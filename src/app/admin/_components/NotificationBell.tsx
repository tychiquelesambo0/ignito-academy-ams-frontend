'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, FileText, UploadCloud, FilePlus, CheckCheck, X } from 'lucide-react'
import { useAdminNotifications, type AdminNotification } from '@/lib/hooks/useAdminNotifications'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60)   return "À l'instant"
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

const TYPE_CONFIG = {
  new_application: {
    icon:  FilePlus,
    color: 'text-[#4EA6F5]',
    bg:    'bg-[#4EA6F5]/10',
    label: 'Nouveau dossier',
  },
  documents_submitted: {
    icon:  UploadCloud,
    color: 'text-[#10B981]',
    bg:    'bg-[#10B981]/10',
    label: 'Documents soumis',
  },
  additional_documents: {
    icon:  FileText,
    color: 'text-amber-500',
    bg:    'bg-amber-500/10',
    label: 'Pièces complémentaires',
  },
} as const

// ─── Single notification row ──────────────────────────────────────────────────

function NotificationRow({
  notification,
  onMarkRead,
}: {
  notification: AdminNotification
  onMarkRead:   (id: string) => void
}) {
  const router  = useRouter()
  const cfg     = TYPE_CONFIG[notification.type]
  const Icon    = cfg.icon
  const unread  = !notification.read_at

  function handleClick() {
    if (unread) onMarkRead(notification.id)
    router.push(`/admin/applications/${notification.applicant_id}`)
  }

  return (
    <button
      onClick={handleClick}
      className={[
        'w-full flex items-start gap-3 px-4 py-3 text-left',
        'transition-colors hover:bg-slate-50',
        unread ? 'bg-[#4EA6F5]/4' : '',
      ].join(' ')}
    >
      {/* Type icon */}
      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${cfg.bg}`}>
        <Icon className={`h-4 w-4 ${cfg.color}`} />
      </span>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-xs font-semibold leading-snug ${unread ? 'text-slate-900' : 'text-slate-600'}`}>
            {notification.applicant_name ?? notification.applicant_id}
          </p>
          <span className="shrink-0 text-[10px] text-slate-400">
            {relativeTime(notification.created_at)}
          </span>
        </div>
        <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
          {notification.message}
        </p>
        <span className={`mt-1 inline-block text-[9px] font-bold uppercase tracking-wide ${cfg.color}`}>
          {cfg.label} · {notification.applicant_id}
        </span>
      </div>

      {/* Unread dot */}
      {unread && (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#4EA6F5]" aria-hidden />
      )}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const panelRef        = useRef<HTMLDivElement>(null)
  const buttonRef       = useRef<HTMLButtonElement>(null)

  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
  } = useAdminNotifications()

  // Close on outside click
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (
        panelRef.current   && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current  && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} non lues)` : ''}`}
        className={[
          'relative flex h-9 w-9 items-center justify-center rounded-md',
          'text-slate-500 transition-colors hover:bg-slate-100',
          open ? 'bg-slate-100 text-slate-700' : '',
        ].join(' ')}
      >
        <Bell className="h-5 w-5" />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center
                       justify-center rounded-full bg-[#EF4444] px-1
                       text-[9px] font-bold text-white leading-none"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-slate-200
                     bg-white shadow-xl z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-slate-600" />
              <span className="text-sm font-semibold text-slate-800">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-[#EF4444] px-1.5 py-0.5 text-[9px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 rounded px-2 py-1
                             text-[10px] font-medium text-slate-500
                             transition-colors hover:bg-slate-100 hover:text-slate-700"
                  title="Tout marquer comme lu"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Tout lire
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="flex h-6 w-6 items-center justify-center rounded
                           text-slate-400 transition-colors hover:bg-slate-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <div className="h-8 w-8 shrink-0 animate-pulse rounded-md bg-slate-100" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
                      <div className="h-2.5 w-1/2 animate-pulse rounded bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400">
                <Bell className="h-8 w-8 opacity-30" />
                <p className="text-xs">Aucune notification</p>
              </div>
            ) : (
              notifications.map((n) => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  onMarkRead={markAsRead}
                />
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-slate-100 px-4 py-2.5 text-center">
              <p className="text-[10px] text-slate-400">
                Les {notifications.length} événements les plus récents
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
