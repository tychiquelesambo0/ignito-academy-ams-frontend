import Link from 'next/link'
import { ShieldX } from 'lucide-react'

export default function AdminForbiddenPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">

      {/* Navbar */}
      <header className="bg-[#021463]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <span className="font-serif text-2xl font-bold text-white tracking-tight">Admitta</span>
        </div>
      </header>

      {/* 403 body */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center mx-auto mb-6">
            <ShieldX className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-[#021463] mb-3">
            Accès refusé
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            Vous n&apos;avez pas les autorisations nécessaires pour accéder au Bureau des Admissions.
            Si vous pensez qu&apos;il s&apos;agit d&apos;une erreur, veuillez contacter l&apos;administrateur système.
          </p>
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-2 bg-[#021463] text-white text-sm font-semibold px-6 py-3 rounded-lg hover:bg-[#021463]/90 transition-colors"
          >
            Accéder à la page de connexion
          </Link>
          <p className="text-xs text-slate-300 mt-8">
            © 2026 Ignito Academy. Tous droits réservés.
          </p>
        </div>
      </main>
    </div>
  )
}
