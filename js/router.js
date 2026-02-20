/* =======================================================
   router.js — SPA hash-based routing CRM M2BPO
   Gère : navigation, auth guard, sidebar active state.
   Init : window.__uiPanels, initSupabase(), initUIComponents()
   ======================================================= */

import { initSupabase }                       from './supabase-client.js';
import { initUIComponents }                   from './ui-components.js';
import { openPanel, closePanels, closeModal } from './ui-panels.js';
import { initAuth, isAuthenticated }          from './auth.js';

// ── Constantes de routing ─────────────────────────────────

const ROUTES = {
  '/login':          { page: 'pages/login.html',           auth: false },
  '/dashboard':      { page: 'pages/dashboard.html',       auth: true  },
  '/prospects':      { page: 'pages/prospect-list.html',   auth: true  },
  '/prospect/:id':   { page: 'pages/prospect-detail.html', auth: true  },
  '/rappels':        { page: 'pages/rappels.html',         auth: true  },
};

const DEFAULT_ROUTE  = '/prospects';
const LOGIN_ROUTE    = '/login';
const APP_CONTAINER  = 'app';
const SIDEBAR_ID     = 'sidebar';
const SIDEBAR_TOGGLE = 'sidebar-toggle';

// ── État module ───────────────────────────────────────────

let _supabase = null;

// ── Init principale ───────────────────────────────────────

/**
 * Point d'entrée du router. Appelé une seule fois au chargement.
 */
export async function initRouter() {
  _supabase = initSupabase();
  initAuth();
  initUIComponents();

  window.__uiPanels = { openPanel, closePanels, closeModal };

  initSidebar();
  listenHashChange();
  await navigate(getCurrentRoute());
}

// ── Route courante ────────────────────────────────────────

/**
 * Lit le hash courant et retourne la route propre.
 * @returns {string}
 */
function getCurrentRoute() {
  const hash = window.location.hash.replace('#', '') || DEFAULT_ROUTE;
  return hash.startsWith('/') ? hash : `/${hash}`;
}

/**
 * Résout une route dynamique avec paramètres.
 * @param {string} path
 * @returns {{ pattern: string, params: object } | null}
 */
function resolveRoute(path) {
  for (const pattern of Object.keys(ROUTES)) {
    const paramNames = [];
    const regexStr   = pattern.replace(/:([^/]+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });
    const match = path.match(new RegExp(`^${regexStr}$`));
    if (!match) continue;
    const params = Object.fromEntries(
      paramNames.map((name, i) => [name, match[i + 1]])
    );
    return { pattern, params };
  }
  return null;
}

// ── Navigation ────────────────────────────────────────────

/**
 * Navigue vers une route. Vérifie l'auth si nécessaire.
 * @param {string} path
 */
async function navigate(path) {
  const resolved = resolveRoute(path);

  if (!resolved) {
    window.location.hash = DEFAULT_ROUTE;
    return;
  }

  const { pattern, params } = resolved;
  const route = ROUTES[pattern];

  if (route.auth && !(await isAuthenticated())) {
    window.location.hash = LOGIN_ROUTE;
    return;
  }

  await loadPage(route.page, params);
  await initPageScripts(pattern);
  updateSidebarActive(path);
}

/**
 * Charge le HTML d'une page dans le conteneur principal.
 * @param {string} pageUrl
 * @param {object} params
 */
async function loadPage(pageUrl, params = {}) {
  const container = document.getElementById(APP_CONTAINER);
  if (!container) return;

  window.CRM             = window.CRM ?? {};
  window.CRM.routeParams = params;

  try {
    const res  = await fetch(pageUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    container.innerHTML = html;
    activateScripts(container);
  } catch {
    container.innerHTML = renderErrorPage(pageUrl);
  }
}

/**
 * Réactive les <script> injectés via innerHTML.
 * innerHTML ne lance pas les scripts, il faut les cloner.
 * @param {HTMLElement} container
 */
function activateScripts(container) {
  container.querySelectorAll('script').forEach(old => {
    const fresh = document.createElement('script');
    for (const attr of old.attributes) {
      fresh.setAttribute(attr.name, attr.value);
    }
    fresh.textContent = old.textContent;
    old.parentNode.replaceChild(fresh, old);
  });
}

/**
 * Génère un HTML d'erreur si la page est introuvable.
 * @param {string} pageUrl
 * @returns {string}
 */
function renderErrorPage(pageUrl) {
  return `
    <div style="padding:3rem;text-align:center;color:var(--color-text-tertiary)">
      <p style="font-size:2rem">⚠️</p>
      <p style="font-weight:600;margin-top:1rem">Page introuvable</p>
      <p style="font-size:.875rem;margin-top:.5rem">${pageUrl}</p>
    </div>
  `.trim();
}

// ── Page scripts (remplace les <script> dans les partials) ──

/**
 * Initialise les scripts spécifiques à chaque page après injection HTML.
 * @param {string} pattern - Le pattern de route matché
 */
async function initPageScripts(pattern) {
  switch (pattern) {
    case '/login':     return initLoginPage();
    case '/prospects': return initProspectListPage();
    default:           return;
  }
}

/**
 * Login page : gère le formulaire, validation, appel Supabase.
 */
function initLoginPage() {
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

  eyeBtn?.addEventListener('click', () => {
    const isHidden = passEl.type === 'password';
    passEl.type = isHidden ? 'text' : 'password';
    eyeBtn.setAttribute('aria-label', isHidden ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
  });

  [emailEl, passEl].forEach(el => el?.addEventListener('input', hideError));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const email    = emailEl.value.trim();
    const password = passEl.value;

    if (!email || !email.includes('@')) {
      showError('Adresse email invalide.');
      emailEl.classList.add('is-error');
      emailEl.focus();
      return;
    }
    if (!password || password.length < 1) {
      showError('Le mot de passe est requis.');
      passEl.classList.add('is-error');
      passEl.focus();
      return;
    }

    setLoading(true);
    const { login } = await import('./auth.js');
    const { error } = await login(email, password);
    setLoading(false);

    if (error) {
      const code = error?.code ?? '';
      const msg  = error?.message ?? '';
      switch (code) {
        case 'invalid_credentials':  showError('Email ou mot de passe incorrect.'); break;
        case 'email_not_confirmed':  showError('Email non confirmé. Vérifiez votre boîte mail.'); break;
        case 'user_not_found':       showError('Aucun compte associé à cet email.'); break;
        case 'too_many_requests':    showError('Trop de tentatives. Réessayez dans quelques minutes.'); break;
        default:                     showError(msg || 'Une erreur est survenue. Réessayez.');
      }
      return;
    }

    window.location.hash = '/prospects';
  });

  function showError(message) {
    errorMsg.textContent = message;
    errorBox.hidden = false;
    errorBox.style.display = '';
  }

  function hideError() {
    errorBox.hidden = true;
    errorBox.style.display = 'none';
    [emailEl, passEl].forEach(el => el?.classList.remove('is-error'));
  }

  function setLoading(loading) {
    btn.disabled        = loading;
    btnText.textContent = loading ? 'Connexion…' : 'Se connecter';
    spinner.hidden      = !loading;
    spinner.style.display = loading ? '' : 'none';
  }
}

/**
 * Prospect list page : initialise la liste via le module prospects.js
 */
async function initProspectListPage() {
  const { initProspectList } = await import('./prospects.js');
  initProspectList();
}

// ── Hash listener ─────────────────────────────────────────

function listenHashChange() {
  window.addEventListener('hashchange', () => navigate(getCurrentRoute()));
}

// ── Sidebar ───────────────────────────────────────────────

function initSidebar() {
  const toggle = document.getElementById(SIDEBAR_TOGGLE);
  if (toggle) toggle.addEventListener('click', toggleSidebar);

  const sidebar = document.getElementById(SIDEBAR_ID);
  if (sidebar) sidebar.addEventListener('click', handleSidebarClick);
}

function toggleSidebar() {
  const sidebar = document.getElementById(SIDEBAR_ID);
  if (!sidebar) return;
  sidebar.classList.toggle('collapsed');
  document.body.classList.toggle('sidebar-collapsed');
}

/**
 * @param {MouseEvent} e
 */
function handleSidebarClick(e) {
  const link = e.target.closest('a[data-route]');
  if (!link) return;
  e.preventDefault();
  window.location.hash = link.dataset.route;
}

/**
 * @param {string} currentPath
 */
function updateSidebarActive(currentPath) {
  document.querySelectorAll('#sidebar a[data-route]').forEach(link => {
    const route    = link.dataset.route;
    const isActive = currentPath === route || currentPath.startsWith(`${route}/`);
    link.classList.toggle('active', isActive);
  });
}
