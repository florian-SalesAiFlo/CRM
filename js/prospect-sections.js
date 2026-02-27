/* =======================================================
   prospect-sections.js — Rendu contacts et timeline
   Extrait de prospect-detail.js pour respecter la limite 300 lignes.
   Export : renderContacts(contacts), renderTimeline(interactions)
   ======================================================= */

import { getCanal, ROLES_EMPLOYE, TRANCHES_EFFECTIF, TYPES_ETABLISSEMENT, SEXES } from './config.js';
import { badgeSelect } from './ui-components.js';
import { editableField } from './prospect-inline-edit.js';

// ── SVG partagés ──────────────────────────────────────────
const SVG = {
  edit:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  delete: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>`,
};

// ── Contacts ──────────────────────────────────────────────

/**
 * Injecte le tableau de contacts dans #contacts-tbody.
 * @param {Array} contacts
 */
export function renderContacts(contacts) {
  const tbody = document.getElementById('contacts-tbody');
  if (!tbody) return;

  if (!contacts.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-cell">Aucun contact enregistré</td></tr>`;
    return;
  }

  tbody.innerHTML = contacts.map(c => {
    const nomComplet = [c.prenom, c.nom].filter(Boolean).map(esc).join(' ') || '—';
    const roleLabel  = c.role_employe === 'autre' && c.role_custom
      ? c.role_custom
      : (ROLES_EMPLOYE.find(r => r.value === c.role_employe)?.label ?? '—');
    const encoded = esc(JSON.stringify(c));
    return `<tr>
      <td>${nomComplet}</td>
      <td><span class="badge badge-secondary">${esc(roleLabel)}</span></td>
      <td>${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : '—'}</td>
      <td>${esc(c.telephone ?? '—')}</td>
      <td class="col-actions">
        <span class="row-actions">
          <button class="row-action-btn row-action-edit contact-edit"
            data-contact='${encoded}' title="Modifier" aria-label="Modifier ${esc(c.nom)}">${SVG.edit}</button>
          <button class="row-action-btn row-action-delete contact-delete"
            data-id="${esc(c.id)}" data-nom="${esc(c.nom)}" title="Supprimer"
            aria-label="Supprimer ${esc(c.nom)}">${SVG.delete}</button>
        </span>
      </td>
    </tr>`;
  }).join('');
}

// ── Timeline interactions ─────────────────────────────────

/**
 * Injecte la timeline dans #timeline.
 * @param {Array} interactions
 */
export function renderTimeline(interactions) {
  const tl = document.getElementById('timeline');
  if (!tl) return;

  if (!interactions.length) {
    tl.innerHTML = `<div class="empty-state"><div class="empty-state-icon">💬</div><p>Aucune interaction enregistrée</p></div>`;
    return;
  }

  tl.innerHTML = interactions.map(buildTimelineItem).join('');
}

/**
 * Construit le HTML d'un item de timeline.
 * @param {object} i - interaction
 * @returns {string} HTML
 */
function buildTimelineItem(i) {
  const canal   = getCanal(i.canal);
  const date    = new Date(i.created_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' });
  const auteur  = i.profiles?.nom ?? 'Inconnu';
  const encoded = esc(JSON.stringify(i));
  const actions = `<span class="row-actions">
    <button class="row-action-btn row-action-edit interaction-edit"
      data-interaction='${encoded}' title="Modifier">${SVG.edit}</button>
    <button class="row-action-btn row-action-delete interaction-delete"
      data-id="${esc(i.id)}" title="Supprimer">${SVG.delete}</button>
  </span>`;

  return `<div class="tl-item canal-${esc(i.canal ?? '')}">
    <div class="tl-body">
      <div class="tl-header">
        <span class="tl-title">${canal.label}</span>
        <span class="tl-date">${date}</span>
        ${actions}
      </div>
      <div class="tl-comment">${esc(i.contenu ?? '')}</div>
      <div class="tl-meta">${esc(auteur)}</div>
    </div>
  </div>`;
}

// ── Utils ─────────────────────────────────────────────────

/** @param {string|null} str @returns {string} */
function esc(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ── Section Identité entreprise ───────────────────────────

/**
 * Génère le HTML de la section "Identité entreprise".
 * @param {object} p - prospect
 * @returns {string} HTML
 */
export function renderSectionIdentite(p) {
  return `
    <div class=\"info-field\">
      <div class=\"info-label\">SIRET</div>
      <div class=\"info-value\">${editableField('siret', formatSiret(p.siret), p.id)}</div>
    </div>
    <div class=\"info-field\">
      <div class=\"info-label\">Sigle</div>
      <div class=\"info-value\">${editableField('sigle', p.sigle, p.id)}</div>
    </div>
    <div class=\"info-field\">
      <div class=\"info-label\">Type établissement</div>
      <div class=\"info-value\">${badgeSelect('type_etablissement', TYPES_ETABLISSEMENT, p.type_etablissement ?? '')}</div>
    </div>
    <div class=\"info-field\">
      <div class=\"info-label\">Effectif</div>
      <div class=\"info-value\">${badgeSelect('tranche_effectif', TRANCHES_EFFECTIF, p.tranche_effectif ?? '')}</div>
    </div>
    <div class=\"info-field\">
      <div class=\"info-label\">Activité (NAF)</div>
      <div class=\"info-value\" id=\"field-activite-principale\">${esc(p.activite_principale ?? '—')}</div>
    </div>
    <div class=\"info-field\">
      <div class=\"info-label\">Date de création</div>
      <div class=\"info-value\">${editableField('date_creation', p.date_creation, p.id)}</div>
    </div>`;
}

// ── Section Coordonnées ───────────────────────────────────

/**
 * Génère le HTML de la section "Coordonnées".
 * @param {object} p - prospect
 * @returns {string} HTML
 */
export function renderSectionCoordonnees(p) {
  return `
    <div class=\"info-field\">
      <div class=\"info-label\">Téléphone</div>
      <div class=\"info-value\">${editableField('telephone', p.telephone, p.id)}</div>
    </div>
    <div class=\"info-field\">
      <div class=\"info-label\">Email</div>
      <div class=\"info-value\">${editableField('email', p.email, p.id)}</div>
    </div>
    <div class=\"info-field\">
      <div class=\"info-label\">Site web</div>
      <div class=\"info-value\">${editableField('site_web', p.site_web, p.id)}</div>
    </div>
    <div class=\"info-field info-field--full\">
      <div class=\"info-label\">Adresse</div>
      <div class=\"info-value\">${editableField('adresse', p.adresse, p.id)}</div>
    </div>
    <div class=\"info-field\">
      <div class=\"info-label\">Code postal</div>
      <div class=\"info-value\">${editableField('code_postal', p.code_postal, p.id)}</div>
    </div>
    <div class=\"info-field\">
      <div class=\"info-label\">Ville</div>
      <div class=\"info-value\">${editableField('ville', p.ville, p.id)}</div>
    </div>
    <div class=\"info-field info-field--full\">
      <div class=\"info-label\">Commentaire</div>
      <div class=\"info-value\">${editableField('commentaire', p.commentaire, p.id)}</div>
    </div>`;
}

// ── Section Dirigeant ─────────────────────────────────────

/**
 * Génère le HTML de la section "Dirigeant".
 * @param {object} p - prospect
 * @returns {string} HTML
 */
export function renderSectionGerant(p) {
  return `
    <div class=\"info-field\">
      <div class=\"info-label\">Prénom</div>
      <div class=\"info-value\">${editableField('prenom_gerant', p.prenom_gerant, p.id)}</div>
    </div>
    <div class=\"info-field\">
      <div class=\"info-label\">Nom</div>
      <div class=\"info-value\">${editableField('nom_gerant', p.nom_gerant, p.id)}</div>
    </div>
    <div class=\"info-field\">
      <div class=\"info-label\">Sexe</div>
      <div class=\"info-value\">${badgeSelect('sexe_gerant', SEXES, p.sexe_gerant ?? '')}</div>
    </div>`;
}

/** Formate un SIRET : groupes de 3 chiffres séparés par espace. */
function formatSiret(s) { return s ? s.replace(/(\d{3})(?=\d)/g, '$1 ') : null; }
