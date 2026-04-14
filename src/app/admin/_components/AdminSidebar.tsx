'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Award, X } from 'lucide-react'

const NAV_ITEMS = [
  { id: 'dashboard',   label: 'Tableau de bord',    href: '/admin',             icon: LayoutDashboard },
  { id: 'scholarship', label: "Bourse d'Excellence", href: '/admin/scholarship', icon: Award },
]

interface AdminSidebarProps {
  isOpen:  boolean
  onClose: () => void
}

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-[#021463]',
          'transition-transform duration-300 ease-in-out will-change-transform',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-64',
        ].join(' ')}
      >
        {/* ── Logo ── */}
        <div className="relative flex shrink-0 flex-col items-center justify-center gap-2 border-b border-white/10 px-4 py-5">
          <Image
            src="/ignito-logo-white.svg"
            alt="Ignito Academy"
            width={130}
            height={42}
            className="shrink-0"
            priority
          />
          <span className="font-serif text-[13px] font-semibold tracking-widest text-white/65">
            ADMITTA
          </span>

          {/* Close button — mobile only, pinned top-right */}
          <button
            onClick={onClose}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md
                       text-white/50 transition-colors hover:bg-white/10 lg:hidden"
            aria-label="Fermer le menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-3 text-[9px] font-bold uppercase
                        tracking-widest text-white/30">
            Mon Bureau
          </p>

          <ul className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              // Dashboard is only active on exact /admin; others match prefix
              const isActive =
                item.href === '/admin'
                  ? pathname === '/admin'
                  : pathname.startsWith(item.href)

              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={[
                      'flex min-h-[48px] items-center gap-3 rounded-md px-3 py-2.5',
                      'text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-white/12 text-white'
                        : 'text-white/65 hover:bg-white/8 hover:text-white',
                    ].join(' ')}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        isActive ? 'text-[#4EA6F5]' : 'text-white/40'
                      }`}
                    />
                    <span className="flex-1 truncate">{item.label}</span>
                    {isActive && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-sm bg-[#4EA6F5]" />
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* ── Footer ── */}
        <div className="shrink-0 border-t border-white/10 px-4 py-4">
          <p className="text-[10px] leading-snug text-white/30">
            © 2026 Ignito Academy. Tous droits réservés.
          </p>
        </div>
      </aside>
    </>
  )
}
