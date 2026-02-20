/* =======================================================
   ui-panels.js — Slide panels & Modals
   Gestion des overlays, ouverture/fermeture, et helpers
   pour les composants de type "layer" (panel, modal).
   ======================================================= */

// ── Slide panel ───────────────────────────────────────────

/**
 * Génère un slide-over panel (à insérer dans le DOM).
 * @param {string} id
 * @param {string} title
 * @param {string} bodyHTML
 * @returns {string} HTML
 */
export function slidePanel(id, title, bodyHTML) {
  return `
    <div class="slide-panel" id="${id}" role="dialog" aria-modal="true" aria-labelledby="${id}-title">
      <div class="slide-panel-header">
        <h2 id="${id}-title">${title}</h2>
        <button class="slide-close btn btn-ghost" data-panel-close="${id}" aria-label="Fermer">✕</button>
      </div>
      <div class="slide-panel-body">${bodyHTML}</div>
    </div>
  `.trim();
}

/**
 * Ouvre un slide panel par son ID.
 * @param {string} id
 */
export function openPanel(id) {
  const overlay = document.getElementById('slide-overlay');
  const panel   = document.getElementById(id);
  if (!overlay || !panel) return;
  overlay.classList.add('open');
  panel.classList.add('open');
}

/**
 * Ferme tous les slide panels ouverts.
 */
export function closePanels() {
  const overlay = document.getElementById('slide-overlay');
  if (overlay) overlay.classList.remove('open');
  document.querySelectorAll('.slide-panel.open')
    .forEach(p => p.classList.remove('open'));
}

// ── Modal ─────────────────────────────────────────────────

/**
 * Génère le HTML d'une modal (à insérer dans le DOM).
 * @param {string} id
 * @param {string} title
 * @param {string} bodyHTML
 * @param {string} [footerHTML]
 * @returns {string} HTML
 */
export function modal(id, title, bodyHTML, footerHTML = '') {
  const footer = footerHTML
    ? `<div class="modal-footer">${footerHTML}</div>`
    : '';

  return `
    <div class="modal-overlay" id="${id}-overlay" data-modal="${id}">
      <div class="modal" id="${id}" role="dialog" aria-modal="true" aria-labelledby="${id}-title">
        <div class="modal-header">
          <h2 class="modal-title" id="${id}-title">${title}</h2>
          <button class="modal-close btn btn-ghost" data-modal-close="${id}" aria-label="Fermer">✕</button>
        </div>
        <div class="modal-body">${bodyHTML}</div>
        ${footer}
      </div>
    </div>
  `.trim();
}

/**
 * Ferme une modal par son ID.
 * @param {string} id
 */
export function closeModal(id) {
  const overlay = document.getElementById(`${id}-overlay`);
  if (overlay) overlay.classList.remove('open');
}
