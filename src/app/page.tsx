'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Root page - Redirects to /apply
 * 
 * The landing page should be hosted separately at https://ignitoacademy.com
 * This AMS (Admissions Management System) is for https://admissions.ignitoacademy.com
 */
export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to application page
    router.replace('/apply')
  }, [router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <p className="text-muted-foreground">Redirecting to application...</p>
      </div>
    </div>
  )
}
