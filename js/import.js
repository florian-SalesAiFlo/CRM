/* =======================================================
   import.js — Import CSV legacy → Cosmos
   Point d'entrée : initImport()
   ======================================================= */

import { createProspect, createContact } from './supabase-client.js';
import { renderPreview, renderMapping, renderProgress, renderReport, autoMapHeader, renderStepIndicator } from './import-render.js';

// ── État module ───────────────────────────────────────────
let _rows    = [];   // toutes les lignes du CSV (header inclus)
let _mapping = {};   // { colIndex: 'prospect.nom' | 'contact.email' | '' }

// ── CSV Parser ────────────────────────────────────────────

/**
 * Détecte le séparateur dominant (virgule ou point-virgule).
 * @param {string} firstLine
 * @returns {',' | ';'}
 */
function detectSeparator(firstLine) {
  const sc = (firstLine.match(/;/g) ?? []).length;
  const cm = (firstLine.match(/,/g) ?? []).length;
  return sc >= cm ? ';' : ',';
}

/**
 * Parse un CSV UTF-8 en tableau 2D.
 * Gère : guillemets, retours à la ligne dans les champs, séparateur auto.
 * @param {string} text  - contenu brut du fichier
 * @returns {string[][]}
 */
export function parseCSV(text) {
  const sep = detectSeparator(text.split('\n')[0] ?? '');
  const rows = [];
  let row = [], field = '', inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i], next = text[i + 1];
    if (inQuotes) {
      if (c === '"' && next === '"') { field += '"'; i++; }
      else if (c === '"')            { inQuotes = false; }
      else                           { field += c; }
    } else {
      if (c === '"')                 { inQuotes = true; }
      else if (c === sep)            { row.push(field.trim()); field = ''; }
      else if (c === '\n' || (c === '\r' && next === '\n')) {
        if (c === '\r') i++;
        row.push(field.trim());
        if (row.some(v => v !== '')) rows.push(row);
        row = []; field = '';
      } else { field += c; }
    }
  }
  if (field !== '' || row.length) { row.push(field.trim()); if (row.some(v => v !== '')) rows.push(row); }
  return rows;
}

// ── Validation ────────────────────────────────────────────

/** @param {string} v @returns {boolean} */
function isValidSiret(v) { return !v || /^\d{9}(\s?\d{5})?$/.test(v.replace(/\s/g, '')); }
/** @param {string} v @returns {boolean} */
function isValidEmail(v) { return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

/**
 * Valide une ligne et retourne un message d'erreur ou null.
 * @param {Object} p  - données prospect extraites
 * @param {number} lineNum
 * @returns {string|null}
 */
function validateLine(p, lineNum) {
  if (!p.nom?.trim()) return `Ligne ${lineNum} : champ "nom" manquant.`;
  if (!isValidSiret(p.siret)) return `Ligne ${lineNum} : SIRET invalide (${p.siret}).`;
  if (!isValidEmail(p.email)) return `Ligne ${lineNum} : email prospect invalide (${p.email}).`;
  return null;
}

// ── Extraction depuis mapping ─────────────────────────────

/**
 * Extrait les données prospect et contact d'une ligne CSV selon le mapping actif.
 * @param {string[]} row
 * @returns {{ prospect: Object, contact: Object|null }}
 */
function extractRow(row) {
  const prospect = {}, contact = {};
  let hasContact = false;

  for (const [colIdx, field] of Object.entries(_mapping)) {
    if (!field) continue;
    const val = row[+colIdx] ?? '';
    const [table, key] = field.split('.');
    if (table === 'prospect') prospect[key] = val || null;
    if (table === 'contact')  { contact[key] = val || null; hasContact = true; }
  }

  return { prospect, contact: hasContact && contact.nom ? contact : null };
}

// ── Import ────────────────────────────────────────────────

/**
 * Lance l'import des lignes CSV vers Supabase.
 * Traite par micro-batches de 10 pour ne pas bloquer le navigateur.
 */
async function runImport() {
  showStep('progress');
  const headers = _rows[0];
  const dataRows = _rows.slice(1);
  const results = { prospects: 0, contacts: 0, errors: [] };
  const total = dataRows.length;

  for (let i = 0; i < total; i++) {
    const lineNum = i + 2; // ligne 1 = headers
    const { prospect, contact } = extractRow(dataRows[i]);

    const validErr = validateLine(prospect, lineNum);
    if (validErr) { results.errors.push(validErr); renderProgress(i + 1, total); continue; }

    const { data: created, error: pErr } = await createProspect(prospect);
    if (pErr) {
      results.errors.push(`Ligne ${lineNum} : ${pErr.message}`);
    } else {
      results.prospects++;
      if (contact && created?.id) {
        const { error: cErr } = await createContact(created.id, contact);
        if (cErr) results.errors.push(`Ligne ${lineNum} (contact) : ${cErr.message}`);
        else results.contacts++;
      }
    }

    renderProgress(i + 1, total);
    // Micro-pause tous les 10 pour libérer le thread UI
    if ((i + 1) % 10 === 0) await new Promise(r => setTimeout(r, 0));
  }

  showStep('report');
  renderReport(results);
}

// ── UI helpers ────────────────────────────────────────────

/** Montre une étape, masque les autres + met à jour le stepper. */
function showStep(name) {
  ['upload','preview','mapping','progress','report'].forEach(s => {
    const el = document.getElementById(`import-step-${s}`);
    if (el) el.hidden = s !== name;
  });
  renderStepIndicator(name);
}

/** Calcule le mapping initial (auto-détection) depuis les headers. */
function buildInitialMapping(headers) {
  return Object.fromEntries(headers.map((h, i) => [i, autoMapHeader(h)]));
}

/** Vérifie que le mapping couvre au moins le champ nom. */
function isMappingValid() {
  return Object.values(_mapping).includes('prospect.nom');
}

/** Met à jour l'état du bouton Importer. */
function refreshImportBtn() {
  const btn = document.getElementById('btn-start-import');
  if (btn) btn.disabled = !isMappingValid();
}

// ── Listeners ─────────────────────────────────────────────

function bindFileInput() {
  const input = document.getElementById('csv-file-input');
  const zone  = document.getElementById('upload-zone');

  const handleFile = file => {
    if (!file) return;
    const label = document.getElementById('upload-filename');
    if (label) { label.textContent = file.name; label.hidden = false; }
    const reader = new FileReader();
    reader.onload = e => onCSVLoaded(e.target.result);
    reader.readAsText(file, 'UTF-8');
  };

  input?.addEventListener('change', e => handleFile(e.target.files[0]));

  zone?.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
  zone?.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone?.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('dragover');
    handleFile(e.dataTransfer?.files[0]);
  });
  zone?.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') input?.click(); });
}

function onCSVLoaded(text) {
  _rows = parseCSV(text);
  if (_rows.length < 2) { alert('Le fichier CSV est vide ou ne contient pas de données.'); return; }
  _mapping = buildInitialMapping(_rows[0]);
  showStep('preview');
  renderPreview(_rows);
  showStep('mapping');
  renderMapping(_rows[0], _mapping);
  refreshImportBtn();
  bindMappingSelects();
}

function bindMappingSelects() {
  document.getElementById('import-mapping-container')
    ?.addEventListener('change', e => {
      const sel = e.target.closest('.mapping-select');
      if (!sel) return;
      _mapping[sel.dataset.col] = sel.value;
      refreshImportBtn();
    });
}

// ── Init ──────────────────────────────────────────────────

/**
 * Point d'entrée de la page import, appelé par router.js.
 */
export function initImport() {
  showStep('upload');
  bindFileInput();

  document.getElementById('btn-start-import')
    ?.addEventListener('click', runImport);

  document.getElementById('btn-import-reset')
    ?.addEventListener('click', () => {
      _rows = []; _mapping = {};
      showStep('upload');
      const input = document.getElementById('csv-file-input');
      if (input) input.value = '';
      const label = document.getElementById('upload-filename');
      if (label) label.hidden = true;
    });
}
