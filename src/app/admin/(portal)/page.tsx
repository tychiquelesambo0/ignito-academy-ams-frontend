'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Users, Clock, CheckCircle2, CreditCard, FileText, AlertCircle,
  Search, X, ChevronUp, ChevronDown, ChevronsUpDown, ExternalLink, Award,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminApplication {
  applicant_id:           string
  application_status:     string
  payment_status:         string
  created_at:             string
  exam_status:            string | null
  is_scholarship_eligible: boolean
  documents_submitted:    boolean
  prenom:                 string
  nom:                    string
  email:                  string
}

interface Stats {
  total:              number
  enCours:            number
  decisions:          number
  paymentsConfirmed:  number
  scholarshipEligible: number
}

type SortKey = 'applicant_id' | 'nom' | 'exam_status' | 'payment_status' | 'application_status' | 'created_at'
type SortDir = 'asc' | 'desc'

// ─── Constants ────────────────────────────────────────────────────────────────

const DECISION_STATUSES = ['Admission sous réserve', 'Admission définitive', 'Dossier refusé']

const APP_STATUS_LABELS: Record<string, string> = {
  'Dossier Créé':           'Dossier créé',
  'en_cours_devaluation':   "En cours d'évaluation",
  'Frais Réglés':           "En cours d'évaluation",
  'Admission sous réserve': 'Admission sous réserve',
  'Admission définitive':   'Admission définitive',
  'Dossier refusé':         'Dossier refusé',
}

const APP_STATUS_STYLE: Record<string, string> = {
  'Dossier Créé':           'bg-slate-100  text-slate-600  border-slate-200',
  'en_cours_devaluation':   'bg-amber-50   text-amber-700  border-amber-200',
  'Frais Réglés':           'bg-amber-50   text-amber-700  border-amber-200',
  'Admission sous réserve': 'bg-purple-50  text-purple-700 border-purple-200',
  'Admission définitive':   'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Dossier refusé':         'bg-red-50     text-red-700    border-red-200',
}

const PAY_STYLE: Record<string, string> = {
  Confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Waived:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  Pending:   'bg-amber-50   text-amber-700   border-amber-200',
  Failed:    'bg-red-50     text-red-700     border-red-200',
}

const PAY_LABELS: Record<string, string> = {
  Confirmed: 'Confirmé', Waived: 'Exonéré',
  Pending:   'En attente', Failed: 'Échoué',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusPill({ value, type }: { value: string; type: 'application' | 'payment' }) {
  const cls = type === 'payment'
    ? (PAY_STYLE[value]      ?? 'bg-slate-100 text-slate-600 border-slate-200')
    : (APP_STATUS_STYLE[value] ?? 'bg-slate-100 text-slate-600 border-slate-200')
  const label = type === 'payment'
    ? (PAY_LABELS[value]        ?? value)
    : (APP_STATUS_LABELS[value] ?? value)

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px]
                      font-medium border ${cls}`}>
      {label}
    </span>
  )
}

function SortIcon({ col, sortKey, sortDir }: {
  col: SortKey; sortKey: SortKey | null; sortDir: SortDir
}) {
  if (sortKey !== col) return <ChevronsUpDown className="w-3.5 h-3.5 text-slate-300 ml-1 inline" />
  return sortDir === 'asc'
    ? <ChevronUp   className="w-3.5 h-3.5 text-[#4EA6F5] ml-1 inline" />
    : <ChevronDown className="w-3.5 h-3.5 text-[#4EA6F5] ml-1 inline" />
}

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`h-9 rounded-lg border text-xs font-medium px-3 pr-7 appearance-none
                  cursor-pointer transition-colors focus:outline-none
                  focus:ring-2 focus:ring-[#4EA6F5]/40
                  ${value
                    ? 'border-[#4EA6F5] bg-blue-50 text-[#021463]'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
    >
      <option value="">{label}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-200" />
        ))}
      </div>
      {/* Table */}
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
        <div className="h-16 bg-slate-50 border-b border-slate-100" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 border-b border-slate-50 px-6">
            <div className="h-4 w-1/3 bg-slate-200 rounded mt-5" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [apps,    setApps]    = useState<AdminApplication[]>([])
  const [stats,   setStats]   = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const [search,     setSearch]     = useState('')
  const [filterApp,  setFilterApp]  = useState('')
  const [filterPay,  setFilterPay]  = useState('')
  const [filterExam, setFilterExam] = useState('')
  const [sortKey,    setSortKey]    = useState<SortKey | null>(null)
  const [sortDir,    setSortDir]    = useState<SortDir>('asc')

  // ── Fetch ─────────────────────────────────────────────────────────────────

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
          payment_status,
          created_at,
          exam_status,
          is_scholarship_eligible,
          documents_submitted,
          applicants!inner (
            prenom,
            nom,
            email
          )
        `)
        .order('created_at', { ascending: false })

      if (fetchError) {
        setError("Impossible de charger les candidatures. Vérifiez votre connexion.")
        setLoading(false)
        return
      }

      const normalised: AdminApplication[] = (data ?? []).map((row: any) => ({
        applicant_id:            row.applicant_id,
        application_status:      row.application_status,
        payment_status:          row.payment_status,
        created_at:              row.created_at,
        exam_status:             row.exam_status,
        is_scholarship_eligible: row.is_scholarship_eligible ?? false,
        documents_submitted:     row.documents_submitted ?? false,
        prenom:                  row.applicants?.prenom ?? '',
        nom:                     row.applicants?.nom    ?? '',
        email:                   row.applicants?.email  ?? '',
      }))

      setApps(normalised)
      setStats({
        total:              normalised.length,
        enCours:            normalised.filter(a =>
          a.application_status === 'en_cours_devaluation' ||
          a.application_status === 'Frais Réglés'
        ).length,
        decisions:          normalised.filter(a =>
          DECISION_STATUSES.includes(a.application_status)
        ).length,
        paymentsConfirmed:  normalised.filter(a =>
          a.payment_status === 'Confirmed' || a.payment_status === 'Waived'
        ).length,
        scholarshipEligible: normalised.filter(a => a.is_scholarship_eligible).length,
      })
      setLoading(false)
    }
    load()
  }, [])

  // ── Filter + sort ─────────────────────────────────────────────────────────

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase()
    let filtered = apps.filter(a => {
      if (q && !a.applicant_id.toLowerCase().includes(q) &&
               !`${a.prenom} ${a.nom}`.toLowerCase().includes(q) &&
               !a.email.toLowerCase().includes(q)) return false
      if (filterApp  && a.application_status !== filterApp)  return false
      if (filterPay  && a.payment_status      !== filterPay)  return false
      if (filterExam && (a.exam_status ?? '')  !== filterExam) return false
      return true
    })

    if (sortKey) {
      filtered = [...filtered].sort((a, b) => {
        let va = '', vb = ''
        if      (sortKey === 'nom')         { va = `${a.nom} ${a.prenom}`; vb = `${b.nom} ${b.prenom}` }
        else if (sortKey === 'exam_status') { va = a.exam_status ?? '';    vb = b.exam_status ?? '' }
        else                               { va = (a as any)[sortKey] ?? ''; vb = (b as any)[sortKey] ?? '' }
        const cmp = va.localeCompare(vb, 'fr')
        return sortDir === 'asc' ? cmp : -cmp
      })
    }
    return filtered
  }, [apps, search, filterApp, filterPay, filterExam, sortKey, sortDir])

  const handleSort = (col: SortKey) => {
    if (sortKey === col) {
      if (sortDir === 'asc') setSortDir('desc')
      else { setSortKey(null); setSortDir('asc') }
    } else {
      setSortKey(col); setSortDir('asc')
    }
  }

  const hasFilters  = !!(search || filterApp || filterPay || filterExam)
  const clearFilters = () => {
    setSearch(''); setFilterApp(''); setFilterPay(''); setFilterExam('')
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return <Skeleton />

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertCircle className="w-10 h-10 text-slate-300" />
        <p className="text-sm text-slate-500">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-xs text-[#4EA6F5] hover:underline"
        >
          Réessayer
        </button>
      </div>
    )
  }

  const thClass = 'px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider select-none'
  const thSort  = `${thClass} cursor-pointer hover:text-[#021463] transition-colors whitespace-nowrap`

  const statCards = [
    {
      label: 'Candidatures totales',
      value: stats?.total ?? 0,
      icon:  Users,
      color: 'text-[#021463]',
      bg:    'border-[#021463]/10 bg-[#021463]/5',
    },
    {
      label: "En cours d'évaluation",
      value: stats?.enCours ?? 0,
      icon:  Clock,
      color: 'text-amber-600',
      bg:    'border-amber-200 bg-amber-50',
    },
    {
      label: 'Décisions rendues',
      value: stats?.decisions ?? 0,
      icon:  CheckCircle2,
      color: 'text-emerald-600',
      bg:    'border-emerald-200 bg-emerald-50',
    },
    {
      label: 'Paiements confirmés',
      value: stats?.paymentsConfirmed ?? 0,
      icon:  CreditCard,
      color: 'text-[#4EA6F5]',
      bg:    'border-blue-200 bg-blue-50',
    },
  ]

  return (
    <div className="space-y-8">

      {/* ── Heading ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#021463]">
            Bureau des Admissions
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Vue d&apos;ensemble des candidatures pour la promotion 2026.
          </p>
        </div>
        {(stats?.scholarshipEligible ?? 0) > 0 && (
          <Link
            href="/admin/scholarship"
            className="hidden sm:inline-flex items-center gap-2 rounded-md
                       border border-amber-300 bg-amber-50 px-4 py-2
                       text-xs font-semibold text-amber-700
                       transition-colors hover:bg-amber-100"
          >
            <Award className="h-3.5 w-3.5" />
            {stats?.scholarshipEligible} éligible{(stats?.scholarshipEligible ?? 0) > 1 ? 's' : ''} bourse
          </Link>
        )}
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map(card => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className={`rounded-xl border bg-white p-5 shadow-sm ${card.bg}`}
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center
                              rounded-lg bg-white/70">
                <Icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <p className="mb-1 text-2xl font-bold leading-none text-[#021463]">
                {card.value}
              </p>
              <p className="text-xs font-medium text-slate-500">{card.label}</p>
            </div>
          )
        })}
      </div>

      {/* ── Applications table ── */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

        {/* Toolbar */}
        <div className="space-y-3 border-b border-slate-100 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#4EA6F5]" />
              <h2 className="font-serif text-base font-bold text-[#021463]">
                Toutes les candidatures
              </h2>
            </div>
            <span className="text-xs text-slate-400">
              {displayed.length} résultat{displayed.length !== 1 ? 's' : ''}
              {hasFilters ? ` (filtré sur ${apps.length})` : ''}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative min-w-[200px] max-w-xs flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2
                                 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher par ID, nom, email…"
                className="h-9 w-full rounded-lg border border-slate-200 pl-8 pr-3
                           text-xs transition-colors focus:border-[#4EA6F5]
                           focus:outline-none focus:ring-2 focus:ring-[#4EA6F5]/40"
              />
            </div>

            <FilterSelect
              label="Statut dossier"
              value={filterApp}
              onChange={setFilterApp}
              options={[
                { value: 'Dossier Créé',           label: 'Dossier créé' },
                { value: 'en_cours_devaluation',   label: "En cours d'évaluation" },
                { value: 'Admission sous réserve', label: 'Admission sous réserve' },
                { value: 'Admission définitive',   label: 'Admission définitive' },
                { value: 'Dossier refusé',         label: 'Dossier refusé' },
              ]}
            />

            <FilterSelect
              label="Paiement"
              value={filterPay}
              onChange={setFilterPay}
              options={[
                { value: 'Pending',   label: 'En attente' },
                { value: 'Confirmed', label: 'Confirmé' },
                { value: 'Waived',    label: 'Exonéré' },
                { value: 'Failed',    label: 'Échoué' },
              ]}
            />

            <FilterSelect
              label="Examen d'État"
              value={filterExam}
              onChange={setFilterExam}
              options={[
                { value: 'En attente', label: 'En attente' },
                { value: 'Diplôme obtenu', label: 'Diplôme obtenu' },
              ]}
            />

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex h-9 items-center gap-1 rounded-lg border border-slate-200
                           px-3 text-xs text-slate-500 transition-colors
                           hover:border-red-300 hover:bg-red-50 hover:text-red-500"
              >
                <X className="h-3.5 w-3.5" />
                Réinitialiser
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <AlertCircle className="h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-400">
              {hasFilters
                ? 'Aucune candidature ne correspond aux filtres.'
                : "Aucune candidature reçue pour l'instant."}
            </p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="mt-1 text-xs text-[#4EA6F5] hover:underline"
              >
                Effacer les filtres
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className={thSort} onClick={() => handleSort('applicant_id')}>
                    Identifiant <SortIcon col="applicant_id" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                  <th className={thSort} onClick={() => handleSort('nom')}>
                    Candidat <SortIcon col="nom" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                  <th className={`${thSort} hidden md:table-cell`} onClick={() => handleSort('exam_status')}>
                    Examen d&apos;État <SortIcon col="exam_status" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                  <th className={thSort} onClick={() => handleSort('payment_status')}>
                    Paiement <SortIcon col="payment_status" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                  <th className={thSort} onClick={() => handleSort('application_status')}>
                    Statut <SortIcon col="application_status" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                  <th className={`${thSort} hidden lg:table-cell`} onClick={() => handleSort('created_at')}>
                    Soumis le <SortIcon col="created_at" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                  <th className={thClass}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayed.map(app => (
                  <tr key={app.applicant_id}
                      className="transition-colors hover:bg-slate-50/50">
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs font-bold text-[#021463]">
                        {app.applicant_id}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-800">
                          {app.prenom} {app.nom}
                        </span>
                        {app.is_scholarship_eligible && (
                          <span className="inline-flex items-center gap-1 rounded border
                                           border-amber-300 bg-amber-100 px-1.5 py-0.5
                                           text-[10px] font-bold text-amber-700">
                            <Award className="h-2.5 w-2.5" />
                            Bourse
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-400">{app.email}</p>
                    </td>
                    <td className="hidden px-4 py-3.5 md:table-cell">
                      <span className="text-xs text-slate-500">
                        {app.exam_status ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusPill value={app.payment_status} type="payment" />
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusPill value={app.application_status} type="application" />
                    </td>
                    <td className="hidden px-4 py-3.5 lg:table-cell">
                      <span className="text-xs text-slate-400">
                        {new Date(app.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <Link
                        href={`/admin/applications/${encodeURIComponent(app.applicant_id)}`}
                        className="inline-flex items-center gap-1 text-xs font-medium
                                   text-[#4EA6F5] transition-colors hover:text-[#021463]"
                      >
                        Voir <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination hint */}
        {apps.length > 0 && (
          <div className="border-t border-slate-100 px-6 py-3">
            <p className="text-[11px] text-slate-400">
              {apps.length} candidature{apps.length !== 1 ? 's' : ''} au total — affichées par ordre d&apos;inscription (plus récente en premier).
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
