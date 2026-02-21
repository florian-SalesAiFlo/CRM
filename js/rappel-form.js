/* =======================================================
   rappel-form.js — Formulaire création rappel
   Injecte et lie le formulaire dans #panel-rappel-body.
   Export : initRappelPanel(prospectId, onCreated)
   ======================================================= */

import { createRappel }  from './supabase-client.js';
import { toast }         from './ui-components.js';
import { closePanels }   from './ui-panels.js';

// ── Utils ─────────────────────────────────────────────────

/** Date ISO YYYY-MM-DD du jour + n jours */
function dateIn(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ── HTML formulaire ───────────────────────────────────────

function renderForm() {
  return `
    <form id="form-new-rappel" novalidate class="pf-form">

      <div class="pf-field">
        <label class="pf-label" for="fr-date">Date du rappel <span aria-hidden="true">*</span></label>
        <input class="pf-input" id="fr-date" name="date_rappel" type="date"
               value="${dateIn(1)}" required autofocus>
      </div>

      <div class="pf-field">
        <label class="pf-label" for="fr-motif">Motif <span aria-hidden="true">*</span></label>
        <input class="pf-input" id="fr-motif" name="motif" type="text"
               placeholder="Suivi candidature, point trimestriel…" required>
      </div>

      <div class="pf-field">
        <label class="pf-label" for="fr-commentaire">Commentaire</label>
        <textarea class="pf-input pf-textarea" id="fr-commentaire" name="commentaire"
                  placeholder="Informations complémentaires…" rows="3"></textarea>
      </div>

      <div class="pf-actions">
        <button type="button" class="btn btn-ghost" id="fr-cancel">Annuler</button>
        <button type="submit" class="btn btn-primary" id="fr-submit">
          <span id="fr-submit-text">Enregistrer</span>
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
      .pf-textarea { resize: vertical; min-height: 72px; }
      .pf-actions {
        display: flex; gap: var(--space-3); justify-content: flex-end;
        padding-top: var(--space-4); border-top: 1px solid var(--color-border);
        margin-top: var(--space-2);
      }
    </style>`;
}

// ── API publique ──────────────────────────────────────────

/**
 * Injecte le formulaire rappel dans #panel-rappel-body et attache les listeners.
 * @param {string} prospectId - UUID du prospect parent
 * @param {Function} onCreated - Appelé après création réussie (ex: rafraîchir la liste rappels)
 */
export function initRappelPanel(prospectId, onCreated) {
  const body = document.getElementById('panel-rappel-body');
  if (!body) return;

  body.innerHTML = renderForm();

  const form      = document.getElementById('form-new-rappel');
  const submitBtn = document.getElementById('fr-submit');
  const submitTxt = document.getElementById('fr-submit-text');

  document.getElementById('fr-cancel')?.addEventListener('click', () => closePanels());

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const date_rappel = form.querySelector('#fr-date')?.value;
    const motif       = form.querySelector('#fr-motif')?.value.trim();

    if (!date_rappel) {
      form.querySelector('#fr-date')?.focus();
      toast('La date du rappel est obligatoire.', 'error');
      return;
    }
    if (!motif) {
      form.querySelector('#fr-motif')?.focus();
      toast('Le motif est obligatoire.', 'error');
      return;
    }

    submitBtn.disabled    = true;
    submitTxt.textContent = 'Enregistrement…';

    const payload = {
      date_rappel,
      motif,
      commentaire: form.querySelector('#fr-commentaire')?.value.trim() || null,
    };

    const { error } = await createRappel(prospectId, payload);

    submitBtn.disabled    = false;
    submitTxt.textContent = 'Enregistrer';

    if (error) {
      toast(`Erreur : ${error.message ?? 'création impossible.'}`, 'error');
      return;
    }

    toast('Rappel créé.', 'success');
    closePanels();
    if (typeof onCreated === 'function') onCreated();
  });
}
