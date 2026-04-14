import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Créer un dossier de candidature",
  description:
    "Créez votre dossier de candidature pour intégrer la Licence Britannique d'Ignito Academy. Inscription gratuite — processus 100 % en ligne depuis la RDC.",
  alternates: {
    canonical: "https://admissions.ignitoacademy.com/apply",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function ApplyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
