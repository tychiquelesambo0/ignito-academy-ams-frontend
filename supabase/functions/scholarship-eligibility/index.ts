// Supabase Edge Function: scholarship-eligibility
// Task 16.2 — Server-side scholarship eligibility evaluation
//
// Called from the Next.js dashboard after academic history is saved.
// Evaluates eligibility criteria and checks the live scholarship award count
// from the database (enforces the 20-scholarship hard cap server-side).
//
// Input:
//   { applicant_id, intake_year }
//
// Output:
//   { isEligible, reasons, ageOnSeptember1st, averageGrade, limitReached, currentCount, maxScholarships }

import { serve }       from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── CORS ─────────────────────────────────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Constants (mirror of src/lib/scholarship/eligibility.ts) ─────────────────

const MAX_SCHOLARSHIPS_AWARDED_PER_YEAR = 20
const MIN_GRADE_AVERAGE                 = 70
const MAX_AGE_ON_SEPTEMBER_1ST          = 19
const MIN_GRADUATION_YEAR               = 2024

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Calculate age on September 1st of the intake year (Task 8.2) */
function calculateAge(dateOfBirth: Date, intakeYear: number): number {
  const september1st = new Date(intakeYear, 8, 1) // month 0-indexed
  let age = september1st.getFullYear() - dateOfBirth.getFullYear()

  const birthdayThisYear = new Date(
    september1st.getFullYear(),
    dateOfBirth.getMonth(),
    dateOfBirth.getDate(),
  )
  if (september1st < birthdayThisYear) age--

  return age
}

function jsonRes(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // ── Parse input ───────────────────────────────────────────────────────────
    let body: { applicant_id: string; intake_year: number }
    try {
      body = await req.json()
    } catch {
      return jsonRes({ error: 'INVALID_JSON' }, 400)
    }

    const { applicant_id, intake_year } = body

    if (!applicant_id || !intake_year) {
      return jsonRes({ error: 'MISSING_FIELDS', message: 'applicant_id et intake_year sont requis.' }, 400)
    }

    // ── Supabase admin client ─────────────────────────────────────────────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // ── Fetch academic history + date of birth ────────────────────────────────
    const { data: appRow, error: appErr } = await supabase
      .from('applications')
      .select(`
        grade10_average,
        grade11_average,
        grade12_average,
        exetat_percentage,
        graduation_year,
        applicants!inner ( date_naissance )
      `)
      .eq('applicant_id', applicant_id)
      .single()

    if (appErr || !appRow) {
      return jsonRes({ error: 'APPLICATION_NOT_FOUND' }, 404)
    }

    const apt = (appRow as any).applicants
    const dateOfBirth   = new Date(apt.date_naissance)
    const graduationYear = appRow.graduation_year ?? 0

    // ── Eligibility calculation (Task 8.3–8.7) ────────────────────────────────
    const reasons: string[] = []

    const grades = [
      appRow.grade10_average,
      appRow.grade11_average,
      appRow.grade12_average,
      appRow.exetat_percentage,
    ]

    const hasAllGrades = grades.every((g) => g !== null && g !== undefined)
    if (!hasAllGrades) {
      return jsonRes({
        isEligible:        false,
        reasons:           ['Toutes les notes (10e, 11e, 12e année, et EXETAT) sont requises'],
        limitReached:      false,
        currentCount:      0,
        maxScholarships:   MAX_SCHOLARSHIPS_AWARDED_PER_YEAR,
      }, 200)
    }

    const validGrades   = grades.filter((g): g is number => g !== null && g !== undefined)
    const averageGrade  = validGrades.reduce((s, g) => s + g, 0) / validGrades.length

    if (averageGrade < MIN_GRADE_AVERAGE) {
      reasons.push(`Moyenne académique insuffisante: ${averageGrade.toFixed(1)}% (minimum requis: ${MIN_GRADE_AVERAGE}%)`)
    }

    const gradeNames = ['10e année', '11e année', '12e année', 'EXETAT']
    validGrades.forEach((grade, i) => {
      if (grade < MIN_GRADE_AVERAGE) {
        reasons.push(`Note de ${gradeNames[i]} insuffisante: ${grade}% (minimum requis: ${MIN_GRADE_AVERAGE}%)`)
      }
    })

    const ageOnSeptember1st = calculateAge(dateOfBirth, intake_year)
    if (ageOnSeptember1st > MAX_AGE_ON_SEPTEMBER_1ST) {
      reasons.push(`Âge trop élevé: ${ageOnSeptember1st} ans au 1er septembre ${intake_year} (maximum: ${MAX_AGE_ON_SEPTEMBER_1ST} ans)`)
    }

    if (graduationYear < MIN_GRADUATION_YEAR) {
      reasons.push(`Année de graduation invalide: ${graduationYear} (minimum: ${MIN_GRADUATION_YEAR})`)
    }

    const isEligible = reasons.length === 0

    // ── Scholarship award limit check (Task 8.8) ──────────────────────────────
    const { count, error: countErr } = await supabase
      .from('scholarship_applications')
      .select('*', { count: 'exact', head: true })
      .eq('intake_year', intake_year)
      .eq('scholarship_status', 'Awarded')

    const currentCount = countErr ? 0 : (count ?? 0)
    const limitReached = currentCount >= MAX_SCHOLARSHIPS_AWARDED_PER_YEAR

    // ── Response ──────────────────────────────────────────────────────────────
    return jsonRes({
      isEligible,
      reasons,
      ageOnSeptember1st,
      averageGrade,
      limitReached,
      currentCount,
      maxScholarships: MAX_SCHOLARSHIPS_AWARDED_PER_YEAR,
    }, 200)

  } catch (err) {
    console.error('[scholarship-eligibility] Unhandled error:', err)
    return jsonRes({ error: 'INTERNAL_ERROR', message: String(err) }, 500)
  }
})
