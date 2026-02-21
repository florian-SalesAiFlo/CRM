/* =======================================================
   router.js — SPA hash-based routing CRM Cosmos
   ======================================================= */

import { initSupabase }                       from './supabase-client.js';
import { initUIComponents }                   from './ui-components.js';
import { openPanel, closePanels, closeModal } from './ui-panels.js';
import { initAuth }                           from './auth.js';

const ROUTES = {
  '/login':          { page: 'pages/login.html',           auth: false },
  '/dashboard':      { page: 'pages/dashboard.html',       auth: true  },
  '/prospects':      { page: 'pages/prospect-list.html',   auth: true  },
  '/prospect/:id':   { page: 'pages/prospect-detail.html', auth: true  },
  '/rappels':        { page: 'pages/rappels.html',         auth: true  },
};

const DEFAULT_ROUTE  = '/prospects';
const APP_CONTAINER  = 'app';
const SIDEBAR_ID     = 'sidebar';
const SIDEBAR_TOGGLE = 'sidebar-toggle';

let _supabase = null;

// ── Init ──────────────────────────────────────────────────

export async function initRouter() {
  _supabase = initSupabase();
  initAuth();
  initUIComponents();
  window.__uiPanels = { openPanel, closePanels, closeModal };

  // Auto-login silencieux (dev mode)
  _supabase.auth.signInWithPassword({
    email: 'florian@salesaiflo.com',
    password: 'Test1234'
  }).then(() => {
    // Re-naviguer après login pour charger les données
    navigate(getCurrentRoute());
  }).catch(() => {});

  initSidebar();
  listenHashChange();
  await navigate(getCurrentRoute());
}

// ── Routing ───────────────────────────────────────────────

function getCurrentRoute() {
  const hash = window.location.hash.replace('#', '') || DEFAULT_ROUTE;
  return hash.startsWith('/') ? hash : `/${hash}`;
}

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

async function navigate(path) {
  const resolved = resolveRoute(path);
  if (!resolved) {
    window.location.hash = DEFAULT_ROUTE;
    return;
  }

  const { pattern, params } = resolved;
  const route = ROUTES[pattern];

  await loadPage(route.page, params);
  await initPageScripts(pattern);
  updateSidebarActive(path);
  autoCollapseSidebar();
}

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
  } catch {
    container.innerHTML = `
      <div style="padding:3rem;text-align:center;color:var(--color-text-tertiary)">
        <p style="font-size:2rem">⚠️</p>
        <p style="font-weight:600;margin-top:1rem">Page introuvable</p>
        <p style="font-size:.875rem;margin-top:.5rem">${pageUrl}</p>
      </div>`.trim();
  }
}

function listenHashChange() {
  window.addEventListener('hashchange', () => navigate(getCurrentRoute()));
}

// ── Page scripts ──────────────────────────────────────────

async function initPageScripts(pattern) {
  switch (pattern) {
    case '/login':          return initLoginPage();
    case '/dashboard':      return initDashboardPage();
    case '/prospects':      return initProspectListPage();
    case '/prospect/:id':   return initProspectDetailPage();
    default:                return;
  }
}

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

async function initDashboardPage() {
  const { initDashboard } = await import('./dashboard.js');
  initDashboard();
}

async function initProspectListPage() {
  const { initProspectList } = await import('./prospects.js');
  initProspectList();
  const { initProspectCreate } = await import('./prospect-create.js');
  initProspectCreate();
}

async function initProspectDetailPage() {
  const { initProspectDetail } = await import('./prospect-detail.js');
  initProspectDetail();
}

// ── Sidebar ───────────────────────────────────────────────

function initSidebar() {
  const toggle = document.getElementById(SIDEBAR_TOGGLE);
  if (toggle) toggle.addEventListener('click', toggleSidebar);

  const sidebar = document.getElementById(SIDEBAR_ID);
  if (!sidebar) return;
  sidebar.addEventListener('click', handleSidebarClick);

  sidebar.addEventListener('mouseenter', () => {
    if (sidebar.classList.contains('collapsed')) {
      sidebar.classList.remove('collapsed');
      document.body.classList.remove('sidebar-collapsed');
    }
  });

  sidebar.addEventListener('mouseleave', () => {
    if (!sidebar.classList.contains('collapsed')) {
      sidebar.classList.add('collapsed');
      document.body.classList.add('sidebar-collapsed');
    }
  });
}

function toggleSidebar() {
  const sidebar = document.getElementById(SIDEBAR_ID);
  if (!sidebar) return;
  sidebar.classList.toggle('collapsed');
  document.body.classList.toggle('sidebar-collapsed');
}

function autoCollapseSidebar() {
  const sidebar = document.getElementById(SIDEBAR_ID);
  if (!sidebar || sidebar.classList.contains('collapsed')) return;
  let hovered = false;
  const onEnter = () => { hovered = true; };
  sidebar.addEventListener('mouseenter', onEnter, { once: true });
  setTimeout(() => {
    if (!hovered) {
      sidebar.classList.add('collapsed');
      document.body.classList.add('sidebar-collapsed');
    }
    sidebar.removeEventListener('mouseenter', onEnter);
  }, 3000);
}

function handleSidebarClick(e) {
  const link = e.target.closest('a[data-route]');
  if (!link) return;
  e.preventDefault();
  window.location.hash = link.dataset.route;
}

function updateSidebarActive(currentPath) {
  document.querySelectorAll('#sidebar a[data-route]').forEach(link => {
    const route    = link.dataset.route;
    const isActive = currentPath === route || currentPath.startsWith(`${route}/`);
    link.classList.toggle('active', isActive);
  });
}
