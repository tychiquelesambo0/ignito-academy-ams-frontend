import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Espace Étudiant - Admitta | Ignito Academy",
  description: "Suivez l'état de votre candidature et gérez vos documents justificatifs.",
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
