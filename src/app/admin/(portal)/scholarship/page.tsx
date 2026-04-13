'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Award, Play, Clock, CheckCircle2, XCircle, AlertCircle,
  ExternalLink, BadgeCheck, Users, Loader2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScholarshipApplicant {
  applicant_id:           string
  application_status:     string
  scholarship_video_url:  string | null
  is_scholarship_eligible: boolean
  created_at:             string
  prenom:                 string
  nom:                    string
  email:                  string
  grade_10_average:       number | null
  grade_11_average:       number | null
  grade_12_average:       number | null
  exetat_percentage:      number | null
  graduation_year:        number | null
}

type TabKey = 'all' | 'video' | 'no_video'

const SCHOLARSHIP_LIMIT = 20

// ─── Helpers ──────────────────────────────────────────────────────────────────

function avgBadge(val: number | null) {
  if (val == null) return <span className="text-slate-300">—</span>
  const color = val >= 80 ? 'text-emerald-600' : val >= 70 ? 'text-amber-600' : 'text-red-500'
  return <span className={`font-semibold ${color}`}>{val}%</span>
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    'Dossier Créé':           'bg-slate-100  text-slate-600  border-slate-200',
    'en_cours_devaluation':   'bg-amber-50   text-amber-700  border-amber-200',
    'Frais Réglés':           'bg-amber-50   text-amber-700  border-amber-200',
    'Admission sous réserve': 'bg-purple-50  text-purple-700 border-purple-200',
    'Admission définitive':   'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Dossier refusé':         'bg-red-50     text-red-700    border-red-200',
  }
  const labels: Record<string, string> = {
    'Dossier Créé':           'Dossier créé',
    'en_cours_devaluation':   "En cours d'évaluation",
    'Frais Réglés':           "En cours d'évaluation",
    'Admission sous réserve': 'Sous réserve',
    'Admission définitive':   'Admis',
    'Dossier refusé':         'Refusé',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px]
                      font-medium border ${map[status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {labels[status] ?? status}
    </span>
  )
}

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-200" />
        ))}
      </div>
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
        <div className="h-14 bg-slate-50 border-b border-slate-100" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 border-b border-slate-50 px-6">
            <div className="h-4 w-1/3 bg-slate-200 rounded mt-6" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminScholarshipPage() {
  const [applicants, setApplicants] = useState<ScholarshipApplicant[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [activeTab,  setActiveTab]  = useState<TabKey>('all')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      const supabase = createClient()

      const { data, error: fetchError } = await supabase
        .from('applications')
        .select(`
          applicant_id,
          application_status,
          scholarship_video_url,
          is_scholarship_eligible,
          created_at,
          grade_10_average,
          grade_11_average,
          grade_12_average,
          exetat_percentage,
          graduation_year,
          applicants!inner (
            prenom,
            nom,
            email
          )
        `)
        .eq('is_scholarship_eligible', true)
        .order('created_at', { ascending: false })

      if (fetchError) {
        setError('Impossible de charger les données de bourse.')
        setLoading(false)
        return
      }

      const normalised: ScholarshipApplicant[] = (data ?? []).map((row: any) => ({
        applicant_id:            row.applicant_id,
        application_status:      row.application_status,
        scholarship_video_url:   row.scholarship_video_url,
        is_scholarship_eligible: row.is_scholarship_eligible,
        created_at:              row.created_at,
        grade_10_average:        row.grade_10_average,
        grade_11_average:        row.grade_11_average,
        grade_12_average:        row.grade_12_average,
        exetat_percentage:       row.exetat_percentage,
        graduation_year:         row.graduation_year,
        prenom:                  row.applicants?.prenom ?? '',
        nom:                     row.applicants?.nom    ?? '',
        email:                   row.applicants?.email  ?? '',
      }))

      setApplicants(normalised)
      setLoading(false)
    }
    load()
  }, [])

  const videoSubmitted = useMemo(
    () => applicants.filter(a => !!a.scholarship_video_url).length,
    [applicants]
  )
  const awaitingVideo = applicants.length - videoSubmitted

  const displayed = useMemo(() => {
    if (activeTab === 'video')    return applicants.filter(a => !!a.scholarship_video_url)
    if (activeTab === 'no_video') return applicants.filter(a => !a.scholarship_video_url)
    return applicants
  }, [applicants, activeTab])

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'all',      label: 'Tous',              count: applicants.length },
    { key: 'video',    label: 'Vidéo soumise',     count: videoSubmitted },
    { key: 'no_video', label: 'En attente vidéo',  count: awaitingVideo },
  ]

  if (loading) return <Skeleton />

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <AlertCircle className="h-10 w-10 text-slate-300" />
        <p className="text-sm text-slate-500">{error}</p>
        <button onClick={() => window.location.reload()}
                className="text-xs text-[#4EA6F5] hover:underline">
          Réessayer
        </button>
      </div>
    )
  }

  const pct = Math.min(Math.round((applicants.length / SCHOLARSHIP_LIMIT) * 100), 100)

  return (
    <div className="space-y-8">

      {/* ── Heading ── */}
      <div>
        <h1 className="font-serif text-3xl font-bold text-[#021463]">
          Bourse d&apos;Excellence
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Candidats académiquement éligibles à la bourse d&apos;études Ignito Academy.
        </p>
      </div>

      {/* ── Counter cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

        {/* Quota card */}
        <div className="col-span-1 sm:col-span-1 rounded-xl border border-amber-200
                        bg-amber-50 p-5 shadow-sm">
          <div className="mb-3 flex h-9 w-9 items-center justify-center
                          rounded-lg bg-amber-100">
            <Award className="h-5 w-5 text-amber-600" />
          </div>
          <p className="mb-0.5 text-2xl font-bold leading-none text-[#021463]">
            {applicants.length}
            <span className="ml-1.5 text-sm font-medium text-slate-400">
              / {SCHOLARSHIP_LIMIT}
            </span>
          </p>
          <p className="mb-3 text-xs font-medium text-slate-500">
            Candidats éligibles (quota : {SCHOLARSHIP_LIMIT})
          </p>
          {/* Progress bar */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-amber-200">
            <div
              className="h-full rounded-full bg-amber-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-amber-600 font-medium">
            {SCHOLARSHIP_LIMIT - applicants.length} place{SCHOLARSHIP_LIMIT - applicants.length !== 1 ? 's' : ''} restante{SCHOLARSHIP_LIMIT - applicants.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Video submitted */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <div className="mb-3 flex h-9 w-9 items-center justify-center
                          rounded-lg bg-emerald-100">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mb-1 text-2xl font-bold leading-none text-[#021463]">
            {videoSubmitted}
          </p>
          <p className="text-xs font-medium text-slate-500">Vidéos soumises</p>
        </div>

        {/* Awaiting video */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex h-9 w-9 items-center justify-center
                          rounded-lg bg-slate-100">
            <Clock className="h-5 w-5 text-slate-500" />
          </div>
          <p className="mb-1 text-2xl font-bold leading-none text-[#021463]">
            {awaitingVideo}
          </p>
          <p className="text-xs font-medium text-slate-500">En attente de vidéo</p>
        </div>
      </div>

      {/* ── Applicants list ── */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

        {/* Header + tabs */}
        <div className="border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-[#4EA6F5]" />
            <h2 className="font-serif text-base font-bold text-[#021463]">
              Candidats à la Bourse
            </h2>
          </div>
          <div className="flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={[
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  activeTab === tab.key
                    ? 'bg-[#021463] text-white'
                    : 'text-slate-500 hover:bg-slate-100',
                ].join(' ')}
              >
                {tab.label}
                <span className={[
                  'rounded px-1.5 py-0.5 text-[10px] font-bold',
                  activeTab === tab.key
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 text-slate-600',
                ].join(' ')}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <BadgeCheck className="h-10 w-10 text-slate-200" />
            <p className="text-sm text-slate-400">
              {activeTab === 'all'
                ? "Aucun candidat éligible à la bourse pour l'instant."
                : "Aucun candidat dans cette catégorie."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {displayed.map(applicant => (
              <div key={applicant.applicant_id}
                   className="flex flex-col gap-4 px-6 py-4 transition-colors
                              hover:bg-slate-50/50 md:flex-row md:items-start md:justify-between">

                {/* Left: identity + grades */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-[#021463]">
                      {applicant.applicant_id}
                    </span>
                    <StatusPill status={applicant.application_status} />
                    {applicant.scholarship_video_url ? (
                      <span className="inline-flex items-center gap-1 rounded border
                                       border-emerald-300 bg-emerald-50 px-1.5 py-0.5
                                       text-[10px] font-semibold text-emerald-700">
                        <Play className="h-2.5 w-2.5" /> Vidéo soumise
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded border
                                       border-amber-300 bg-amber-50 px-1.5 py-0.5
                                       text-[10px] font-semibold text-amber-700">
                        <Clock className="h-2.5 w-2.5" /> En attente
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-semibold text-slate-800">
                    {applicant.prenom} {applicant.nom}
                  </p>
                  <p className="text-xs text-slate-400 mb-2">{applicant.email}</p>

                  {/* Grade mini-table */}
                  <div className="flex flex-wrap gap-3 text-xs">
                    <span className="text-slate-500">
                      10e : {avgBadge(applicant.grade_10_average)}
                    </span>
                    <span className="text-slate-500">
                      11e : {avgBadge(applicant.grade_11_average)}
                    </span>
                    <span className="text-slate-500">
                      12e : {avgBadge(applicant.grade_12_average)}
                    </span>
                    <span className="text-slate-500">
                      Exetat : {avgBadge(applicant.exetat_percentage)}
                    </span>
                    {applicant.graduation_year && (
                      <span className="text-slate-500">
                        Promo <span className="font-semibold text-slate-700">
                          {applicant.graduation_year}
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: video preview + link to dossier */}
                <div className="flex items-center gap-3 shrink-0">
                  {applicant.scholarship_video_url && (
                    <a
                      href={applicant.scholarship_video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md
                                 border border-[#4EA6F5]/30 bg-[#4EA6F5]/5 px-3 py-1.5
                                 text-xs font-medium text-[#4EA6F5]
                                 transition-colors hover:bg-[#4EA6F5]/10"
                    >
                      <Play className="h-3 w-3" />
                      Voir la vidéo
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                  <Link
                    href={`/admin/applications/${encodeURIComponent(applicant.applicant_id)}`}
                    className="inline-flex items-center gap-1.5 rounded-md
                               bg-[#021463] px-3 py-1.5 text-xs font-semibold text-white
                               transition-colors hover:bg-[#021463]/90"
                  >
                    Voir le dossier
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
