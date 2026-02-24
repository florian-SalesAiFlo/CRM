/* =======================================================
   prospect-create.js — Panel création d'un prospect
   Appelé par router.js après initProspectList().
   Formulaire enrichi : nom, SIRET, métier, adresse, ville,
   CP, téléphone, email, site web, commentaire.
   ======================================================= */

import { createProspect }       from './supabase-client.js';
import { toast }                from './ui-components.js';
import { openPanel, closePanels } from './ui-panels.js';
import { METIERS, STATUTS_PROSPECT, RETOURS_PROSPECT } from './config.js';
import { lookupSiret }          from './siret-lookup.js';

// ── IDs DOM ───────────────────────────────────────────────

const PANEL_ID = 'panel-new-prospect';
const FORM_ID  = 'form-new-prospect';
const BTN_ID   = 'btn-new-prospect';

// ── Init ──────────────────────────────────────────────────

/**
 * Initialise le bouton "+ Nouveau prospect".
 * Doit être appelé après que prospect-list.html est dans le DOM.
 * @param {Function} onCreated - callback après création réussie (ex: rechargement liste)
 */
export function initProspectCreate(onCreated) {
  const btn = document.getElementById(BTN_ID);
  if (!btn) return;

  // Remplace le listener précédent en clonant le bouton
  const fresh = btn.cloneNode(true);
  btn.replaceWith(fresh);

  fresh.addEventListener('click', () => openCreatePanel(onCreated));
}

// ── Panel ─────────────────────────────────────────────────

function openCreatePanel(onCreated) {
  const panelEl = document.getElementById(PANEL_ID);
  if (!panelEl) return;

  panelEl.querySelector('.slide-panel-body').innerHTML = renderForm();
  document.getElementById(FORM_ID)?.addEventListener('submit', e =>
    handleSubmit(e, onCreated)
  );
  bindSiretLookupOnCreate();
  openPanel(PANEL_ID);
}

// ── SIRET auto-enrichissement à la création ───────────────

function bindSiretLookupOnCreate() {
  const siretInput = document.getElementById('fc-siret');
  if (!siretInput) return;

  let debounceTimer = null;
  siretInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const val = siretInput.value.replace(/\s/g, '');
    if (val.length !== 14) return;
    debounceTimer = setTimeout(() => autoFillFromSiret(val), 400);
  });
}

async function autoFillFromSiret(siret) {
  const result = await lookupSiret(siret);
  if (!result?.nom) return;

  const fill = (id, v) => { const el = document.getElementById(id); if (el && v && !el.value.trim()) el.value = v; };
  const fillForce = (id, v) => { const el = document.getElementById(id); if (el && v) el.value = v; };

  // Nom : remplir seulement si vide ou placeholder
  fill('fc-nom', result.nom);
  fill('fc-adresse', result.adresse);
  fill('fc-cp', result.code_postal);
  fill('fc-ville', result.ville);

  // Bandeau info
  const banner = document.getElementById('siret-create-banner');
  if (banner) banner.remove();
  const addr = [result.adresse, result.code_postal, result.ville].filter(Boolean).join(', ');
  const html = `<div id="siret-create-banner" style="background:var(--color-success-soft);color:var(--color-success);padding:var(--space-3) var(--space-4);border-radius:var(--radius-sm);font-size:var(--text-sm);margin-bottom:var(--space-4)">
    🔍 <strong>${esc(result.nom)}</strong>${addr ? ' — ' + esc(addr) : ''} — champs pré-remplis
  </div>`;
  document.getElementById('fc-siret')?.closest('.form-row')?.insertAdjacentHTML('afterend', html);
  toast('Entreprise trouvée, champs pré-remplis.', 'success');
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ── Soumission ────────────────────────────────────────────

async function handleSubmit(e, onCreated) {
  e.preventDefault();
  const form = e.target;
  const nom  = form.querySelector('#fc-nom')?.value.trim();

  if (!nom) {
    form.querySelector('#fc-nom')?.focus();
    toast('Le nom du prospect est obligatoire.', 'error');
    return;
  }

  const submitBtn = document.getElementById('fc-submit');
  const submitTxt = document.getElementById('fc-submit-text');
  if (submitBtn) submitBtn.disabled = true;
  if (submitTxt) submitTxt.textContent = 'Création…';

  const payload = {
    nom,
    siret:      (form.querySelector('#fc-siret')?.value || '').replace(/\s/g, '') || null,
    metier:     form.querySelector('#fc-metier')?.value          || null,
    statut:     form.querySelector('#fc-statut')?.value          || 'a_definir',
    retour:     form.querySelector('#fc-retour')?.value          || null,
    adresse:    form.querySelector('#fc-adresse')?.value.trim()  || null,
    ville:      form.querySelector('#fc-ville')?.value.trim()    || null,
    code_postal: form.querySelector('#fc-cp')?.value.trim()      || null,
    telephone:  form.querySelector('#fc-telephone')?.value.trim()|| null,
    email:      form.querySelector('#fc-email')?.value.trim()    || null,
    site_web:   form.querySelector('#fc-site')?.value.trim()     || null,
    commentaire: form.querySelector('#fc-commentaire')?.value.trim() || null,
  };

  const { data, error } = await createProspect(payload);

  if (submitBtn) submitBtn.disabled = false;
  if (submitTxt) submitTxt.textContent = 'Créer le prospect';

  if (error) {
    toast('Erreur lors de la création.', 'error');
    console.error('[prospect-create]', error);
    return;
  }

  toast(`${payload.nom} créé.`, 'success');
  closePanels();

  if (typeof onCreated === 'function') await onCreated();
  if (data?.id) window.location.hash = `/prospect/${data.id}`;
}

// ── HTML du formulaire ────────────────────────────────────

function renderForm() {
  const metierOptions = METIERS.map(m =>
    `<option value="${m.value}">${m.label}</option>`).join('');
  const statutOptions = STATUTS_PROSPECT.map(s =>
    `<option value="${s.value}">${s.label}</option>`).join('');
  const retourOptions = RETOURS_PROSPECT.map(r =>
    `<option value="${r.value}">${r.label}</option>`).join('');

  return `
    <form id="${FORM_ID}" novalidate>

      <div class="form-field">
        <label class="form-label" for="fc-nom">Nom du prospect <span aria-hidden="true">*</span></label>
        <input class="form-input" id="fc-nom" name="nom" type="text"
               placeholder="Cabinet Dupont Architectes" required autofocus>
      </div>

      <div class="form-row">
        <div class="form-field">
          <label class="form-label" for="fc-siret">SIRET</label>
          <input class="form-input" id="fc-siret" name="siret" type="text"
                 placeholder="123 456 789 00012" maxlength="20">
        </div>
        <div class="form-field">
          <label class="form-label" for="fc-metier">Métier</label>
          <select class="form-select" id="fc-metier" name="metier">
            <option value="">Sélectionner…</option>
            ${metierOptions}
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-field">
          <label class="form-label" for="fc-statut">Statut</label>
          <select class="form-select" id="fc-statut" name="statut">
            ${statutOptions}
          </select>
        </div>
        <div class="form-field">
          <label class="form-label" for="fc-retour">Retour</label>
          <select class="form-select" id="fc-retour" name="retour">
            <option value="">— Aucun —</option>
            ${retourOptions}
          </select>
        </div>
      </div>

      <div class="form-field">
        <label class="form-label" for="fc-adresse">Adresse</label>
        <input class="form-input" id="fc-adresse" name="adresse" type="text"
               placeholder="12 rue de la Paix">
      </div>

      <div class="form-row">
        <div class="form-field">
          <label class="form-label" for="fc-cp">Code postal</label>
          <input class="form-input" id="fc-cp" name="code_postal" type="text"
                 placeholder="75001" maxlength="10">
        </div>
        <div class="form-field">
          <label class="form-label" for="fc-ville">Ville</label>
          <input class="form-input" id="fc-ville" name="ville" type="text"
                 placeholder="Paris">
        </div>
      </div>

      <div class="form-row">
        <div class="form-field">
          <label class="form-label" for="fc-telephone">Téléphone</label>
          <input class="form-input" id="fc-telephone" name="telephone" type="tel"
                 placeholder="01 23 45 67 89">
        </div>
        <div class="form-field">
          <label class="form-label" for="fc-email">Email</label>
          <input class="form-input" id="fc-email" name="email" type="email"
                 placeholder="contact@cabinet.fr">
        </div>
      </div>

      <div class="form-field">
        <label class="form-label" for="fc-site">Site web</label>
        <input class="form-input" id="fc-site" name="site_web" type="url"
               placeholder="https://www.cabinet.fr">
      </div>

      <div class="form-field">
        <label class="form-label" for="fc-commentaire">Commentaire</label>
        <textarea class="form-textarea" id="fc-commentaire" name="commentaire"
                  placeholder="Notes libres sur ce prospect…" rows="3"></textarea>
      </div>

      <div class="form-actions">
        <button type="button" class="btn btn-ghost" data-panel-close>Annuler</button>
        <button type="submit" class="btn btn-primary" id="fc-submit">
          <span id="fc-submit-text">Créer le prospect</span>
        </button>
      </div>

    </form>

    <style>
      .form-field    { margin-bottom: var(--space-4); }
      .form-label    { display: block; font-size: var(--text-sm); font-weight: 500;
                       color: var(--color-text-secondary); margin-bottom: var(--space-2); }
      .form-input, .form-select, .form-textarea {
        width: 100%; font-family: var(--font-sans); font-size: var(--text-base);
        color: var(--color-text); background: var(--color-surface);
        border: 1px solid var(--color-border-strong); border-radius: var(--radius-sm);
        padding: var(--space-3) var(--space-4);
        transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
        box-sizing: border-box;
      }
      .form-textarea { resize: vertical; min-height: 72px; }
      .form-input:focus, .form-select:focus, .form-textarea:focus {
        outline: none; border-color: var(--color-primary); box-shadow: var(--shadow-focus);
      }
      .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
      .form-actions {
        display: flex; gap: var(--space-3); justify-content: flex-end;
        margin-top: var(--space-6); padding-top: var(--space-4);
        border-top: 1px solid var(--color-border);
      }
      .btn { display: inline-flex; align-items: center; gap: var(--space-2);
             font-family: var(--font-sans); font-size: var(--text-sm); font-weight: 600;
             border-radius: var(--radius-sm); border: none; cursor: pointer;
             padding: var(--space-2) var(--space-4);
             transition: background var(--transition-fast); }
      .btn-primary { background: var(--color-primary); color: #fff; }
      .btn-primary:hover { background: var(--color-primary-hover); }
      .btn-ghost   { background: transparent; color: var(--color-text-secondary); }
      .btn-ghost:hover { background: var(--color-surface-alt); }
    </style>
  `.trim();
}
