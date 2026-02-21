/* =======================================================
   supabase-client.js — Init Supabase + helpers CRUD
   Toutes les fonctions retournent { data, error }.
   Importer depuis les modules métier (prospects.js, etc.)
   ======================================================= */

import { SUPABASE_CONFIG } from './config.js';

// ── Client Supabase (singleton) ───────────────────────────

let _client = null;

/**
 * Initialise et retourne le client Supabase (singleton).
 * Doit être appelé une seule fois au démarrage de l'app.
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function initSupabase() {
  if (_client) return _client;

  if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey) {
    throw new Error('[supabase-client] SUPABASE_URL et SUPABASE_KEY sont requis.');
  }

  // Le SDK Supabase est chargé en <script> CDN dans index.html.
  // window.supabase est exposé globalement par le bundle UMD.
  // ⚠️ NE PAS MODIFIER ce bloc createClient — options auth critiques.
  _client = window.supabase.createClient(
    SUPABASE_CONFIG.url,
    SUPABASE_CONFIG.anonKey,
    {
      auth: {
        persistSession: true,
        storageKey: 'crm-m2bpo-auth',
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'implicit'
      }
    }
  );

  return _client;
}

/**
 * Retourne le client initialisé. Lance une erreur si non init.
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
function getClient() {
  if (!_client) throw new Error('[supabase-client] Appeler initSupabase() d\'abord.');
  return _client;
}

// ── Prospects ─────────────────────────────────────────────

/**
 * Récupère la liste des prospects avec filtres optionnels.
 * @param {object} [filters]
 * @param {string} [filters.statut]
 * @param {string} [filters.metier]
 * @param {string} [filters.commercial_id]
 * @param {string} [filters.search]
 * @param {number} [filters.limit]
 * @param {number} [filters.offset]
 * @returns {Promise<{data: Array, error: object|null}>}
 */
export async function fetchProspects(filters = {}) {
  const db = getClient();
  const { statut, metier, commercial_id, search, limit = 100, offset = 0 } = filters;

  let query = db
    .from('prospects')
    .select('*, profiles!commercial_id(nom, email)')
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (statut)        query = query.eq('statut', statut);
  if (metier)        query = query.eq('metier', metier);
  if (commercial_id) query = query.eq('commercial_id', commercial_id);
  if (search)        query = query.or(`nom.ilike.%${search}%,siret.ilike.%${search}%`);

  return query;
}

/**
 * Récupère les prospects avec stats interactions pour la vue liste.
 * @param {object} [filters]
 * @returns {Promise<{data: Array, error: object|null}>}
 */
export async function fetchProspectsWithStats(filters = {}) {
  const db = getClient();
  const { statut, metier, retour, commercial_id, limit = 200, offset = 0 } = filters;

  let query = db
    .from('prospects')
    .select(`id, nom, siret, metier, statut, retour, updated_at, profiles!commercial_id(id, nom), interactions(id, created_at)`)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (statut)        query = query.eq('statut', statut);
  if (metier)        query = query.eq('metier', metier);
  if (retour)        query = query.eq('retour', retour);
  if (commercial_id) query = query.eq('commercial_id', commercial_id);

  return query;
}

/**
 * Récupère un prospect par son ID avec ses contacts et stats.
 * @param {string} id
 * @returns {Promise<{data: object|null, error: object|null}>}
 */
export async function fetchProspectById(id) {
  const db = getClient();

  return db
    .from('prospects')
    .select(`
      *,
      profiles!commercial_id(id, nom, email),
      contacts(*),
      interactions(id, canal, created_at),
      rappels(id, date_rappel, statut)
    `)
    .eq('id', id)
    .single();
}

/**
 * Crée un nouveau prospect.
 * @param {object} data
 * @returns {Promise<{data: object|null, error: object|null}>}
 */
export async function createProspect(data) {
  const db = getClient();
  return db.from('prospects').insert(data).select().single();
}

/**
 * Met à jour un prospect existant.
 * @param {string} id
 * @param {object} data
 * @returns {Promise<{data: object|null, error: object|null}>}
 */
export async function updateProspect(id, data) {
  const db = getClient();
  return db.from('prospects').update(data).eq('id', id).select().single();
}

/**
 * Déconnecte l'utilisateur courant de Supabase.
 * @returns {Promise<void>}
 */
export async function signOut() {
  const db = getClient();
  await db.auth.signOut();
}

/**
 * Supprime un prospect.
 * @param {string} id
 * @returns {Promise<{data: object|null, error: object|null}>}
 */
export async function deleteProspect(id) {
  const db = getClient();
  return db.from('prospects').delete().eq('id', id);
}

// ── Contacts ──────────────────────────────────────────────

/**
 * Récupère tous les contacts d'un prospect.
 * @param {string} prospectId
 * @returns {Promise<{data: Array, error: object|null}>}
 */
export async function fetchContacts(prospectId) {
  const db = getClient();
  return db
    .from('contacts')
    .select('*')
    .eq('prospect_id', prospectId)
    .order('created_at', { ascending: true });
}

/**
 * Crée un contact rattaché à un prospect.
 * @param {string} prospectId
 * @param {object} data
 * @returns {Promise<{data: object|null, error: object|null}>}
 */
export async function createContact(prospectId, data) {
  const db = getClient();
  return db.from('contacts').insert({ ...data, prospect_id: prospectId }).select().single();
}

/**
 * Met à jour un contact existant.
 * @param {string} id
 * @param {object} data
 * @returns {Promise<{data: object|null, error: object|null}>}
 */
export async function updateContact(id, data) {
  const db = getClient();
  return db.from('contacts').update(data).eq('id', id).select().single();
}

/**
 * Supprime un contact.
 * @param {string} id
 * @returns {Promise<{data: object|null, error: object|null}>}
 */
export async function deleteContact(id) {
  const db = getClient();
  return db.from('contacts').delete().eq('id', id);
}

// ── Interactions ──────────────────────────────────────────

/**
 * Récupère les interactions d'un prospect.
 * @param {string} prospectId
 * @param {number} [limit]
 * @returns {Promise<{data: Array, error: object|null}>}
 */
export async function fetchInteractions(prospectId, limit = 50) {
  const db = getClient();
  return db
    .from('interactions')
    .select('*, profiles!auteur_id(nom)')
    .eq('prospect_id', prospectId)
    .order('created_at', { ascending: false })
    .limit(limit);
}

/**
 * Crée une interaction dans la timeline.
 * @param {string} prospectId
 * @param {object} data
 * @returns {Promise<{data: object|null, error: object|null}>}
 */
export async function createInteraction(prospectId, data) {
  const db   = getClient();
  const user = await db.auth.getUser();

  return db.from('interactions').insert({
    ...data,
    prospect_id: prospectId,
    auteur_id:   user.data.user?.id ?? null,
  }).select('*, profiles!auteur_id(nom)').single();
}

// ── Rappels ───────────────────────────────────────────────

/**
 * Récupère les rappels avec filtres.
 * @param {object} [filters]
 * @returns {Promise<{data: Array, error: object|null}>}
 */
export async function fetchRappels(filters = {}) {
  const db = getClient();
  const { prospect_id, statut, assigne_a } = filters;

  let query = db
    .from('rappels')
    .select('*, profiles!assigne_a(nom), prospects(nom)')
    .order('date_rappel', { ascending: true });

  if (prospect_id) query = query.eq('prospect_id', prospect_id);
  if (statut)      query = query.eq('statut', statut);
  if (assigne_a)   query = query.eq('assigne_a', assigne_a);

  return query;
}

/**
 * Récupère les rappels du jour ou en retard.
 * @returns {Promise<{data: Array, error: object|null}>}
 */
export async function fetchRappelsDuJour() {
  const db    = getClient();
  const today = new Date().toISOString();
  return db
    .from('rappels')
    .select('*, profiles!assigne_a(nom), prospects(id, nom)')
    .lte('date_rappel', today)
    .eq('statut', 'planifie')
    .order('date_rappel', { ascending: true });
}

/**
 * Crée un rappel pour un prospect.
 * @param {string} prospectId
 * @param {object} data
 * @returns {Promise<{data: object|null, error: object|null}>}
 */
export async function createRappel(prospectId, data) {
  const db = getClient();
  return db.from('rappels').insert({
    ...data,
    prospect_id: prospectId,
  }).select('*, profiles!assigne_a(nom)').single();
}

/**
 * Récupère les N interactions les plus récentes (tous prospects).
 * @param {number} [limit]
 * @returns {Promise<{data: Array, error: object|null}>}
 */
export async function fetchRecentInteractions(limit = 10) {
  const db = getClient();
  return db
    .from('interactions')
    .select('*, profiles!auteur_id(nom), prospects!prospect_id(nom, id)')
    .order('created_at', { ascending: false })
    .limit(limit);
}

/**
 * Met à jour un rappel.
 * @param {string} id
 * @param {object} data
 * @returns {Promise<{data: object|null, error: object|null}>}
 */
export async function updateRappel(id, data) {
  const db = getClient();
  return db.from('rappels').update(data).eq('id', id).select().single();
}
