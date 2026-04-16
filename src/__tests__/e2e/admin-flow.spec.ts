/**
 * E2E: Admin journey
 *   1. Admin login at /admin/login
 *   2. Dashboard shows searchable application table
 *   3. Click into application → detail view loads
 *   4. Status update dropdown excludes "En cours d'évaluation"
 *   5. Selecting "Admission sous réserve" reveals mandatory message textarea
 *
 * Run: npm run test:e2e -- --grep "Admin flow"
 *
 * CREDENTIALS
 * -----------
 * Set the following environment variables (e.g. in .env.test.local) to run
 * the admin login tests against your Supabase instance:
 *
 *   E2E_ADMIN_EMAIL=your-admin@ignitoacademy.com
 *   E2E_ADMIN_PASSWORD=YourAdminPassword
 *
 * If either variable is absent the entire describe block is skipped cleanly.
 */

import { test, expect } from '@playwright/test'

const ADMIN_EMAIL    = process.env.E2E_ADMIN_EMAIL    ?? ''
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? ''

test.describe('Admin flow', () => {

  test.beforeEach(async ({ page }) => {
    // Skip every test in this suite when credentials are not configured.
    // test.skip() called inside beforeEach skips the current test.
    test.skip(
      !ADMIN_EMAIL || !ADMIN_PASSWORD,
      'Admin credentials not configured — set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD env vars.'
    )

    await page.goto('/admin/login')
    await page.getByLabel(/adresse email/i).fill(ADMIN_EMAIL)
    await page.getByLabel(/mot de passe/i).fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: /accéder au portail/i }).click()
    await expect(page).toHaveURL('/admin', { timeout: 10_000 })
  })

  test('Admin dashboard loads with application table', async ({ page }) => {
    await expect(page.getByText(/bureau des admissions/i)).toBeVisible()
    // Search input exists
    await expect(page.getByPlaceholder(/rechercher/i)).toBeVisible()
  })

  test('Status dropdown does not include "En cours d\'évaluation"', async ({ page }) => {
    // Navigate to first application in the table
    const firstRow = page.locator('table tbody tr').first()
    test.skip(!(await firstRow.isVisible()), 'No applications in table')

    await firstRow.getByRole('link').first().click()
    await page.waitForURL(/\/admin\/applications\//)

    // Open the status select
    const select = page.locator('select').last()
    const options = await select.locator('option').allTextContents()

    expect(options).not.toContain("En cours d'évaluation")
    expect(options).toContain('Admission sous réserve')
    expect(options).toContain('Admission définitive')
    expect(options).toContain('Dossier refusé')
  })

  test('Selecting "Admission sous réserve" reveals mandatory message textarea', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first()
    test.skip(!(await firstRow.isVisible()), 'No applications in table')

    await firstRow.getByRole('link').first().click()
    await page.waitForURL(/\/admin\/applications\//)

    const select = page.locator('select').last()
    await select.selectOption('Admission sous réserve')

    // Mandatory message textarea should appear
    await expect(page.getByText(/message obligatoire/i)).toBeVisible()
    await expect(page.locator('textarea')).toBeVisible()

    // Submit button should be disabled while textarea is empty
    const submitBtn = page.getByRole('button', { name: /enregistrer le statut/i })
    await expect(submitBtn).toBeDisabled()
  })

})
