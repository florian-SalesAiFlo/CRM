/* =======================================================
   import-render.js — Rendu interface import CSV
   Fonctions de rendu pur (HTML) pour la page import.
   Appelé par import.js. Pas de logique métier ici.
   ======================================================= */

// ── Constantes ────────────────────────────────────────────

/** Ordre des étapes + labels pour le stepper visuel. */
const STEPS = [
  { name: 'upload',   label: 'Fichier'   },
  { name: 'preview',  label: 'Aperçu'   },
  { name: 'mapping',  label: 'Mapping'   },
  { name: 'progress', label: 'Import'    },
  { name: 'report',   label: 'Résultat'  },
];

/** Champs mappables : clé interne → label lisible. */
const FIELD_OPTIONS = [
  { value: '',                    label: '— Ne pas importer —' },
  { value: 'prospect.nom',        label: 'Prospect : Nom' },
  { value: 'prospect.siret',      label: 'Prospect : SIRET' },
  { value: 'prospect.email',      label: 'Prospect : Email' },
  { value: 'prospect.telephone',  label: 'Prospect : Téléphone' },
  { value: 'prospect.adresse',    label: 'Prospect : Adresse' },
  { value: 'prospect.code_postal',label: 'Prospect : Code postal' },
  { value: 'prospect.ville',      label: 'Prospect : Ville' },
  { value: 'prospect.site_web',   label: 'Prospect : Site web' },
  { value: 'prospect.commentaire',label: 'Prospect : Commentaire' },
  { value: 'contact.nom',         label: 'Contact : Nom' },
  { value: 'contact.email',       label: 'Contact : Email' },
  { value: 'contact.telephone',   label: 'Contact : Téléphone' },
];

/** Heuristiques d'auto-mapping header CSV → champ interne. */
const AUTOMAP_RULES = [
  { test: /nom|name|cabinet|societe/i,    field: 'prospect.nom' },
  { test: /siret/i,                       field: 'prospect.siret' },
  { test: /email|mail|courriel/i,         field: 'prospect.email' },
  { test: /tel|phone|portable/i,          field: 'prospect.telephone' },
  { test: /adresse|addresse|address/i,    field: 'prospect.adresse' },
  { test: /postal|cp|zip/i,              field: 'prospect.code_postal' },
  { test: /ville|city/i,                  field: 'prospect.ville' },
  { test: /site|web|url/i,                field: 'prospect.site_web' },
  { test: /commentaire|note|comment/i,    field: 'prospect.commentaire' },
  { test: /contact/i,                     field: 'contact.nom' },
];

// ── Stepper indicator ─────────────────────────────────────

/**
 * Met à jour l'indicateur de progression en haut de la page.
 * @param {string} activeName - nom de l'étape active
 */
export function renderStepIndicator(activeName) {
  const container = document.getElementById('step-indicator');
  if (!container) return;

  const activeIdx = STEPS.findIndex(s => s.name === activeName);
  container.innerHTML = STEPS.map((s, i) => {
    const state = i < activeIdx ? 'done' : i === activeIdx ? 'active' : 'pending';
    const inner = state === 'done' ? '✓' : String(i + 1);
    const connector = i < STEPS.length - 1
      ? `<div class="step-connector ${i < activeIdx ? 'done' : ''}"></div>` : '';
    return `
      <div class="step-item">
        <div class="step-badge step-${state}">${inner}</div>
        <div class="step-label">${s.label}</div>
      </div>${connector}`.trim();
  }).join('');
}

// ── Aperçu CSV ────────────────────────────────────────────

/**
 * Affiche un aperçu tabulaire des 5 premières lignes du CSV.
 * @param {string[][]} rows - tableau 2D (header + données)
 */
export function renderPreview(rows) {
  const container = document.getElementById('import-step-preview');
  if (!container) return;

  const header = rows[0] ?? [];
  const data   = rows.slice(1, 6);

  const thead = `<tr>${header.map(h => `<th>${esc(h)}</th>`).join('')}</tr>`;
  const tbody = data.map(row =>
    `<tr>${row.map(cell => `<td>${esc(cell)}</td>`).join('')}</tr>`
  ).join('');

  const wrap = container.querySelector('#preview-table-wrap');
  if (wrap) {
    wrap.innerHTML = `
      <div class="preview-table-wrap">
        <table class="preview-table">
          <thead>${thead}</thead>
          <tbody>${tbody}</tbody>
        </table>
      </div>
      <p class="import-step-hint">${rows.length - 1} lignes détectées (hors en-tête).</p>`;
  }
}

// ── Mapping colonnes ──────────────────────────────────────

/**
 * Affiche le formulaire de mapping colonnes CSV → champs BDD.
 * @param {string[]} headers - ligne d'en-tête du CSV
 * @param {object}   mapping - { colIndex: fieldValue }
 */
export function renderMapping(headers, mapping) {
  const container = document.getElementById('import-mapping-container');
  if (!container) return;

  container.innerHTML = headers.map((h, i) => {
    const current = mapping[i] ?? '';
    const opts    = FIELD_OPTIONS.map(o => {
      const sel = o.value === current ? 'selected' : '';
      return `<option value="${o.value}" ${sel}>${o.label}</option>`;
    }).join('');
    return `
      <div class="mapping-row">
        <div class="mapping-col-name">${esc(h)}</div>
        <div class="mapping-arrow">→</div>
        <select class="mapping-select" data-col="${i}">${opts}</select>
      </div>`;
  }).join('');
}

// ── Barre de progression ──────────────────────────────────

/**
 * Met à jour la barre de progression et le label pendant l'import.
 * @param {number} done  - lignes traitées
 * @param {number} total - total de lignes
 */
export function renderProgress(done, total) {
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
  const bar   = document.getElementById('import-progress-bar');
  const label = document.getElementById('import-progress-label');
  if (bar)   bar.style.width = `${pct}%`;
  if (label) label.textContent = `${done} / ${total} lignes traitées`;
}

// ── Rapport final ─────────────────────────────────────────

/**
 * Affiche le rapport de résultat après l'import.
 * @param {{ prospects: number, contacts: number, errors: string[] }} results
 */
export function renderReport(results) {
  const container = document.getElementById('import-report-content');
  if (!container) return;

  const errorsHTML = results.errors.length ? `
    <div class="import-errors-wrap">
      <p class="import-errors-title">${results.errors.length} erreur(s) :</p>
      <ul class="import-errors-list">
        ${results.errors.map(e => `<li class="import-error">${esc(e)}</li>`).join('')}
      </ul>
    </div>` : '';

  container.innerHTML = `
    <div class="import-report">
      <p class="import-stat import-success">✓ ${results.prospects} prospect(s) importé(s)</p>
      <p class="import-stat import-success">✓ ${results.contacts} contact(s) importé(s)</p>
      ${results.errors.length
        ? `<p class="import-stat import-error-stat">⚠ ${results.errors.length} erreur(s)</p>`
        : ''}
      ${errorsHTML}
    </div>`;
}

// ── Auto-mapping ──────────────────────────────────────────

/**
 * Retourne le champ BDD le plus probable pour un en-tête CSV donné.
 * @param {string} header
 * @returns {string} valeur de champ ou '' si non reconnu
 */
export function autoMapHeader(header) {
  const rule = AUTOMAP_RULES.find(r => r.test.test(header));
  return rule ? rule.field : '';
}

// ── Utils ─────────────────────────────────────────────────

/** @param {string} str @returns {string} */
function esc(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
