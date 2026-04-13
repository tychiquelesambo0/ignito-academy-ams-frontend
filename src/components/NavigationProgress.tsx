'use client'

/**
 * NavigationProgress
 *
 * A thin #4EA6F5 progress bar fixed to the very top of the viewport.
 * Fires on every internal client-side navigation — both <Link> clicks and
 * programmatic router.push() calls — and completes the moment the new
 * pathname is committed by React.
 *
 * Design rules ("Le Conservateur Numérique"):
 *   - Accent colour #4EA6F5 only
 *   - Height: 2px (h-0.5) so it never competes with content
 *   - z-index 9999 — always on top, including the fixed sidebar/topbar
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'

// ─── tiny event bus so programmatic navigations can also trigger the bar ──────
// Any call to `startNavigationProgress()` from anywhere in the app will fire it.

type Listener = () => void
const listeners = new Set<Listener>()

export function startNavigationProgress() {
  listeners.forEach((fn) => fn())
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NavigationProgress() {
  const pathname         = usePathname()
  const prevPathname     = useRef(pathname)
  const [visible, setVisible]   = useState(false)
  const [width, setWidth]       = useState(0)
  const intervalRef      = useRef<ReturnType<typeof setInterval> | null>(null)
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimers = () => {
    if (intervalRef.current)      clearInterval(intervalRef.current)
    if (completeTimerRef.current) clearTimeout(completeTimerRef.current)
  }

  // Start the bar animation
  const start = useCallback(() => {
    clearTimers()
    setVisible(true)
    setWidth(8)           // jump to 8% immediately so user sees feedback at once

    intervalRef.current = setInterval(() => {
      setWidth((w) => {
        if (w >= 82) {
          clearInterval(intervalRef.current!)
          return 82        // hold at 82% while waiting for the route to settle
        }
        // Non-linear easing: fast at start, slows toward the hold point
        const increment = Math.max(1, (82 - w) * 0.12)
        return Math.min(82, w + increment)
      })
    }, 120)
  }, [])

  // Complete the bar to 100% then fade it out
  const complete = useCallback(() => {
    clearTimers()
    setWidth(100)
    completeTimerRef.current = setTimeout(() => {
      setVisible(false)
      setWidth(0)
    }, 350)  // matches the CSS transition duration
  }, [])

  // ── Subscribe to the programmatic event bus ────────────────────────────────
  useEffect(() => {
    listeners.add(start)
    return () => { listeners.delete(start) }
  }, [start])

  // ── Detect <Link> / <a> clicks for declarative navigation ─────────────────
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null
      if (!anchor) return

      const href = anchor.getAttribute('href') ?? ''
      // Skip: external links, hash anchors, non-http protocols
      if (
        !href ||
        href.startsWith('http') ||
        href.startsWith('//') ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:')
      ) return

      // Only trigger if the destination differs from current path
      if (href !== pathname) start()
    }

    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [pathname, start])

  // ── Complete when the pathname actually changes ────────────────────────────
  useEffect(() => {
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname
      complete()
    }
  }, [pathname, complete])

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => () => clearTimers(), [])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 right-0 top-0 z-[9999] h-0.5"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 200ms ease' }}
    >
      <div
        className="h-full bg-[#4EA6F5]"
        style={{
          width: `${width}%`,
          transition: width === 100
            ? 'width 200ms ease-out'      // fast completion
            : 'width 120ms ease-out',     // smooth crawl
          boxShadow: '0 0 6px 0 rgba(78,166,245,0.6)',  // subtle glow
        }}
      />
    </div>
  )
}
