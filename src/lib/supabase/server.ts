import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from './types'

// 30 days — matches the middleware so cookies are always persistent
const SESSION_MAX_AGE = 60 * 60 * 24 * 30

/** Service-role client — bypasses RLS. Use only in trusted server-side routes. */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase URL or service role key')
  }
  return createSupabaseClient<Database>(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                maxAge:   SESSION_MAX_AGE,
                sameSite: 'lax',
                secure:   process.env.NODE_ENV === 'production',
              })
            )
          } catch {
            // Called from a Server Component — safe to ignore;
            // the middleware handles cookie refresh.
          }
        },
      },
    }
  )
}
