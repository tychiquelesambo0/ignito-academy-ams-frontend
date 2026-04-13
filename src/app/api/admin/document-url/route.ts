import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

const Schema = z.object({
  filePath: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    // ── 1. Verify admin officer ──────────────────────────────────────────────
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

    const { data: officer } = await supabase
      .from('admissions_officers')
      .select('id')
      .eq('id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!officer) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

    // ── 2. Validate ──────────────────────────────────────────────────────────
    const body = await req.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Chemin de fichier invalide.' }, { status: 400 })
    }

    // ── 3. Generate signed URL via admin client ──────────────────────────────
    const admin = createAdminClient()
    const { data, error } = await admin
      .storage
      .from('pieces_justificatives')
      .createSignedUrl(parsed.data.filePath, 300) // 5-minute expiry

    if (error || !data?.signedUrl) {
      console.error('[admin/document-url] storage error:', error)
      return NextResponse.json(
        { error: 'Impossible de générer le lien de téléchargement.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: data.signedUrl })

  } catch (err) {
    console.error('[admin/document-url] unexpected error:', err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
