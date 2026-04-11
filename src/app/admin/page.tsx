'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Users, Clock, CheckCircle2, CreditCard, LogOut,
  FileText, AlertCircle, Search, X, ChevronUp, ChevronDown,
  ChevronsUpDown, ExternalLink,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OfficerProfile { prenom: string; nom: string; role: string }

interface Stats {
  total: number; enCours: number; decisions: number; paymentsConfirmed: number
}

interface Application {
  applicant_id: string
  application_status: string
  payment_status: string
  created_at: string
  exam_status: string | null
  prenom: string
  nom: string
  is_scholarship_eligible: boolean
}

type SortKey = 'applicant_id' | 'nom' | 'exam_status' | 'payment_status' | 'application_status' | 'created_at'
type SortDir = 'asc' | 'desc'

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_OFFICER: OfficerProfile = {
  prenom: 'Marie',
  nom: 'Dupont',
  role: 'Responsable Admissions'
}

const MOCK_APPLICATIONS: Application[] = [
  {
    applicant_id: 'IA-2026-001234',
    application_status: 'en_cours_devaluation',
    payment_status: 'paid',
    created_at: '2026-01-15T10:30:00Z',
    exam_status: 'Diplôme obtenu',
    prenom: 'Jean',
    nom: 'Kabila',
    is_scholarship_eligible: true,
  },
  {
    applicant_id: 'IA-2026-001235',
    application_status: 'Admission définitive',
    payment_status: 'paid',
    created_at: '2026-01-14T14:20:00Z',
    exam_status: 'Diplôme obtenu',
    prenom: 'Marie',
    nom: 'Lumumba',
    is_scholarship_eligible: false,
  },
  {
    applicant_id: 'IA-2026-001236',
    application_status: 'Admission sous réserve',
    payment_status: 'paid',
    created_at: '2026-01-13T09:15:00Z',
    exam_status: 'En attente des résultats',
    prenom: 'Patrick',
    nom: 'Mukendi',
    is_scholarship_eligible: true,
  },
  {
    applicant_id: 'IA-2026-001237',
    application_status: 'Dossier Créé',
    payment_status: 'Pending',
    created_at: '2026-01-12T16:45:00Z',
    exam_status: null,
    prenom: 'Ange',
    nom: 'Tshisekedi',
    is_scholarship_eligible: false,
  },
  {
    applicant_id: 'IA-2026-001238',
    application_status: 'Dossier refusé',
    payment_status: 'Failed',
    created_at: '2026-01-11T11:00:00Z',
    exam_status: 'Diplôme obtenu',
    prenom: 'Grace',
    nom: 'Mbeki',
    is_scholarship_eligible: false,
  },
  {
    applicant_id: 'IA-2026-001239',
    application_status: 'en_cours_devaluation',
    payment_status: 'paid',
    created_at: '2026-01-10T08:30:00Z',
    exam_status: 'Diplôme obtenu',
    prenom: 'Samuel',
    nom: 'Kasongo',
    is_scholarship_eligible: true,
  },
]

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

const PAYMENT_LABELS: Record<string, string> = {
  paid: 'Payé', Confirmed: 'Confirmé', Pending: 'En attente', Failed: 'Échoué',
}

// ─── Status pill ──────────────────────────────────────────────────────────────

function StatusPill({ value, type }: { value: string; type: 'application' | 'payment' }) {
  if (type === 'payment') {
    const cls: Record<string, string> = {
      paid:      'bg-emerald-50 text-emerald-700 border-emerald-200',
      Confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      Pending:   'bg-amber-50   text-amber-700   border-amber-200',
      Failed:    'bg-red-50     text-red-700     border-red-200',
    }
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${cls[value] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
        {PAYMENT_LABELS[value] ?? value}
      </span>
    )
  }
  const cls: Record<string, string> = {
    'Dossier Créé':           'bg-slate-100  text-slate-600  border-slate-200',
    'en_cours_devaluation':   'bg-amber-50   text-amber-700  border-amber-200',
    'Frais Réglés':           'bg-amber-50   text-amber-700  border-amber-200',
    'Admission sous réserve': 'bg-purple-50  text-purple-700 border-purple-200',
    'Admission définitive':   'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Dossier refusé':         'bg-red-50     text-red-700    border-red-200',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${cls[value] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {APP_STATUS_LABELS[value] ?? value}
    </span>
  )
}

// ─── Sort indicator ───────────────────────────────────────────────────────────

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey | null; sortDir: SortDir }) {
  if (sortKey !== col) return <ChevronsUpDown className="w-3.5 h-3.5 text-slate-300 ml-1 inline" />
  return sortDir === 'asc'
    ? <ChevronUp   className="w-3.5 h-3.5 text-[#4EA6F5] ml-1 inline" />
    : <ChevronDown className="w-3.5 h-3.5 text-[#4EA6F5] ml-1 inline" />
}

// ─── Filter select ────────────────────────────────────────────────────────────

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`h-9 rounded-lg border text-xs font-medium px-3 pr-7 appearance-none cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-[#4EA6F5]/40
        ${value ? 'border-[#4EA6F5] bg-blue-50 text-[#021463]' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
    >
      <option value="">{label}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const router = useRouter()
  const [officer, setOfficer]   = useState<OfficerProfile | null>(null)
  const [stats, setStats]       = useState<Stats | null>(null)
  const [apps, setApps]         = useState<Application[]>([])
  const [loading, setLoading]   = useState(true)

  // ── Filter & sort state ───────────────────────────────────────────────────
  const [search,      setSearch]      = useState('')
  const [filterApp,   setFilterApp]   = useState('')
  const [filterPay,   setFilterPay]   = useState('')
  const [filterExam,  setFilterExam]  = useState('')
  const [sortKey,     setSortKey]     = useState<SortKey | null>(null)
  const [sortDir,     setSortDir]     = useState<SortDir>('asc')

  // ── Mock data fetch ────────────────────────────────────────────────────────

  useEffect(() => {
    // Simulate loading delay
    const timer = setTimeout(() => {
      setOfficer(MOCK_OFFICER)
      setApps(MOCK_APPLICATIONS)
      setStats({
        total:             MOCK_APPLICATIONS.length,
        enCours:           MOCK_APPLICATIONS.filter(a => a.application_status === 'en_cours_devaluation' || a.application_status === 'Frais Réglés').length,
        decisions:         MOCK_APPLICATIONS.filter(a => DECISION_STATUSES.includes(a.application_status)).length,
        paymentsConfirmed: MOCK_APPLICATIONS.filter(a => a.payment_status === 'paid' || a.payment_status === 'Confirmed').length,
      })
      setLoading(false)
    }, 600)

    return () => clearTimeout(timer)
  }, [])

  // ── Filtered + sorted list (client-side) ──────────────────────────────────

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase()

    let filtered = apps.filter(a => {
      if (q && !a.applicant_id.toLowerCase().includes(q) &&
               !`${a.prenom} ${a.nom}`.toLowerCase().includes(q)) return false
      if (filterApp  && a.application_status !== filterApp)  return false
      if (filterPay  && a.payment_status     !== filterPay)  return false
      if (filterExam && (a.exam_status ?? '') !== filterExam) return false
      return true
    })

    if (sortKey) {
      filtered = [...filtered].sort((a, b) => {
        let va = '', vb = ''
        if (sortKey === 'nom')     { va = `${a.nom} ${a.prenom}`; vb = `${b.nom} ${b.prenom}` }
        else if (sortKey === 'exam_status') { va = a.exam_status ?? ''; vb = b.exam_status ?? '' }
        else { va = (a as any)[sortKey] ?? ''; vb = (b as any)[sortKey] ?? '' }
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

  const hasFilters = search || filterApp || filterPay || filterExam
  const clearFilters = () => { setSearch(''); setFilterApp(''); setFilterPay(''); setFilterExam('') }

  const handleSignOut = () => {
    router.push('/admin/login')
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#021463] mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Chargement du Bureau des Admissions…</p>
        </div>
      </div>
    )
  }

  // ── Stats cards config ────────────────────────────────────────────────────

  const statCards = [
    { label: 'Candidatures totales', value: stats?.total ?? 0,             icon: Users,         color: 'text-[#021463]',   bg: 'bg-[#021463]/5 border-[#021463]/10' },
    { label: "En cours d'évaluation", value: stats?.enCours ?? 0,          icon: Clock,         color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200' },
    { label: 'Décisions rendues',     value: stats?.decisions ?? 0,        icon: CheckCircle2,  color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
    { label: 'Paiements confirmés',   value: stats?.paymentsConfirmed ?? 0, icon: CreditCard,   color: 'text-[#4EA6F5]',   bg: 'bg-blue-50 border-blue-200' },
  ]

  const thClass = 'px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider select-none'
  const thSortable = `${thClass} cursor-pointer hover:text-[#021463] transition-colors whitespace-nowrap`

  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      {/* ── Navbar ── */}
      <header className="bg-[#021463] sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-serif text-2xl font-bold text-white tracking-tight">Admitta</span>
            <span className="hidden sm:inline text-white/30 text-lg font-thin">|</span>
            <span className="hidden sm:inline text-white/70 text-sm font-medium tracking-wide">Bureau des Admissions</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-white/60 text-sm">{officer?.prenom} {officer?.nom}</span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-white/65 hover:text-white text-sm font-medium transition-colors hover:bg-white/10 px-3 py-1.5 rounded-md"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Se déconnecter</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-12 space-y-8">

        {/* ── Heading ── */}
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#021463]">Bureau des Admissions</h1>
          <p className="text-slate-500 text-sm mt-1">
            Bonjour, {officer?.prenom}. Voici l&apos;état actuel des candidatures.
          </p>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(card => {
            const Icon = card.icon
            return (
              <div key={card.label} className={`bg-white rounded-xl shadow-sm border p-5 ${card.bg}`}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 bg-white/70">
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <p className="text-2xl font-bold text-[#021463] leading-none mb-1">{card.value}</p>
                <p className="text-xs text-slate-500 font-medium">{card.label}</p>
              </div>
            )
          })}
        </div>

        {/* ── Applications table ── */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

          {/* Table header + search/filter toolbar */}
          <div className="px-6 py-4 border-b border-slate-100 space-y-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#4EA6F5]" />
                <h2 className="font-serif text-base font-bold text-[#021463]">Toutes les candidatures</h2>
              </div>
              <span className="text-xs text-slate-400">
                {displayed.length} résultat{displayed.length !== 1 ? 's' : ''}
                {hasFilters ? ` (filtré sur ${apps.length})` : ''}
              </span>
            </div>

            {/* Search + filters */}
            <div className="flex flex-wrap gap-2 items-center">

              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher par ID ou nom…"
                  className="w-full h-9 pl-8 pr-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#4EA6F5]/40 focus:border-[#4EA6F5] transition-colors"
                />
              </div>

              {/* Filter: application status */}
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

              {/* Filter: payment status */}
              <FilterSelect
                label="Paiement"
                value={filterPay}
                onChange={setFilterPay}
                options={[
                  { value: 'Pending',   label: 'En attente' },
                  { value: 'paid',      label: 'Payé' },
                  { value: 'Confirmed', label: 'Confirmé (legacy)' },
                  { value: 'Failed',    label: 'Échoué' },
                ]}
              />

              {/* Filter: exam status */}
              <FilterSelect
                label="Examen d'État"
                value={filterExam}
                onChange={setFilterExam}
                options={[
                  { value: 'En attente des résultats', label: 'En attente des résultats' },
                  { value: 'Diplôme obtenu',            label: 'Diplôme obtenu' },
                ]}
              />

              {/* Clear filters */}
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 h-9 px-3 rounded-lg border border-slate-200 text-xs text-slate-500 hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Réinitialiser
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          {displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertCircle className="w-8 h-8 text-slate-300" />
              <p className="text-sm text-slate-400">
                {hasFilters ? 'Aucune candidature ne correspond aux filtres.' : 'Aucune candidature reçue pour l\'instant.'}
              </p>
              {hasFilters && (
                <button onClick={clearFilters} className="text-xs text-[#4EA6F5] hover:underline mt-1">
                  Effacer les filtres
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className={thSortable} onClick={() => handleSort('applicant_id')}>
                      Identifiant <SortIcon col="applicant_id" sortKey={sortKey} sortDir={sortDir} />
                    </th>
                    <th className={thSortable} onClick={() => handleSort('nom')}>
                      Candidat <SortIcon col="nom" sortKey={sortKey} sortDir={sortDir} />
                    </th>
                    <th className={`${thSortable} hidden md:table-cell`} onClick={() => handleSort('exam_status')}>
                      Examen d&apos;État <SortIcon col="exam_status" sortKey={sortKey} sortDir={sortDir} />
                    </th>
                    <th className={thSortable} onClick={() => handleSort('payment_status')}>
                      Paiement <SortIcon col="payment_status" sortKey={sortKey} sortDir={sortDir} />
                    </th>
                    <th className={thSortable} onClick={() => handleSort('application_status')}>
                      Statut <SortIcon col="application_status" sortKey={sortKey} sortDir={sortDir} />
                    </th>
                    <th className={`${thSortable} hidden lg:table-cell`} onClick={() => handleSort('created_at')}>
                      Soumis le <SortIcon col="created_at" sortKey={sortKey} sortDir={sortDir} />
                    </th>
                    <th className={thClass}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayed.map(app => (
                    <tr key={app.applicant_id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs font-bold text-[#021463]">{app.applicant_id}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-800 text-sm">{app.prenom} {app.nom}</span>
                          {app.is_scholarship_eligible && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-300">
                              Bourse
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <span className="text-xs text-slate-500">{app.exam_status ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusPill value={app.payment_status} type="payment" />
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusPill value={app.application_status} type="application" />
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <span className="text-xs text-slate-400">
                          {new Date(app.created_at).toLocaleDateString('fr-FR', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/admin/applications/${encodeURIComponent(app.applicant_id)}`}
                          className="inline-flex items-center gap-1 text-xs text-[#4EA6F5] hover:text-[#021463] font-medium transition-colors"
                        >
                          Voir <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-center">
        <p className="text-xs text-slate-300">© 2026 Ignito Academy. Tous droits réservés.</p>
      </footer>
    </div>
  )
}
