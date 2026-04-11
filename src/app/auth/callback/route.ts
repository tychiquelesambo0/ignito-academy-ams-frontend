import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code       = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type       = searchParams.get('type')

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  if (token_hash && type === 'recovery') {
    return NextResponse.redirect(
      `${origin}/auth/reset?token_hash=${token_hash}&type=recovery`
    )
  }

  let userId: string | null = null

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) userId = data.user.id
  }

  if (token_hash && (type === 'signup' || type === 'email')) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'signup' | 'email',
    })
    if (!error && data.user) userId = data.user.id
  }

  if (!userId) {
    return NextResponse.redirect(`${origin}/apply?error=confirmation_failed`)
  }

  // Fetch their application to decide where to send them
  const { data: app } = await admin
    .from('applications')
    .select('applicant_id, ecole_provenance, option_academique')
    .eq('user_id', userId)
    .single()

  // Academic history not yet filled → continue the onboarding flow
  if (!app?.ecole_provenance || !app?.option_academique) {
    const qs = app?.applicant_id ? `?applicant_id=${app.applicant_id}` : ''
    return NextResponse.redirect(`${origin}/apply/academic-history${qs}`)
  }

  // Fully onboarded → go straight to dashboard
  return NextResponse.redirect(`${origin}/dashboard`)
}
