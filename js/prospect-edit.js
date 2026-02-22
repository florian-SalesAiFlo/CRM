/* =======================================================
   prospect-edit.js — Édition inline du prospect
   Transforme #info-grid en formulaire éditable.
   Export : initProspectEdit(prospect, onSave)
   ======================================================= */

import { updateProspect }                    from './supabase-client.js';
import { toast }                             from './ui-components.js';
import { METIERS, STATUTS_PROSPECT, RETOURS_PROSPECT } from './config.js';

// ── Utils locaux ──────────────────────────────────────────

function esc(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

function opt(list, current) {
  return list.map(o =>
    `<option value="${esc(o.value)}"${o.value === current ? ' selected' : ''}>${esc(o.label)}</option>`
  ).join('');
}

function field(label, inputHtml, full) {
  return `<div class="info-field${full ? ' info-field--full' : ''}">
    <div class="info-label">${label}</div>
    <div class="info-value">${inputHtml}</div>
  </div>`;
}

// ── Rendu formulaire inline ───────────────────────────────

function renderEditGrid(p) {
  const metierOpts  = opt(METIERS, p.metier);
  const statutOpts  = opt(STATUTS_PROSPECT, p.statut);
  const retourOpts  = `<option value="">— Aucun —</option>${opt(RETOURS_PROSPECT, p.retour)}`;

  const html = `
    <form id="form-edit-prospect" novalidate>
      ${field('Nom *',
        `<input class="ef-input" id="ef-nom" name="nom" type="text" value="${esc(p.nom)}" required>`
      )}
      ${field('SIRET',
        `<input class="ef-input" id="ef-siret" name="siret" type="text" value="${esc(p.siret ?? '')}" maxlength="14">`
      )}
      ${field('Métier',
        `<select class="ef-input" id="ef-metier" name="metier"><option value="">— Sélectionner —</option>${metierOpts}</select>`
      )}
      ${field('Statut',
        `<select class="ef-input" id="ef-statut" name="statut">${statutOpts}</select>`
      )}
      ${field('Retour',
        `<select class="ef-input" id="ef-retour" name="retour">${retourOpts}</select>`
      )}
      ${field('Téléphone',
        `<input class="ef-input" id="ef-telephone" name="telephone" type="tel" value="${esc(p.telephone ?? '')}">`
      )}
      ${field('Email',
        `<input class="ef-input" id="ef-email" name="email" type="email" value="${esc(p.email ?? '')}">`
      )}
      ${field('Site web',
        `<input class="ef-input" id="ef-site" name="site_web" type="url" value="${esc(p.site_web ?? '')}">`
      )}
      ${field('Adresse',
        `<input class="ef-input" id="ef-adresse" name="adresse" type="text" value="${esc(p.adresse ?? '')}">`,
        true
      )}
      ${field('Code postal',
        `<input class="ef-input" id="ef-cp" name="code_postal" type="text" value="${esc(p.code_postal ?? '')}" maxlength="10">`
      )}
      ${field('Ville',
        `<input class="ef-input" id="ef-ville" name="ville" type="text" value="${esc(p.ville ?? '')}">`
      )}
      ${field('Commentaire',
        `<textarea class="ef-input ef-textarea" id="ef-commentaire" name="commentaire" rows="3">${esc(p.commentaire ?? '')}</textarea>`,
        true
      )}
      <div class="info-field info-field--full ef-actions-row">
        <button type="button" class="btn btn-ghost" id="ef-cancel">Annuler</button>
        <button type="submit" class="btn btn-primary" id="ef-submit">
          <span id="ef-submit-text">Enregistrer</span>
        </button>
      </div>
    </form>

    <style>
      /* Inputs s'intègrent dans info-value */
      .ef-input {
        font-family: var(--font-sans); font-size: var(--text-sm);
        color: var(--color-text); background: var(--color-bg);
        border: 1px solid var(--color-border-strong); border-radius: var(--radius-sm);
        padding: var(--space-2) var(--space-3);
        transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
        width: 100%; box-sizing: border-box;
      }
      .ef-input:focus {
        outline: none; border-color: var(--color-primary);
        box-shadow: var(--shadow-focus);
      }
      .ef-textarea { resize: vertical; min-height: 72px; }
      /* Full width fields */
      .info-field--full { grid-column: 1 / -1; }
      /* Actions row */
      .ef-actions-row {
        display: flex; gap: var(--space-3); justify-content: center;
        padding-top: var(--space-4); border-bottom: none !important;
      }
    </style>`;

  return html;
}

// ── API publique ──────────────────────────────────────────

/**
 * Active le mode édition inline sur #info-grid.
 * @param {object} prospect - Données actuelles du prospect
 * @param {Function} onSave - Appelé après sauvegarde réussie
 */
export function initProspectEdit(prospect, onSave) {
  const grid = document.getElementById('info-grid');
  if (!grid) return;

  grid.innerHTML = renderEditGrid(prospect);

  const form      = document.getElementById('form-edit-prospect');
  const submitBtn = document.getElementById('ef-submit');
  const submitTxt = document.getElementById('ef-submit-text');

  document.getElementById('ef-cancel')?.addEventListener('click', () => {
    if (typeof onSave === 'function') onSave();
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nom = form.querySelector('#ef-nom')?.value.trim();
    if (!nom) {
      form.querySelector('#ef-nom')?.focus();
      toast('Le nom est obligatoire.', 'error');
      return;
    }

    submitBtn.disabled  = true;
    submitTxt.textContent = 'Enregistrement…';

    const payload = {
      nom,
      siret:       form.querySelector('#ef-siret')?.value.trim()      || null,
      metier:      form.querySelector('#ef-metier')?.value             || null,
      statut:      form.querySelector('#ef-statut')?.value             || null,
      retour:      form.querySelector('#ef-retour')?.value             || null,
      telephone:   form.querySelector('#ef-telephone')?.value.trim()  || null,
      email:       form.querySelector('#ef-email')?.value.trim()       || null,
      site_web:    form.querySelector('#ef-site')?.value.trim()        || null,
      adresse:     form.querySelector('#ef-adresse')?.value.trim()     || null,
      code_postal: form.querySelector('#ef-cp')?.value.trim()          || null,
      ville:       form.querySelector('#ef-ville')?.value.trim()       || null,
      commentaire: form.querySelector('#ef-commentaire')?.value.trim() || null,
    };

    const { error } = await updateProspect(prospect.id, payload);

    submitBtn.disabled    = false;
    submitTxt.textContent = 'Enregistrer';

    if (error) {
      toast(`Erreur : ${error.message ?? 'sauvegarde impossible.'}`, 'error');
      return;
    }

    toast('Prospect mis à jour.', 'success');
    if (typeof onSave === 'function') onSave();
  });
}
