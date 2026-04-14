import type { Metadata } from "next"
import { Inter, Crimson_Pro } from "next/font/google"
import "./globals.css"
import { LanguageProvider } from "@/contexts/LanguageContext"
import NavigationProgress from "@/components/NavigationProgress"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

const crimsonPro = Crimson_Pro({
  subsets: ["latin"],
  variable: "--font-serif",
})

const BASE_URL = "https://admissions.ignitoacademy.com"

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default: "Admitta — Portail d'Admission | Ignito Academy",
    template: "%s | Admitta · Ignito Academy",
  },
  description:
    "Portail officiel d'admission d'Ignito Academy. Soumettez votre dossier de candidature pour la Licence Britannique, suivez son avancement et recevez votre décision en ligne.",

  authors: [{ name: "Ignito Academy", url: "https://ignitoacademy.com" }],
  creator: "Ignito Academy",
  publisher: "Ignito Academy",

  alternates: {
    canonical: `${BASE_URL}/apply`,
  },

  openGraph: {
    type: "website",
    locale: "fr_CD",
    url: `${BASE_URL}/apply`,
    siteName: "Admitta — Ignito Academy",
    title: "Admitta — Portail d'Admission Ignito Academy",
    description:
      "Déposez votre candidature pour la Licence Britannique d'Ignito Academy. Processus 100 % en ligne depuis la RDC.",
    images: [
      {
        url: "https://ignitoacademy.com/ignito-logo.svg",
        width: 1200,
        height: 630,
        alt: "Admitta — Portail d'Admission Ignito Academy",
      },
    ],
  },

  twitter: {
    card: "summary",
    title: "Admitta — Portail d'Admission Ignito Academy",
    description:
      "Déposez votre candidature pour la Licence Britannique d'Ignito Academy, 100 % en ligne depuis la RDC.",
    images: ["https://ignitoacademy.com/ignito-logo.svg"],
  },

  // The AMS is a web app — only the apply page is public. All protected
  // routes (/dashboard, /admin) set their own noindex via generateMetadata.
  robots: {
    index: false,
    follow: false,
  },

  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <head>
        {/* Structured data — WebApplication */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Admitta",
              url: BASE_URL,
              applicationCategory: "EducationApplication",
              operatingSystem: "All",
              description:
                "Portail officiel d'admission d'Ignito Academy. Soumettez et suivez votre dossier de candidature pour la Licence Britannique depuis la RDC.",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              provider: {
                "@type": "EducationalOrganization",
                name: "Ignito Academy",
                url: "https://ignitoacademy.com",
              },
            }),
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${crimsonPro.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <NavigationProgress />
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  )
}
