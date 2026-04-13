import { Lock } from 'lucide-react'

/**
 * Displayed at the top of every form page once payment is Confirmed/Waived.
 * Communicates to the applicant that their dossier is sealed.
 */
export default function SubmittedLockBanner() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-[#10B981]/30 bg-[#10B981]/8 px-4 py-3.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#10B981]/15">
        <Lock className="h-4 w-4 text-[#10B981]" />
      </div>
      <div>
        <p className="text-sm font-semibold text-[#10B981]">
          Dossier soumis — consultation uniquement
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
          Votre paiement a été confirmé et votre dossier est maintenant scellé.
          Aucune modification n'est possible à ce stade.
        </p>
      </div>
    </div>
  )
}
