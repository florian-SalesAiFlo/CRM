/* =======================================================
   auth.js — Authentification CRM M2BPO
   Source de vérité unique pour l'état d'authentification.
   Expose : login, logout, getCurrentUser, getCurrentProfile,
            isAuthenticated, initAuth.
   Stocke le profil dans window.CRM.currentUser.
   ======================================================= */

import { initSupabase } from './supabase-client.js';

// ── Constantes ────────────────────────────────────────────

const LOGIN_ROUTE   = '/login';
const DEFAULT_ROUTE = '/prospects';

// ── État module ───────────────────────────────────────────

let _db      = null;
let _profile = null;

// ── Init ──────────────────────────────────────────────────

/**
 * Initialise le module auth. À appeler UNE FOIS au démarrage,
 * depuis router.js, après initSupabase().
 */
export function initAuth() {
  _db = initSupabase();

  _db.auth.onAuthStateChange(async (event, session) => {
    switch (event) {
      case 'SIGNED_IN':
        await _loadProfile(session.user.id);
        break;
      case 'SIGNED_OUT':
        _clearProfile();
        window.location.hash = LOGIN_ROUTE;
        break;
      case 'TOKEN_REFRESHED':
        break;
      default:
        break;
    }
  });
}

// ── API publique ──────────────────────────────────────────

/**
 * Connecte un utilisateur avec email + mot de passe.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ user: object|null, error: object|null }>}
 */
export async function login(email, password) {
  const { data, error } = await _db.auth.signInWithPassword({ email, password });

  if (error) return { user: null, error };

  await _loadProfile(data.user.id);
  return { user: data.user, error: null };
}

/**
 * Déconnecte l'utilisateur courant et vide le profil.
 * @returns {Promise<void>}
 */
export async function logout() {
  _clearProfile();
  await _db.auth.signOut();
}

/**
 * Retourne l'utilisateur Supabase Auth courant.
 * @returns {Promise<object|null>}
 */
export async function getCurrentUser() {
  const { data } = await _db.auth.getUser();
  return data?.user ?? null;
}

/**
 * Retourne le profil CRM de l'utilisateur courant.
 * Charge depuis Supabase si absent du cache.
 * @returns {Promise<object|null>}
 */
export async function getCurrentProfile() {
  if (_profile) return _profile;

  const user = await getCurrentUser();
  if (!user) return null;

  await _loadProfile(user.id);
  return _profile;
}

/**
 * Vérifie si une session active existe.
 * @returns {Promise<boolean>}
 */
export async function isAuthenticated() {
  const { data } = await _db.auth.getSession();
  return !!data?.session;
}

// ── Helpers internes ──────────────────────────────────────

/**
 * Charge le profil CRM depuis la table `profiles`.
 * @param {string} userId
 */
async function _loadProfile(userId) {
  const { data, error } = await _db
    .from('profiles')
    .select('id, nom, email, role, equipe_id')
    .eq('id', userId)
    .single();

  if (error || !data) {
    console.warn('[auth] Profil introuvable pour', userId, error?.message);
    _profile = null;
    return;
  }

  _profile = data;
  window.CRM             = window.CRM ?? {};
  window.CRM.currentUser = data;
}

/**
 * Vide le profil en mémoire et dans le namespace global.
 */
function _clearProfile() {
  _profile = null;
  if (window.CRM) window.CRM.currentUser = null;
}
