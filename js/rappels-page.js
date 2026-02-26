/* =======================================================
   rappels-page.js — Vue globale des rappels (manager)
   Filtre par statut + commercial. Tri par date. Retards par commercial.
   Export : initRappelsPage()
   ======================================================= */

import { fetchRappels, updateRappel } from './supabase-client.js';
import { toast }                       from './ui-components.js';
import { STATUTS_RAPPEL, OPTIONS_REPORT } from './config.js';

// ── État ──────────────────────────────────────────────────

const state = {
  all:      [],
  filtered: [],
  sortAsc:  true,
  filters:  { statut: '', commercial: '' },
};

// ── Init ──────────────────────────────────────────────────

/** Point d'entrée. Appelé par router.js → initRappelsPage(). */
export async function initRappelsPage() {
  await load();
  bindFilters();
  bindSortToggle();
}

// ── Chargement données ────────────────────────────────────

/** Charge tous les rappels depuis Supabase puis rend la page. */
async function load() {
  const { data, error } = await fetchRappels();
  if (error) { toast('Erreur chargement rappels.', 'error'); return; }

  state.all = data ?? [];
  populateCommercialFilter();
  renderRetardsBadges();
  applyAndRender();
}

// ── Filtre commercial dynamique ───────────────────────────

/** Peuple le select #rappels-filter-commercial avec les noms uniques. */
function populateCommercialFilter() {
  const sel = document.getElementById('rappels-filter-commercial');
  if (!sel) return;

  const noms = [...new Set(
    state.all.map(r => r.profiles?.nom).filter(Boolean)
  )].sort();

  sel.innerHTML =
    `<option value="">Tous les commerciaux</option>` +
    noms.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
}

// ── Compteurs retards par commercial ─────────────────────

/** Rend les badges de retard par commercial dans #rappels-retards. */
function renderRetardsBadges() {
  const container = document.getElementById('rappels-retards');
  if (!container) return;

  const today = new Date().toISOString().slice(0, 10);
  const map   = new Map();

  for (const r of state.all) {
    if (r.statut !== 'planifie' || r.date_rappel >= today) continue;
    const nom = r.profiles?.nom ?? 'Non assigné';
    map.set(nom, (map.get(nom) ?? 0) + 1);
  }

  if (!map.size) { container.innerHTML = ''; return; }

  container.innerHTML = [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([nom, count]) =>
      `<span class="badge badge-danger">${esc(nom)} : ${count} en retard</span>`
    ).join('');
}

// ── Filtrage + tri + rendu ────────────────────────────────

/** Applique les filtres, trie et rend le tableau. */
function applyAndRender() {
  const { statut, commercial } = state.filters;

  state.filtered = state.all.filter(r => {
    if (statut     && r.statut           !== statut)     return false;
    if (commercial && (r.profiles?.nom ?? '') !== commercial) return false;
    return true;
  });

  state.filtered.sort((a, b) => {
    const cmp = a.date_rappel < b.date_rappel ? -1 : a.date_rappel > b.date_rappel ? 1 : 0;
    return state.sortAsc ? cmp : -cmp;
  });

  renderTable(state.filtered);
}

// ── Rendu tableau ─────────────────────────────────────────

/**
 * Injecte les lignes dans #rappels-tbody.
 * @param {Array} rappels
 */
function renderTable(rappels) {
  const tbody = document.getElementById('rappels-tbody');
  if (!tbody) return;

  updateCount(rappels.length);

  if (!rappels.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-cell">Aucun rappel trouvé.</td></tr>`;
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  tbody.innerHTML = rappels.map(r => buildRow(r, today)).join('');
  bindTableActions();
}

/**
 * Construit une ligne <tr> pour un rappel.
 * @param {object} r @param {string} today
 * @returns {string}
 */
function buildRow(r, today) {
  const st         = STATUTS_RAPPEL.find(s => s.value === r.statut);
  const date       = new Date(r.date_rappel).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const retard     = r.statut === 'planifie' && r.date_rappel < today;
  const commercial = r.profiles?.nom ?? '—';
  const prosNom    = r.prospects?.nom ?? '—';
  const prosId     = r.prospects?.id  ?? '';
  const actions    = r.statut === 'planifie' ? buildActions(r) : '';

  return `<tr class="rappel-row${retard ? ' rappel-retard' : ''}">
    <td>${date}${retard ? ' <span class="badge badge-danger badge-sm">Retard</span>' : ''}</td>
    <td><a href="#/prospects/${prosId}">${esc(prosNom)}</a></td>
    <td class="td-truncate">${esc(r.motif ?? '—')}</td>
    <td>${st ? `<span class="badge badge-${st.badgeType}">${st.label}</span>` : '—'}</td>
    <td>${esc(commercial)}</td>
    <td class="col-actions">${actions}</td>
  </tr>`;
}

/**
 * Boutons d'action pour rappel planifié (marquer fait + reporter).
 * @param {object} r
 * @returns {string}
 */
function buildActions(r) {
  const opts = OPTIONS_REPORT.map(o =>
    `<button class="reporter-option" data-id="${r.id}" data-option="${o.value}">${o.label}</button>`
  ).join('');

  return `<span class="row-actions">
    <button class="row-action-btn rappel-done" data-id="${r.id}" title="Marquer fait">✓</button>
    <span class="reporter-wrap">
      <button class="row-action-btn rappel-report" data-id="${r.id}" title="Reporter">↻</button>
      <div class="reporter-dropdown">${opts}</div>
    </span>
  </span>`;
}

/** Met à jour le compteur de résultats. */
function updateCount(n) {
  const el = document.getElementById('rappels-count');
  if (el) el.textContent = n;
}

// ── Événements ────────────────────────────────────────────

/** Attache les filtres statut + commercial. */
function bindFilters() {
  document.getElementById('rappels-filter-statut')?.addEventListener('change', e => {
    state.filters.statut = e.target.value;
    applyAndRender();
  });

  document.getElementById('rappels-filter-commercial')?.addEventListener('change', e => {
    state.filters.commercial = e.target.value;
    applyAndRender();
  });
}

/** Attache le tri sur le header date. */
function bindSortToggle() {
  const btn = document.getElementById('rappels-sort-date');
  if (!btn) return;
  btn.addEventListener('click', () => {
    state.sortAsc = !state.sortAsc;
    btn.textContent = `Date ${state.sortAsc ? '▲' : '▼'}`;
    applyAndRender();
  });
}

/** Délègue les actions du tableau (marquer fait + reporter). */
function bindTableActions() {
  const tbody = document.getElementById('rappels-tbody');
  if (!tbody) return;

  tbody.addEventListener('click', e => {
    const reportTrigger = e.target.closest('.rappel-report');
    if (reportTrigger) {
      const wrap = reportTrigger.closest('.reporter-wrap');
      const isOpen = wrap.classList.contains('open');
      closeAllReporters();
      if (!isOpen) wrap.classList.add('open');
      e.stopPropagation();
      return;
    }
    handleTableClick(e);
  });

  document.addEventListener('click', closeAllReporters, { once: false });
}

/**
 * Gère les clics sur options reporter et bouton fait.
 * @param {MouseEvent} e
 */
async function handleTableClick(e) {
  const opt  = e.target.closest('.reporter-option');
  const done = e.target.closest('.rappel-done');

  if (opt) {
    const { id, option } = opt.dataset;
    const newDate = calcDateReport(option);
    closeAllReporters();
    const { error } = await updateRappel(id, { date_rappel: newDate, statut: 'reporte' });
    if (error) { toast(`Erreur : ${error.message}`, 'error'); return; }
    toast(`Rappel reporté au ${newDate.slice(8, 10)}/${newDate.slice(5, 7)}.`, 'success');
    await load();
    return;
  }

  if (done) {
    const { error } = await updateRappel(done.dataset.id, { statut: 'fait' });
    if (error) { toast(`Erreur : ${error.message}`, 'error'); return; }
    toast('Rappel marqué comme fait.', 'success');
    await load();
  }
}

// ── Utils ─────────────────────────────────────────────────

/** Ferme tous les dropdowns reporter. */
function closeAllReporters() {
  document.querySelectorAll('.reporter-wrap.open').forEach(w => w.classList.remove('open'));
}

/**
 * Calcule la date de report.
 * @param {string} option - '1', '3' ou 'lundi'
 * @returns {string} YYYY-MM-DD
 */
function calcDateReport(option) {
  const d = new Date();
  switch (option) {
    case '1':     d.setDate(d.getDate() + 1); break;
    case '3':     d.setDate(d.getDate() + 3); break;
    case 'lundi': {
      const day = d.getDay();
      d.setDate(d.getDate() + (day === 0 ? 8 : 8 - day));
      break;
    }
  }
  return d.toISOString().slice(0, 10);
}

/** @param {string|null} str @returns {string} */
function esc(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
