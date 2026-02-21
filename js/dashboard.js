/* =======================================================
   dashboard.js — Dashboard CRM M2BPO
   KPIs : total prospects, définis, fermés, rappels du jour.
   Tableau : 10 dernières interactions globales.
   ======================================================= */

import { fetchProspectsWithStats, fetchRappelsDuJour, fetchRecentInteractions }
  from './supabase-client.js';
import { toast }   from './ui-components.js';
import { getCanal } from './config.js';

// ── Init ──────────────────────────────────────────────────

export async function initDashboard() {
  renderDate();
  renderSkeletons();

  const [
    { data: prospects, error: errP },
    { data: rappels,   error: errR },
    { data: activites, error: errA },
  ] = await Promise.all([
    fetchProspectsWithStats(),
    fetchRappelsDuJour(),
    fetchRecentInteractions(10),
  ]);

  if (errP) toast('Erreur chargement prospects.', 'error');
  if (errR) toast('Erreur chargement rappels.', 'error');
  if (errA) toast('Erreur chargement activités.', 'error');

  renderKPIs(prospects ?? [], rappels ?? []);
  renderActivites(activites ?? []);
}

// ── Date courante ─────────────────────────────────────────

function renderDate() {
  const el = document.getElementById('dash-date');
  if (!el) return;
  el.textContent = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

// ── Skeletons pendant le chargement ──────────────────────

function renderSkeletons() {
  ['kpi-total-val', 'kpi-defini-val', 'kpi-ferme-val', 'kpi-rappels-val'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '<div class="skel skel-text" style="width:36px;height:28px"></div>';
  });

  const tbody = document.getElementById('activites-tbody');
  if (tbody) {
    tbody.innerHTML = Array(5).fill(0).map(() => `
      <tr>
        <td><div class="skel skel-text" style="width:70px"></div></td>
        <td><div class="skel skel-text" style="width:110px"></div></td>
        <td><div class="skel skel-text" style="width:60px"></div></td>
        <td><div class="skel skel-text" style="width:200px"></div></td>
        <td><div class="skel skel-text" style="width:80px"></div></td>
      </tr>`).join('');
  }
}

// ── KPIs ──────────────────────────────────────────────────

function renderKPIs(prospects, rappels) {
  const total  = prospects.length;
  const defini = prospects.filter(p => p.statut === 'defini').length;
  const ferme  = prospects.filter(p => p.statut === 'ferme').length;
  const nbRappels = rappels.length;

  setKPI('kpi-total-val',    total);
  setKPI('kpi-defini-val',   defini);
  setKPI('kpi-ferme-val',    ferme);
  setKPI('kpi-rappels-val',  nbRappels);
}

function setKPI(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ── Tableau activités ─────────────────────────────────────

function renderActivites(interactions) {
  const tbody = document.getElementById('activites-tbody');
  if (!tbody) return;

  if (!interactions.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">
          <p>Aucune activité récente</p>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = interactions.map(i => {
    const date     = formatDate(i.created_at);
    const prospect = i.prospects;
    const canal    = getCanal(i.canal);
    const auteur   = i.profiles?.nom ?? '—';
    const contenu  = truncate(i.contenu ?? '', 80);

    const prospectCell = prospect
      ? `<a href="#/prospect/${esc(prospect.id)}">${esc(prospect.nom)}</a>`
      : '—';

    return `
      <tr>
        <td style="white-space:nowrap;color:var(--color-text-secondary)">${date}</td>
        <td class="td-prospect">${prospectCell}</td>
        <td><span class="badge badge-secondary">${esc(canal.label)}</span></td>
        <td class="td-truncate" title="${esc(i.contenu ?? '')}">${esc(contenu)}</td>
        <td style="color:var(--color-text-secondary)">${esc(auteur)}</td>
      </tr>`;
  }).join('');
}

// ── Utils ─────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}
