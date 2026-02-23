/* =======================================================
   rappels-page.js — Page /rappels : liste globale avec filtres
   ======================================================= */
import { fetchRappels, updateRappel, deleteRappel } from './supabase-client.js';
import { toast, badge }  from './ui-components.js';
import { STATUTS_RAPPEL } from './config.js';

let _allRappels = [];

// ── Init ──────────────────────────────────────────────────

export async function initRappelsPage() {
  injectFilterOptions();
  await load();
  document.getElementById('rappels-filter-statut')
    ?.addEventListener('change', () => renderFiltered());
}

// ── Chargement ────────────────────────────────────────────

async function load() {
  const { data, error } = await fetchRappels();
  if (error) { toast('Erreur chargement rappels.', 'error'); return; }
  _allRappels = (data ?? []).sort((a, b) =>
    new Date(a.date_rappel) - new Date(b.date_rappel));
  renderFiltered();
}

// ── Rendu ─────────────────────────────────────────────────

function renderFiltered() {
  const statut = document.getElementById('rappels-filter-statut')?.value ?? '';
  const list   = statut ? _allRappels.filter(r => r.statut === statut) : _allRappels;
  render(list);
}

function render(rappels) {
  const tbody  = document.getElementById('rappels-tbody');
  const empty  = document.getElementById('rappels-empty');
  const count  = document.getElementById('rappels-count');
  if (!tbody) return;

  if (count) count.textContent = rappels.length;

  if (!rappels.length) {
    tbody.innerHTML = '';
    if (empty) empty.style.display = '';
    return;
  }
  if (empty) empty.style.display = 'none';

  const now = new Date().setHours(0, 0, 0, 0);
  tbody.innerHTML = rappels.map(r => {
    const date    = new Date(r.date_rappel);
    const dateStr = date.toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' });
    const enRetard = r.statut === 'planifie' && date.setHours(0,0,0,0) < now;
    const st      = STATUTS_RAPPEL.find(s => s.value === r.statut);
    const nom     = r.prospects?.nom ?? '—';
    const prospId = r.prospect_id;
    const rowClass = enRetard ? 'class="row-overdue"' : '';
    const dateCell = enRetard
      ? `<td><span class="badge badge-danger" title="En retard">${dateStr}</span></td>`
      : `<td>${dateStr}</td>`;
    const actions = r.statut === 'planifie'
      ? `<button class="btn btn-xs btn-ghost rp-done" data-id="${esc(r.id)}" title="Marquer fait">✓ Fait</button>`
      : '';
    return `<tr ${rowClass} data-id="${esc(r.id)}">
      ${dateCell}
      <td>${prospId ? `<a href="#/prospect/${esc(prospId)}">${esc(nom)}</a>` : esc(nom)}</td>
      <td>${esc(r.motif ?? '—')}</td>
      <td>${st ? badge(st.label, st.badgeType) : '—'}</td>
      <td class="col-actions">${actions}</td>
    </tr>`;
  }).join('');

  // Délégation événements
  tbody.addEventListener('click', handleTableClick, { once: true });
}

// ── Actions ───────────────────────────────────────────────

async function handleTableClick(e) {
  const doneBtn = e.target.closest('.rp-done');
  if (doneBtn) {
    const id = doneBtn.dataset.id;
    doneBtn.disabled = true;
    const { error } = await updateRappel(id, { statut: 'effectue' });
    if (error) { toast(`Erreur : ${error.message}`, 'error'); doneBtn.disabled = false; return; }
    _allRappels = _allRappels.map(r => r.id === id ? { ...r, statut: 'effectue' } : r);
    toast('Rappel marqué fait.', 'success');
    renderFiltered();
  }
}

// ── Utils ─────────────────────────────────────────────────

function injectFilterOptions() {
  const sel = document.getElementById('rappels-filter-statut');
  if (!sel) return;
  STATUTS_RAPPEL.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.value;
    opt.textContent = s.label;
    sel.appendChild(opt);
  });
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
