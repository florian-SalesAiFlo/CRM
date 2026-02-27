/* =======================================================
   rappel-render.js — Rendu liste rappels + actions inline
   Injecte le HTML dans #rappels-list et attache la délégation.
   Export : renderRappels(rappels), bindRappelActions(prospectId, refresh)
   ======================================================= */

import { updateRappel, deleteRappel } from './supabase-client.js';
import { toast }       from './ui-components.js';
import { openPanel }   from './ui-panels.js';
import { STATUTS_RAPPEL, OPTIONS_REPORT } from './config.js';

// ── État local ────────────────────────────────────────────
let _showAll = false;
let _busy    = false;

// ── Utils ─────────────────────────────────────────────────
function esc(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

// ── SVG icônes ────────────────────────────────────────────
const SVG = {
  check:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`,
  undo:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 7v6h6"/><path d="M3 13a9 9 0 0118 0 9 9 0 01-9 9 9 9 0 01-7.5-4"/></svg>`,
  edit:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  delete: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>`,
  report: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M17 2.1l4 4-4 4"/><path d="M3 12.2v-2a4 4 0 014-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 11.8v2a4 4 0 01-4 4H3"/></svg>`,
};

// ── Calcul date de report ─────────────────────────────────

function calcDateReport(option) {
  const d = new Date();
  switch (option) {
    case '1':     d.setDate(d.getDate() + 1);  break;
    case '3':     d.setDate(d.getDate() + 3);  break;
    case 'lundi': {
      const day = d.getDay();
      const toMonday = day === 0 ? 8 : 8 - day;
      d.setDate(d.getDate() + toMonday);
      break;
    }
    default: break;
  }
  return d.toISOString().slice(0, 10);
}

function fmtShort(iso) {
  return iso.slice(8, 10) + '/' + iso.slice(5, 7);
}

// ── Dropdown reporter ─────────────────────────────────────

function reportBtn(rappelId) {
  const opts = OPTIONS_REPORT.map(o =>
    `<button class="reporter-option" data-id="${rappelId}" data-option="${o.value}">${o.label}</button>`
  ).join('');
  return `<span class="reporter-wrap">
    <button class="row-action-btn rappel-report" data-id="${rappelId}" title="Reporter">${SVG.report}</button>
    <div class="reporter-dropdown">${opts}</div>
  </span>`;
}

// ── Rendu ─────────────────────────────────────────────────

export function renderRappels(rappels) {
  const list = document.getElementById('rappels-list');
  if (!list) return;

  if (!rappels.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔔</div><p>Aucun rappel</p></div>`;
    return;
  }

  const actifs    = rappels.filter(r => r.statut !== 'effectue');
  const effectues = rappels.filter(r => r.statut === 'effectue');
  const visible   = _showAll ? rappels : actifs;

  let html = '';

  if (!visible.length && !_showAll) {
    html = `<p class="rappel-empty-msg">Tous les rappels sont effectués.</p>`;
  } else {
    html = visible.map(r => buildRappelItem(r)).join('');
  }

  if (effectues.length > 0) {
    const icon = _showAll ? '▴' : '▾';
    const label = _showAll ? 'Masquer effectués' : `Voir effectués (${effectues.length})`;
    html += `<button class="rappels-toggle-done">${icon} ${label}</button>`;
  }

  list.innerHTML = html;
}

function buildRappelItem(r) {
  const st      = STATUTS_RAPPEL.find(s => s.value === r.statut);
  const date    = new Date(r.date_rappel).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' });
  const isDone  = r.statut === 'effectue';
  const encoded = esc(JSON.stringify(r));

  let actionsHtml = '';
  if (isDone) {
    actionsHtml = `
      <button class="rappel-action-btn rappel-undo" data-id="${esc(r.id)}" title="Remettre en planifié">↩ Annuler</button>
      <button class="rappel-action-btn rappel-action-delete rappel-delete"
        data-id="${esc(r.id)}" data-motif="${esc(r.motif ?? '')}" title="Supprimer">🗑 Supprimer</button>`;
  } else {
    actionsHtml = `
      <button class="rappel-action-btn rappel-action-done rappel-done" data-id="${esc(r.id)}" title="Marquer effectué">✓ Fait</button>
      ${reportBtn(esc(r.id))}
      <button class="rappel-action-btn rappel-action-edit rappel-edit"
        data-rappel='${encoded}' title="Modifier">✎ Modifier</button>
      <button class="rappel-action-btn rappel-action-delete rappel-delete"
        data-id="${esc(r.id)}" data-motif="${esc(r.motif ?? '')}" title="Supprimer">🗑</button>`;
  }

  return `<div class="rappel-card${isDone ? ' rappel-card--done' : ''}">
    <div class="rappel-card-top">
      <span class="rappel-card-date">${date}</span>
      ${st ? `<span class="badge badge-${st.badgeType}">${st.label}</span>` : ''}
    </div>
    <div class="rappel-card-motif">${esc(r.motif ?? '—')}</div>
    <div class="rappel-card-actions">${actionsHtml}</div>
  </div>`;
}

// ── Délégation ────────────────────────────────────────────

export function bindRappelActions(prospectId, refresh) {
  const list = document.getElementById('rappels-list');
  if (!list) return;

  list.addEventListener('click', e => {
    const reportTrigger = e.target.closest('.rappel-report');
    if (reportTrigger) {
      const wrap = reportTrigger.closest('.reporter-wrap');
      const isOpen = wrap.classList.contains('open');
      closeAllReporters();
      if (!isOpen) wrap.classList.add('open');
      e.stopPropagation();
    }
  });

  document.addEventListener('click', closeAllReporters);

  list.addEventListener('click', async (e) => {
    const toggleBtn = e.target.closest('.rappels-toggle-done');
    if (toggleBtn) {
      _showAll = !_showAll;
      refresh();
      return;
    }

    if (_busy) return;

    const reportOption = e.target.closest('.reporter-option');
    const doneBtn   = e.target.closest('.rappel-done');
    const undoBtn   = e.target.closest('.rappel-undo');
    const editBtn   = e.target.closest('.rappel-edit');
    const deleteBtn = e.target.closest('.rappel-delete');

    if (reportOption) {
      _busy = true;
      const { id, option } = reportOption.dataset;
      const newDate = calcDateReport(option);
      closeAllReporters();
      const { error } = await updateRappel(id, { date_rappel: newDate, statut: 'reporte' });
      _busy = false;
      if (error) { toast(`Erreur : ${error.message}`, 'error'); return; }
      toast(`Reporté au ${fmtShort(newDate)}.`, 'success');
      refresh();
      return;
    }

    if (doneBtn) {
      _busy = true;
      const { id } = doneBtn.dataset;
      const { error } = await updateRappel(id, { statut: 'effectue' });
      _busy = false;
      if (error) { toast(`Erreur : ${error.message}`, 'error'); return; }
      toast('Rappel effectué.', 'success');
      refresh();
      return;
    }

    if (undoBtn) {
      _busy = true;
      const { id } = undoBtn.dataset;
      const { error } = await updateRappel(id, { statut: 'planifie' });
      _busy = false;
      if (error) { toast(`Erreur : ${error.message}`, 'error'); return; }
      toast('Remis en planifié.', 'success');
      refresh();
      return;
    }

    if (editBtn) {
      const rappel = JSON.parse(editBtn.dataset.rappel);
      const { initRappelPanel } = await import('./rappel-form.js');
      initRappelPanel(prospectId, refresh, rappel);
      openPanel('panel-new-rappel');
      return;
    }

    if (deleteBtn) {
      const { id, motif } = deleteBtn.dataset;
      if (!window.confirm(`Supprimer le rappel "${motif}" ?`)) return;
      _busy = true;
      const { error } = await deleteRappel(id);
      _busy = false;
      if (error) { toast(`Erreur : ${error.message}`, 'error'); return; }
      toast('Rappel supprimé.', 'success');
      refresh();
    }
  });
}

function closeAllReporters() {
  document.querySelectorAll('.reporter-wrap.open').forEach(w => w.classList.remove('open'));
}
