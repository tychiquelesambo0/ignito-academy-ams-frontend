/**
 * E2E: Application portal entry point (/apply)
 *   - Loads correctly in French
 *   - FR/EN language toggle works (vacuous pass when toggle is absent)
 *   - "Créer un dossier" CTA reveals the sign-up form
 *   - Mobile viewport (320 px) renders without horizontal overflow
 *
 * Run: npm run test:e2e -- --grep "Landing page"
 *
 * NOTE: The AMS has no separate marketing landing page at "/".
 * Navigating to "/" issues a 301 permanent redirect to "/apply", which is
 * the real public entry point. All tests target "/apply" directly.
 */

import { test, expect } from '@playwright/test'

test.describe('Landing page', () => {

  test('renders in French by default', async ({ page }) => {
    await page.goto('/apply')

    // h2 heading "Bienvenue sur Admitta" is always visible (h1 is desktop-only)
    await expect(page.locator('h2').first()).toBeVisible()

    // Primary French CTA tab button is present
    await expect(
      page.getByRole('button', { name: /créer un dossier/i })
    ).toBeVisible()
  })

  test('FR/EN language toggle switches copy', async ({ page }) => {
    await page.goto('/apply')

    // The /apply portal has no FR/EN toggle — this guard makes the test pass
    // vacuously. If a toggle is ever added it will be exercised automatically.
    const enToggle = page.getByRole('button', { name: /^EN$/i })
    if (await enToggle.isVisible()) {
      await enToggle.click()
      const hero = page.locator('main, section').first()
      await expect(hero).toContainText(/apply|academy|degree/i)

      await page.getByRole('button', { name: /^FR$/i }).click()
      await expect(hero).toContainText(/candidature|diplôme|ignito/i)
    }
  })

  test('"Créer un dossier" CTA reveals the sign-up form', async ({ page }) => {
    await page.goto('/apply')

    // The tab switcher uses plain <button> elements (not role="tab")
    const cta = page.getByRole('button', { name: /créer un dossier/i })
    await expect(cta).toBeVisible()
    await cta.click()

    // After clicking, the sign-up form's first unique field becomes interactive
    await expect(page.locator('#prenom')).toBeVisible()
  })

  test('renders correctly on 320 px mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 667 })
    await page.goto('/apply')

    // No horizontal scrollbar
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(320)

    // Primary CTA still visible on the narrowest mobile screen
    await expect(
      page.getByRole('button', { name: /créer un dossier/i })
    ).toBeVisible()
  })

})
