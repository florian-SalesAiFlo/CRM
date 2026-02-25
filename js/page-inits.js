/* =======================================================
   page-inits.js — Initialiseurs de pages (lazy imports)
   Chaque fonction charge et initialise le module de la page.
   Appelé par router.js → initPageScripts().
   ======================================================= */

/** Init page login. */
export async function initLoginPage() {
  const { initLogin } = await import('./login.js');
  initLogin();
}

/** Init liste prospects + création. */
export async function initProspectListPage() {
  const { initProspectList }   = await import('./prospects.js');
  const { initProspectCreate } = await import('./prospect-create.js');
  initProspectList();
  initProspectCreate(() => initProspectList());
}

/** Init fiche prospect détail. Auto-collapse sidebar. */
export async function initProspectDetailPage() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar && !sidebar.classList.contains('collapsed')) {
    sidebar.classList.add('collapsed');
    document.body.classList.add('sidebar-collapsed');
  }
  const { initProspectDetail } = await import('./prospect-detail.js');
  initProspectDetail();
}

/** Init dashboard + graphiques. */
export async function initDashboardPage() {
  const { initDashboard }       = await import('./dashboard.js');
  const { initDashboardCharts } = await import('./dashboard-charts.js');
  await initDashboard();
  initDashboardCharts();
}

/** Init page rappels manager. */
export async function initRappelsPage() {
  const { initRappelsPage: init } = await import('./rappels-page.js');
  init();
}

/** Init page réabonnements. */
export async function initReabonnementsPage() {
  const { initReabonnementsPage: init } = await import('./reabonnements.js');
  init();
}

/** Init page import CSV. */
export async function initImportPage() {
  const { initImport } = await import('./import.js');
  initImport();
}
