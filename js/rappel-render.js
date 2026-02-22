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
    return `<div class="rappel-item${isFait ? ' rappel-fait' : ''}">
      <div class="rappel-info">
        <div class="rappel-date">${date}</div>
        <div class="rappel-motif">${esc(r.motif ?? '—')}</div>
      </div>
      <div class="rappel-actions">
        ${!isFait ? `<button class="btn btn-sm btn-ghost rappel-done" data-id="${esc(r.id)}"
          title="Marquer comme fait" aria-label="Marquer comme fait">✅</button>` : ''}
        <button class="btn btn-sm btn-ghost rappel-edit"
          data-rappel='${encoded}'
          title="Modifier" aria-label="Modifier le rappel">✏️</button>
        <button class="btn btn-sm btn-ghost rappel-delete"
          data-id="${esc(r.id)}" data-motif="${esc(r.motif ?? '')}"
          title="Supprimer" aria-label="Supprimer le rappel">🗑️</button>
      </div>
      ${st ? `<span class="badge badge-${st.badgeType} rappel-badge">${st.label}</span>` : ''}
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
