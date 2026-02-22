/* =======================================================
   prospect-detail.js — Fiche prospect : lecture, édition, suppression
   Coordinateur : charge les données, délègue aux sous-modules.
   ======================================================= */
import { fetchProspectById, fetchInteractions, fetchRappels, fetchContacts,
         deleteProspect } from './supabase-client.js';
import { toast }          from './ui-components.js';
import { openPanel, modal, closeModal } from './ui-panels.js';
import { getStatut, getRetour, getCanal, METIERS, ROLES_EMPLOYE, STATUTS_RAPPEL,
         CANAUX_INTERACTION } from './config.js';

let _prospect = null;

// ── Init ──────────────────────────────────────────────────
export async function initProspectDetail() {
  const id = window.CRM?.routeParams?.id;
  if (!id) { window.location.hash = '/prospects'; return; }
  document.getElementById('btn-back')
    ?.addEventListener('click', () => { window.location.hash = '/prospects'; });
  await loadProspect(id);
}

// ── Chargement ────────────────────────────────────────────
async function loadProspect(id) {
  const [{ data: prospect, error }, { data: interactions }, { data: rappels }] =
    await Promise.all([fetchProspectById(id), fetchInteractions(id), fetchRappels({ prospect_id: id })]);
  if (error || !prospect) {
    toast('Prospect introuvable.', 'error');
    window.location.hash = '/prospects';
    return;
  }
  _prospect = prospect;
  renderHeader(prospect);
  renderInfoGrid(prospect);
  renderContacts(prospect.contacts ?? []);
  renderTimeline(interactions ?? []);
  renderRappels(rappels ?? []);
  bindPanelButtons(id);
}

// ── Header condensé ───────────────────────────────────────
function renderHeader(p) {
  const fill = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '—'; };
  fill('detail-nom', p.nom);
  const badgesEl = document.getElementById('detail-badges');
  if (badgesEl) {
    const st = p.statut ? getStatut(p.statut) : null;
    const re = p.retour ? getRetour(p.retour) : null;
    badgesEl.innerHTML = [
      st ? `<span class="badge badge-${st.badgeType}">${st.label}</span>` : '',
      re ? `<span class="badge badge-${re.badgeType}">${re.label}</span>` : '',
    ].join('');
  }
  const metierLabel = METIERS.find(m => m.value === p.metier)?.label ?? p.metier ?? null;
  fill('dhc-siret',  p.siret     ? `🏢 ${formatSiret(p.siret)}` : null);
  fill('dhc-metier', metierLabel ? `🔧 ${metierLabel}` : null);
  fill('dhc-email',  p.email     ? `✉ ${p.email}` : null);
  fill('dhc-phone',  p.telephone ? `📞 ${p.telephone}` : null);
  fill('dhc-web',    p.site_web  ? `🌐 ${p.site_web}` : null);
  const siretEl = document.getElementById('dhc-siret');
  if (siretEl && p.siret) {
    siretEl.addEventListener('click', () =>
      navigator.clipboard.writeText(p.siret.replace(/\s/g, ''))
        .then(() => toast('SIRET copié.', 'success'))
        .catch(() => toast('Copie non supportée.', 'error')));
  }
  const commEl = document.getElementById('detail-commercial-label');
  if (commEl && p.profiles?.nom) commEl.textContent = p.profiles.nom;
  // Modifier (clone → évite doublons d'écouteurs)
  const editBtn = document.getElementById('btn-edit-prospect');
  if (editBtn) {
    const fe = editBtn.cloneNode(true);
    editBtn.replaceWith(fe);
    fe.addEventListener('click', async () => {
      const { initProspectEdit } = await import('./prospect-edit.js');
      initProspectEdit(_prospect, () => loadProspect(_prospect.id));
    });
  }
  // Supprimer
  bindDeleteButton(p);
}

// ── Suppression ───────────────────────────────────────────
const MODAL_ID = 'modal-delete-prospect';

/** Attache le bouton Supprimer (cloné pour éviter accumulation d'écouteurs). */
function bindDeleteButton(prospect) {
  const btn = document.getElementById('btn-delete-prospect');
  if (!btn) return;
  const fresh = btn.cloneNode(true);
  btn.replaceWith(fresh);
  fresh.addEventListener('click', () => openDeleteModal(prospect));
}

/** Injecte et ouvre la modale de confirmation de suppression. */
function openDeleteModal(prospect) {
  document.getElementById(`${MODAL_ID}-overlay`)?.remove();
  const body = `<p style="font-size:var(--text-sm);color:var(--color-text);line-height:1.6">
    Cette action est irréversible. Le prospect <strong>${esc(prospect.nom)}</strong>,
    ainsi que tous ses contacts, interactions et rappels associés,
    seront définitivement supprimés.</p>`;
  const footer = `
    <button class="btn btn-ghost" id="mdl-cancel">Annuler</button>
    <button class="btn" id="mdl-confirm" style="background:var(--color-danger);color:#fff">
      <span id="mdl-txt">Supprimer définitivement</span></button>`;
  document.body.insertAdjacentHTML('beforeend',
    modal(MODAL_ID, 'Supprimer ce prospect ?', body, footer));
  const overlay = document.getElementById(`${MODAL_ID}-overlay`);
  overlay.classList.add('open');
  overlay.addEventListener('click', e => {
    if (e.target === overlay || e.target.id === 'mdl-cancel' ||
        e.target.closest('[data-modal-close]')) closeModal(MODAL_ID);
  });
  document.getElementById('mdl-confirm')?.addEventListener('click', () => confirmDelete(prospect));
}

/** Exécute la suppression Supabase et redirige en cas de succès. */
async function confirmDelete(prospect) {
  const btn = document.getElementById('mdl-confirm');
  const txt = document.getElementById('mdl-txt');
  if (!btn) return;
  btn.disabled = true;
  if (txt) txt.textContent = 'Suppression…';
  const { error } = await deleteProspect(prospect.id);
  if (error) {
    btn.disabled = false;
    if (txt) txt.textContent = 'Supprimer définitivement';
    toast(`Erreur : ${error.message}`, 'error');
    return;
  }
  closeModal(MODAL_ID);
  toast('Prospect supprimé.', 'success');
  window.location.hash = '/prospects';
}

// ── Info grid ─────────────────────────────────────────────
function renderInfoGrid(p) {
  const grid = document.getElementById('info-grid');
  if (!grid) return;
  const metierLabel = METIERS.find(m => m.value === p.metier)?.label ?? p.metier ?? null;
  const fields = [
    { label: 'Nom',         value: p.nom },
    { label: 'SIRET',       value: formatSiret(p.siret) },
    { label: 'Métier',      value: metierLabel },
    { label: 'Téléphone',   value: p.telephone },
    { label: 'Email',       value: p.email, link: p.email ? `mailto:${p.email}` : null },
    { label: 'Site web',    value: p.site_web, link: p.site_web },
    { label: 'Adresse',     value: p.adresse },
    { label: 'Code postal', value: p.code_postal },
    { label: 'Ville',       value: p.ville },
    { label: 'Commentaire', value: p.commentaire },
  ];
  grid.innerHTML = fields.map(f => `
    <div class="info-field">
      <div class="info-label">${esc(f.label)}</div>
      <div class="info-value${f.value ? '' : ' empty'}">
        ${f.value ? (f.link ? `<a href="${esc(f.link)}" target="_blank" rel="noopener">${esc(f.value)}</a>` : esc(f.value)) : '—'}
      </div>
    </div>`).join('');
}

// ── Contacts ──────────────────────────────────────────────
function renderContacts(contacts) {
  const tbody = document.getElementById('contacts-tbody');
  if (!tbody) return;
  if (!contacts.length) {
    tbody.innerHTML = `<tr><td colspan="4" style="padding:var(--space-6);text-align:center;color:var(--color-text-tertiary)">Aucun contact enregistré</td></tr>`;
    return;
  }
  tbody.innerHTML = contacts.map(c => {
    const role = ROLES_EMPLOYE.find(r => r.value === c.role_employe)?.label ?? '—';
    return `<tr>
      <td>${esc(c.nom)}</td><td>${esc(role)}</td>
      <td>${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : '—'}</td>
      <td>${esc(c.telephone ?? '—')}</td></tr>`;
  }).join('');
}

// ── Timeline ──────────────────────────────────────────────
function renderTimeline(interactions) {
  const tl = document.getElementById('timeline');
  if (!tl) return;
  if (!interactions.length) {
    tl.innerHTML = `<div class="empty-state"><div class="empty-state-icon">💬</div><p>Aucune interaction enregistrée</p></div>`;
    return;
  }
  tl.innerHTML = interactions.map(i => {
    const canal  = getCanal(i.canal);
    const date   = new Date(i.created_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' });
    const auteur = i.profiles?.nom ?? 'Inconnu';
    return `<div class="tl-item">
      <div class="tl-icon ${canal.tlClass}">${canal.icon}</div>
      <div class="tl-body">
        <div class="tl-header"><span class="tl-title">${canal.label}</span><span class="tl-date">${date}</span></div>
        <div class="tl-comment">${esc(i.contenu ?? '')}</div>
        <div class="tl-meta">${esc(auteur)}</div>
      </div></div>`;
  }).join('');
}

// ── Rappels ───────────────────────────────────────────────
function renderRappels(rappels) {
  const list = document.getElementById('rappels-list');
  if (!list) return;
  if (!rappels.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔔</div><p>Aucun rappel</p></div>`;
    return;
  }
  list.innerHTML = rappels.map(r => {
    const st   = STATUTS_RAPPEL.find(s => s.value === r.statut);
    const date = new Date(r.date_rappel).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' });
    return `<div class="rappel-item">
      <div><div class="rappel-date">${date}</div><div class="rappel-motif">${esc(r.motif ?? '—')}</div></div>
      ${st ? `<span class="badge badge-${st.badgeType}">${st.label}</span>` : ''}
    </div>`;
  }).join('');
}

// ── Panels boutons ────────────────────────────────────────
function bindPanelButtons(prospectId) {
  document.getElementById('btn-new-contact')?.addEventListener('click', async () => {
    const { initContactPanel } = await import('./contact-form.js');
    initContactPanel(prospectId, () => loadProspect(prospectId));
    openPanel('panel-new-contact');
  });
  document.getElementById('btn-new-interaction')?.addEventListener('click', async () => {
    const { initInteractionPanel } = await import('./interaction-form.js');
    initInteractionPanel(prospectId, () => loadProspect(prospectId));
    openPanel('panel-new-interaction');
  });
  document.getElementById('btn-new-rappel')?.addEventListener('click', async () => {
    const { initRappelPanel } = await import('./rappel-form.js');
    initRappelPanel(prospectId, () => loadProspect(prospectId));
    openPanel('panel-new-rappel');
  });
}

// ── Utils ─────────────────────────────────────────────────
function formatSiret(siret) {
  if (!siret) return null;
  return siret.replace(/(\d{3})(?=\d)/g, '$1 ');
}
function esc(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
