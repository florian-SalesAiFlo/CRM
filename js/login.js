/* =======================================================
   login.js — Logique du formulaire de connexion
   Point d'entrée : initLogin(), appelé par router.js
   ======================================================= */

import { login } from './auth.js';

/**
 * Initialise le formulaire de connexion.
 * Appelé par initPageScripts('/login') dans router.js.
 */
export function initLogin() {
  const form     = document.getElementById('login-form');
  const emailEl  = document.getElementById('login-email');
  const passEl   = document.getElementById('login-password');
  const errorBox = document.getElementById('login-error');
  const errorMsg = document.getElementById('login-error-msg');
  const btn      = document.getElementById('login-btn');
  const btnText  = document.getElementById('login-btn-text');
  const spinner  = document.getElementById('login-spinner');
  const eyeBtn   = document.getElementById('login-eye');

  if (!form) return;

  // ── Toggle visibilité mot de passe ───────────────────────
  eyeBtn?.addEventListener('click', () => {
    const isHidden = passEl.type === 'password';
    passEl.type = isHidden ? 'text' : 'password';
    eyeBtn.setAttribute('aria-label', isHidden ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
  });

  // ── Masquer l'erreur à la frappe ─────────────────────────
  [emailEl, passEl].forEach(el => el?.addEventListener('input', hideError));

  // ── Soumission ───────────────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const email    = emailEl.value.trim();
    const password = passEl.value;

    if (!validateInputs(email, password)) return;

    setLoading(true);
    const { error } = await login(email, password);
    setLoading(false);

    if (error) {
      console.error('LOGIN ERROR:', error);
      showError(mapErrorMessage(error));
      return;
    }

    window.location.hash = '/prospects';
  });

  // ── Validation locale ────────────────────────────────────
  function validateInputs(email, password) {
    if (!email || !email.includes('@')) {
      showError('Adresse email invalide.');
      emailEl.classList.add('is-error');
      emailEl.focus();
      return false;
    }
    if (!password || password.length < 1) {
      showError('Le mot de passe est requis.');
      passEl.classList.add('is-error');
      passEl.focus();
      return false;
    }
    return true;
  }

  // ── Messages d'erreur Supabase → français ────────────────
  function mapErrorMessage(error) {
    const code = error?.code ?? '';
    const msg  = error?.message ?? '';
    switch (code) {
      case 'invalid_credentials':  return 'Email ou mot de passe incorrect.';
      case 'email_not_confirmed':  return 'Votre email n\'a pas encore été confirmé.';
      case 'user_not_found':       return 'Aucun compte associé à cet email.';
      case 'too_many_requests':    return 'Trop de tentatives. Réessayez dans quelques minutes.';
      default: return msg || 'Une erreur est survenue. Réessayez.';
    }
  }

  // ── Helpers UI ───────────────────────────────────────────
  function showError(message) {
    errorMsg.textContent = message;
    errorBox.hidden = false;
  }

  function hideError() {
    errorBox.hidden = true;
    [emailEl, passEl].forEach(el => el?.classList.remove('is-error'));
  }

  function setLoading(loading) {
    btn.disabled        = loading;
    btnText.textContent = loading ? 'Connexion…' : 'Se connecter';
    if (spinner) spinner.hidden = !loading;
  }
}
