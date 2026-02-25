/* =======================================================
   dashboard.js — Dashboard CRM M2BPO
   KPIs, pipeline, activités récentes.
   Graphiques et équipe : dashboard-charts.js (appelé séparément par router.js)
   ======================================================= */

import { fetchProspectsWithStats, fetchRappelsDuJour, fetchRecentInteractions } from './supabase-client.js';
import { STATUTS_PROSPECT, getCanal } from './config.js';
import { emptyState } from './ui-components.js';

// ── Init ──────────────────────────────────────────────────

/**
 * Point d'entrée dashboard. Charge les données et rend KPIs, pipeline, activités.
 */
export async function initDashboard() {
  renderDate();
  const [{ data: prospects }, { data: rappels }, { data: interactions }] =
    await Promise.all([
      fetchProspectsWithStats(),
      fetchRappelsDuJour(),
      fetchRecentInteractions(10),
    ]);

  const p = prospects    ?? [];
  const r = rappels      ?? [];
  const i = interactions ?? [];

  renderKPIs(p, r);
  renderPipeline(p);
  renderActivites(i);
}

// ── Date ──────────────────────────────────────────────────

/** Affiche la date du jour dans #dash-date. */
function renderDate() {
  const el = document.getElementById('dash-date');
  if (!el) return;
  el.textContent = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

// ── KPIs ──────────────────────────────────────────────────

/**
 * Remplit les 4 cartes KPI.
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
 * Rend la section pipeline avec 3 colonnes par statut.
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
 * Construit le HTML d'une colonne pipeline.
 * @param {object} statut
 * @param {Array}  prospects
 * @returns {string}
 */
function buildPipelineCol(statut, prospects) {
  const filtered = prospects.filter(p => p.statut === statut.value);
  const top5     = filtered.slice(0, 5);
  const rows     = top5.map(p =>
    `<a class="pipeline-prospect-link" href="#/prospect/${p.id}">${esc(p.nom)}</a>`
  ).join('');
  const list = top5.length ? `<div class="pipeline-list">${rows}</div>` : '';
  return `<div class="pipeline-col">
    <div class="pipeline-col-header">
      <span class="badge badge-${statut.badgeType}">${statut.label}</span>
      <span class="pipeline-count">${filtered.length}</span>
    </div>
    ${list}
    <button class="pipeline-voir-tout btn btn-ghost btn-sm"
            data-statut="${statut.value}">Voir tout →</button>
  </div>`;
}

/**
 * Attache les clics sur "Voir tout" pour filtrer la liste prospects.
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
  tbody.innerHTML = interactions.map(buildActiviteRow).join('');
}

/**
 * Construit une ligne HTML pour une interaction.
 * @param {object} i
 * @returns {string}
 */
function buildActiviteRow(i) {
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
}

// ── Utils ─────────────────────────────────────────────────

/** @param {string|null} str @returns {string} */
function esc(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
