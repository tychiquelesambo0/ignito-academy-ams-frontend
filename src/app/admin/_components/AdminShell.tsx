'use client'

import { useState, useEffect } from 'react'
import AdminSidebar from './AdminSidebar'
import AdminTopBar  from './AdminTopBar'

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Lock body scroll when mobile sidebar drawer is open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  return (
    <>
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <AdminTopBar onMenuOpen={() => setSidebarOpen(true)} />

      <main className="min-h-screen bg-slate-50 pt-16 lg:ml-64">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 md:px-8 md:py-10">
          {children}
        </div>
      </main>
    </>
  )
}
