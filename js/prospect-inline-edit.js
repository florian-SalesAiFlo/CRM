/* =======================================================
   prospect-inline-edit.js — Édition inline des champs texte
   sur la fiche prospect. Extrait de prospect-detail.js.
   Exports : editableField(), bindEditableFields()
   ======================================================= */

import { updateProspect } from './supabase-client.js';
import { toast }          from './ui-components.js';
import { lookupSiret, proposeSiretEnrichment } from './siret-lookup.js';

// ── HTML helper ───────────────────────────────────────────

/**
 * Génère un span éditable inline pour un champ texte.
 * @param {string}      name - nom du champ BDD
 * @param {string|null} val  - valeur actuelle
 * @param {string}      id   - UUID du prospect
 * @returns {string} HTML
 */
export function editableField(name, val, id) {
  const display = val ? esc(val) : '<span class="editable-empty">—</span>';
  return `<span class="editable-field" data-name="${name}" data-id="${id}">${display}</span>`;
}

// ── Binding ───────────────────────────────────────────────

/**
 * Attache un listener délégué sur le conteneur pour l'édition inline.
 * Clic sur .editable-field → input/textarea. Blur ou Entrée → sauvegarde.
 * @param {HTMLElement} container - ex: #info-grid
 */
export function bindEditableFields(container) {
  container.addEventListener('click', e => {
    const span = e.target.closest('.editable-field');
    if (!span || span.dataset.editing) return;
    activateInlineEdit(span);
  });
}

// ── Activation ────────────────────────────────────────────

/**
 * Remplace le span par un input ou textarea focalisé.
 * @param {HTMLElement} span - .editable-field cliqué
 */
function activateInlineEdit(span) {
  const { name, id } = span.dataset;
  const currentText  = span.querySelector('.editable-empty') ? '' : span.textContent.trim();
  const isTextarea   = name === 'commentaire';

  span.dataset.editing = '1';

  const input = document.createElement(isTextarea ? 'textarea' : 'input');
  input.className  = 'editable-input';
  input.value      = currentText;
  input.dataset.name = name;
  input.dataset.id   = id;
  if (!isTextarea) input.type = getInputType(name);
  if (isTextarea)  input.rows = 3;

  span.replaceWith(input);
  input.focus();
  input.select?.();

  input.addEventListener('blur',    () => commitInlineEdit(input, name, id));
  input.addEventListener('keydown', e => handleInlineKey(e, input, name, id, currentText));
}

/**
 * Retourne le type input approprié selon le nom du champ.
 * @param {string} name @returns {string}
 */
function getInputType(name) {
  switch (name) {
    case 'email':     return 'email';
    case 'telephone': return 'tel';
    case 'site_web':  return 'url';
    default:          return 'text';
  }
}

// ── Keyboard ──────────────────────────────────────────────

/**
 * Gère Entrée (commit) et Escape (annule) sur l'input inline.
 * @param {KeyboardEvent} e
 * @param {HTMLElement}   input
 * @param {string}        name
 * @param {string}        id
 * @param {string}        original - valeur avant édition
 */
function handleInlineKey(e, input, name, id, original) {
  if (e.key === 'Escape') { cancelInlineEdit(input, name, id, original); return; }
  if (e.key === 'Enter' && name !== 'commentaire') {
    e.preventDefault();
    commitInlineEdit(input, name, id);
  }
}

// ── Commit / Cancel ───────────────────────────────────────

/**
 * Sauvegarde la nouvelle valeur en Supabase et restaure un span.
 * @param {HTMLElement} input
 * @param {string}      name
 * @param {string}      id
 */
async function commitInlineEdit(input, name, id) {
  const value = input.value.trim() || null;
  const span  = buildEditableSpan(name, id, value);
  input.replaceWith(span);

  const { error } = await updateProspect(id, { [name]: value });
  if (error) { toast(`Erreur : ${error.message}`, 'error'); return; }
  toast('Mis à jour.', 'success');
  rebindGrid();

  if (name === 'siret' && value) {
    triggerSiretLookup(value, id);
  }
}

/**
 * Lance la recherche SIRET en background et propose l'enrichissement si trouvé.
 * @param {string} siret
 * @param {string} prospectId
 */
async function triggerSiretLookup(siret, prospectId) {
  const result = await lookupSiret(siret);
  if (!result) return;
  const refresh = async () => {
    const { initProspectDetail } = await import('./prospect-detail.js');
    initProspectDetail();
  };
  proposeSiretEnrichment(result, prospectId, refresh);
}

/**
 * Annule l'édition et remet la valeur d'origine.
 * @param {HTMLElement} input
 * @param {string}      name
 * @param {string}      id
 * @param {string}      original
 */
function cancelInlineEdit(input, name, id, original) {
  const span = buildEditableSpan(name, id, original || null);
  input.replaceWith(span);
  rebindGrid();
}

// ── Utils ─────────────────────────────────────────────────

/**
 * Construit un span .editable-field depuis ses propriétés.
 * @param {string}      name
 * @param {string}      id
 * @param {string|null} value
 * @returns {HTMLElement}
 */
function buildEditableSpan(name, id, value) {
  const span           = document.createElement('span');
  span.className       = 'editable-field';
  span.dataset.name    = name;
  span.dataset.id      = id;
  span.innerHTML       = value ? esc(value) : '<span class="editable-empty">—</span>';
  return span;
}

/** Re-bind les listeners sur le grid après remplacement du DOM. */
function rebindGrid() {
  const grid = document.getElementById('info-grid');
  if (grid) bindEditableFields(grid);
}

/** @param {string} str @returns {string} */
function esc(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
