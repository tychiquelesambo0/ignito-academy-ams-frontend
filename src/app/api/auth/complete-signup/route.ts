import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    // Initialise inside the handler so env vars are always read at request time
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      console.error('[complete-signup] missing env vars', { supabaseUrl: !!supabaseUrl, serviceKey: !!serviceKey })
      return NextResponse.json({ error: 'Configuration serveur manquante.' }, { status: 500 })
    }

    const admin = createClient(supabaseUrl, serviceKey)

    const { userId, email, prenom, nom, phone_number, date_naissance } = await req.json()

    if (!userId || !email) {
      return NextResponse.json({ error: 'userId et email sont requis.' }, { status: 400 })
    }

    // 1. Upsert profile — clean up any orphaned records that share email or phone
    //    before attempting the upsert, to avoid unique-constraint violations.

    // Collect all orphaned ids in one pass
    const orphanIds = new Set<string>()

    const { data: byEmail } = await admin
      .from('applicants').select('id').eq('email', email).maybeSingle()
    if (byEmail && byEmail.id !== userId) orphanIds.add(byEmail.id)

    if (phone_number) {
      const { data: byPhone } = await admin
        .from('applicants').select('id').eq('phone_number', phone_number).maybeSingle()
      if (byPhone && byPhone.id !== userId) orphanIds.add(byPhone.id)
    }

    for (const orphanId of orphanIds) {
      await admin.from('applications').delete().eq('user_id', orphanId)
      await admin.from('applicants').delete().eq('id', orphanId)
    }

    const { error: profileError } = await admin.from('applicants').upsert({
      id: userId,
      email,
      phone_number,
      prenom,
      nom,
      date_naissance,
    }, { onConflict: 'id' })

    if (profileError) {
      console.error('[complete-signup] profile error:', profileError.message)
      return NextResponse.json({ error: `Erreur profil: ${profileError.message}` }, { status: 500 })
    }

    // 2. Check if application already exists (idempotent)
    const { data: existingApp } = await admin
      .from('applications')
      .select('applicant_id')
      .eq('user_id', userId)
      .single()

    if (existingApp?.applicant_id) {
      return NextResponse.json({ applicant_id: existingApp.applicant_id })
    }

    // 3. Generate applicant ID
    const currentYear = new Date().getFullYear()
    const { data: applicantId, error: idError } = await admin
      .rpc('generate_applicant_id', { p_intake_year: currentYear })

    if (idError || !applicantId) {
      console.error('[complete-signup] id error:', idError?.message)
      return NextResponse.json({ error: `Erreur identifiant: ${idError?.message}` }, { status: 500 })
    }

    // 4. Create application record
    // exam_status defaults to 'En attente' per the live schema enum
    const { error: appError } = await admin.from('applications').insert({
      applicant_id: applicantId as string,
      user_id: userId,
      intake_year: currentYear,
      application_status: 'Dossier Créé',
      payment_status: 'Pending',
    })

    if (appError) {
      console.error('[complete-signup] application error:', appError.message)
      return NextResponse.json({ error: `Erreur dossier: ${appError.message}` }, { status: 500 })
    }

    return NextResponse.json({ applicant_id: applicantId })
  } catch (err: any) {
    console.error('[complete-signup] unexpected error:', err?.message)
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 })
  }
}
