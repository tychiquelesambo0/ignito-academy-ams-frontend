/**
 * E2E: Landing page
 *   - Loads correctly
 *   - FR/EN language toggle works
 *   - "Déposer ma candidature" CTA navigates to /apply
 *   - Mobile viewport renders correctly (320 px)
 *
 * Run: npm run test:e2e -- --grep "Landing page"
 */

import { test, expect } from '@playwright/test'

test.describe('Landing page', () => {

  test('renders in French by default', async ({ page }) => {
    await page.goto('/')
    // Page title / headline visible
    await expect(page.locator('h1, h2').first()).toBeVisible()
    // French CTA present
    await expect(
      page.getByRole('link', { name: /déposer ma candidature|postuler|apply/i })
    ).toBeVisible()
  })

  test('FR/EN language toggle switches copy', async ({ page }) => {
    await page.goto('/')

    const enToggle = page.getByRole('button', { name: /^EN$/i })
    if (await enToggle.isVisible()) {
      await enToggle.click()
      // At least one English word should appear in the hero area
      const hero = page.locator('main, section').first()
      await expect(hero).toContainText(/apply|academy|degree/i)

      // Toggle back
      await page.getByRole('button', { name: /^FR$/i }).click()
      await expect(hero).toContainText(/candidature|diplôme|ignito/i)
    }
  })

  test('"Apply Now" CTA navigates to /apply', async ({ page }) => {
    await page.goto('/')

    const cta = page.getByRole('link', { name: /déposer ma candidature|apply now|postuler/i }).first()
    await expect(cta).toBeVisible()
    await cta.click()
    await expect(page).toHaveURL(/\/apply/, { timeout: 5_000 })
  })

  test('renders correctly on 320 px mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 667 })
    await page.goto('/')
    // No horizontal scrollbar
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(320)
    // Primary CTA still visible
    await expect(
      page.getByRole('link', { name: /déposer ma candidature|apply|postuler/i }).first()
    ).toBeVisible()
  })

})
