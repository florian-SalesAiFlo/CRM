/* =======================================================
   interaction-form.js — Formulaire création interaction
   Injecte et lie le formulaire dans #panel-interaction-body.
   Export : initInteractionPanel(prospectId, onCreated)
   ======================================================= */

import { createInteraction }   from './supabase-client.js';
import { toast }               from './ui-components.js';
import { closePanels }         from './ui-panels.js';
import { CANAUX_INTERACTION }  from './config.js';

// ── Utils ─────────────────────────────────────────────────

function esc(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

// ── HTML formulaire ───────────────────────────────────────

function renderForm() {
  const canalOpts = CANAUX_INTERACTION.map(c =>
    `<option value="${esc(c.value)}">${esc(c.label)}</option>`
  ).join('');

  return `
    <form id="form-new-interaction" novalidate class="pf-form">

      <div class="pf-field">
        <label class="pf-label" for="fi-canal">Canal <span aria-hidden="true">*</span></label>
        <select class="pf-input" id="fi-canal" name="canal" required autofocus>
          <option value="">— Sélectionner —</option>
          ${canalOpts}
        </select>
      </div>

      <div class="pf-field">
        <label class="pf-label" for="fi-contenu">Contenu <span aria-hidden="true">*</span></label>
        <textarea class="pf-input pf-textarea" id="fi-contenu" name="contenu"
                  placeholder="Résumé de l'échange…" rows="5" required></textarea>
      </div>

      <div class="pf-field">
        <label class="pf-label" for="fi-destinataire">Destinataire</label>
        <input class="pf-input" id="fi-destinataire" name="destinataire" type="text"
               placeholder="Nom du contact concerné (optionnel)">
      </div>

      <div class="pf-actions">
        <button type="button" class="btn btn-ghost" id="fi-cancel">Annuler</button>
        <button type="submit" class="btn btn-primary" id="fi-submit">
          <span id="fi-submit-text">Enregistrer</span>
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
      .pf-textarea { resize: vertical; min-height: 100px; }
      .pf-actions {
        display: flex; gap: var(--space-3); justify-content: flex-end;
        padding-top: var(--space-4); border-top: 1px solid var(--color-border);
        margin-top: var(--space-2);
      }
    </style>`;
}

// ── API publique ──────────────────────────────────────────

/**
 * Injecte le formulaire interaction dans #panel-interaction-body et attache les listeners.
 * @param {string} prospectId - UUID du prospect parent
 * @param {Function} onCreated - Appelé après création réussie (ex: rafraîchir la timeline)
 */
export function initInteractionPanel(prospectId, onCreated) {
  const body = document.getElementById('panel-interaction-body');
  if (!body) return;

  body.innerHTML = renderForm();

  const form      = document.getElementById('form-new-interaction');
  const submitBtn = document.getElementById('fi-submit');
  const submitTxt = document.getElementById('fi-submit-text');

  document.getElementById('fi-cancel')?.addEventListener('click', () => closePanels());

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const canal   = form.querySelector('#fi-canal')?.value;
    const contenu = form.querySelector('#fi-contenu')?.value.trim();

    if (!canal) {
      form.querySelector('#fi-canal')?.focus();
      toast('Le canal est obligatoire.', 'error');
      return;
    }
    if (!contenu) {
      form.querySelector('#fi-contenu')?.focus();
      toast('Le contenu est obligatoire.', 'error');
      return;
    }

    submitBtn.disabled    = true;
    submitTxt.textContent = 'Enregistrement…';

    const payload = {
      canal,
      contenu,
      destinataire: form.querySelector('#fi-destinataire')?.value.trim() || null,
    };

    const { error } = await createInteraction(prospectId, payload);

    submitBtn.disabled    = false;
    submitTxt.textContent = 'Enregistrer';

    if (error) {
      toast(`Erreur : ${error.message ?? 'création impossible.'}`, 'error');
      return;
    }

    toast('Interaction enregistrée.', 'success');
    closePanels();
    if (typeof onCreated === 'function') onCreated();
  });
}
