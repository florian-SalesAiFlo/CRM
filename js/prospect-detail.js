/* =======================================================
   prospect-detail.js — Page fiche prospect (lecture seule)
   Charge le prospect par ID, rend header, infos, contacts,
   timeline interactions, rappels.
   ======================================================= */

import { fetchProspectById, fetchInteractions, fetchRappels, fetchContacts }
  from './supabase-client.js';
import { toast }          from './ui-components.js';
import { openPanel }      from './ui-panels.js';
import { getStatut, getRetour, getCanal, METIERS, ROLES_EMPLOYE, STATUTS_RAPPEL,
         CANAUX_INTERACTION }
  from './config.js';

// ── État ──────────────────────────────────────────────────

let _prospect = null;

// ── Init ──────────────────────────────────────────────────

export async function initProspectDetail() {
  const id = window.CRM?.routeParams?.id;
  if (!id) {
    window.location.hash = '/prospects';
    return;
  }

  document.getElementById('btn-back')
    ?.addEventListener('click', () => { window.location.hash = '/prospects'; });

  await loadProspect(id);
}

// ── Chargement ────────────────────────────────────────────

async function loadProspect(id) {
  const [{ data: prospect, error }, { data: interactions }, { data: rappels }] =
    await Promise.all([
      fetchProspectById(id),
      fetchInteractions(id),
      fetchRappels({ prospect_id: id }),
    ]);

  if (error || !prospect) {
    toast('Prospect introuvable.', 'error');
    window.location.hash = '/prospects';
    return;
  }

  _prospect = prospect;

  // Plus de masquage/démasquage : le contenu est visible dès le départ
  renderHeader(prospect);
  renderInfoGrid(prospect);
  renderContacts(prospect.contacts ?? []);
  renderTimeline(interactions ?? []);
  renderRappels(rappels ?? []);
  bindPanelButtons(id);
}

// ── Header condensé ───────────────────────────────────────

function renderHeader(p) {
  const fill = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val || '—';
  };

  // Nom + badges statut/retour
  fill('detail-nom', p.nom);

  const badgesEl = document.getElementById('detail-badges');
  if (badgesEl) {
    const statut = p.statut ? getStatut(p.statut) : null;
    const retour = p.retour ? getRetour(p.retour) : null;
    badgesEl.innerHTML = [
      statut ? `<span class="badge badge-${statut.badgeType}">${statut.label}</span>` : '',
      retour ? `<span class="badge badge-${retour.badgeType}">${retour.label}</span>` : '',
    ].join('');
  }

  // Infos rapides DHC
  const metierLabel = METIERS.find(m => m.value === p.metier)?.label ?? p.metier ?? null;
  fill('dhc-siret',  p.siret ? `🏢 ${formatSiret(p.siret)}` : null);
  fill('dhc-metier', metierLabel ? `🔧 ${metierLabel}` : null);
  fill('dhc-email',  p.email    ? `✉ ${p.email}`    : null);
  fill('dhc-phone',  p.telephone ? `📞 ${p.telephone}` : null);
  fill('dhc-web',    p.site_web ? `🌐 ${p.site_web}` : null);

  // SIRET cliquable → copie presse-papier
  const siretEl = document.getElementById('dhc-siret');
  if (siretEl && p.siret) {
    siretEl.addEventListener('click', () => {
      navigator.clipboard.writeText(p.siret.replace(/\s/g, ''))
        .then(() => toast('SIRET copié.', 'success'))
        .catch(() => toast('Copie non supportée.', 'error'));
    });
  }

  // Bouton Modifier → édition inline lazy
  const editBtn = document.getElementById('btn-edit-prospect');
  if (editBtn) {
    const fresh = editBtn.cloneNode(true);
    editBtn.replaceWith(fresh);
    fresh.addEventListener('click', async () => {
      const { initProspectEdit } = await import('./prospect-edit.js');
      initProspectEdit(_prospect, () => loadProspect(_prospect.id));
    });
  }

  // Commercial
  const commEl = document.getElementById('detail-commercial-label');
  if (commEl && p.profiles?.nom) {
    commEl.textContent = p.profiles.nom;
  }
}

// ── Info grid ─────────────────────────────────────────────

function renderInfoGrid(p) {
  const grid = document.getElementById('info-grid');
  if (!grid) return;

  const metierLabel = METIERS.find(m => m.value === p.metier)?.label ?? p.metier ?? null;

  const fields = [
    { label: 'Nom',          value: p.nom },
    { label: 'SIRET',        value: formatSiret(p.siret) },
    { label: 'Métier',       value: metierLabel },
    { label: 'Téléphone',    value: p.telephone },
    { label: 'Email',        value: p.email, link: p.email ? `mailto:${p.email}` : null },
    { label: 'Site web',     value: p.site_web, link: p.site_web },
    { label: 'Adresse',      value: p.adresse },
    { label: 'Code postal',  value: p.code_postal },
    { label: 'Ville',        value: p.ville },
    { label: 'Commentaire',  value: p.commentaire },
  ];

  grid.innerHTML = fields.map(f => `
    <div class="info-field">
      <div class="info-label">${esc(f.label)}</div>
      <div class="info-value${f.value ? '' : ' empty'}">
        ${f.value
          ? (f.link
              ? `<a href="${esc(f.link)}" target="_blank" rel="noopener">${esc(f.value)}</a>`
              : esc(f.value))
          : '—'}
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
    const role = ROLES_EMPLOYE.find(r => r.value === c.role)?.label ?? '—';
    return `<tr>
      <td>${esc(c.nom)}</td>
      <td>${esc(role)}</td>
      <td>${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : '—'}</td>
      <td>${esc(c.telephone ?? '—')}</td>
    </tr>`;
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
    return `
      <div class="tl-item">
        <div class="tl-icon ${canal.tlClass}">${canal.icon}</div>
        <div class="tl-body">
          <div class="tl-header">
            <span class="tl-title">${canal.label}</span>
            <span class="tl-date">${date}</span>
          </div>
          <div class="tl-comment">${esc(i.contenu ?? '')}</div>
          <div class="tl-meta">${esc(auteur)}</div>
        </div>
      </div>`;
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
    const statut = STATUTS_RAPPEL.find(s => s.value === r.statut);
    const date   = new Date(r.date_rappel).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' });
    return `
      <div class="rappel-item">
        <div>
          <div class="rappel-date">${date}</div>
          <div class="rappel-motif">${esc(r.motif ?? '—')}</div>
        </div>
        ${statut ? `<span class="badge badge-${statut.badgeType}">${statut.label}</span>` : ''}
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
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}
