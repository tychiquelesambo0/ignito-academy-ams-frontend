import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

const Schema = z.object({
  applicantId: z.string().min(1),
  message:     z.string().min(5, 'Le message doit contenir au moins 5 caractères.'),
})

export async function POST(req: NextRequest) {
  try {
    // ── 1. Verify officer ────────────────────────────────────────────────────
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
    }

    const { data: officer } = await supabase
      .from('admissions_officers')
      .select('id')
      .eq('id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!officer) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
    }

    // ── 2. Validate ──────────────────────────────────────────────────────────
    const body = await req.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Données invalides.' },
        { status: 400 },
      )
    }

    const { applicantId, message } = parsed.data

    // ── 3. Update application — set conditional message ──────────────────────
    const admin = createAdminClient()

    // Fetch previous status for audit trail
    const { data: current } = await admin
      .from('applications')
      .select('application_status')
      .eq('applicant_id', applicantId)
      .single()

    const { data: updated, error } = await admin
      .from('applications')
      .update({
        conditional_message: message.trim(),
        updated_at:          new Date().toISOString(),
      })
      .eq('applicant_id', applicantId)
      .select('applicant_id, conditional_message')
      .single()

    if (error || !updated) {
      console.error('[admin/request-document] update error:', error)
      return NextResponse.json(
        { error: 'Impossible d\'envoyer la demande de document.' },
        { status: 500 }
      )
    }

    // ── 4. Log in audit_trail ────────────────────────────────────────────────
    await admin
      .from('audit_trail')
      .insert({
        applicant_id:    applicantId,
        admin_id:        user.id,
        previous_status: current?.application_status as any,
        new_status:      current?.application_status as any, // status unchanged
        notes:           `Demande de document : ${message.trim()}`,
      })
      .then()

    return NextResponse.json({ success: true, updated })

  } catch (err) {
    console.error('[admin/request-document] unexpected error:', err)
    return NextResponse.json({ error: 'Erreur serveur inattendue.' }, { status: 500 })
  }
}
