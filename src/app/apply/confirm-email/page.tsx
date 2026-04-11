'use client'

export const dynamic = 'force-dynamic'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Mail } from 'lucide-react'
import Link from 'next/link'

function ConfirmEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? 'votre adresse email'

  return (
    <div className="min-h-screen flex bg-[#F8FAFC]">
      {/* Left column — same branding as /apply */}
      <div className="hidden lg:flex lg:w-[45%] bg-[#021463] flex-col relative overflow-hidden">
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #4EA6F5 0%, transparent 60%)' }} />
        <div className="relative z-10 flex flex-col h-full p-12">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <span className="text-white/45 text-xs font-medium tracking-widest uppercase group-hover:text-white/70 transition-colors">
              Retour
            </span>
          </Link>
          <div className="flex-1 flex flex-col justify-center space-y-7">
            <div className="space-y-3">
              <p className="text-white/40 text-xs font-medium tracking-widest uppercase">
                Portail d&apos;admission
              </p>
              <h1 className="text-white font-serif text-5xl font-bold leading-tight tracking-tight">
                Admitta
              </h1>
              <p className="text-white/60 text-[15px] leading-relaxed font-light w-full">
                Le portail d&apos;admission officiel de Ignito Academy. Soumettez votre candidature
                et accédez à nos licences britanniques depuis la RDC.
              </p>
            </div>
          </div>
          <p className="text-white/25 text-xs">© 2026 Ignito Academy. Tous droits réservés.</p>
        </div>
      </div>

      {/* Right column */}
      <div className="w-full lg:w-[55%] flex flex-col bg-white min-h-screen">
        <div className="flex-1 flex items-center justify-center px-6 py-10 lg:px-16">
          <div className="w-full max-w-md text-center space-y-6">

            {/* Icon */}
            <div className="mx-auto w-16 h-16 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
              <Mail className="w-7 h-7 text-[#4EA6F5]" />
            </div>

            {/* Heading */}
            <div className="space-y-2">
              <h2 className="font-serif text-3xl font-bold text-[#021463]">
                Vérifiez votre email
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                Un lien de confirmation a été envoyé à
              </p>
              <p className="font-semibold text-[#021463] text-sm">{email}</p>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 text-left space-y-3">
              <p className="text-sm font-semibold text-[#021463]">Comment procéder :</p>
              <ol className="space-y-2 text-sm text-slate-600">
                <li className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#021463] text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                  <span>Ouvrez votre boîte de réception et cherchez un email de <strong>admin@ignitoacademy.com</strong></span>
                </li>
                <li className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#021463] text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                  <span>Cliquez sur le bouton <strong>« Confirmer mon adresse email »</strong> dans l&apos;email</span>
                </li>
                <li className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#021463] text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                  <span>Vous serez automatiquement redirigé vers votre dossier de candidature</span>
                </li>
              </ol>
            </div>

            {/* Spam note */}
            <p className="text-xs text-slate-400">
              Vous ne trouvez pas l&apos;email ? Vérifiez votre dossier spam ou courrier indésirable.
            </p>

            {/* Back to login */}
            <Link
              href="/apply"
              className="inline-block text-sm text-[#4EA6F5] font-medium hover:underline transition-colors"
            >
              Retour a la connexion
            </Link>
          </div>
        </div>
        <div className="hidden lg:block px-16 pb-6 text-center">
          <p className="text-xs text-[#1E293B]/25">© 2026 Ignito Academy. Tous droits réservés.</p>
        </div>
      </div>
    </div>
  )
}

export default function ConfirmEmailPage() {
  return (
    <Suspense>
      <ConfirmEmailContent />
    </Suspense>
  )
}
