'use client'

/**
 * useAdminNotifications
 *
 * Fetches and subscribes (via Supabase Realtime) to the admin_notifications
 * table. Returns:
 *
 *   notifications  — last 30 items, newest first
 *   unreadCount    — number of rows where read_at IS NULL
 *   markAsRead     — mark a single notification as read
 *   markAllAsRead  — mark every unread notification as read
 *   loading        — initial fetch in progress
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface AdminNotification {
  id:             string
  type:           'new_application' | 'documents_submitted' | 'additional_documents'
  applicant_id:   string
  applicant_name: string | null
  message:        string
  read_at:        string | null
  created_at:     string
}

export function useAdminNotifications() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [loading, setLoading]             = useState(true)
  const supabaseRef                       = useRef(createClient())

  // ── Initial fetch ─────────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    const { data, error } = await supabaseRef.current
      .from('admin_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)

    if (!error && data) {
      setNotifications(data as AdminNotification[])
    }
    setLoading(false)
  }, [])

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    fetchNotifications()

    const channel = supabaseRef.current
      .channel('admin_notifications_feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'admin_notifications' },
        (payload) => {
          const newRow = payload.new as AdminNotification
          setNotifications((prev) => [newRow, ...prev].slice(0, 30))
        },
      )
      .subscribe()

    return () => {
      supabaseRef.current.removeChannel(channel)
    }
  }, [fetchNotifications])

  // ── Actions ───────────────────────────────────────────────────────────────
  const markAsRead = useCallback(async (id: string) => {
    const now = new Date().toISOString()

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: now } : n)),
    )

    await supabaseRef.current
      .from('admin_notifications')
      .update({ read_at: now })
      .eq('id', id)
  }, [])

  const markAllAsRead = useCallback(async () => {
    const now     = new Date().toISOString()
    const unread  = notifications.filter((n) => !n.read_at).map((n) => n.id)
    if (!unread.length) return

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (!n.read_at ? { ...n, read_at: now } : n)),
    )

    await supabaseRef.current
      .from('admin_notifications')
      .update({ read_at: now })
      .in('id', unread)
  }, [notifications])

  const unreadCount = notifications.filter((n) => !n.read_at).length

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead }
}
