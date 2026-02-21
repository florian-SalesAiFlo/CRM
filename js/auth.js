/* =======================================================
   auth.js — Authentification CRM M2BPO
   Source de vérité unique pour l'état d'authentification.
   Expose : login, logout, getCurrentUser, getCurrentProfile,
            isAuthenticated, initAuth.
   Stocke le profil dans window.CRM.currentUser.

   Résilience : toutes les opérations Supabase Auth sont
   wrappées dans un timeout. Si la session est corrompue
   (LockManager bloqué, localStorage corrompu), le code
   vide automatiquement les clés Supabase et retourne false
   au lieu de bloquer indéfiniment sur "Chargement…".
   ======================================================= */

import { initSupabase } from './supabase-client.js';

// ── Constantes ────────────────────────────────────────────

const LOGIN_ROUTE      = '/login';
const AUTH_TIMEOUT_MS  = 3000;
const STORAGE_KEY      = 'crm-m2bpo-auth';

// ── État module ───────────────────────────────────────────

let _db      = null;
let _profile = null;

// ── Init ──────────────────────────────────────────────────

/**
 * Initialise le module auth. À appeler UNE FOIS au démarrage,
 * depuis router.js, après initSupabase().
 * Écoute les changements d'état auth Supabase en continu.
 * onAuthStateChange est lui-même safe (il ne bloque pas au init).
 */
export function initAuth() {
  _db = initSupabase();

  try {
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
          // Session silencieusement renouvelée — rien à faire
          break;
        default:
          break;
      }
    });
  } catch (err) {
    // onAuthStateChange ne devrait jamais throw, mais par sécurité
    console.warn('[auth] onAuthStateChange init failed:', err?.message);
    clearCorruptedSession();
  }
}

// ── API publique ──────────────────────────────────────────

/**
 * Vérifie si une session active existe.
 * Wrappe getSession() dans un timeout de 3s.
 * Si timeout ou erreur (ex: LockManager bloqué, localStorage corrompu),
 * vide les clés Supabase et retourne false — jamais de blocage.
 * @returns {Promise<boolean>}
 */
export async function isAuthenticated() {
  const client = initSupabase();
  try {
    const result = await Promise.race([
      client.auth.getSession(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Auth timeout')), AUTH_TIMEOUT_MS)
      ),
    ]);
    return !!result.data?.session;
  } catch (err) {
    console.warn('[auth] isAuthenticated failed, clearing session:', err?.message);
    clearCorruptedSession();
    return false;
  }
}

/**
 * Connecte un utilisateur avec email + mot de passe.
 * Timeout de 10s (login réseau peut être plus lent que getSession).
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ user: object|null, error: object|null }>}
 */
export async function login(email, password) {
  try {
    const result = await Promise.race([
      _db.auth.signInWithPassword({ email, password }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Login timeout')), 10_000)
      ),
    ]);

    const { data, error } = result;
    if (error) return { user: null, error };

    await _loadProfile(data.user.id);
    return { user: data.user, error: null };

  } catch (err) {
    const isTimeout = err?.message === 'Login timeout';
    return {
      user: null,
      error: {
        message: isTimeout
          ? 'La connexion a expiré. Vérifiez votre réseau et réessayez.'
          : 'Erreur réseau. Vérifiez votre connexion.',
        code: isTimeout ? 'timeout' : 'network_error',
      },
    };
  }
}

/**
 * Déconnecte l'utilisateur courant et vide le profil.
 * @returns {Promise<void>}
 */
export async function logout() {
  _clearProfile();
  try {
    await _db.auth.signOut();
  } catch (err) {
    // signOut peut échouer si la session est déjà invalide — on nettoie quand même
    console.warn('[auth] signOut error (ignoré):', err?.message);
    clearCorruptedSession();
  }
}

/**
 * Retourne l'utilisateur Supabase Auth courant (session active).
 * @returns {Promise<object|null>}
 */
export async function getCurrentUser() {
  try {
    const { data } = await _db.auth.getUser();
    return data?.user ?? null;
  } catch {
    return null;
  }
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

// ── Helpers internes ──────────────────────────────────────

/**
 * Charge le profil CRM depuis la table `profiles`.
 * @param {string} userId
 */
async function _loadProfile(userId) {
  try {
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

  } catch (err) {
    console.warn('[auth] _loadProfile error:', err?.message);
    _profile = null;
  }
}

/**
 * Vide le profil en mémoire et dans le namespace global.
 */
function _clearProfile() {
  _profile = null;
  if (window.CRM) window.CRM.currentUser = null;
}

/**
 * Supprime toutes les clés Supabase du localStorage.
 * Appelé automatiquement quand isAuthenticated() ou login() détecte
 * une session corrompue (LockManager bloqué, données invalides, etc.).
 */
function clearCorruptedSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') || key.includes('supabase')) {
        localStorage.removeItem(key);
      }
    });
  } catch {
    // localStorage peut être inaccessible en mode privé strict — on ignore
  }
}
