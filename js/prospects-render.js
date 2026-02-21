/* =======================================================
   prospects-render.js — Fonctions de rendu HTML
   Module compagnon de prospects.js.
   Importé uniquement par prospects.js.
   ======================================================= */

import { badgeStatut, badge, emptyState } from './ui-components.js';
import { getRetour, STATUTS_PROSPECT, RETOURS_PROSPECT, METIERS } from './config.js';

// ── Tableau ───────────────────────────────────────────────

/**
 * Injecte le rendu du tableau dans le tbody.
 * @param {Array}  prospects - données filtrées et triées
 * @param {string} tbodyId
 */
export function renderTable(prospects, tbodyId) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;

  if (!prospects.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="padding:2.5rem 0">
          ${emptyState('Aucun prospect trouvé', '🔍')}
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = prospects.map(renderRow).join('');
}

/**
 * Génère le HTML d'une ligne prospect.
 * @param {object} p - prospect enrichi avec profiles et interactions
 * @returns {string} HTML <tr>
 */
function renderRow(p) {
  const commercial     = p.profiles?.nom ?? '—';
  const nbInteractions = p.interactions?.length ?? 0;
  const lastContact    = formatLastContact(p.interactions);
  const retour         = p.retour ? getRetour(p.retour) : null;

  return `
    <tr class="prospects-row" data-id="${p.id}"
        tabindex="0" role="link" aria-label="Ouvrir la fiche ${esc(p.nom)}">
      <td class="col-nom">
        <span class="prospect-name">${esc(p.nom)}</span>
        ${p.siret ? `<span class="prospect-siret">${esc(formatSiret(p.siret))}</span>` : ''}
      </td>
      <td>${p.metier ? esc(p.metier) : '—'}</td>
      <td>${badgeStatut(p.statut)}</td>
      <td>${retour ? badge(retour.label, retour.badgeType) : '—'}</td>
      <td>${esc(commercial)}</td>
      <td class="col-date">${lastContact}</td>
      <td class="col-center">
        <span class="nb-interactions" title="${nbInteractions} interaction(s)">
          ${nbInteractions}
        </span>
      </td>
    </tr>`.trim();
}

/**
 * Retourne la date de la dernière interaction formatée.
 * @param {Array|undefined} interactions
 * @returns {string}
 */
function formatLastContact(interactions) {
  if (!interactions?.length) return '—';
  const dates = interactions
    .map(i => new Date(i.created_at))
    .filter(d => !isNaN(d));
  if (!dates.length) return '—';
  const last = new Date(Math.max(...dates));
  return last.toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

// ── Formulaire création ───────────────────────────────────

/**
 * Génère le HTML du formulaire de création de prospect.
 * @param {string} formId - id du <form> à générer
 * @returns {string} HTML
 */
export function renderCreateForm(formId) {
  return `
    <form id="${formId}" novalidate>
      <div class="form-field">
        <label class="form-label" for="f-nom">
          Nom du prospect <span aria-hidden="true">*</span>
        </label>
        <input class="form-input" id="f-nom" name="nom" type="text"
               placeholder="Cabinet Dupont Architectes" required autofocus>
      </div>

      <div class="form-field">
        <label class="form-label" for="f-siret">SIRET</label>
        <input class="form-input" id="f-siret" name="siret" type="text"
               placeholder="123 456 789 00012" maxlength="14">
      </div>

      <div class="form-row">
        <div class="form-field">
          <label class="form-label" for="f-metier">Métier</label>
          <select class="form-select" id="f-metier" name="metier">
            <option value="">Sélectionner…</option>
            ${METIERS.map(m => `<option value="${m.value}">${m.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-field">
          <label class="form-label" for="f-statut">Statut</label>
          <select class="form-select" id="f-statut" name="statut">
            ${STATUTS_PROSPECT.map(s => `<option value="${s.value}">${s.label}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="form-field">
        <label class="form-label" for="f-retour">Retour</label>
        <select class="form-select" id="f-retour" name="retour">
          <option value="">— Aucun —</option>
          ${RETOURS_PROSPECT.map(r => `<option value="${r.value}">${r.label}</option>`).join('')}
        </select>
      </div>

      <div class="form-actions">
        <button type="button" class="btn btn-ghost" data-panel-close>
          Annuler
        </button>
        <button type="submit" class="btn btn-primary" id="f-submit">
          <span id="f-submit-text">Créer le prospect</span>
        </button>
      </div>
    </form>`.trim();
}

// ── Utils locaux ──────────────────────────────────────────

/**
 * Formate un SIRET avec des espaces tous les 3 chiffres.
 * @param {string|null} siret
 * @returns {string}
 */
function formatSiret(siret) {
  if (!siret) return '';
  return siret.replace(/(\d{3})(?=\d)/g, '$1 ');
}

/**
 * Échappe les caractères HTML dangereux.
 * @param {string|null} str
 * @returns {string}
 */
function esc(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}
