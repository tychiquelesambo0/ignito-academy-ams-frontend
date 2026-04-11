import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  test: {
    globals: true,

    // ── Coverage (v8 — zero-config, fast) ────────────────────────────────────
    coverage: {
      provider:           'v8',
      reporter:           ['text', 'html', 'lcov', 'json-summary'],
      reportsDirectory:   './coverage',
      // Target: 80 %+ across lines, functions, branches, statements
      thresholds: {
        lines:      80,
        functions:  80,
        branches:   70,
        statements: 80,
      },
      // Only measure coverage for pure utility lib files that can be unit-tested
      // without a live Supabase/DOM environment. API routes, components, and
      // Supabase integration helpers are covered by E2E/integration tests.
      include: [
        'src/lib/applicant-id.ts',
        'src/lib/status-machine.ts',
        'src/lib/validations/phone.ts',
        'src/lib/validations/email.ts',
        'src/lib/validations/file-upload.ts',
        'src/lib/validations/auth.ts',
        'src/lib/email/templates.ts',
        'src/lib/webhooks/signature.ts',
      ],
      exclude: [
        'src/**/*.d.ts',
        'src/**/__tests__/**',
      ],
    },

    // ── Named projects — run different file sets with different environments ──
    projects: [
      // Unit + property tests (Node environment — no DOM needed)
      {
        extends: true,
        test: {
          name:        'unit',
          environment: 'node',
          include: [
            'src/__tests__/applicant-id*.test.ts',
            'src/__tests__/payment-*.test.ts',
            'src/__tests__/document-*.test.ts',
            'src/__tests__/file-*.test.ts',
            'src/__tests__/webhook-*.test.ts',
            'src/__tests__/exam-*.test.ts',
            'src/__tests__/reapplication-*.test.ts',
            'src/__tests__/academic-*.test.ts',
            'src/__tests__/email-*.test.ts',
            'src/__tests__/concurrent-*.test.ts',
            'src/__tests__/atomic-*.test.ts',
            'src/__tests__/status-*.test.ts',
            'src/__tests__/phone-*.test.ts',
            'src/__tests__/utils/**/*.test.ts',
            'src/__tests__/lib/**/*.test.ts',
          ],
        },
      },

      // Property-based tests (subset tag — same env, explicit pattern)
      {
        extends: true,
        test: {
          name:        'property',
          environment: 'node',
          include: [
            'src/__tests__/**/*.test.ts',
          ],
          exclude: [
            'src/__tests__/components/**',
            'src/__tests__/e2e/**',
          ],
        },
      },

      // React component tests (jsdom)
      {
        extends: true,
        test: {
          name:        'components',
          environment: 'jsdom',
          setupFiles:  ['./src/__tests__/setup/jest-dom.ts'],
          include: [
            'src/__tests__/components/**/*.test.tsx',
          ],
        },
      },
    ],
  },
})
