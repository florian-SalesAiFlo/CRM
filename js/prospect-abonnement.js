/* =======================================================
   prospect-abonnement.js — Section abonnement fiche prospect
   Affiche type, statut, dates, tarif, réabo auto.
   Export : renderAbonnement(p), bindAbonnementSelects(container, id)
   ======================================================= */

import { updateProspect } from './supabase-client.js';
import { toast, badgeSelect } from './ui-components.js';
import { TYPES_ABO, STATUTS_ABO } from './config.js';

// ── Rendu ─────────────────────────────────────────────────

/**
 * Injecte la section abonnement dans #abonnement-section.
 * @param {object} p - données prospect
 */
export function renderAbonnement(p) {
  const container = document.getElementById('abonnement-section');
  if (!container) return;

  container.innerHTML = buildAbonnementHTML(p);
  bindAbonnementSelects(container, p.id);
  bindReaboToggle(container, p.id);
}

/**
 * Construit le HTML de la section abonnement.
 * @param {object} p
 * @returns {string} HTML
 */
function buildAbonnementHTML(p) {
  const typeSelect   = badgeSelect('type_abo',   TYPES_ABO,   p.type_abo   ?? 'aucun');
  const statutSelect = badgeSelect('statut_abo', STATUTS_ABO, p.statut_abo ?? 'actif');
  const debut  = fmtDate(p.date_debut_abo);
  const fin    = fmtDate(p.date_fin_abo);
  const tarif  = p.tarif_mensuel != null ? `${Number(p.tarif_mensuel).toFixed(0)} €/mois` : '—';
  const reabo  = p.reabo_auto ? 'checked' : '';

  return `
    <div class="abo-row">
      <div class="abo-field"><div class="abo-label">Type</div>${typeSelect}</div>
      <div class="abo-field"><div class="abo-label">Statut</div>${statutSelect}</div>
    </div>
    <div class="abo-row">
      <div class="abo-field"><div class="abo-label">Début</div><div class="abo-value">${debut}</div></div>
      <div class="abo-field"><div class="abo-label">Fin / Renouvellement</div><div class="abo-value">${fin}</div></div>
    </div>
    <div class="abo-row">
      <div class="abo-field"><div class="abo-label">Tarif mensuel</div><div class="abo-value">${tarif}</div></div>
      <div class="abo-field">
        <div class="abo-label">Réabo automatique</div>
        <label class="abo-toggle">
          <input type="checkbox" id="reabo-auto-input" ${reabo} aria-label="Réabonnement automatique">
          <span class="abo-toggle-track"></span>
        </label>
      </div>
    </div>`.trim();
}

// ── Binding ───────────────────────────────────────────────

/**
 * Sauvegarde les badge-selects abonnement (type_abo, statut_abo).
 * @param {HTMLElement} container
 * @param {string}      prospectId
 */
export function bindAbonnementSelects(container, prospectId) {
  container.addEventListener('badge-select-change', async (e) => {
    const { name, value } = e.detail;
    const { error } = await updateProspect(prospectId, { [name]: value });
    if (error) { toast(`Erreur : ${error.message}`, 'error'); return; }
    toast('Abonnement mis à jour.', 'success');
  });
}

/**
 * Sauvegarde le toggle réabo automatique.
 * @param {HTMLElement} container
 * @param {string}      prospectId
 */
function bindReaboToggle(container, prospectId) {
  container.querySelector('#reabo-auto-input')?.addEventListener('change', async (e) => {
    const val = e.target.checked;
    const { error } = await updateProspect(prospectId, { reabo_auto: val });
    if (error) { toast(`Erreur : ${error.message}`, 'error'); return; }
    toast(`Réabo auto ${val ? 'activé' : 'désactivé'}.`, 'success');
  });
}

// ── Utils ─────────────────────────────────────────────────

/**
 * Formate une date ISO en DD/MM/YYYY ou '—'.
 * @param {string|null} iso
 * @returns {string}
 */
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}
