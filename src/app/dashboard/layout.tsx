'use client'

/**
 * Dashboard Layout
 * 
 * Main layout for applicant dashboard with navigation
 */

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, User, GraduationCap, CreditCard, FileText, Award, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

const navigation = [
  { name: 'Accueil', href: '/dashboard', icon: Home },
  { name: 'Profil', href: '/dashboard/profile', icon: User },
  { name: 'Historique académique', href: '/dashboard/academic', icon: GraduationCap },
  { name: 'Paiement', href: '/dashboard/payment', icon: CreditCard },
  { name: 'Documents', href: '/dashboard/documents', icon: FileText },
  { name: 'Bourse', href: '/dashboard/scholarship', icon: Award },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const handleSignOut = async () => {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Ignito Academy</h1>
              <p className="text-sm text-muted-foreground">Espace Candidat</p>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar Navigation */}
          <aside className="w-64 flex-shrink-0">
            <nav className="space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                )
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
