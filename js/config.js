/* =======================================================
   config.js — Constantes métier CRM M2BPO
   TOUTES les valeurs métier (labels, options, couleurs)
   vivent ici. Importer depuis ce fichier uniquement.
   ======================================================= */

// ── Statuts prospect ─────────────────────────────────────

export const STATUTS_PROSPECT = [
  {
    value: 'a_definir',
    label: 'À définir',
    hlClass: 'hl-orange',
    badgeType: 'warning',
    color: 'var(--color-warning)',
    bg: 'var(--color-warning-soft)',
  },
  {
    value: 'defini',
    label: 'Défini',
    hlClass: 'hl-green',
    badgeType: 'success',
    color: 'var(--color-success)',
    bg: 'var(--color-success-soft)',
  },
  {
    value: 'ferme',
    label: 'Fermé',
    hlClass: 'hl-red',
    badgeType: 'danger',
    color: 'var(--color-danger)',
    bg: 'var(--color-danger-soft)',
  },
];

// ── Retours prospect ──────────────────────────────────────

export const RETOURS_PROSPECT = [
  { value: 'positif',    label: 'Positif',    badgeType: 'success' },
  { value: 'neutre',     label: 'Neutre',     badgeType: 'secondary' },
  { value: 'negatif',    label: 'Négatif',    badgeType: 'danger' },
  { value: 'pas_de_mp',  label: 'Pas de MP',  badgeType: 'secondary' },
];

// ── Métiers ───────────────────────────────────────────────

export const METIERS = [
  { value: 'architecte',  label: 'Architecte' },
  { value: 'urbaniste',   label: 'Urbaniste' },
  { value: 'paysagiste',  label: 'Paysagiste' },
  { value: 'bet_tce',     label: 'BET TCE' },
  { value: 'autres_bet',  label: 'Autres BET' },
];

// ── Volumes de candidatures ───────────────────────────────

export const VOLUMES_CANDIDATURES = [
  { value: 'aucune_info', label: 'Aucune info' },
  { value: 'non',         label: 'Non' },
  { value: '1_mois',      label: '1/mois' },
  { value: '2_a_4',       label: '2 à 4' },
  { value: '5_a_15',      label: '5 à 15' },
  { value: '15_plus',     label: '15+' },
];

// ── Canaux d'interaction ──────────────────────────────────

export const CANAUX_INTERACTION = [
  { value: 'email',          label: 'Email',           icon: '✉',  cssClass: 'ch-email',    tlClass: 'email' },
  { value: 'telephone',      label: 'Téléphone',       icon: '📞', cssClass: 'ch-phone',    tlClass: 'phone' },
  { value: 'linkedin',       label: 'LinkedIn',        icon: 'in', cssClass: 'ch-linkedin', tlClass: 'linkedin' },
  { value: 'messagerie',     label: 'Messagerie',      icon: '💬', cssClass: 'ch-msg',      tlClass: 'msg' },
  { value: 'note_interne',   label: 'Note interne',    icon: '📝', cssClass: 'ch-note',     tlClass: 'note' },
];

// ── Rôles utilisateur ─────────────────────────────────────

export const ROLES_UTILISATEUR = [
  { value: 'admin',       label: 'Admin' },
  { value: 'manager',     label: 'Manager' },
  { value: 'commercial',  label: 'Commercial' },
];

// ── Statuts rappel ────────────────────────────────────────

export const STATUTS_RAPPEL = [
  { value: 'planifie',  label: 'Planifié',  badgeType: 'info' },
  { value: 'effectue',  label: 'Effectué',  badgeType: 'success' },
  { value: 'reporte',   label: 'Reporté',   badgeType: 'warning' },
  { value: 'annule',    label: 'Annulé',    badgeType: 'secondary' },
];

// ── Presets de délai pour rappels ─────────────────────────

export const PRESETS_RAPPEL = [
  { label: 'J+1',          days: 1,    isSystem: false },
  { label: 'J+7',          days: 7,    isSystem: false },
  { label: 'J+30',         days: 30,   isSystem: false },
  { label: 'M+11 réabo',   months: 11, isSystem: true  },
  { label: 'Revue annuelle', months: 12, isSystem: true },
];

// ── Rôles employé (contact dans la fiche) ─────────────────

export const ROLES_EMPLOYE = [
  { value: 'inconnu',   label: 'Inconnu' },
  { value: 'dirigeant', label: 'Dirigeant' },
  { value: 'associe',   label: 'Associé' },
  { value: 'salarie',   label: 'Salarié' },
  { value: 'autre',     label: 'Autre' },
];

// ── Configuration Supabase ────────────────────────────────
// Les vraies valeurs sont injectées via des variables d'env
// ou un fichier .env.local non versionné.

export const SUPABASE_CONFIG = {
  url:'https://supabase.com/dashboard/project/mlybcxtnnoupvwromwhf',     anonKey:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1seWJjeHRubm91cHZ3cm9td2hmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1OTkwMTcsImV4cCI6MjA4NzE3NTAxN30.r69K7wLWlVIlx2Hcmn194qUkT0Net7O6a_fj5mKWK8I',
};

// ── Helpers de lookup ─────────────────────────────────────

/**
 * Retourne l'objet statut correspondant à une valeur donnée.
 * @param {string} value
 * @returns {object}
 */
export function getStatut(value) {
  return STATUTS_PROSPECT.find(s => s.value === value)
    ?? STATUTS_PROSPECT[0];
}

/**
 * Retourne l'objet retour correspondant à une valeur donnée.
 * @param {string} value
 * @returns {object}
 */
export function getRetour(value) {
  return RETOURS_PROSPECT.find(r => r.value === value)
    ?? RETOURS_PROSPECT[1];
}

/**
 * Retourne l'objet canal correspondant à une valeur donnée.
 * @param {string} value
 * @returns {object}
 */
export function getCanal(value) {
  return CANAUX_INTERACTION.find(c => c.value === value)
    ?? CANAUX_INTERACTION[4];
}

// ── Options de report rapide ──────────────────────────────

export const OPTIONS_REPORT = [
  { value: '1',     label: 'Demain' },
  { value: '3',     label: 'Dans 3 jours' },
  { value: 'lundi', label: 'Semaine prochaine' },
];

// ── Types abonnement ──────────────────────────────────────

export const TYPES_ABO = [
  { value: 'aucun',   label: 'Aucun',    badgeType: 'secondary' },
  { value: 'essai',   label: 'Essai',    badgeType: 'info' },
  { value: 'mensuel', label: 'Mensuel',  badgeType: 'primary' },
  { value: 'annuel',  label: 'Annuel',   badgeType: 'success' },
];

// ── Statuts abonnement ────────────────────────────────────

export const STATUTS_ABO = [
  { value: 'actif',       label: 'Actif',       badgeType: 'success' },
  { value: 'en_attente',  label: 'En attente',  badgeType: 'warning' },
  { value: 'expire',      label: 'Expiré',      badgeType: 'danger' },
  { value: 'resilie',     label: 'Résilié',     badgeType: 'danger' },
];

// ── Tranches d'effectif ───────────────────────────────────

export const TRANCHES_EFFECTIF = [
  { value: '',        label: '—',               badgeType: 'secondary' },
  { value: '0',       label: '0 salarié',       badgeType: 'secondary' },
  { value: '1-2',     label: '1 à 2 salariés',  badgeType: 'secondary' },
  { value: '3-5',     label: '3 à 5 salariés',  badgeType: 'secondary' },
  { value: '6-9',     label: '6 à 9 salariés',  badgeType: 'secondary' },
  { value: '10-19',   label: '10 à 19 salariés', badgeType: 'info' },
  { value: '20-49',   label: '20 à 49 salariés', badgeType: 'info' },
  { value: '50-99',   label: '50 à 99 salariés', badgeType: 'primary' },
  { value: '100-199', label: '100 à 199 salariés', badgeType: 'primary' },
  { value: '200-499', label: '200 à 499 salariés', badgeType: 'success' },
  { value: '500+',    label: '500 et plus',      badgeType: 'success' },
];

// ── Types établissement ───────────────────────────────────

export const TYPES_ETABLISSEMENT = [
  { value: '',           label: '—',          badgeType: 'secondary' },
  { value: 'principal',  label: 'Principal',  badgeType: 'primary' },
  { value: 'secondaire', label: 'Secondaire', badgeType: 'secondary' },
];

// ── Sexe gérant ───────────────────────────────────────────

export const SEXES = [
  { value: '', label: '—',     badgeType: 'secondary' },
  { value: 'M', label: 'Homme', badgeType: 'info' },
  { value: 'F', label: 'Femme', badgeType: 'info' },
];
