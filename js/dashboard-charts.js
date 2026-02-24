/* =======================================================
   dashboard-charts.js — Graphiques de tendance dashboard
   Dépendance : Chart.js via CDN window.Chart
   Export : renderCharts(container, prospects, interactions)
   ======================================================= */

import { STATUTS_PROSPECT } from './config.js';

const WEEKS = 8;

// ── Point d'entrée ────────────────────────────────────────

/**
 * Rend les 3 graphiques dans leurs conteneurs respectifs.
 * Fallback silencieux si Chart.js non chargé.
 * @param {Array} prospects
 * @param {Array} interactions
 */
export function renderCharts(prospects, interactions) {
  if (typeof window.Chart === 'undefined') {
    document.getElementById('charts-section')?.remove();
    return;
  }
  renderProspectsChart(prospects);
  renderInteractionsChart(interactions);
  renderConversionChart(prospects);
}

// ── Graphique 1 : Nouveaux prospects / semaine ────────────

/**
 * Line chart : nb de nouveaux prospects par semaine (8 semaines).
 * @param {Array} prospects
 */
function renderProspectsChart(prospects) {
  const canvas = document.getElementById('chart-prospects');
  if (!canvas) return;

  const { labels, counts } = groupByWeek(
    prospects,
    p => p.updated_at ?? p.created_at
  );

  new window.Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Nouveaux prospects',
        data: counts,
        borderColor: 'var(--color-primary)',
        backgroundColor: 'rgba(45,91,227,.08)',
        tension: 0.3,
        fill: true,
        pointRadius: 4,
      }],
    },
    options: chartOptions('Prospects / semaine'),
  });
}

// ── Graphique 2 : Interactions / semaine ──────────────────

/**
 * Bar chart : nb d'interactions par semaine (8 semaines).
 * @param {Array} interactions
 */
function renderInteractionsChart(interactions) {
  const canvas = document.getElementById('chart-interactions');
  if (!canvas) return;

  const { labels, counts } = groupByWeek(
    interactions,
    i => i.created_at
  );

  new window.Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Interactions',
        data: counts,
        backgroundColor: 'rgba(45,91,227,.7)',
        borderRadius: 4,
      }],
    },
    options: chartOptions('Interactions / semaine'),
  });
}

// ── Graphique 3 : Répartition par statut (doughnut) ───────

/**
 * Doughnut chart : répartition des prospects par statut.
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
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }],
    },
    options: {
      plugins: {
        legend: { position: 'bottom', labels: { padding: 12, font: { size: 12 } } },
        title: { display: true, text: 'Répartition par statut', font: { size: 13 } },
      },
      cutout: '65%',
    },
  });
}

// ── Utils ─────────────────────────────────────────────────

/**
 * Regroupe un tableau d'items par semaine sur les N dernières semaines.
 * @param {Array}    items
 * @param {Function} dateGetter - (item) => dateString
 * @returns {{ labels: string[], counts: number[] }}
 */
function groupByWeek(items, dateGetter) {
  const now    = new Date();
  const labels = [];
  const counts = [];

  for (let w = WEEKS - 1; w >= 0; w--) {
    const start = new Date(now);
    start.setDate(now.getDate() - w * 7 - 6);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    const count = items.filter(item => {
      const d = new Date(dateGetter(item));
      return d >= start && d <= end;
    }).length;

    labels.push(formatWeekLabel(start));
    counts.push(count);
  }

  return { labels, counts };
}

/**
 * Formate une date en label court "DD/MM".
 * @param {Date} date
 * @returns {string}
 */
function formatWeekLabel(date) {
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

/**
 * Options Chart.js communes.
 * @param {string} titleText
 * @returns {object}
 */
function chartOptions(titleText) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title:  { display: true, text: titleText, font: { size: 13 } },
    },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1 } },
    },
  };
}
