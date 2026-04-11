'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * /login redirects to the unified Admitta gateway with the login tab pre-selected.
 * Full Supabase auth logic will be wired up in /apply/page.tsx once the UI is approved.
 */
export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/apply?tab=connexion')
  }, [router])

  return <div className="min-h-screen bg-[#021463]" />
}
