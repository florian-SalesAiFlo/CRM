/* =======================================================
   ui-components.js — Composants UI réutilisables
   Toutes les fonctions retournent une string HTML,
   sauf toast() qui agit directement sur le DOM.
   Panels/modals : voir ui-panels.js
   ======================================================= */

import { getStatut, getCanal, STATUTS_PROSPECT } from './config.js';

// ── Badge Select ──────────────────────────────────────────

/**
 * Génère un badge-select : badge coloré cliquable qui ouvre un dropdown custom.
 * Dispatche un CustomEvent 'badge-select-change' sur l'élément quand la valeur change.
 * @param {string} name            - data-name du champ (ex: 'statut')
 * @param {Array}  options         - [{value, label, badgeType}]
 * @param {string} selectedValue   - valeur initiale sélectionnée
 * @param {string} [extraClass]    - classe CSS additionnelle
 * @returns {string} HTML
 */
export function badgeSelect(name, options, selectedValue, extraClass = '') {
  const sel = options.find(o => o.value === selectedValue) ?? options[0];
  const optionsHTML = options.map(o =>
    `<button class="badge-select-option" data-value="${o.value}" data-badge-type="${o.badgeType ?? 'secondary'}">${o.label}</button>`
  ).join('');
  return `
    <div class="badge-select ${extraClass}" data-name="${name}" data-current="${sel.value}">
      <button class="badge-select-trigger badge badge-${sel.badgeType ?? 'secondary'}" type="button">
        ${sel.label} ▾
      </button>
      <div class="badge-select-dropdown">${optionsHTML}</div>
    </div>`.trim();
}

// ── Badge ─────────────────────────────────────────────────

/**
 * Génère un badge coloré pill.
 * @param {string} label
 * @param {'success'|'warning'|'danger'|'info'|'secondary'|'primary'|'outline'} type
 * @returns {string} HTML
 */
export function badge(label, type = 'secondary') {
  return `<span class="badge badge-${type}">${label}</span>`;
}

/**
 * Génère un badge depuis une valeur de statut prospect.
 * @param {string} value
 * @returns {string} HTML
 */
export function badgeStatut(value) {
  const statut = getStatut(value);
  return badge(statut.label, statut.badgeType);
}

// ── Select inline éditable ────────────────────────────────

/**
 * Génère un <select> inline avec highlight couleur selon valeur.
 * @param {string} name           - data-name du champ
 * @param {Array}  options        - [{value, label, hlClass?}]
 * @param {string} selectedValue
 * @param {string} [extraClass]
 * @returns {string} HTML
 */
export function selectInline(name, options, selectedValue, extraClass = '') {
  const selected = options.find(o => o.value === selectedValue) ?? options[0];
  const hlClass  = selected.hlClass ?? '';

  const opts = options.map(o => {
    const sel    = o.value === selectedValue ? 'selected' : '';
    const dataHl = o.hlClass ? `data-hl="${o.hlClass}"` : '';
    return `<option value="${o.value}" ${dataHl} ${sel}>${o.label}</option>`;
  }).join('');

  return `<select class="${hlClass} ${extraClass}" data-name="${name}" data-current="${selectedValue}">${opts}</select>`;
}

/**
 * Génère un select statut prospect avec auto-highlight.
 * @param {string} selectedValue
 * @returns {string} HTML
 */
export function selectStatut(selectedValue) {
  return selectInline('statut', STATUTS_PROSPECT, selectedValue);
}

// ── Card ──────────────────────────────────────────────────

/**
 * Génère une card avec header et body.
 * @param {string}  title
 * @param {string}  bodyHTML
 * @param {string}  [headerExtra] - HTML additionnel dans le header
 * @param {boolean} [flush]       - Pas de padding sur le body
 * @returns {string} HTML
 */
export function card(title, bodyHTML, headerExtra = '', flush = false) {
  const bodyClass = flush ? 'card-body-flush' : 'card-body';
  const header    = title || headerExtra
    ? `<div class="card-header"><span class="card-title">${title}</span><div class="card-header-actions">${headerExtra}</div></div>`
    : '';
  return `<div class="card">${header}<div class="${bodyClass}">${bodyHTML}</div></div>`;
}

// ── Toast ─────────────────────────────────────────────────

/**
 * Affiche une notification toast temporaire dans le DOM.
 * @param {string} message
 * @param {'success'|'error'|'info'} [type]
 * @param {number} [duration] - ms avant disparition
 */
export function toast(message, type = 'info', duration = 3000) {
  const container = getOrCreateToastContainer();
  const el        = document.createElement('div');
  el.className    = `toast toast-${type}`;
  el.textContent  = message;
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('toast-visible'));
  setTimeout(() => {
    el.classList.remove('toast-visible');
    el.addEventListener('transitionend', () => el.remove(), { once: true });
  }, duration);
}

/**
 * Crée ou retourne le conteneur des toasts.
 * @returns {HTMLElement}
 */
function getOrCreateToastContainer() {
  let c = document.getElementById('toast-container');
  if (!c) { c = document.createElement('div'); c.id = 'toast-container'; document.body.appendChild(c); }
  return c;
}

// ── Timeline item ─────────────────────────────────────────

/**
 * Génère un item de timeline d'interaction.
 * @param {object} p
 * @param {string} p.canal
 * @param {string} p.contenu
 * @param {string} p.auteur
 * @param {string} p.date         - date formatée
 * @param {string} [p.titre]      - override label canal
 * @param {string} [p.destinataire]
 * @returns {string} HTML
 */
export function timelineItem({ canal, contenu, auteur, date, titre, destinataire }) {
  const c    = getCanal(canal);
  const lbl  = titre ?? c.label;
  const meta = destinataire ? `${auteur} → ${destinataire}` : auteur;
  return `
    <div class="tl-item">
      <div class="tl-icon ${c.tlClass}">${c.icon}</div>
      <div class="tl-body">
        <div class="tl-header"><span class="tl-title">${lbl}</span><span class="tl-date">${date}</span></div>
        <div class="tl-comment">${contenu}</div>
        <div class="tl-meta">${meta}</div>
      </div>
    </div>`.trim();
}

// ── Empty state ───────────────────────────────────────────

/**
 * Génère un bloc état vide centré.
 * @param {string} message
 * @param {string} [icon]
 * @returns {string} HTML
 */
export function emptyState(message, icon = '📭') {
  return `<div class="empty-state"><div class="empty-state-icon">${icon}</div><p>${message}</p></div>`;
}

// ── Init globale ──────────────────────────────────────────

/**
 * Initialise les interactions globales des composants UI.
 * Appeler une fois au chargement de chaque page.
 */
export function initUIComponents() {
  document.addEventListener('click',  handleGlobalClick);
  document.addEventListener('change', handleSelectHighlight);
}

/**
 * Gère les clics globaux pour fermeture panels/modals et badge-selects.
 * Délègue à ui-panels.js via window.__uiPanels.
 * @param {MouseEvent} e
 */
function handleGlobalClick(e) {
  const { closePanels, closeModal } = window.__uiPanels ?? {};

  if (e.target.id === 'slide-overlay')        { closePanels?.(); return; }
  if (e.target.closest('[data-panel-close]')) { closePanels?.(); return; }

  const overlay = e.target.closest('.modal-overlay');
  if (overlay && e.target === overlay) { closeModal?.(overlay.dataset.modal); return; }

  const mc = e.target.closest('[data-modal-close]');
  if (mc) { closeModal?.(mc.dataset.modalClose); return; }

  // Badge-select : toggle ou fermeture
  const trigger = e.target.closest('.badge-select-trigger');
  const option  = e.target.closest('.badge-select-option');

  if (trigger) {
    const parent = trigger.closest('.badge-select');
    const isOpen = parent.classList.contains('open');
    closeAllBadgeSelects();
    if (!isOpen) parent.classList.add('open');
    return;
  }

  if (option) { handleBadgeSelectOption(option); return; }

  closeAllBadgeSelects();
}

/**
 * Ferme tous les badge-selects ouverts dans le document.
 */
function closeAllBadgeSelects() {
  document.querySelectorAll('.badge-select.open').forEach(el => el.classList.remove('open'));
}

/**
 * Applique la sélection d'une option badge-select.
 * Met à jour le trigger, data-current et dispatche un CustomEvent.
 * @param {HTMLElement} option - .badge-select-option cliqué
 */
function handleBadgeSelectOption(option) {
  const parent    = option.closest('.badge-select');
  const trigger   = parent.querySelector('.badge-select-trigger');
  const value     = option.dataset.value;
  const badgeType = option.dataset.badgeType ?? 'secondary';
  const label     = option.textContent.trim();

  parent.dataset.current = value;
  trigger.textContent    = `${label} ▾`;
  trigger.className      = `badge-select-trigger badge badge-${badgeType}`;
  parent.classList.remove('open');

  parent.dispatchEvent(new CustomEvent('badge-select-change', {
    bubbles: true,
    detail: { name: parent.dataset.name, value },
  }));
}

/**
 * Met à jour la classe highlight d'un select lorsque sa valeur change.
 * @param {Event} e
 */
function handleSelectHighlight(e) {
  const select = e.target;
  if (!(select instanceof HTMLSelectElement)) return;
  const hlClass = select.options[select.selectedIndex]?.dataset?.hl;
  if (!hlClass) return;
  select.classList.remove('hl-green', 'hl-orange', 'hl-red');
  select.classList.add(hlClass);
}
