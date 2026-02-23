/* =======================================================
   search.js — Recherche globale sidebar (prospects)
   Appelé depuis initRouter(). Global, pas lié à une page.
   ======================================================= */
import { fetchProspects } from './supabase-client.js';

const INPUT_ID   = 'sidebar-search-input';
const DROPDOWN_ID = 'search-dropdown';
const MIN_CHARS  = 2;
const DEBOUNCE   = 300;
const MAX_RESULTS = 8;

let _timer = null;

// ── Init ──────────────────────────────────────────────────

export function initSearch() {
  const input = document.getElementById(INPUT_ID);
  if (!input) return;

  input.addEventListener('input', () => {
    clearTimeout(_timer);
    const q = input.value.trim();
    if (q.length < MIN_CHARS) { closeDropdown(); return; }
    _timer = setTimeout(() => runSearch(q), DEBOUNCE);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeDropdown(); input.blur(); }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.sidebar-search')) closeDropdown();
  });
}

// ── Recherche ─────────────────────────────────────────────

async function runSearch(query) {
  const { data, error } = await fetchProspects({ search: query, limit: MAX_RESULTS });
  if (error) { closeDropdown(); return; }
  renderDropdown(data ?? [], query);
}

// ── Rendu dropdown ────────────────────────────────────────

function renderDropdown(results, query) {
  let dd = document.getElementById(DROPDOWN_ID);
  if (!dd) {
    dd = document.createElement('div');
    dd.id = DROPDOWN_ID;
    dd.className = 'search-dropdown';
    document.getElementById(INPUT_ID)?.closest('.sidebar-search')?.appendChild(dd);
  }

  if (!results.length) {
    dd.innerHTML = `<div class="search-result-empty">Aucun résultat pour « ${esc(query)} »</div>`;
    dd.classList.add('open');
    return;
  }

  dd.innerHTML = results.map(p => {
    const metier = p.metier ?? '';
    return `<button class="search-result-item" data-id="${esc(p.id)}">
      <span class="sri-nom">${esc(p.nom)}</span>
      <span class="sri-meta">${[p.siret ? formatSiret(p.siret) : null, metier].filter(Boolean).join(' · ')}</span>
    </button>`;
  }).join('');

  dd.classList.add('open');

  dd.querySelectorAll('.search-result-item').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.hash = `/prospect/${btn.dataset.id}`;
      closeDropdown();
      document.getElementById(INPUT_ID).value = '';
    });
  });
}

function closeDropdown() {
  const dd = document.getElementById(DROPDOWN_ID);
  if (dd) { dd.classList.remove('open'); dd.innerHTML = ''; }
}

// ── Utils ─────────────────────────────────────────────────

function formatSiret(s) { return s ? s.replace(/(\d{3})(?=\d)/g, '$1 ') : ''; }
function esc(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
