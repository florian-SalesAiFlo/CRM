/* =======================================================
   dashboard.js — Dashboard CRM M2BPO
   Affiche : date, KPIs, pipeline par statut, activités récentes.
   Init : initDashboard() appelé par router.js → initPageScripts()
   ======================================================= */

import { fetchProspectsWithStats, fetchRappelsDuJour, fetchRecentInteractions } from './supabase-client.js';
import { getStatut, STATUTS_PROSPECT, getCanal } from './config.js';
import { emptyState } from './ui-components.js';
import { renderCharts } from './dashboard-charts.js';

// ── Init ──────────────────────────────────────────────────

/**
 * Point d'entrée dashboard, appelé par router.js.
 * Charge toutes les données en parallèle puis rend la page.
 */
export async function initDashboard() {
  renderDate();
  const [{ data: prospects }, { data: rappels }, { data: interactions }] =
    await Promise.all([
      fetchProspectsWithStats(),
      fetchRappelsDuJour(),
      fetchRecentInteractions(10),
    ]);

  const safeProspects    = prospects    ?? [];
  const safeRappels      = rappels      ?? [];
  const safeInteractions = interactions ?? [];

  renderKPIs(safeProspects, safeRappels);
  renderPipeline(safeProspects);
  renderActivites(safeInteractions);
  renderCharts(safeProspects, safeInteractions);
  renderTeamActivity(safeProspects, safeInteractions, safeRappels);
}

// ── Date ──────────────────────────────────────────────────

/**
 * Affiche la date du jour dans #dash-date.
 */
function renderDate() {
  const el = document.getElementById('dash-date');
  if (!el) return;
  el.textContent = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

// ── KPIs ──────────────────────────────────────────────────

/**
 * Remplit les 4 cartes KPI (total, définis, fermés, rappels du jour).
 * @param {Array} prospects
 * @param {Array} rappels
 */
function renderKPIs(prospects, rappels) {
  const fill = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  fill('kpi-total-val',   prospects.length);
  fill('kpi-defini-val',  prospects.filter(p => p.statut === 'defini').length);
  fill('kpi-ferme-val',   prospects.filter(p => p.statut === 'ferme').length);
  fill('kpi-rappels-val', rappels.length);
}

// ── Pipeline ──────────────────────────────────────────────

/**
 * Rend la section pipeline avec 3 colonnes (une par statut).
 * @param {Array} prospects
 */
function renderPipeline(prospects) {
  const section = document.getElementById('pipeline-section');
  if (!section) return;

  const cols = STATUTS_PROSPECT.map(s => buildPipelineCol(s, prospects));
  section.innerHTML = `<div class="pipeline-grid">${cols.join('')}</div>`;
  bindPipelineLinks(section);
}

/**
 * Construit le HTML d'une colonne pipeline pour un statut donné.
 * @param {object} statut - objet STATUTS_PROSPECT
 * @param {Array}  prospects
 * @returns {string} HTML
 */
function buildPipelineCol(statut, prospects) {
  const filtered = prospects.filter(p => p.statut === statut.value);
  const top5     = filtered.slice(0, 5);
  const rows     = top5.map(p =>
    `<a class="pipeline-prospect-link" href="#/prospect/${p.id}" data-route="/prospect/${p.id}">${esc(p.nom)}</a>`
  ).join('');
  const list     = top5.length ? `<div class="pipeline-list">${rows}</div>` : '';

  return `
    <div class="pipeline-col">
      <div class="pipeline-col-header">
        <span class="badge badge-${statut.badgeType}">${statut.label}</span>
        <span class="pipeline-count">${filtered.length}</span>
      </div>
      ${list}
      <button class="pipeline-voir-tout btn btn-ghost btn-sm"
              data-statut="${statut.value}">Voir tout →</button>
    </div>`.trim();
}

/**
 * Attache les clics sur "Voir tout" → filtre la liste prospects par statut.
 * @param {HTMLElement} container
 */
function bindPipelineLinks(container) {
  container.addEventListener('click', e => {
    const btn = e.target.closest('.pipeline-voir-tout');
    if (!btn) return;
    localStorage.setItem('prospects_filter_statut', btn.dataset.statut);
    window.location.hash = '/prospects';
  });
}

// ── Activités récentes ────────────────────────────────────

/**
 * Rend le tableau des dernières interactions.
 * @param {Array} interactions
 */
function renderActivites(interactions) {
  const tbody = document.getElementById('activites-tbody');
  if (!tbody) return;

  if (!interactions.length) {
    tbody.innerHTML = `<tr><td colspan="5">${emptyState('Aucune activité récente', '💬')}</td></tr>`;
    return;
  }

  tbody.innerHTML = interactions.map(i => {
    const date    = new Date(i.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const canal   = getCanal(i.canal);
    const auteur  = i.profiles?.nom ?? '—';
    const nomPros = i.prospects?.nom ?? '—';
    const idPros  = i.prospects?.id  ?? '';
    const contenu = (i.contenu ?? '').slice(0, 80) + (i.contenu?.length > 80 ? '…' : '');
    return `<tr>
      <td class="col-date">${date}</td>
      <td class="td-prospect"><a href="#/prospect/${idPros}">${esc(nomPros)}</a></td>
      <td><span class="badge badge-secondary">${canal.label}</span></td>
      <td class="td-truncate">${esc(contenu)}</td>
      <td>${esc(auteur)}</td>
    </tr>`;
  }).join('');
}

// ── Activité équipe ───────────────────────────────────────

/**
 * Rend le tableau d'activité par commercial.
 * Section masquée si aucun commercial assigné.
 * @param {Array} prospects
 * @param {Array} interactions
 * @param {Array} rappels
 */
function renderTeamActivity(prospects, interactions, rappels) {
  const section = document.getElementById('team-section');
  if (!section) return;

  const team = buildTeamStats(prospects, interactions, rappels);
  if (!team.length) { section.style.display = 'none'; return; }

  const rows = team.map(buildTeamRow).join('');
  section.innerHTML = `
    <h3 class="section-title">Activité équipe</h3>
    <div class="table-wrap">
    <table class="data-table">
      <thead><tr>
        <th>Commercial</th>
        <th class="col-center">Prospects</th>
        <th class="col-center">Interactions 30j</th>
        <th class="col-center">Rappels faits 30j</th>
        <th class="col-center">Rappels en retard</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    </div>`;
}

/**
 * Calcule les stats par commercial et trie par interactions desc.
 * @param {Array} prospects
 * @param {Array} interactions
 * @param {Array} rappels
 * @returns {Array} stats par commercial
 */
function buildTeamStats(prospects, interactions, rappels) {
  const map    = new Map();
  const cutoff = new Date(Date.now() - 30 * 86400000);
  const today  = new Date().toISOString().slice(0, 10);

  for (const p of prospects) {
    const nom = p.profiles?.nom;
    if (!nom) continue;
    if (!map.has(nom)) map.set(nom, { nom, prospects: 0, interactions30: 0, rappelsFaits: 0, rappelsRetard: 0 });
    const s = map.get(nom);
    s.prospects++;

    for (const i of p.interactions ?? []) {
      if (new Date(i.created_at) >= cutoff) s.interactions30++;
    }
    for (const r of p.rappels ?? []) {
      if (r.statut === 'fait' && new Date(r.date_rappel) >= cutoff) s.rappelsFaits++;
      if (r.statut === 'planifie' && r.date_rappel < today) s.rappelsRetard++;
    }
  }

  return [...map.values()].sort((a, b) => b.interactions30 - a.interactions30);
}

/**
 * Construit une ligne HTML pour un commercial.
 * @param {object} s - stats du commercial
 * @returns {string} HTML
 */
function buildTeamRow(s) {
  const retardClass = s.rappelsRetard > 0 ? 'badge badge-danger' : 'badge badge-secondary';
  return `<tr>
    <td>${esc(s.nom)}</td>
    <td class="col-center">${s.prospects}</td>
    <td class="col-center">${s.interactions30}</td>
    <td class="col-center">${s.rappelsFaits}</td>
    <td class="col-center"><span class="${retardClass}">${s.rappelsRetard}</span></td>
  </tr>`;
}

// ── Utils ─────────────────────────────────────────────────

/** @param {string} str @returns {string} */
function esc(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
