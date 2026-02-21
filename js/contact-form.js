/* =======================================================
   contact-form.js — Formulaire création contact
   Injecte et lie le formulaire dans #panel-contact-body.
   Export : initContactPanel(prospectId, onCreated)
   ======================================================= */

import { createContact }  from './supabase-client.js';
import { toast }          from './ui-components.js';
import { closePanels }    from './ui-panels.js';
import { ROLES_EMPLOYE }  from './config.js';

// ── Utils ─────────────────────────────────────────────────

function esc(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

// ── HTML formulaire ───────────────────────────────────────

function renderForm() {
  const roleOpts = ROLES_EMPLOYE.map(r =>
    `<option value="${esc(r.value)}">${esc(r.label)}</option>`
  ).join('');

  return `
    <form id="form-new-contact" novalidate class="pf-form">

      <div class="pf-field">
        <label class="pf-label" for="fc-nom">Nom <span aria-hidden="true">*</span></label>
        <input class="pf-input" id="fc-nom" name="nom" type="text"
               placeholder="Jean Dupont" required autofocus>
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
               placeholder="jean.dupont@societe.fr">
      </div>

      <div class="pf-field">
        <label class="pf-label" for="fc-telephone">Téléphone</label>
        <input class="pf-input" id="fc-telephone" name="telephone" type="tel"
               placeholder="06 12 34 56 78">
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
      .pf-field  { display: flex; flex-direction: column; gap: var(--space-2); }
      .pf-label  {
        font-size: var(--text-sm); font-weight: 500;
        color: var(--color-text-secondary);
      }
      .pf-input  {
        font-family: var(--font-sans); font-size: var(--text-base);
        color: var(--color-text); background: var(--color-surface);
        border: 1px solid var(--color-border-strong); border-radius: var(--radius-sm);
        padding: var(--space-3) var(--space-4); width: 100%; box-sizing: border-box;
        transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
      }
      .pf-input:focus {
        outline: none; border-color: var(--color-primary);
        box-shadow: var(--shadow-focus);
      }
      .pf-actions {
        display: flex; gap: var(--space-3); justify-content: flex-end;
        padding-top: var(--space-4); border-top: 1px solid var(--color-border);
        margin-top: var(--space-2);
      }
    </style>`;
}

// ── API publique ──────────────────────────────────────────

/**
 * Injecte le formulaire contact dans #panel-contact-body et attache les listeners.
 * @param {string} prospectId - UUID du prospect parent
 * @param {Function} onCreated - Appelé après création réussie (ex: rafraîchir les contacts)
 */
export function initContactPanel(prospectId, onCreated) {
  const body = document.getElementById('panel-contact-body');
  if (!body) return;

  body.innerHTML = renderForm();

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
      role_employe: form.querySelector('#fc-role')?.value      || null,
      email:        form.querySelector('#fc-email')?.value.trim()    || null,
      telephone:    form.querySelector('#fc-telephone')?.value.trim()|| null,
    };

    const { error } = await createContact(prospectId, payload);

    submitBtn.disabled    = false;
    submitTxt.textContent = 'Enregistrer';

    if (error) {
      toast(`Erreur : ${error.message ?? 'création impossible.'}`, 'error');
      return;
    }

    toast(`${payload.nom} ajouté.`, 'success');
    closePanels();
    if (typeof onCreated === 'function') onCreated();
  });
}
