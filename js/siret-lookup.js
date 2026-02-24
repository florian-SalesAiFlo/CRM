/* =======================================================
   siret-lookup.js — Enrichissement SIRET via API data.gouv.fr
   API : recherche-entreprises.api.gouv.fr (gratuit, sans clé)
   Export : lookupSiret(siret), proposeSiretEnrichment(result, id, refresh)
   ======================================================= */

import { updateProspect } from './supabase-client.js';
import { toast }          from './ui-components.js';

const API_URL = 'https://recherche-entreprises.api.gouv.fr/search';
const BANNER_ID = 'siret-enrichment-banner';

// ── Appel API ─────────────────────────────────────────────

/**
 * Recherche une entreprise par SIRET/SIREN sur l'API Annuaire.
 * Retourne null en cas d'erreur ou si aucun résultat.
 * @param {string} siret - SIRET brut (espaces tolérés)
 * @returns {Promise<object|null>} données normalisées
 */
export async function lookupSiret(siret) {
  const clean = siret.replace(/\s/g, '');
  if (clean.length !== 14) return null;

  try {
    const res  = await fetch(`${API_URL}?q=${encodeURIComponent(clean)}&limit=1`);
    if (!res.ok) return null;
    const json = await res.json();
    const r    = json.results?.[0];
    if (!r) return null;
    return parseResult(r);
  } catch {
    return null;
  }
}

/**
 * Parse le premier résultat de l'API en objet normalisé.
 * @param {object} r - résultat brut API
 * @returns {object} données normalisées
 */
function parseResult(r) {
  const adresseParts = [
    r.siege?.numero_voie,
    r.siege?.type_voie,
    r.siege?.libelle_voie,
  ].filter(Boolean);

  return {
    nom:                r.nom_complet ?? null,
    adresse:            adresseParts.join(' ') || null,
    code_postal:        r.siege?.code_postal ?? null,
    ville:              r.siege?.libelle_commune ?? null,
    activite_principale: r.activite_principale ?? null,
    effectif:           r.tranche_effectif_salarie ?? null,
  };
}

// ── Bandeau proposition ───────────────────────────────────

/**
 * Affiche un bandeau dans #siret-enrichment-banner proposant l'auto-remplissage.
 * @param {object}   result     - données normalisées depuis lookupSiret
 * @param {string}   prospectId - UUID du prospect à mettre à jour
 * @param {Function} refresh    - callback de rechargement de la fiche
 */
export function proposeSiretEnrichment(result, prospectId, refresh) {
  if (!result?.nom) return;
  removeBanner();

  const banner = document.createElement('div');
  banner.id        = BANNER_ID;
  banner.className = 'siret-banner';
  banner.innerHTML = buildBannerHTML(result);

  const grid = document.getElementById('info-grid');
  grid?.insertAdjacentElement('beforebegin', banner);

  banner.querySelector('#siret-yes')
    ?.addEventListener('click', () => applyEnrichment(result, prospectId, refresh));
  banner.querySelector('#siret-no')
    ?.addEventListener('click', removeBanner);
}

/**
 * Construit le HTML du bandeau proposition.
 * @param {object} result
 * @returns {string} HTML
 */
function buildBannerHTML(result) {
  const addr = [result.adresse, result.code_postal, result.ville].filter(Boolean).join(', ');
  const desc = addr ? `${esc(result.nom)} — ${esc(addr)}` : esc(result.nom);
  return `
    <div class="siret-banner-body">
      <span class="siret-banner-icon">🔍</span>
      <span class="siret-banner-text">Entreprise trouvée : <strong>${desc}</strong>. Remplir automatiquement ?</span>
      <div class="siret-banner-actions">
        <button class="btn btn-primary btn-sm" id="siret-yes">Oui, remplir</button>
        <button class="btn btn-ghost btn-sm" id="siret-no">Non</button>
      </div>
    </div>`;
}

// ── Application des données ───────────────────────────────

/**
 * Applique les données d'enrichissement au prospect en Supabase.
 * @param {object}   result
 * @param {string}   prospectId
 * @param {Function} refresh
 */
async function applyEnrichment(result, prospectId, refresh) {
  removeBanner();
  const payload = {};
  if (result.nom)         payload.nom         = result.nom;
  if (result.adresse)     payload.adresse      = result.adresse;
  if (result.code_postal) payload.code_postal  = result.code_postal;
  if (result.ville)       payload.ville        = result.ville;

  const { error } = await updateProspect(prospectId, payload);
  if (error) { toast(`Erreur enrichissement : ${error.message}`, 'error'); return; }
  toast('Fiche enrichie depuis l\'annuaire.', 'success');
  refresh?.();
}

// ── Helpers ───────────────────────────────────────────────

/** Supprime le bandeau s'il existe. */
function removeBanner() {
  document.getElementById(BANNER_ID)?.remove();
}

/** @param {string} str @returns {string} */
function esc(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
