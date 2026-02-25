/* =======================================================
   router.js — SPA hash-based routing CRM M2BPO
   Gère : navigation, auth guard, sidebar active state.
   Init : window.__uiPanels, initSupabase(), initUIComponents()
   ======================================================= */

import { initSupabase }                      from './supabase-client.js';
import { initUIComponents }                  from './ui-components.js';
import { openPanel, closePanels, closeModal } from './ui-panels.js';
import {
  initLoginPage, initProspectListPage, initProspectDetailPage,
  initDashboardPage, initRappelsPage, initReabonnementsPage, initImportPage,
} from './page-inits.js';

// ── Constantes de routing ─────────────────────────────────

const ROUTES = {
  '/login':          { page: 'pages/login.html',           auth: false },
  '/dashboard':      { page: 'pages/dashboard.html',       auth: true  },
  '/prospects':      { page: 'pages/prospect-list.html',   auth: true  },
  '/prospect/:id':   { page: 'pages/prospect-detail.html', auth: true  },
  '/rappels':        { page: 'pages/rappels.html',         auth: true  },
  '/reabonnements':  { page: 'pages/reabonnements.html',   auth: true  },
  '/import':         { page: 'pages/import.html',          auth: true  },
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
 * Point d'entrée du router. Appelé une seule fois au chargement de la page.
 * Initialise Supabase, les composants UI, le namespace global panels,
 * puis démarre le routing.
 */
export async function initRouter() {
  _supabase = initSupabase();
  // initAuth();

  initUIComponents();

  // Expose les fonctions panels dans le namespace global.
  // Pattern documenté dans SKILL.md — communication inter-modules sans bundler.
  window.__uiPanels = { openPanel, closePanels, closeModal };

  // AUTH DÉSACTIVÉE POUR DEV
  window.location.hash = window.location.hash || '#/prospects';

  initSidebar();
  listenHashChange();
  await navigate(getCurrentRoute());

  // Recherche globale — init après le routing initial
  const { initSearch } = await import('./search.js');
  initSearch();
}

// ── Route courante ────────────────────────────────────────

/**
 * Lit le hash courant et retourne la route propre (sans le #).
 * @returns {string} ex: '/prospects' ou '/prospect/abc-123'
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
 * Navigue vers une route. Charge le HTML et init le module de la page.
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

  // AUTH DÉSACTIVÉE POUR DEV — décommenter pour réactiver
  // if (route.auth) { ... }

  await loadPage(route.page, params);
  updateSidebarActive(path);
  initPageScripts(pattern);
}

/**
 * Charge le HTML d'une page dans le conteneur principal.
 * @param {string} pageUrl
 * @param {object} params
 */
async function loadPage(pageUrl, params = {}) {
  const container = document.getElementById(APP_CONTAINER);
  if (!container) return;

  window.CRM = window.CRM ?? {};
  window.CRM.routeParams = params;

  try {
    const res  = await fetch(pageUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    container.innerHTML = await res.text();
  } catch {
    container.innerHTML = renderErrorPage(pageUrl);
  }
}

/**
 * Génère un HTML d'erreur si la page est introuvable.
 * @param {string} pageUrl
 * @returns {string}
 */
function renderErrorPage(pageUrl) {
  return `<div style="padding:3rem;text-align:center;color:var(--color-text-tertiary)">
    <p style="font-size:2rem">⚠️</p>
    <p style="font-weight:600;margin-top:1rem">Page introuvable</p>
    <p style="font-size:.875rem;margin-top:.5rem">${pageUrl}</p>
  </div>`.trim();
}

// ── Hash listener ─────────────────────────────────────────

/** Écoute les changements de hash et déclenche la navigation. */
function listenHashChange() {
  window.addEventListener('hashchange', () => navigate(getCurrentRoute()));
}

// ── Sidebar ───────────────────────────────────────────────

/** Initialise la sidebar : toggle collapse + délégation clics nav + hover expand. */
function initSidebar() {
  const toggle = document.getElementById(SIDEBAR_TOGGLE);
  if (toggle) toggle.addEventListener('click', toggleSidebar);

  const sidebar = document.getElementById(SIDEBAR_ID);
  if (!sidebar) return;
  sidebar.addEventListener('click', handleSidebarClick);
  initSidebarHover(sidebar);
}

/** Bascule l'état collapsed de la sidebar. */
function toggleSidebar() {
  const sidebar = document.getElementById(SIDEBAR_ID);
  if (!sidebar) return;
  sidebar.classList.toggle('collapsed');
  document.body.classList.toggle('sidebar-collapsed');
}

/**
 * Initialise le comportement hover-expand sur la sidebar collapsed.
 * @param {HTMLElement} sidebar
 */
function initSidebarHover(sidebar) {
  let leaveTimer = null;

  sidebar.addEventListener('mouseenter', () => {
    if (!sidebar.classList.contains('collapsed')) return;
    clearTimeout(leaveTimer);
    sidebar.classList.add('sidebar-hover-expand');
  });

  sidebar.addEventListener('mouseleave', () => {
    clearTimeout(leaveTimer);
    leaveTimer = setTimeout(() => sidebar.classList.remove('sidebar-hover-expand'), 300);
  });
}

/**
 * Délègue les clics sur les liens de la sidebar pour le routage.
 * @param {MouseEvent} e
 */
function handleSidebarClick(e) {
  const link = e.target.closest('a[data-route]');
  if (!link) return;
  e.preventDefault();
  const sidebar = document.getElementById(SIDEBAR_ID);
  sidebar?.classList.remove('sidebar-hover-expand');
  window.location.hash = link.dataset.route;
}

/**
 * Met à jour la classe active des liens sidebar selon la route courante.
 * @param {string} currentPath
 */
function updateSidebarActive(currentPath) {
  document.querySelectorAll('#sidebar a[data-route]').forEach(link => {
    const route    = link.dataset.route;
    const isActive = currentPath === route || currentPath.startsWith(`${route}/`);
    link.classList.toggle('active', isActive);
  });
}

// ── Page scripts (dispatch par route) ────────────────────

/**
 * Dispatch vers l'initialiseur de la page active.
 * Fonctions définies dans page-inits.js (lazy imports).
 * @param {string} pattern
 */
function initPageScripts(pattern) {
  switch (pattern) {
    case '/login':          return initLoginPage();
    case '/prospects':      return initProspectListPage();
    case '/prospect/:id':   return initProspectDetailPage();
    case '/dashboard':      return initDashboardPage();
    case '/rappels':        return initRappelsPage();
    case '/reabonnements':  return initReabonnementsPage();
    case '/import':         return initImportPage();
    default:                break;
  }
}
