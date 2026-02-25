// =======================================================
// cosmos.spec.js — Tests E2E CRM Cosmos (Playwright)
// v4 — fix: tr.prospects-row cliquable, SPA hash routing
// Lance : npx playwright test
// =======================================================

const { test, expect } = require('@playwright/test');

const BASE_URL = 'https://florian-salesaiflo.github.io/CRM/#';

// ── Helpers ───────────────────────────────────────────────

async function waitForApp(page) {
  await page.waitForFunction(() => {
    const app = document.getElementById('app');
    return app && !app.textContent.includes('Chargement');
  }, { timeout: 15000 });
}

async function navigateToFirstProspect(page) {
  await page.goto(`${BASE_URL}/prospects`);
  await waitForApp(page);
  // Attend les lignes du tableau
  await page.waitForSelector('tr.prospects-row', { timeout: 15000 });
  await page.waitForTimeout(500);
  // Clic sur la première ligne (tr.prospects-row avec cursor:pointer)
  await page.locator('tr.prospects-row').first().click();
  // SPA hash routing : pas de vraie navigation, on attend le DOM de la fiche
  await page.waitForSelector('#detail-nom', { timeout: 15000 });
  // Laisse Supabase charger toutes les sections
  await page.waitForTimeout(2000);
}

// ── DASHBOARD ─────────────────────────────────────────────

test.describe('Dashboard', () => {

  test('charge et affiche les KPIs', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForApp(page);
    const kpiCards = page.locator('.kpi-card');
    await expect(kpiCards).toHaveCount(4);
    const totalVal = page.locator('#kpi-total-val');
    await expect(totalVal).not.toHaveText('—', { timeout: 10000 });
  });

  test('affiche la section Pipeline', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForApp(page);
    const pipeline = page.locator('#pipeline-section');
    await expect(pipeline).toBeVisible();
    const cols = page.locator('.pipeline-col');
    await expect(cols).toHaveCount(3);
  });

  test('affiche le tableau Dernières activités', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForApp(page);
    const activites = page.locator('#activites-tbody');
    await expect(activites).toBeVisible();
  });

  test('sections charts et team existent dans le DOM', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForApp(page);
    await expect(page.locator('#charts-section')).toBeAttached();
    await expect(page.locator('#team-section')).toBeAttached();
  });
});

// ── LISTE PROSPECTS ───────────────────────────────────────

test.describe('Liste Prospects', () => {

  test('charge et affiche la liste', async ({ page }) => {
    await page.goto(`${BASE_URL}/prospects`);
    await waitForApp(page);
    await expect(page.locator('.page-title')).toHaveText('Prospects');
    const count = page.locator('#prospects-count');
    await expect(count).not.toHaveText('—', { timeout: 10000 });
  });

  test('affiche les filtres statut, retour, métier', async ({ page }) => {
    await page.goto(`${BASE_URL}/prospects`);
    await waitForApp(page);
    await expect(page.locator('select[data-filter="statut"]')).toBeVisible();
    await expect(page.locator('select[data-filter="retour"]')).toBeVisible();
    await expect(page.locator('select[data-filter="metier"]')).toBeVisible();
  });

  test('affiche le tableau avec colonnes triables', async ({ page }) => {
    await page.goto(`${BASE_URL}/prospects`);
    await waitForApp(page);
    const headers = page.locator('.th-sort');
    const count = await headers.count();
    expect(count).toBeGreaterThanOrEqual(6);
  });

  test('bouton Nouveau prospect ouvre le panel', async ({ page }) => {
    await page.goto(`${BASE_URL}/prospects`);
    await waitForApp(page);
    await page.click('#btn-new-prospect');
    await page.waitForTimeout(500);
    const panel = page.locator('#panel-new-prospect');
    await expect(panel).toHaveClass(/open/, { timeout: 3000 });
  });

  test('formulaire création contient champ SIRET', async ({ page }) => {
    await page.goto(`${BASE_URL}/prospects`);
    await waitForApp(page);
    await page.click('#btn-new-prospect');
    await page.waitForSelector('#fc-siret', { timeout: 3000 });
    await expect(page.locator('#fc-siret')).toBeVisible();
  });

  test('div pagination existe', async ({ page }) => {
    await page.goto(`${BASE_URL}/prospects`);
    await waitForApp(page);
    await expect(page.locator('#prospects-pagination')).toBeAttached();
  });
});

// ── FICHE PROSPECT ────────────────────────────────────────

test.describe('Fiche Prospect', () => {

  test('charge une fiche depuis la liste', async ({ page }) => {
    await navigateToFirstProspect(page);
    const nom = await page.locator('#detail-nom').textContent();
    expect(nom.trim().length).toBeGreaterThan(0);
  });

  test('affiche les badges statut et retour cliquables', async ({ page }) => {
    await navigateToFirstProspect(page);
    const badges = page.locator('#detail-badges .badge-select, #detail-badges .badge');
    const count = await badges.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('affiche la grille info avec champs éditables', async ({ page }) => {
    await navigateToFirstProspect(page);
    await page.waitForSelector('#info-grid', { timeout: 5000 });
    const editables = page.locator('.editable-field');
    const count = await editables.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test('champ éditable inline fonctionne', async ({ page }) => {
    await navigateToFirstProspect(page);
    await page.waitForSelector('#info-grid', { timeout: 5000 });
    const field = page.locator('.editable-field').first();
    await field.click();
    const input = page.locator('.editable-input');
    await expect(input).toBeVisible({ timeout: 3000 });
  });

  test('section Abonnement visible', async ({ page }) => {
    await navigateToFirstProspect(page);
    await expect(page.locator('#abonnement-section')).toBeAttached({ timeout: 5000 });
  });

  test('section Rappels visible avec bouton +', async ({ page }) => {
    await navigateToFirstProspect(page);
    await expect(page.locator('#btn-new-rappel')).toBeVisible({ timeout: 5000 });
  });

  test('section Contacts visible avec bouton +', async ({ page }) => {
    await navigateToFirstProspect(page);
    await expect(page.locator('#btn-new-contact')).toBeVisible({ timeout: 5000 });
  });

  test('section Interactions visible avec bouton +', async ({ page }) => {
    await navigateToFirstProspect(page);
    await expect(page.locator('#btn-new-interaction')).toBeVisible({ timeout: 5000 });
  });

  test('bandeau SIRET enrichment existe dans le DOM', async ({ page }) => {
    await navigateToFirstProspect(page);
    await expect(page.locator('#siret-enrichment-banner')).toBeAttached({ timeout: 5000 });
  });

  test('boutons Supprimer et Modifier visibles', async ({ page }) => {
    await navigateToFirstProspect(page);
    await expect(page.locator('#btn-delete-prospect')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#btn-edit-prospect')).toBeVisible({ timeout: 5000 });
  });
});

// ── PAGE RAPPELS ──────────────────────────────────────────

test.describe('Page Rappels', () => {

  test('charge et affiche le titre', async ({ page }) => {
    await page.goto(`${BASE_URL}/rappels`);
    await waitForApp(page);
    const content = await page.locator('#app').textContent();
    expect(content).toContain('Rappels');
  });

  test('filtre statut visible', async ({ page }) => {
    await page.goto(`${BASE_URL}/rappels`);
    await waitForApp(page);
    const select = page.locator('select');
    await expect(select.first()).toBeVisible();
  });
});

// ── PAGE IMPORT ───────────────────────────────────────────

test.describe('Page Import', () => {

  test('charge la page import', async ({ page }) => {
    await page.goto(`${BASE_URL}/import`);
    await waitForApp(page);
    const content = await page.locator('#app').textContent();
    expect(content.toLowerCase()).toContain('import');
  });
});

// ── SIDEBAR ───────────────────────────────────────────────

test.describe('Sidebar', () => {

  test('sidebar visible avec liens navigation', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForApp(page);
    const sidebar = page.locator('#sidebar');
    await expect(sidebar).toBeVisible();
    await expect(page.locator('a[data-route="/dashboard"]')).toBeAttached();
    await expect(page.locator('a[data-route="/prospects"]')).toBeAttached();
    await expect(page.locator('a[data-route="/rappels"]')).toBeAttached();
    await expect(page.locator('a[data-route="/import"]')).toBeAttached();
  });

  test('toggle collapse fonctionne', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForApp(page);
    const sidebar = page.locator('#sidebar');
    const toggle = page.locator('#sidebar-toggle');
    await toggle.click();
    await expect(sidebar).toHaveClass(/collapsed/);
    await toggle.click();
    await expect(sidebar).not.toHaveClass(/collapsed/);
  });

  test('navigation vers rappels fonctionne', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForApp(page);
    await page.click('a[data-route="/rappels"]');
    await page.waitForTimeout(2000);
    await waitForApp(page);
    const url = page.url();
    expect(url).toContain('#/rappels');
  });
});

// ── RECHERCHE GLOBALE ─────────────────────────────────────

test.describe('Recherche globale', () => {

  test('champ recherche sidebar existe', async ({ page }) => {
    await page.goto(`${BASE_URL}/prospects`);
    await waitForApp(page);
    await expect(page.locator('#sidebar-search-input')).toBeVisible();
  });
});
