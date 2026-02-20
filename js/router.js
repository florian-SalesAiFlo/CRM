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
