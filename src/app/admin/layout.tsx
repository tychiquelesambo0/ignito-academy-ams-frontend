import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Administration — Admitta | Ignito Academy',
  description: 'Bureau des Admissions — Gestion des dossiers de candidature.',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
