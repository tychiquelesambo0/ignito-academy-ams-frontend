import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Portail d'Admission Admitta | Ignito Academy",
  description: "Créez votre dossier de candidature ou connectez-vous pour suivre votre admission à Ignito Academy.",
}

export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
