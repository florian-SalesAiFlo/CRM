/* =======================================================
   contact-form.js — Formulaire contact (création + édition)
   Injecte et lie le formulaire dans #panel-contact-body.
   Export : initContactPanel(prospectId, onCreated, contact?)
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
function renderForm(contact = null) {
  const v = contact ?? {};
  const roleOpts = ROLES_EMPLOYE.map(r =>
    `<option value="${esc(r.value)}"${v.role_employe === r.value ? ' selected' : ''}>${esc(r.label)}</option>`
  ).join('');
  const btnLabel = contact ? 'Enregistrer' : 'Enregistrer';

  return `
    <form id="form-new-contact" novalidate class="pf-form">

      <div class="pf-field">
        <label class="pf-label" for="fc-nom">Nom <span aria-hidden="true">*</span></label>
        <input class="pf-input" id="fc-nom" name="nom" type="text"
               placeholder="Jean Dupont" required autofocus
               value="${esc(v.nom ?? '')}">
      </div>

      <div class="pf-field">
        <label class="pf-label" for="fc-role">Rôle</label>
        <select class="pf-input" id="fc-role" name="role_employe">
          <option value="">— Sélectionner —</option>
          ${roleOpts}
        </select>
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
          <span id="fc-submit-text">${btnLabel}</span>
        </button>
      </div>

    </form>

    <style>
      .pf-form   { display: flex; flex-direction: column; gap: var(--space-4); }
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
    </style>`;
}

// ── Mise à jour du titre du panel ─────────────────────────
function setPanelTitle(isEdit) {
  const h2 = document.querySelector('#panel-new-contact .slide-panel-header h2');
  if (h2) h2.textContent = isEdit ? 'Modifier le contact' : 'Nouveau contact';
}

// ── API publique ──────────────────────────────────────────

/**
 * Injecte le formulaire contact dans #panel-contact-body.
 * Supporte la création (sans `contact`) et l'édition (avec `contact`).
 * @param {string}   prospectId - UUID du prospect parent (requis en création)
 * @param {Function} onSaved    - Appelé après enregistrement réussi
 * @param {object|null} [contact] - Contact existant pour le mode édition
 */
export function initContactPanel(prospectId, onSaved, contact = null) {
  const body = document.getElementById('panel-contact-body');
  if (!body) return;

  const isEdit = !!contact;
  body.innerHTML = renderForm(contact);
  setPanelTitle(isEdit);

  const form      = document.getElementById('form-new-contact');
  const submitBtn = document.getElementById('fc-submit');
  const submitTxt = document.getElementById('fc-submit-text');

  document.getElementById('fc-cancel')?.addEventListener('click', () => closePanels());

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nom = form.querySelector('#fc-nom')?.value.trim();
    if (!nom) {
      form.querySelector('#fc-nom')?.focus();
      toast('Le nom du contact est obligatoire.', 'error');
      return;
    }

    submitBtn.disabled    = true;
    submitTxt.textContent = 'Enregistrement…';

    const payload = {
      nom,
      role_employe: form.querySelector('#fc-role')?.value       || null,
      email:        form.querySelector('#fc-email')?.value.trim()     || null,
      telephone:    form.querySelector('#fc-telephone')?.value.trim() || null,
    };

    const { error } = isEdit
      ? await updateContact(contact.id, payload)
      : await createContact(prospectId, payload);

    submitBtn.disabled    = false;
    submitTxt.textContent = 'Enregistrer';

    if (error) {
      toast(`Erreur : ${error.message ?? 'opération impossible.'}`, 'error');
      return;
    }

    toast(isEdit ? `${payload.nom} modifié.` : `${payload.nom} ajouté.`, 'success');
    closePanels();
    if (typeof onSaved === 'function') onSaved();
  });
}
