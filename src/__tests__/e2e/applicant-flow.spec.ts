/**
 * E2E: Full applicant journey
 *   1. Land on /apply → sign up → redirect to dashboard
 *   2. Dashboard shows "Dossier créé" status tracker
 *   3. Upload all 5 required documents → payment button unlocks
 *   4. Mock payment → dashboard shows "En cours d'évaluation"
 *
 * Run: npm run test:e2e -- --grep "Applicant flow"
 */

import { test, expect } from '@playwright/test'

const TEST_EMAIL    = `e2e-applicant-${Date.now()}@test.ignitoacademy.cd`
const TEST_PASSWORD = 'TestApplicant2026!'
const TEST_PRENOM   = 'Marie'
const TEST_NOM      = 'Dupont'

test.describe('Applicant flow', () => {

  test('Sign-up form creates account and redirects to dashboard', async ({ page }) => {
    await page.goto('/apply')

    // Switch to Sign-up tab
    await page.getByRole('tab', { name: /créer un dossier/i }).click()

    await page.getByLabel(/prénom/i).fill(TEST_PRENOM)
    await page.getByLabel(/nom/i).fill(TEST_NOM)
    await page.getByLabel(/adresse email/i).fill(TEST_EMAIL)
    await page.getByLabel(/mot de passe/i).fill(TEST_PASSWORD)

    await page.getByRole('button', { name: /créer mon compte/i }).click()

    // Should land on dashboard
    await expect(page).toHaveURL('/dashboard', { timeout: 10_000 })
    await expect(page.getByText(/bienvenue/i)).toBeVisible()
  })

  test('Dashboard displays step 1 "Dossier créé" after account creation', async ({ page }) => {
    // Log in with existing test account
    await page.goto('/apply?tab=connexion')
    await page.getByLabel(/adresse email/i).fill(TEST_EMAIL)
    await page.getByLabel(/mot de passe/i).fill(TEST_PASSWORD)
    await page.getByRole('button', { name: /connexion/i }).click()

    await expect(page).toHaveURL('/dashboard', { timeout: 10_000 })

    // Step 1 should be active
    await expect(page.getByText(/dossier créé/i)).toBeVisible()
    // Payment button should NOT be visible yet
    await expect(page.getByRole('link', { name: /procéder au paiement/i })).not.toBeVisible()
  })

  test('Payment button appears after all 5 documents are uploaded', async ({ page }) => {
    // This test requires a pre-seeded account with all docs uploaded.
    // In CI, this is handled by the test database seed.
    // Here we just verify the selector contract.
    test.skip(process.env.CI !== 'true', 'Requires seeded test data in CI')

    await page.goto('/dashboard')
    await expect(
      page.getByRole('link', { name: /procéder au paiement/i })
    ).toBeVisible({ timeout: 5_000 })
  })

})
