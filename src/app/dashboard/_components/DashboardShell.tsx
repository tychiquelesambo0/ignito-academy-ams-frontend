'use client'

/**
 * DashboardShell
 *
 * Client-side shell that owns the sidebar open/close state and wires the
 * hamburger button (TopBar) to the drawer (Sidebar).
 *
 * This is the only component that manages sidebar visibility — all other
 * components receive it as a prop.  The layout stays a pure server component.
 *
 * Mobile behaviour:
 *   - Sidebar is hidden off-screen (-translate-x-full) by default
 *   - Hamburger button in TopBar triggers sidebarOpen = true
 *   - Dark backdrop covers the page; tap to close
 *   - Body scroll is locked while drawer is open
 *   - Sidebar auto-closes on route change (handled inside DashboardSidebar)
 *
 * Desktop behaviour (lg+):
 *   - Sidebar is always visible via CSS (lg:translate-x-0)
 *   - sidebarOpen state has no visual effect
 */

import { useState, useEffect, useCallback, type ReactNode } from 'react'
import DashboardSidebar from './DashboardSidebar'
import DashboardTopBar from './DashboardTopBar'
import DocumentRequestAlert from './DocumentRequestAlert'

export default function DashboardShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const openSidebar  = useCallback(() => setSidebarOpen(true),  [])
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  // Lock body scroll while mobile drawer is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  return (
    <>
      <DashboardSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <DashboardTopBar onMenuOpen={openSidebar} />

      {/* Main content — full width on mobile, offset on desktop */}
      <main className="min-h-screen bg-slate-50 pt-16 lg:ml-64">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 md:px-8 md:py-10">
          <DocumentRequestAlert />
          {children}
        </div>
      </main>
    </>
  )
}
