import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from './lib/supabase/types'

// 30 days — keeps the cookie alive so the refresh token can always be used
const SESSION_MAX_AGE = 60 * 60 * 24 * 30

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  // Bypass auth checks when Supabase is not configured (frontend-only dev mode)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response
  }

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Write cookies onto the request so downstream handlers see them
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          // Write cookies onto the response with a long maxAge so they are
          // never treated as session-only cookies by the browser.
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              maxAge:   SESSION_MAX_AGE,
              sameSite: 'lax',
              secure:   process.env.NODE_ENV === 'production',
            })
          )
        },
      },
    }
  )

  // getUser() will silently refresh an expired access token using the
  // refresh token and write updated cookies via setAll above.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  // If the auth token is invalid (user deleted from auth.users), force sign-out
  if (authError && authError.message !== 'Auth session missing!') {
    await supabase.auth.signOut()
    const redirectUrl = request.nextUrl.pathname.startsWith('/admin')
      ? '/admin/login'
      : '/apply'
    return NextResponse.redirect(new URL(redirectUrl, request.url))
  }

  // ── Applicant dashboard ──────────────────────────────────────────────────
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!user) {
      console.log('[Middleware] No user found, redirecting to /apply')
      return NextResponse.redirect(new URL('/apply', request.url))
    }

    console.log('[Middleware] User authenticated:', user.id, user.email)

    // Verify the applicant record still exists
    const { data: applicant, error: applicantError } = await supabase
      .from('applicants')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    console.log('[Middleware] Applicant lookup:', { applicant, applicantError })

    if (!applicant) {
      console.log('[Middleware] No applicant record found, signing out and redirecting')
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL('/apply', request.url))
    }

    console.log('[Middleware] Applicant verified, allowing access to dashboard')
  }

  // ── Admin portal ─────────────────────────────────────────────────────────
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const isPublicAdminRoute =
      request.nextUrl.pathname === '/admin/login' ||
      request.nextUrl.pathname === '/admin/forbidden'

    if (isPublicAdminRoute) {
      // Already authenticated officers skip straight to the dashboard
      if (user && request.nextUrl.pathname === '/admin/login') {
        const { data: officer } = await supabase
          .from('admissions_officers')
          .select('id, is_active')
          .eq('id', user.id)
          .eq('is_active', true)
          .maybeSingle()

        if (officer) {
          return NextResponse.redirect(new URL('/admin', request.url))
        }
      }
      return response
    }

    if (!user) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    const { data: officer, error } = await supabase
      .from('admissions_officers')
      .select('id, is_active')
      .eq('id', user.id)
      .maybeSingle()

    if (error || !officer || !officer.is_active) {
      return NextResponse.redirect(new URL('/admin/forbidden', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all routes EXCEPT:
     *  - Next.js internals (_next/static, _next/image)
     *  - Static assets (favicon, images)
     *  - PawaPay callback endpoints — must never be wrapped in auth per PawaPay docs
     */
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
