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

export const metadata: Metadata = {
  title: "Ignito Academy | Obtenez une Licence Britannique depuis la RDC",
  description: "Le cursus complet en 4 ans, 100% à distance. Débutez dès l'obtention de votre Diplôme d'État et décrochez votre Licence Britannique sans frais de voyage ni visa.",
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <body 
        className={`${inter.variable} ${crimsonPro.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <NavigationProgress />
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  )
}
