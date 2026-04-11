import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Historique Académique - Admitta | Ignito Academy",
  description: "Renseignez votre parcours scolaire pour compléter votre dossier de candidature.",
}

export default function AcademicHistoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
