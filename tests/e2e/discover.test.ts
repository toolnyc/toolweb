/**
 * E2E test for the Discover prospects flow.
 *
 * Strategy: Playwright intercepts the browser-side API calls
 * (POST /api/outreach/discover and GET /api/outreach/batch-status)
 * so this test never touches Apollo or costs any credits.
 *
 * Auth: logs in via the admin login form using TEST_ADMIN_EMAIL /
 * TEST_ADMIN_PASSWORD env vars (or falls back to the ADMIN_EMAIL /
 * ADMIN_PASSWORD vars used by the dev environment).
 *
 * Run: pnpm exec playwright test tests/e2e/discover.test.ts
 */
import { test, expect, type Page } from '@playwright/test';

const ADMIN_EMAIL =
  process.env.TEST_ADMIN_EMAIL ?? process.env.ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD =
  process.env.TEST_ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD ?? '';

async function login(page: Page) {
  await page.goto('/admin/login');
  await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.locator('button[type="submit"]').click();
  // Wait until we're on an admin page (redirect after login)
  await page.waitForURL(/\/admin/, { timeout: 10_000 });
}

test.describe('Discover prospects', () => {
  test.beforeEach(async ({ page }) => {
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      test.skip(true, 'TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD not set');
    }
    await login(page);
  });

  test('happy path — Discover button starts a batch and prospects appear in the queue', async ({ page }) => {
    const MOCK_BATCH_ID = 'test-batch-happy-001';

    // Mock POST /api/outreach/discover → immediate success
    await page.route('**/api/outreach/discover', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, batch_id: MOCK_BATCH_ID }),
      });
    });

    // Mock GET /api/outreach/batch-status — return "running" once, then "complete"
    let statusCallCount = 0;
    await page.route(`**/api/outreach/batch-status?id=${MOCK_BATCH_ID}`, async (route) => {
      statusCallCount++;
      const payload =
        statusCallCount === 1
          ? { status: 'running', prospect_count: 0, notes: null }
          : { status: 'complete', prospect_count: 3, notes: 'ICP discovery — 1 page(s) · 25 from Apollo · 3 added' };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(payload),
      });
    });

    await page.goto('/admin/outreach');

    // Open the Discover modal
    await page.getByRole('button', { name: 'Discover' }).click();
    await expect(page.getByText('Discover prospects')).toBeVisible();

    // Select 1 page (faster test)
    await page.locator('#discover-pages').selectOption('1');

    // Submit
    await page.getByRole('button', { name: 'Discover', exact: true }).last().click();

    // Modal closes and status bar appears
    await expect(page.locator('#discover-modal')).toHaveClass(/hidden/, { timeout: 5_000 });
    await expect(page.locator('#batch-status-bar')).not.toHaveClass(/hidden/);

    // Wait for "Done" message (status bar turns green)
    await expect(page.locator('#batch-status-text')).toContainText('Done', { timeout: 15_000 });
    await expect(page.locator('#batch-status-text')).toContainText('3 prospects');

    // Page auto-reloads — wait for it
    await page.waitForURL('/admin/outreach', { timeout: 10_000 });
  });

  test('Apollo error — batch fails with a visible error message (not silent zero prospects)', async ({ page }) => {
    const MOCK_BATCH_ID = 'test-batch-error-001';

    await page.route('**/api/outreach/discover', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, batch_id: MOCK_BATCH_ID }),
      });
    });

    // Simulate Apollo failing — batch status comes back as "failed" with an error note
    await page.route(`**/api/outreach/batch-status?id=${MOCK_BATCH_ID}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'failed',
          prospect_count: 0,
          notes: 'Apollo ICP search error: rate_limit_exceeded',
        }),
      });
    });

    await page.goto('/admin/outreach');

    await page.getByRole('button', { name: 'Discover' }).click();
    await expect(page.getByText('Discover prospects')).toBeVisible();
    await page.locator('#discover-pages').selectOption('1');
    await page.getByRole('button', { name: 'Discover', exact: true }).last().click();

    // Status bar shows error state
    await expect(page.locator('#batch-status-bar')).not.toHaveClass(/hidden/);
    await expect(page.locator('#batch-status-text')).toContainText('failed', { timeout: 15_000 });
    // The specific Apollo error must be surfaced — not just "0 prospects"
    await expect(page.locator('#batch-status-text')).toContainText('rate_limit_exceeded');
  });

  test('Discover modal — cancel button closes without submitting', async ({ page }) => {
    let discoverCalled = false;
    await page.route('**/api/outreach/discover', async (route) => {
      discoverCalled = true;
      await route.abort();
    });

    await page.goto('/admin/outreach');
    await page.getByRole('button', { name: 'Discover' }).click();
    await expect(page.getByText('Discover prospects')).toBeVisible();

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('#discover-modal')).toHaveClass(/hidden/);
    expect(discoverCalled).toBe(false);
  });

  test('Discover modal — custom parameters are sent in the request body', async ({ page }) => {
    let capturedBody: Record<string, unknown> = {};

    await page.route('**/api/outreach/discover', async (route) => {
      const req = route.request();
      capturedBody = JSON.parse(req.postData() ?? '{}') as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, batch_id: 'test-params-001' }),
      });
    });

    await page.route('**/api/outreach/batch-status**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'complete', prospect_count: 0, notes: null }),
      });
    });

    await page.goto('/admin/outreach');
    await page.getByRole('button', { name: 'Discover' }).click();

    // Set non-default values
    await page.locator('#discover-pages').selectOption('3');
    await page.locator('#discover-param-min-score').fill('50');

    await page.getByRole('button', { name: 'Discover', exact: true }).last().click();

    // Verify request body contains the custom values
    await expect(page.locator('#discover-modal')).toHaveClass(/hidden/, { timeout: 5_000 });
    expect(capturedBody.pages).toBe(3);
    expect(capturedBody.minScore).toBe(50);
    expect(Array.isArray(capturedBody.targetTitles)).toBe(true);
  });
});
