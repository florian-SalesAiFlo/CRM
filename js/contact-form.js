/* =======================================================
   contact-form.js — Formulaire contact (création + édition)
   Injecte et lie le formulaire dans #panel-contact-body.
   Export : initContactPanel(prospectId, onSaved, contact?)
   ======================================================= */

import { createContact, updateContact } from './supabase-client.js';
import { toast }         from './ui-components.js';
import { closePanels }   from './ui-panels.js';
import { ROLES_EMPLOYE } from './config.js';

// ── Utils ─────────────────────────────────────────────────
function esc(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

// ── HTML formulaire ───────────────────────────────────────

/**
 * Génère le HTML du formulaire contact (création ou édition).
 * @param {object|null} contact - contact existant en édition, null en création
 * @returns {string} HTML
 */
function renderForm(contact = null) {
  const v       = contact ?? {};
  const isAutre = v.role_employe === 'autre';

  const roleOpts = ROLES_EMPLOYE.map(r =>
    `<option value="${esc(r.value)}"${v.role_employe === r.value ? ' selected' : ''}>${esc(r.label)}</option>`
  ).join('');

  return `
    <form id="form-new-contact" novalidate class="pf-form">

      <div class="pf-row">
        <div class="pf-field">
          <label class="pf-label" for="fc-prenom">Prénom</label>
          <input class="pf-input" id="fc-prenom" name="prenom" type="text"
                 placeholder="Jean" value="${esc(v.prenom ?? '')}">
        </div>
        <div class="pf-field">
          <label class="pf-label" for="fc-nom">Nom <span aria-hidden="true">*</span></label>
          <input class="pf-input" id="fc-nom" name="nom" type="text"
                 placeholder="Dupont" required autofocus value="${esc(v.nom ?? '')}">
        </div>
      </div>

      <div class="pf-field">
        <label class="pf-label" for="fc-role">Rôle</label>
        <select class="pf-input" id="fc-role" name="role_employe">
          <option value="">— Sélectionner —</option>
          ${roleOpts}
        </select>
      </div>

      <div class="pf-field pf-field-role-custom" id="fc-role-custom-wrap"
           style="display:${isAutre ? 'flex' : 'none'}">
        <label class="pf-label" for="fc-role-custom">Préciser le rôle</label>
        <input class="pf-input" id="fc-role-custom" name="role_custom" type="text"
               placeholder="Ex : Chargé de projet, Associé fondateur…"
               value="${esc(v.role_custom ?? '')}">
      </div>

      <div class="pf-field">
        <label class="pf-label" for="fc-email">Email</label>
        <input class="pf-input" id="fc-email" name="email" type="email"
               placeholder="jean.dupont@societe.fr"
               value="${esc(v.email ?? '')}">
      </div>

      <div class="pf-field">
        <label class="pf-label" for="fc-telephone">Téléphone</label>
        <input class="pf-input" id="fc-telephone" name="telephone" type="tel"
               placeholder="06 12 34 56 78"
               value="${esc(v.telephone ?? '')}">
      </div>

      <div class="pf-actions">
        <button type="button" class="btn btn-ghost" id="fc-cancel">Annuler</button>
        <button type="submit" class="btn btn-primary" id="fc-submit">
          <span id="fc-submit-text">Enregistrer</span>
        </button>
      </div>

    </form>

    <style>
      .pf-form   { display: flex; flex-direction: column; gap: var(--space-4); }
      .pf-row    { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
      .pf-field  { display: flex; flex-direction: column; gap: var(--space-2); }
      .pf-label  { font-size: var(--text-sm); font-weight: 500; color: var(--color-text-secondary); }
      .pf-input  {
        font-family: var(--font-sans); font-size: var(--text-base);
        color: var(--color-text); background: var(--color-surface);
        border: 1px solid var(--color-border-strong); border-radius: var(--radius-sm);
        padding: var(--space-3) var(--space-4); width: 100%; box-sizing: border-box;
        transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
      }
      .pf-input:focus { outline: none; border-color: var(--color-primary); box-shadow: var(--shadow-focus); }
      .pf-actions {
        display: flex; gap: var(--space-3); justify-content: flex-end;
        padding-top: var(--space-4); border-top: 1px solid var(--color-border);
        margin-top: var(--space-2);
      }
      .pf-field-role-custom { animation: slide-in 0.15s ease; }
      @keyframes slide-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
    </style>`;
}

// ── Logique rôle custom ───────────────────────────────────

/**
 * Attache le listener sur le select rôle pour afficher/masquer le champ custom.
 */
function bindRoleCustomToggle() {
  const roleSelect = document.getElementById('fc-role');
  const wrap       = document.getElementById('fc-role-custom-wrap');
  if (!roleSelect || !wrap) return;

  roleSelect.addEventListener('change', () => {
    const show = roleSelect.value === 'autre';
    wrap.style.display = show ? 'flex' : 'none';
    if (show) document.getElementById('fc-role-custom')?.focus();
    else document.getElementById('fc-role-custom').value = '';
  });
}

// ── Titre panel ───────────────────────────────────────────

/**
 * Met à jour le titre du slide panel selon le mode.
 * @param {boolean} isEdit
 */
function setPanelTitle(isEdit) {
  const h2 = document.querySelector('#panel-new-contact .slide-panel-header h2');
  if (h2) h2.textContent = isEdit ? 'Modifier le contact' : 'Nouveau contact';
}

// ── Construction payload ──────────────────────────────────

/**
 * Construit le payload à envoyer à Supabase depuis le formulaire.
 * @param {HTMLFormElement} form
 * @returns {object}
 */
function buildPayload(form) {
  const roleValue = form.querySelector('#fc-role')?.value || null;
  const isAutre   = roleValue === 'autre';

  return {
    prenom:       form.querySelector('#fc-prenom')?.value.trim()      || null,
    nom:          form.querySelector('#fc-nom')?.value.trim()          || null,
    role_employe: roleValue,
    role_custom:  isAutre ? (form.querySelector('#fc-role-custom')?.value.trim() || null) : null,
    email:        form.querySelector('#fc-email')?.value.trim()        || null,
    telephone:    form.querySelector('#fc-telephone')?.value.trim()    || null,
  };
}

// ── API publique ──────────────────────────────────────────

/**
 * Injecte le formulaire contact dans #panel-contact-body.
 * Supporte la création (sans `contact`) et l'édition (avec `contact`).
 * @param {string}      prospectId - UUID du prospect parent
 * @param {Function}    onSaved    - Callback après enregistrement réussi
 * @param {object|null} [contact]  - Contact existant pour l'édition
 */
export function initContactPanel(prospectId, onSaved, contact = null) {
  const body = document.getElementById('panel-contact-body');
  if (!body) return;

  const isEdit = !!contact;
  body.innerHTML = renderForm(contact);
  setPanelTitle(isEdit);
  bindRoleCustomToggle();

  const form      = document.getElementById('form-new-contact');
  const submitBtn = document.getElementById('fc-submit');
  const submitTxt = document.getElementById('fc-submit-text');

  document.getElementById('fc-cancel')?.addEventListener('click', () => closePanels());

  form?.addEventListener('submit', e => handleSubmit(e, {
    form, submitBtn, submitTxt, isEdit, contact, prospectId, onSaved,
  }));
}

// ── Soumission ────────────────────────────────────────────

/**
 * Gère la soumission du formulaire.
 * @param {SubmitEvent} e
 * @param {object} ctx - contexte (form, boutons, mode, ids…)
 */
async function handleSubmit(e, { form, submitBtn, submitTxt, isEdit, contact, prospectId, onSaved }) {
  e.preventDefault();

  const payload = buildPayload(form);
  if (!payload.nom) {
    form.querySelector('#fc-nom')?.focus();
    toast('Le nom du contact est obligatoire.', 'error');
    return;
  }

  submitBtn.disabled    = true;
  submitTxt.textContent = 'Enregistrement…';

  const { error } = isEdit
    ? await updateContact(contact.id, payload)
    : await createContact(prospectId, payload);

  submitBtn.disabled    = false;
  submitTxt.textContent = 'Enregistrer';

  if (error) {
    toast(`Erreur : ${error.message ?? 'opération impossible.'}`, 'error');
    return;
  }

  const label = [payload.prenom, payload.nom].filter(Boolean).join(' ');
  toast(isEdit ? `${label} modifié.` : `${label} ajouté.`, 'success');
  closePanels();
  if (typeof onSaved === 'function') onSaved();
}
