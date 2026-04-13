'use client'

/**
 * Bannière globale lorsque le Bureau des admissions a renseigné
 * applications.conditional_message (demande de pièces complémentaires).
 */

import Link from 'next/link'
import { ClipboardList, ChevronRight } from 'lucide-react'
import { useApplication } from '@/lib/context/ApplicationContext'

export default function DocumentRequestAlert() {
  const { application, loading } = useApplication()

  if (loading || !application?.conditional_message?.trim()) {
    return null
  }

  const msg = application.conditional_message.trim()

  return (
    <div
      className="mb-6 overflow-hidden rounded-lg border-2 border-[#031463] bg-[#EFF6FF] shadow-sm"
      role="alert"
    >
      <div className="border-b border-[#031463]/15 bg-[#031463] px-4 py-3 sm:px-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-white">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-white/10">
              <ClipboardList className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">
                Action requise sans délai
              </p>
              <h2 className="font-serif text-lg font-bold leading-tight sm:text-xl">
                Pièces complémentaires demandées par le Bureau des admissions
              </h2>
            </div>
          </div>
          <Link
            href="/dashboard/documents"
            className="inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-md
                       bg-[#4EA6F5] px-5 text-sm font-semibold text-[#031463] transition-colors
                       hover:bg-white sm:mt-0 sm:w-auto"
          >
            Téléverser les documents
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>

      <div className="px-4 py-4 sm:px-5 sm:py-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#031463]">
          Consignes transmises par le Bureau des admissions
        </p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
          {msg}
        </p>
        <p className="mt-3 text-xs leading-relaxed text-slate-600">
          Rendez-vous sur la page <strong>Documents</strong> de votre espace candidat pour déposer
          les fichiers demandés. Les formats acceptés sont le PDF, le JPG et le PNG (5&nbsp;Mo maximum
          par fichier). Vous pouvez utiliser la rubrique «&nbsp;Document supplémentaire&nbsp;» si la
          pièce ne correspond pas aux autres catégories.
        </p>
      </div>
    </div>
  )
}
