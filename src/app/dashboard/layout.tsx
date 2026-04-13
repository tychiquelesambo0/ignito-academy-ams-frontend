/**
 * Dashboard Layout — "Le Conservateur Numérique"
 *
 * Shell for the entire applicant dashboard.
 * Architecture:
 *   ApplicationProvider  ← single source of truth for auth + application data
 *     DashboardShell     ← client wrapper that manages sidebar open/close state
 *       DashboardSidebar ← slide-in drawer (mobile) / fixed (desktop)
 *       DashboardTopBar  ← fixed top bar with hamburger (mobile) / offset (desktop)
 *       <main>           ← full-width on mobile, ml-64 offset on desktop
 *         {children}
 */

import type { Metadata } from 'next'
import { ApplicationProvider } from '@/lib/context/ApplicationContext'
import DashboardShell from './_components/DashboardShell'

export const metadata: Metadata = {
  title: 'Espace Candidat — Admitta',
  description: 'Gérez votre dossier de candidature au UK Level 3 Foundation Diploma.',
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ApplicationProvider>
      <DashboardShell>
        {children}
      </DashboardShell>
    </ApplicationProvider>
  )
}
