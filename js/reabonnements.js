/* =======================================================
   reabonnements.js — Récap réabonnements prospects
   3 compteurs KPI + tableau filtré + badges urgence.
   Export : initReabonnementsPage()
   ======================================================= */

import { fetchProspects }           from './supabase-client.js';
import { STATUTS_ABO, TYPES_ABO }   from './config.js';

// ── Seuil alerte (jours avant expiration) ─────────────────
const SEUIL_ALERTE_JOURS = 30;

// ── État ──────────────────────────────────────────────────
const state = {
  all:      [],
  filtered: [],
  filters:  { statut_abo: '', reabo_auto: '' },
};

// ── Init ──────────────────────────────────────────────────

/** Point d'entrée appelé par router.js. */
export async function initReabonnementsPage() {
  await load();
  bindFilters();
}

// ── Chargement ────────────────────────────────────────────

/** Charge les prospects avec abonnement depuis Supabase. */
async function load() {
  const { data, error } = await fetchProspects({ limit: 500 });
  if (error) { console.error('[reabonnements] fetch error', error); return; }

  state.all = (data ?? []).filter(p => p.type_abo && p.type_abo !== 'aucun');
  renderKPIs(state.all);
  applyAndRender();
}

// ── KPIs ──────────────────────────────────────────────────

/**
 * Remplit les 3 compteurs KPI.
 * @param {Array} prospects
 */
function renderKPIs(prospects) {
  const today      = new Date();
  const seuilDate  = new Date(today);
  seuilDate.setDate(today.getDate() + SEUIL_ALERTE_JOURS);
  const todayStr   = today.toISOString().slice(0, 10);
  const seuilStr   = seuilDate.toISOString().slice(0, 10);

  const actifs    = prospects.filter(p => p.statut_abo === 'actif').length;
  const bientot   = prospects.filter(p =>
    p.statut_abo === 'actif' && p.date_fin_abo && p.date_fin_abo <= seuilStr && p.date_fin_abo >= todayStr
  ).length;
  const expires   = prospects.filter(p =>
    p.date_fin_abo && p.date_fin_abo < todayStr
  ).length;

  fill('kpi-abo-actifs',  actifs);
  fill('kpi-abo-bientot', bientot);
  fill('kpi-abo-expires', expires);
}

function fill(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── Filtrage + rendu ──────────────────────────────────────

/** Applique les filtres et rend le tableau. */
function applyAndRender() {
  const { statut_abo, reabo_auto } = state.filters;

  state.filtered = state.all.filter(p => {
    if (statut_abo  && p.statut_abo    !== statut_abo)           return false;
    if (reabo_auto === 'oui'  && !p.reabo_auto)                  return false;
    if (reabo_auto === 'non'  &&  p.reabo_auto)                  return false;
    return true;
  });

  state.filtered.sort((a, b) => {
    if (!a.date_fin_abo) return 1;
    if (!b.date_fin_abo) return -1;
    return a.date_fin_abo < b.date_fin_abo ? -1 : 1;
  });

  renderTable(state.filtered);
  updateCount(state.filtered.length);
}

// ── Tableau ───────────────────────────────────────────────

/**
 * Injecte les lignes dans #reabo-tbody.
 * @param {Array} prospects
 */
function renderTable(prospects) {
  const tbody = document.getElementById('reabo-tbody');
  if (!tbody) return;

  if (!prospects.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-cell">Aucun abonnement trouvé.</td></tr>`;
    return;
  }

  const today     = new Date().toISOString().slice(0, 10);
  const seuilDate = new Date();
  seuilDate.setDate(seuilDate.getDate() + SEUIL_ALERTE_JOURS);
  const seuilStr  = seuilDate.toISOString().slice(0, 10);

  tbody.innerHTML = prospects.map(p => buildRow(p, today, seuilStr)).join('');
}

/**
 * Construit une ligne du tableau.
 * @param {object} p @param {string} today @param {string} seuilStr
 * @returns {string}
 */
function buildRow(p, today, seuilStr) {
  const typeAbo   = TYPES_ABO.find(t => t.value === p.type_abo);
  const statutAbo = STATUTS_ABO.find(s => s.value === p.statut_abo);
  const dateFin   = p.date_fin_abo
    ? new Date(p.date_fin_abo).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';
  const tarif     = p.tarif_mensuel ? `${p.tarif_mensuel} €` : '—';
  const reabo     = p.reabo_auto ? '✓' : '—';
  const rowClass  = urgenceClass(p, today, seuilStr);

  return `<tr class="${rowClass}">
    <td><a href="#/prospect/${p.id}">${esc(p.nom)}</a></td>
    <td>${typeAbo ? `<span class="badge badge-${typeAbo.badgeType}">${typeAbo.label}</span>` : '—'}</td>
    <td>${statutAbo ? `<span class="badge badge-${statutAbo.badgeType}">${statutAbo.label}</span>` : '—'}</td>
    <td>${dateFin}</td>
    <td>${tarif}</td>
    <td class="col-center reabo-auto-col">${reabo}</td>
    <td>${urgenceBadge(p, today, seuilStr)}</td>
  </tr>`;
}

/**
 * Retourne la classe CSS d'urgence pour la ligne.
 * @param {object} p @param {string} today @param {string} seuilStr
 * @returns {string}
 */
function urgenceClass(p, today, seuilStr) {
  if (!p.date_fin_abo) return '';
  if (p.date_fin_abo < today) return 'row-expire';
  if (p.date_fin_abo <= seuilStr) return 'row-bientot';
  if (p.statut_abo === 'actif' && p.reabo_auto) return 'row-ok';
  return '';
}

/**
 * Retourne le badge d'urgence HTML.
 * @param {object} p @param {string} today @param {string} seuilStr
 * @returns {string}
 */
function urgenceBadge(p, today, seuilStr) {
  if (!p.date_fin_abo) return '—';
  if (p.date_fin_abo < today)     return `<span class="badge badge-danger">Expiré</span>`;
  if (p.date_fin_abo <= seuilStr) return `<span class="badge badge-warning">Expire bientôt</span>`;
  if (p.statut_abo === 'actif')   return `<span class="badge badge-success">Actif</span>`;
  return '—';
}

function updateCount(n) {
  const el = document.getElementById('reabo-count');
  if (el) el.textContent = n;
}

// ── Événements ────────────────────────────────────────────

/** Attache les filtres statut_abo + reabo_auto. */
function bindFilters() {
  document.getElementById('reabo-filter-statut')?.addEventListener('change', e => {
    state.filters.statut_abo = e.target.value;
    applyAndRender();
  });
  document.getElementById('reabo-filter-reabo')?.addEventListener('change', e => {
    state.filters.reabo_auto = e.target.value;
    applyAndRender();
  });
}

// ── Utils ─────────────────────────────────────────────────

function esc(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
