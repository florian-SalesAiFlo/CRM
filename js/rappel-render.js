/* =======================================================
   rappel-render.js — Rendu liste rappels + actions inline
   Injecte le HTML dans #rappels-list et attache la délégation.
   Export : renderRappels(rappels), bindRappelActions(prospectId, refresh)
   ======================================================= */

import { updateRappel, deleteRappel } from './supabase-client.js';
import { toast }       from './ui-components.js';
import { openPanel }   from './ui-panels.js';
import { STATUTS_RAPPEL } from './config.js';

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
  edit:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  delete: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>`,
};

// ── Rendu ─────────────────────────────────────────────────

/**
 * Injecte le HTML de la liste des rappels dans #rappels-list.
 * @param {Array} rappels
 */
export function renderRappels(rappels) {
  const list = document.getElementById('rappels-list');
  if (!list) return;
  if (!rappels.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔔</div><p>Aucun rappel</p></div>`;
    return;
  }
  list.innerHTML = rappels.map(r => {
    const st      = STATUTS_RAPPEL.find(s => s.value === r.statut);
    const date    = new Date(r.date_rappel).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' });
    const isFait  = r.statut === 'fait';
    const encoded = esc(JSON.stringify(r));
    const doneBtn = !isFait
      ? `<button class="row-action-btn row-action-done rappel-done" data-id="${esc(r.id)}" title="Marquer comme fait">${SVG.check}</button>`
      : '';
    return `<div class="rappel-item${isFait ? ' rappel-fait' : ''}">
      <div class="rappel-date">${date}</div>
      <div class="rappel-motif">${esc(r.motif ?? '—')}</div>
      ${st ? `<span class="badge badge-${st.badgeType}">${st.label}</span>` : '<span></span>'}
      <span class="row-actions">
        ${doneBtn}
        <button class="row-action-btn row-action-edit rappel-edit"
          data-rappel='${encoded}' title="Modifier">${SVG.edit}</button>
        <button class="row-action-btn row-action-delete rappel-delete"
          data-id="${esc(r.id)}" data-motif="${esc(r.motif ?? '')}" title="Supprimer">${SVG.delete}</button>
      </span>
    </div>`;
  }).join('');
}

// ── Délégation ────────────────────────────────────────────

/**
 * Attache la délégation d'événements sur #rappels-list.
 * @param {string}   prospectId
 * @param {Function} refresh - Callback de rechargement de la fiche
 */
export function bindRappelActions(prospectId, refresh) {
  document.getElementById('rappels-list')?.addEventListener('click', async (e) => {
    const doneBtn   = e.target.closest('.rappel-done');
    const editBtn   = e.target.closest('.rappel-edit');
    const deleteBtn = e.target.closest('.rappel-delete');

    if (doneBtn) {
      const { id } = doneBtn.dataset;
      const { error } = await updateRappel(id, { statut: 'fait' });
      if (error) { toast(`Erreur : ${error.message}`, 'error'); return; }
      toast('Rappel marqué comme fait.', 'success');
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
      if (!window.confirm(`Supprimer le rappel "${motif}" ? Cette action est irréversible.`)) return;
      const { error } = await deleteRappel(id);
      if (error) { toast(`Erreur : ${error.message}`, 'error'); return; }
      toast('Rappel supprimé.', 'success');
      refresh();
    }
  });
}
