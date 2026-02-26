/* =======================================================
   search.js — Recherche globale sidebar
   Cherche sur : prospects, contacts, interactions
   Résultats groupés par type avec navigation vers fiche.
   Init : initSearch() appelé dans router.js au démarrage.
   ======================================================= */

import { fetchProspects, searchContacts, searchInteractions } from './supabase-client.js';

// ── Constantes ────────────────────────────────────────────
const DEBOUNCE_MS  = 300;
const MIN_LEN      = 2;
const MAX_RESULTS  = 5;

// ── État ──────────────────────────────────────────────────
let _debounceTimer = null;
let _dropdown      = null;

// ── Init ──────────────────────────────────────────────────

/**
 * Attache le listener de recherche sur #global-search-input.
 * Crée le dropdown résultats et gère la fermeture.
 */
export function initSearch() {
  const input = document.getElementById('global-search-input');
  if (!input) return;

  // Le dropdown est créé dans .top-header-search (position: relative)
  _dropdown = createDropdown(input);

  input.addEventListener('input', e => {
    clearTimeout(_debounceTimer);
    const q = e.target.value.trim();
    if (q.length < MIN_LEN) { hideDropdown(); return; }
    _debounceTimer = setTimeout(() => runSearch(q), DEBOUNCE_MS);
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.search-dropdown') && e.target !== input) hideDropdown();
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') { hideDropdown(); input.blur(); }
  });
}

// ── Dropdown DOM ──────────────────────────────────────────

/**
 * Crée et positionne le dropdown résultats.
 * @param {HTMLElement} input
 * @returns {HTMLElement}
 */
function createDropdown(input) {
  const dd = document.createElement('div');
  dd.className = 'search-dropdown';
  dd.setAttribute('role', 'listbox');
  dd.setAttribute('aria-label', 'Résultats de recherche');
  input.parentElement.style.position = 'relative';
  input.parentElement.appendChild(dd);
  return dd;
}

function hideDropdown() {
  if (_dropdown) _dropdown.innerHTML = '';
  if (_dropdown) _dropdown.hidden = true;
}

function showDropdown(html) {
  if (!_dropdown) return;
  _dropdown.innerHTML = html;
  _dropdown.hidden = false;
}

// ── Recherche ─────────────────────────────────────────────

/**
 * Lance les 3 requêtes en parallèle et affiche les résultats.
 * @param {string} q
 */
async function runSearch(q) {
  showDropdown('<div class="search-loading">Recherche…</div>');

  try {
    const [prospects, contacts, interactions] = await Promise.all([
      searchProspects(q),
      searchContacts(q),
      searchInteractions(q),
    ]);

    const html = buildResultsHTML(prospects, contacts, interactions, q);
    showDropdown(html || '<div class="search-empty">Aucun résultat</div>');
    bindResultClicks();
  } catch (err) {
    console.error('[search] error', err);
    showDropdown('<div class="search-empty">Erreur de recherche</div>');
  }
}

// ── Requêtes ──────────────────────────────────────────────

/**
 * Recherche sur prospects.
 * @param {string} q
 * @returns {Promise<Array>}
 */
async function searchProspects(q) {
  const { data } = await fetchProspects({ search: q, limit: MAX_RESULTS });
  return data ?? [];
}

// ── Rendu résultats ───────────────────────────────────────

/**
 * Construit le HTML groupé par section.
 * @param {Array} prospects @param {Array} contacts @param {Array} interactions @param {string} q
 * @returns {string}
 */
function buildResultsHTML(prospects, contacts, interactions, q) {
  const parts = [];

  if (prospects.length)    parts.push(buildSection('Prospects', '🏢', prospects,    buildProspectItem));
  if (contacts.length)     parts.push(buildSection('Contacts',  '👤', contacts,     buildContactItem));
  if (interactions.length) parts.push(buildSection('Interactions', '💬', interactions, buildInteractionItem));

  return parts.join('');
}

/**
 * Construit une section de résultats.
 * @param {string} title @param {string} icon @param {Array} items @param {Function} buildItem
 * @returns {string}
 */
function buildSection(title, icon, items, buildItem) {
  const rows = items.slice(0, MAX_RESULTS).map(buildItem).join('');
  return `<div class="search-section">
    <div class="search-section-title">${icon} ${title}</div>
    ${rows}
  </div>`;
}

/**
 * @param {object} p
 * @returns {string}
 */
function buildProspectItem(p) {
  const sub = [p.siret, p.email, p.telephone].filter(Boolean).join(' · ');
  return `<button class="search-item" data-href="#/prospect/${p.id}" role="option">
    <span class="search-item-main">${esc(p.nom)}</span>
    ${sub ? `<span class="search-item-sub">${esc(sub)}</span>` : ''}
  </button>`;
}

/**
 * @param {object} c
 * @returns {string}
 */
function buildContactItem(c) {
  const full   = [c.prenom, c.nom].filter(Boolean).join(' ');
  const parent = c.prospects?.nom ?? '';
  const sub    = [c.email, c.telephone, parent ? `chez ${parent}` : ''].filter(Boolean).join(' · ');
  return `<button class="search-item" data-href="#/prospect/${c.prospect_id}" role="option">
    <span class="search-item-main">${esc(full)}</span>
    ${sub ? `<span class="search-item-sub">${esc(sub)}</span>` : ''}
  </button>`;
}

/**
 * @param {object} i
 * @returns {string}
 */
function buildInteractionItem(i) {
  const preview = (i.contenu ?? '').slice(0, 60) + (i.contenu?.length > 60 ? '…' : '');
  const parent  = i.prospects?.nom ?? '';
  const sub     = [i.auteur, parent ? `chez ${parent}` : ''].filter(Boolean).join(' · ');
  return `<button class="search-item" data-href="#/prospect/${i.prospect_id}" role="option">
    <span class="search-item-main">${esc(preview || '(sans contenu)')}</span>
    ${sub ? `<span class="search-item-sub">${esc(sub)}</span>` : ''}
  </button>`;
}

// ── Navigation résultats ──────────────────────────────────

/** Attache les clics sur les résultats. */
function bindResultClicks() {
  if (!_dropdown) return;
  _dropdown.addEventListener('click', e => {
    const item = e.target.closest('.search-item');
    if (!item?.dataset.href) return;
    window.location.hash = item.dataset.href.replace('#', '');
    hideDropdown();
    const input = document.getElementById('global-search-input');
    if (input) input.value = '';
  });
}

// ── Utils ─────────────────────────────────────────────────

function esc(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
