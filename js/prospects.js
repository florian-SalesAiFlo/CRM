/* =======================================================
   prospects.js — Logique liste des prospects
   Orchestration : chargement, filtres, tri, création.
   Rendu HTML : délégué à prospects-render.js.
   S'auto-initialise via initProspectList().
   ======================================================= */

import { fetchProspectsWithStats, createProspect } from './supabase-client.js';
import { toast }                                    from './ui-components.js';
import { openPanel, closePanels }                   from './ui-panels.js';
import { renderTable, renderCreateForm }            from './prospects-render.js';

// ── État du module ────────────────────────────────────────

const state = {
  prospects: [],
  filtered:  [],
  sortKey:   'updated_at',
  sortAsc:   false,
  filters:   { statut: '', metier: '', retour: '', commercial_id: '' },
  search:    '',
};

const DOM = {
  tbody:     'prospects-tbody',
  count:     'prospects-count',
  search:    'prospects-search',
  filterBar: 'prospects-filters',
  btnNew:    'btn-new-prospect',
  panelId:   'panel-new-prospect',
  formId:    'form-new-prospect',
};

// ── Init ──────────────────────────────────────────────────

export async function initProspectList() {
  bindFilterEvents();
  bindSearchEvent();
  bindNewProspectBtn();
  bindSortHeaders();
  await loadProspects();
}

// ── Chargement Supabase ───────────────────────────────────

async function loadProspects() {
  setLoading(true);
  const { data, error } = await fetchProspectsWithStats(buildServerFilters());
  setLoading(false);

  if (error) {
    toast('Erreur lors du chargement des prospects.', 'error');
    console.error('[prospects]', error);
    return;
  }

  state.prospects = data ?? [];
  applyLocalFiltersAndRender();
}

function buildServerFilters() {
  const { statut, metier, retour, commercial_id } = state.filters;
  return {
    ...(statut        && { statut }),
    ...(metier        && { metier }),
    ...(retour        && { retour }),
    ...(commercial_id && { commercial_id }),
  };
}

// ── Filtrage local + tri ──────────────────────────────────

function applyLocalFiltersAndRender() {
  const q = state.search.toLowerCase().trim();

  state.filtered = state.prospects.filter(p => {
    if (!q) return true;
    return (
      p.nom?.toLowerCase().includes(q)           ||
      p.siret?.toLowerCase().includes(q)         ||
      p.profiles?.nom?.toLowerCase().includes(q)
    );
  });

  sortFiltered();
  renderTable(state.filtered, DOM.tbody);
  updateCount();
  bindRowNavigation();
}

function sortFiltered() {
  const { sortKey, sortAsc } = state;
  state.filtered.sort((a, b) => {
    const va = sortValue(a, sortKey);
    const vb = sortValue(b, sortKey);
    if (va < vb) return sortAsc ? -1 : 1;
    if (va > vb) return sortAsc ? 1 : -1;
    return 0;
  });
}

function sortValue(p, key) {
  switch (key) {
    case 'nom':          return (p.nom ?? '').toLowerCase();
    case 'metier':       return p.metier ?? '';
    case 'statut':       return p.statut ?? '';
    case 'retour':       return p.retour ?? '';
    case 'commercial':   return (p.profiles?.nom ?? '').toLowerCase();
    case 'interactions': return p.interactions?.length ?? 0;
    case 'updated_at':   return p.updated_at ?? '';
    default:             return '';
  }
}

// ── Tri colonnes ──────────────────────────────────────────

function toggleSort(key) {
  state.sortAsc = state.sortKey === key ? !state.sortAsc : false;
  state.sortKey = key;
  updateSortHeaders();
  sortFiltered();
  renderTable(state.filtered, DOM.tbody);
  bindRowNavigation();
}

function updateSortHeaders() {
  document.querySelectorAll('th[data-sort]').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.dataset.sort === state.sortKey) {
      th.classList.add(state.sortAsc ? 'sort-asc' : 'sort-desc');
    }
  });
}

// ── Événements filtres + sort headers ────────────────────

function bindFilterEvents() {
  const bar = document.getElementById(DOM.filterBar);
  if (!bar) return;
  bar.addEventListener('change', async (e) => {
    const sel = e.target.closest('select[data-filter]');
    if (!sel) return;
    state.filters[sel.dataset.filter] = sel.value;
    await loadProspects();
  });
}

function bindSearchEvent() {
  const input = document.getElementById(DOM.search);
  if (!input) return;
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      state.search = input.value;
      applyLocalFiltersAndRender();
    }, 200);
  });
}

function bindSortHeaders() {
  document.querySelectorAll('th[data-sort]').forEach(th => {
    th.addEventListener('click', () => toggleSort(th.dataset.sort));
  });
}

// ── Navigation lignes ─────────────────────────────────────

function bindRowNavigation() {
  const tbody = document.getElementById(DOM.tbody);
  if (!tbody) return;
  tbody.addEventListener('click', onRowClick);
  tbody.addEventListener('keydown', onRowKeydown);
}

function onRowClick(e) {
  const row = e.target.closest('tr[data-id]');
  if (row) window.location.hash = `/prospect/${row.dataset.id}`;
}

function onRowKeydown(e) {
  if (e.key !== 'Enter') return;
  const row = e.target.closest('tr[data-id]');
  if (row) window.location.hash = `/prospect/${row.dataset.id}`;
}

// ── Compteur ──────────────────────────────────────────────

function updateCount() {
  const el = document.getElementById(DOM.count);
  if (!el) return;
  const total = state.prospects.length;
  const shown = state.filtered.length;
  const label = `prospect${total !== 1 ? 's' : ''}`;
  el.textContent = shown === total
    ? `${total} ${label}`
    : `${shown} / ${total} ${label}`;
}

// ── Loading skeleton ──────────────────────────────────────

function setLoading(loading) {
  const tbody = document.getElementById(DOM.tbody);
  if (!tbody || !loading) return;
  tbody.innerHTML = Array(5).fill(0).map(() => `
    <tr>
      <td><div class="skel skel-text"></div></td>
      <td><div class="skel skel-text" style="width:70px"></div></td>
      <td><div class="skel skel-badge"></div></td>
      <td><div class="skel skel-badge"></div></td>
      <td><div class="skel skel-text" style="width:90px"></div></td>
      <td><div class="skel skel-text" style="width:70px"></div></td>
      <td><div class="skel skel-text" style="width:24px;margin:auto"></div></td>
    </tr>`).join('');
}

// ── Panel création ────────────────────────────────────────

function bindNewProspectBtn() {
  const btn = document.getElementById(DOM.btnNew);
  if (!btn) return;
  btn.addEventListener('click', openCreatePanel);
}

function openCreatePanel() {
  const panelEl = document.getElementById(DOM.panelId);
  if (!panelEl) return;
  panelEl.querySelector('.slide-panel-body').innerHTML =
    renderCreateForm(DOM.formId);
  document.getElementById(DOM.formId)?.addEventListener('submit', handleCreateSubmit);
  openPanel(DOM.panelId);
}

async function handleCreateSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const nom  = form.querySelector('#f-nom')?.value.trim();

  if (!nom) {
    form.querySelector('#f-nom')?.focus();
    toast('Le nom du prospect est obligatoire.', 'error');
    return;
  }

  const submitBtn = document.getElementById('f-submit');
  const submitTxt = document.getElementById('f-submit-text');
  if (submitBtn) submitBtn.disabled = true;
  if (submitTxt) submitTxt.textContent = 'Création…';

  const payload = {
    nom,
    siret:  form.querySelector('#f-siret')?.value.trim() || null,
    metier: form.querySelector('#f-metier')?.value       || null,
    statut: form.querySelector('#f-statut')?.value       || 'a_definir',
    retour: form.querySelector('#f-retour')?.value       || null,
  };

  const { data, error } = await createProspect(payload);

  if (submitBtn) submitBtn.disabled = false;
  if (submitTxt) submitTxt.textContent = 'Créer le prospect';

  if (error) {
    toast('Erreur lors de la création.', 'error');
    console.error('[prospects] createProspect:', error);
    return;
  }

  toast(`${payload.nom} créé.`, 'success');
  closePanels();
  await loadProspects();
  if (data?.id) window.location.hash = `/prospect/${data.id}`;
}
