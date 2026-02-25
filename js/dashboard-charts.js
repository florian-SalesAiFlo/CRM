/* =======================================================
   dashboard-charts.js — Graphiques tendance + activité équipe
   Appelé par router.js après initDashboard().
   Chart.js chargé via CDN dans index.html (window.Chart).
   Export : initDashboardCharts()
   ======================================================= */

import { fetchProspectsWithStats, fetchRecentInteractions, fetchRappels } from './supabase-client.js';
import { STATUTS_PROSPECT } from './config.js';

const WEEKS = 8;

// ── Point d'entrée ────────────────────────────────────────

/**
 * Charge les données et rend les 3 graphiques + tableau équipe.
 * Fallback silencieux si Chart.js non disponible.
 */
export async function initDashboardCharts() {
  if (typeof window.Chart === 'undefined') {
    console.warn('[dashboard-charts] Chart.js non disponible.');
    return;
  }

  const [{ data: prospects }, { data: interactions }, { data: rappels }] =
    await Promise.all([
      fetchProspectsWithStats(),
      fetchRecentInteractions(200),
      fetchRappels(),
    ]);

  const p = prospects    ?? [];
  const i = interactions ?? [];
  const r = rappels      ?? [];

  renderProspectsChart(p);
  renderInteractionsChart(i);
  renderConversionChart(p);
  renderTeamActivity(p, i, r);
}

// ── Graphique 1 — Prospects par semaine ───────────────────

/**
 * Line chart : nouveaux prospects par semaine sur 8 semaines.
 * @param {Array} prospects
 */
function renderProspectsChart(prospects) {
  const canvas = document.getElementById('chart-prospects');
  if (!canvas) return;
  const { labels, counts } = groupByWeek(prospects, p => p.updated_at);
  new window.Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Prospects',
        data: counts,
        borderColor: '#2d5be3',
        backgroundColor: 'rgba(45,91,227,.08)',
        tension: 0.3, fill: true, pointRadius: 4,
      }],
    },
    options: baseOptions('Prospects / semaine'),
  });
}

// ── Graphique 2 — Interactions par semaine ────────────────

/**
 * Bar chart : interactions par semaine sur 8 semaines.
 * @param {Array} interactions
 */
function renderInteractionsChart(interactions) {
  const canvas = document.getElementById('chart-interactions');
  if (!canvas) return;
  const { labels, counts } = groupByWeek(interactions, i => i.created_at);
  new window.Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Interactions', data: counts,
        backgroundColor: 'rgba(45,91,227,.7)', borderRadius: 4,
      }],
    },
    options: baseOptions('Interactions / semaine'),
  });
}

// ── Graphique 3 — Répartition par statut ──────────────────

/**
 * Doughnut : répartition prospects par statut.
 * @param {Array} prospects
 */
function renderConversionChart(prospects) {
  const canvas = document.getElementById('chart-conversion');
  if (!canvas) return;
  const data   = STATUTS_PROSPECT.map(s => prospects.filter(p => p.statut === s.value).length);
  const labels = STATUTS_PROSPECT.map(s => s.label);
  const colors = ['rgba(251,191,36,.8)', 'rgba(16,185,129,.8)', 'rgba(239,68,68,.8)'];
  new window.Chart(canvas, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { padding: 12, font: { size: 12 } } },
        title:  { display: true, text: 'Répartition par statut', font: { size: 13 } },
      },
      cutout: '65%',
    },
  });
}

// ── Tableau activité équipe ───────────────────────────────

/**
 * Rend le tableau activité par commercial dans #team-section.
 * @param {Array} prospects
 * @param {Array} interactions
 * @param {Array} rappels
 */
function renderTeamActivity(prospects, interactions, rappels) {
  const section = document.getElementById('team-section');
  if (!section) return;
  const stats = buildTeamStats(prospects, interactions, rappels);
  if (!stats.length) { section.hidden = true; return; }
  section.innerHTML = buildTeamHTML(stats);
}

/**
 * Calcule les stats par commercial.
 * @param {Array} prospects @param {Array} interactions @param {Array} rappels
 * @returns {Array}
 */
function buildTeamStats(prospects, interactions, rappels) {
  const map    = new Map();
  const cutoff = new Date(Date.now() - 30 * 86400_000);
  const today  = new Date().toISOString().slice(0, 10);

  for (const p of prospects) {
    const nom = p.profiles?.nom;
    if (!nom) continue;
    if (!map.has(nom)) map.set(nom, { nom, nbProspects: 0, inter30: 0, rappelsFaits: 0, rappelsRetard: 0 });
    map.get(nom).nbProspects++;
  }
  for (const i of interactions) {
    const nom = i.profiles?.nom;
    if (nom && map.has(nom) && new Date(i.created_at) >= cutoff) map.get(nom).inter30++;
  }
  for (const r of rappels) {
    const nom = r.profiles?.nom;
    if (!nom || !map.has(nom)) continue;
    if (r.statut === 'fait' && new Date(r.date_rappel) >= cutoff) map.get(nom).rappelsFaits++;
    if (r.statut === 'planifie' && r.date_rappel < today) map.get(nom).rappelsRetard++;
  }

  return [...map.values()].sort((a, b) => b.inter30 - a.inter30);
}

/**
 * Construit le HTML du tableau équipe.
 * @param {Array} stats
 * @returns {string}
 */
function buildTeamHTML(stats) {
  const rows = stats.map(s => {
    const retardCell = s.rappelsRetard > 0
      ? `<span class="badge badge-danger">${s.rappelsRetard}</span>`
      : `<span class="badge badge-secondary">0</span>`;
    return `<tr>
      <td>${esc(s.nom)}</td>
      <td class="col-center">${s.nbProspects}</td>
      <td class="col-center">${s.inter30}</td>
      <td class="col-center">${s.rappelsFaits}</td>
      <td class="col-center">${retardCell}</td>
    </tr>`;
  }).join('');
  return `<div class="dash-section-header"><h2 class="dash-section-title">Activité équipe</h2></div>
    <div class="table-wrap"><table class="data-table">
      <thead><tr>
        <th>Commercial</th><th class="col-center">Prospects</th>
        <th class="col-center">Interactions 30j</th>
        <th class="col-center">Rappels faits 30j</th>
        <th class="col-center">Retards</th>
      </tr></thead><tbody>${rows}</tbody>
    </table></div>`;
}

// ── Utils ─────────────────────────────────────────────────

function groupByWeek(items, dateGetter) {
  const now = new Date();
  const labels = [], counts = [];
  for (let w = WEEKS - 1; w >= 0; w--) {
    const start = new Date(now);
    start.setDate(now.getDate() - w * 7 - 6);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    counts.push(items.filter(item => {
      const d = new Date(dateGetter(item));
      return d >= start && d <= end;
    }).length);
    labels.push(start.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }));
  }
  return { labels, counts };
}

function baseOptions(titleText) {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title:  { display: true, text: titleText, font: { size: 13 } },
    },
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
  };
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
