/* =======================================================
   rappel-form.js — Formulaire rappel (création + édition)
   Injecte et lie le formulaire dans #panel-rappel-body.
   Export : initRappelPanel(prospectId, onSaved, rappel?)
   ======================================================= */

import { createRappel, updateRappel } from './supabase-client.js';
import { toast }       from './ui-components.js';
import { closePanels } from './ui-panels.js';

// ── Utils ─────────────────────────────────────────────────
function esc(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

/** Date ISO YYYY-MM-DD du jour + n jours */
function dateIn(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ── HTML formulaire ───────────────────────────────────────
function renderForm(rappel = null) {
  const v = rappel ?? {};
  const defaultDate = v.date_rappel?.slice(0, 10) ?? dateIn(1);

  return `
    <form id="form-new-rappel" novalidate class="pf-form">

      <div class="pf-field">
        <label class="pf-label" for="fr-date">Date du rappel <span aria-hidden="true">*</span></label>
        <input class="pf-input" id="fr-date" name="date_rappel" type="date"
               value="${esc(defaultDate)}" required autofocus>
      </div>

      <div class="pf-field">
        <label class="pf-label" for="fr-motif">Motif <span aria-hidden="true">*</span></label>
        <input class="pf-input" id="fr-motif" name="motif" type="text"
               placeholder="Suivi candidature, point trimestriel…"
               value="${esc(v.motif ?? '')}" required>
      </div>

      <div class="pf-field">
        <label class="pf-label" for="fr-commentaire">Commentaire</label>
        <textarea class="pf-input pf-textarea" id="fr-commentaire" name="commentaire"
                  placeholder="Informations complémentaires…" rows="3">${esc(v.commentaire ?? '')}</textarea>
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
      .pf-label  { font-size: var(--text-sm); font-weight: 500; color: var(--color-text-secondary); }
      .pf-input  {
        font-family: var(--font-sans); font-size: var(--text-base);
        color: var(--color-text); background: var(--color-surface);
        border: 1px solid var(--color-border-strong); border-radius: var(--radius-sm);
        padding: var(--space-3) var(--space-4); width: 100%; box-sizing: border-box;
        transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
      }
      .pf-input:focus { outline: none; border-color: var(--color-primary); box-shadow: var(--shadow-focus); }
      .pf-textarea { resize: vertical; min-height: 72px; }
      .pf-actions {
        display: flex; gap: var(--space-3); justify-content: flex-end;
        padding-top: var(--space-4); border-top: 1px solid var(--color-border);
        margin-top: var(--space-2);
      }
    </style>`;
}

// ── Titre du panel ────────────────────────────────────────
function setPanelTitle(isEdit) {
  const h2 = document.querySelector('#panel-new-rappel .slide-panel-header h2');
  if (h2) h2.textContent = isEdit ? 'Modifier le rappel' : 'Nouveau rappel';
}

// ── API publique ──────────────────────────────────────────

/**
 * Injecte le formulaire rappel dans #panel-rappel-body.
 * Supporte la création (sans `rappel`) et l'édition (avec `rappel`).
 * @param {string}      prospectId  - UUID du prospect parent (requis en création)
 * @param {Function}    onSaved     - Appelé après enregistrement réussi
 * @param {object|null} [rappel]    - Rappel existant pour le mode édition
 */
export function initRappelPanel(prospectId, onSaved, rappel = null) {
  const body = document.getElementById('panel-rappel-body');
  if (!body) return;

  const isEdit = !!rappel;
  body.innerHTML = renderForm(rappel);
  setPanelTitle(isEdit);

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

    const { error } = isEdit
      ? await updateRappel(rappel.id, payload)
      : await createRappel(prospectId, payload);

    submitBtn.disabled    = false;
    submitTxt.textContent = 'Enregistrer';

    if (error) {
      toast(`Erreur : ${error.message ?? 'opération impossible.'}`, 'error');
      return;
    }

    toast(isEdit ? 'Rappel modifié.' : 'Rappel créé.', 'success');
    closePanels();
    if (typeof onSaved === 'function') onSaved();
  });
}
