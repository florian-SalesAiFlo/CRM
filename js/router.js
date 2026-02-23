/* =======================================================
   router.js — SPA hash-based routing CRM M2BPO
   Gère : navigation, auth guard, sidebar active state.
   Init : window.__uiPanels, initSupabase(), initUIComponents()
   ======================================================= */

import { initSupabase }                      from './supabase-client.js';
import { initUIComponents }                  from './ui-components.js';
import { openPanel, closePanels, closeModal } from './ui-panels.js';

// ── Constantes de routing ─────────────────────────────────

const ROUTES = {
  '/login':          { page: 'pages/login.html',         auth: false },
  '/dashboard':      { page: 'pages/dashboard.html',     auth: true  },
  '/prospects':      { page: 'pages/prospect-list.html', auth: true  },
  '/prospect/:id':   { page: 'pages/prospect-detail.html', auth: true },
  '/rappels':        { page: 'pages/rappels.html',       auth: true  },
  '/import':         { page: 'pages/import.html',        auth: true  },
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


  initUIComponents();

  // Recherche globale (permanente, pas liée à une page)
  const { initSearch } = await import('./search.js');
  initSearch();

  // Expose les fonctions panels dans le namespace global.
  // Pattern documenté dans SKILL.md — communication inter-modules sans bundler.
  window.__uiPanels = { openPanel, closePanels, closeModal };

  // AUTH DÉSACTIVÉE POUR DEV
  window.location.hash = window.location.hash || '#/prospects';

  initSidebar();
  listenHashChange();
  await navigate(getCurrentRoute());
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
 * Retourne le pattern matché et les params extraits.
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
 * Charge le HTML de la page dans le conteneur #app.
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
  // if (route.auth) {
  //   try {
  //     const authenticated = await Promise.race([
  //       isAuthenticated(),
  //       new Promise(resolve => setTimeout(() => resolve(false), 3000))
  //     ]);
  //     if (!authenticated) {
  //       window.location.hash = LOGIN_ROUTE;
  //       return;
  //     }
  //   } catch {
  //     window.location.hash = LOGIN_ROUTE;
  //     return;
  //   }
  // }

  await loadPage(route.page, params);
  updateSidebarActive(path);
  initPageScripts(pattern);
}

/**
 * Charge le HTML d'une page dans le conteneur principal.
 * Injecte les params de route dans window.CRM.routeParams.
 * @param {string} pageUrl  - chemin vers le fichier HTML partiel
 * @param {object} params   - paramètres de route extraits (ex: { id: '...' })
 */
async function loadPage(pageUrl, params = {}) {
  const container = document.getElementById(APP_CONTAINER);
  if (!container) return;

  window.CRM = window.CRM ?? {};
  window.CRM.routeParams = params;

  try {
    const res  = await fetch(pageUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    container.innerHTML = html;
  } catch {
    container.innerHTML = renderErrorPage(pageUrl);
  }
}

/**
 * Génère un HTML d'erreur si la page est introuvable.
 * @param {string} pageUrl
 * @returns {string} HTML
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

/**
 * Écoute les changements de hash et déclenche la navigation.
 */
function listenHashChange() {
  window.addEventListener('hashchange', () => navigate(getCurrentRoute()));
}

// ── Sidebar ───────────────────────────────────────────────

/**
 * Initialise la sidebar : toggle collapse + délégation clics nav.
 */
function initSidebar() {
  const toggle = document.getElementById(SIDEBAR_TOGGLE);
  if (toggle) toggle.addEventListener('click', toggleSidebar);

  const sidebar = document.getElementById(SIDEBAR_ID);
  if (sidebar) sidebar.addEventListener('click', handleSidebarClick);
}

/**
 * Bascule l'état collapsed de la sidebar.
 */
function toggleSidebar() {
  const sidebar = document.getElementById(SIDEBAR_ID);
  if (!sidebar) return;
  sidebar.classList.toggle('collapsed');
  document.body.classList.toggle('sidebar-collapsed');
}

/**
 * Délègue les clics sur les liens de la sidebar pour le routage.
 * @param {MouseEvent} e
 */
function handleSidebarClick(e) {
  const link = e.target.closest('a[data-route]');
  if (!link) return;
  e.preventDefault();
  window.location.hash = link.dataset.route;
}

/**
 * Met à jour la classe active des liens sidebar selon la route courante.
 * @param {string} currentPath
 */
function updateSidebarActive(currentPath) {
  document.querySelectorAll('#sidebar a[data-route]').forEach(link => {
    const route   = link.dataset.route;
    const isActive = currentPath === route || currentPath.startsWith(`${route}/`);
    link.classList.toggle('active', isActive);
  });
}

// ── Page scripts (lazy import par route) ─────────────────

/**
 * Charge et initialise le module JS correspondant à la route active.
 * Chaque import est lazy pour éviter de charger du code inutile.
 * @param {string} pattern - pattern de route (ex: '/prospects')
 */
function initPageScripts(pattern) {
  switch (pattern) {
    case '/login':        return initLoginPage();
    case '/prospects':    return initProspectListPage();
    case '/prospect/:id': return initProspectDetailPage();
    case '/dashboard':    return initDashboardPage();
    case '/rappels':      return initRappelsPageRoute();
    case '/import':       return initImportPage();
    default:              break;
  }
}

async function initLoginPage() {
  const { initLogin } = await import('./login.js');
  initLogin();
}

async function initProspectListPage() {
  const { initProspectList }   = await import('./prospects.js');
  const { initProspectCreate } = await import('./prospect-create.js');
  initProspectList();
  initProspectCreate(() => initProspectList());
}

async function initProspectDetailPage() {
  // Auto-collapse sidebar pour maximiser l'espace sur la fiche
  const sidebar = document.getElementById('sidebar');
  if (sidebar && !sidebar.classList.contains('collapsed')) {
    sidebar.classList.add('collapsed');
    document.body.classList.add('sidebar-collapsed');
  }
  const { initProspectDetail } = await import('./prospect-detail.js');
  initProspectDetail();
}

async function initDashboardPage() {
  const { initDashboard } = await import('./dashboard.js');
  initDashboard();
}

async function initRappelsPageRoute() {
  const { initRappelsPage } = await import('./rappels-page.js');
  initRappelsPage();
}

async function initImportPage() {
  const { initImport } = await import('./import.js');
  initImport();
}
