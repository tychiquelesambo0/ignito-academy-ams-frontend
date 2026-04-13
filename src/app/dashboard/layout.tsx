/**
 * Dashboard Layout — "Le Conservateur Numérique"
 *
 * Shell for the entire applicant dashboard.
 * Architecture:
 *   ApplicationProvider  ← single source of truth for auth + application data
 *     DashboardSidebar   ← fixed left, w-64, Navy #021463 (client — usePathname)
 *     DashboardTopBar    ← fixed top, backdrop-blur (client — useApplication)
 *     <main>             ← offset canvas, bg-slate-50
 *       {children}
 */

import type { Metadata } from 'next'
import { ApplicationProvider } from '@/lib/context/ApplicationContext'
import DashboardSidebar from './_components/DashboardSidebar'
import DashboardTopBar from './_components/DashboardTopBar'

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
      {/* Sidebar — fixed, always visible */}
      <DashboardSidebar />

      {/* Top bar — fixed, offset by sidebar width */}
      <DashboardTopBar />

      {/* Main content canvas */}
      <main className="ml-64 min-h-screen bg-slate-50 pt-16">
        <div className="mx-auto max-w-5xl px-6 py-8 md:px-8 md:py-10">
          {children}
        </div>
      </main>
    </ApplicationProvider>
  )
}
