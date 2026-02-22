/* =======================================================
   import-render.js — Rendu HTML des étapes d'import CSV
   ======================================================= */

/** Champs Cosmos disponibles pour le mapping */
export const COSMOS_FIELDS = [
  { value: '',                  label: '— Ignorer —' },
  { value: 'prospect.nom',      label: 'Prospect · Nom *' },
  { value: 'prospect.siret',    label: 'Prospect · SIRET' },
  { value: 'prospect.metier',   label: 'Prospect · Métier' },
  { value: 'prospect.statut',   label: 'Prospect · Statut' },
  { value: 'prospect.retour',   label: 'Prospect · Retour' },
  { value: 'prospect.email',    label: 'Prospect · Email' },
  { value: 'prospect.telephone',label: 'Prospect · Téléphone' },
  { value: 'prospect.site_web', label: 'Prospect · Site web' },
  { value: 'prospect.adresse',  label: 'Prospect · Adresse' },
  { value: 'prospect.commentaire', label: 'Prospect · Commentaire' },
  { value: 'contact.nom',       label: 'Contact · Nom' },
  { value: 'contact.prenom',    label: 'Contact · Prénom' },
  { value: 'contact.email',     label: 'Contact · Email' },
  { value: 'contact.telephone', label: 'Contact · Téléphone' },
  { value: 'contact.role_employe', label: 'Contact · Rôle' },
];

/** Correspondances automatiques header CSV → champ Cosmos */
const AUTO_MAP = {
  nom: 'prospect.nom', raison_sociale: 'prospect.nom', entreprise: 'prospect.nom',
  siret: 'prospect.siret',
  metier: 'prospect.metier', secteur: 'prospect.metier', activite: 'prospect.metier',
  statut: 'prospect.statut',
  retour: 'prospect.retour',
  email: 'prospect.email',
  telephone: 'prospect.telephone', tel: 'prospect.telephone',
  site_web: 'prospect.site_web', site: 'prospect.site_web', web: 'prospect.site_web',
  adresse: 'prospect.adresse',
  commentaire: 'prospect.commentaire', notes: 'prospect.commentaire',
  contact_nom: 'contact.nom', nom_contact: 'contact.nom',
  contact_prenom: 'contact.prenom', prenom_contact: 'contact.prenom',
  contact_email: 'contact.email',
  contact_tel: 'contact.telephone', contact_telephone: 'contact.telephone',
  contact_role: 'contact.role_employe', fonction: 'contact.role_employe', poste: 'contact.role_employe',
};

/**
 * Retourne la valeur de mapping automatique pour un header CSV.
 * @param {string} header
 * @returns {string} valeur COSMOS_FIELDS ou ''
 */
export function autoMapHeader(header) {
  return AUTO_MAP[header.toLowerCase().trim().replace(/[\s-]/g, '_')] ?? '';
}

/**
 * Injecte la table de prévisualisation (5 premières lignes).
 * @param {string[][]} rows  - lignes du CSV (header inclus)
 */
export function renderPreview(rows) {
  const container = document.getElementById('import-preview-container');
  if (!container || !rows.length) return;
  const headers = rows[0];
  const preview = rows.slice(1, 6);
  const ths = headers.map(h => `<th>${esc(h)}</th>`).join('');
  const trs = preview.map(r =>
    `<tr>${headers.map((_, i) => `<td>${esc(r[i] ?? '')}</td>`).join('')}</tr>`
  ).join('');
  container.innerHTML =
    `<div class="preview-table-wrap"><table class="preview-table">` +
    `<thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>` +
    `<p class="import-step-hint">${rows.length - 1} ligne(s) détectée(s).</p>`;
}

/**
 * Injecte les lignes de mapping colonnes → champs Cosmos.
 * @param {string[]} headers
 * @param {Object}   currentMapping  - { colIndex: cosmosField }
 */
export function renderMapping(headers, currentMapping = {}) {
  const container = document.getElementById('import-mapping-container');
  if (!container) return;
  const opts = COSMOS_FIELDS.map(f =>
    `<option value="${esc(f.value)}">${esc(f.label)}</option>`
  ).join('');
  container.innerHTML = headers.map((h, i) => {
    const auto = currentMapping[i] ?? autoMapHeader(h);
    const selOpts = COSMOS_FIELDS.map(f =>
      `<option value="${esc(f.value)}"${f.value === auto ? ' selected' : ''}>${esc(f.label)}</option>`
    ).join('');
    return `<div class="mapping-row">` +
      `<span class="mapping-col-name">${esc(h)}</span>` +
      `<span class="mapping-arrow">→</span>` +
      `<select class="mapping-select" data-col="${i}">${selOpts}</select>` +
      `</div>`;
  }).join('');
}

/**
 * Met à jour la barre de progression.
 * @param {number} current
 * @param {number} total
 */
export function renderProgress(current, total) {
  const container = document.getElementById('import-progress-container');
  if (!container) return;
  const pct = total ? Math.round((current / total) * 100) : 0;
  container.innerHTML =
    `<div class="progress-bar-wrap">` +
    `<div class="progress-bar" style="width:${pct}%"></div></div>` +
    `<p class="import-progress-label">${current} / ${total} ligne(s) traitée(s)</p>`;
}

/**
 * Injecte le rapport final d'import.
 * @param {{ prospects: number, contacts: number, errors: string[] }} results
 */
export function renderReport(results) {
  const container = document.getElementById('import-report-container');
  if (!container) return;
  const errHtml = results.errors.length
    ? `<div class="import-errors-wrap"><p class="import-errors-title">Erreurs (${results.errors.length})</p>` +
      `<ul class="import-errors-list">${results.errors.map(e => `<li class="import-error">${esc(e)}</li>`).join('')}</ul></div>`
    : '';
  container.innerHTML =
    `<div class="import-report">` +
    `<div class="import-stat import-success">✅ ${results.prospects} prospect(s) créé(s)</div>` +
    `<div class="import-stat import-success">👤 ${results.contacts} contact(s) créé(s)</div>` +
    (results.errors.length
      ? `<div class="import-stat import-error-stat">⚠️ ${results.errors.length} erreur(s)</div>`
      : '') +
    `</div>${errHtml}`;
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
