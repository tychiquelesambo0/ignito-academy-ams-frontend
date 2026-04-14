'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, LogOut, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import NotificationBell from './NotificationBell'

interface AdminTopBarProps {
  onMenuOpen: () => void
}

interface Officer {
  prenom: string
  nom:    string
  role:   string
}

export default function AdminTopBar({ onMenuOpen }: AdminTopBarProps) {
  const router = useRouter()
  const [officer, setOfficer] = useState<Officer | null>(null)

  useEffect(() => {
    async function loadOfficer() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('admissions_officers')
        .select('prenom, nom, role')
        .eq('id', user.id)
        .single()

      if (data) setOfficer(data as Officer)
    }
    loadOfficer()
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  const initials = officer
    ? `${officer.prenom[0] ?? ''}${officer.nom[0] ?? ''}`.toUpperCase()
    : '?'

  const roleLabel = officer?.role === 'admin'
    ? 'Administrateur'
    : officer?.role === 'senior_officer'
    ? 'Agent senior'
    : 'Agent'

  return (
    <header
      className="fixed inset-x-0 top-0 z-20 flex h-16 items-center justify-between
                 border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-md lg:left-64"
    >
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuOpen}
        className="flex h-9 w-9 items-center justify-center rounded-md
                   text-slate-500 transition-colors hover:bg-slate-100 lg:hidden"
        aria-label="Ouvrir le menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-3">

        {/* Officer info — desktop */}
        {officer && (
          <div className="hidden items-center gap-2.5 sm:flex">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center
                            rounded-md bg-[#021463] text-xs font-bold text-white">
              {initials}
            </div>
            <div className="text-right leading-tight">
              <p className="text-xs font-semibold text-slate-800">
                {officer.prenom} {officer.nom}
              </p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                {roleLabel}
              </p>
            </div>
          </div>
        )}

        {/* Admin badge */}
        <span
          className="hidden items-center gap-1 rounded border border-[#4EA6F5]/25
                     bg-[#4EA6F5]/8 px-2 py-0.5 text-[10px] font-bold
                     uppercase tracking-wider text-[#4EA6F5] sm:inline-flex"
        >
          <Shield className="h-3 w-3" />
          Admin
        </span>

        {/* Notification bell */}
        <NotificationBell />

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="flex h-9 items-center gap-1.5 rounded-md px-3 text-xs
                     font-medium text-slate-500 transition-colors
                     hover:bg-slate-100 hover:text-slate-700"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Déconnexion</span>
        </button>
      </div>
    </header>
  )
}
