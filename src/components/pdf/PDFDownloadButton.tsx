'use client'

/**
 * Wrapper that lazy-loads @react-pdf/renderer only on the client.
 * Import this component with dynamic({ ssr: false }) in parent pages.
 */

import { PDFDownloadLink } from '@react-pdf/renderer'
import { DecisionLetterPDF, type DecisionStatus } from './DecisionLetterPDF'
import { FileDown, Loader2 } from 'lucide-react'

interface Props {
  applicantName:       string
  applicantId:         string
  status:              DecisionStatus
  conditionalMessage?: string | null
}

const STYLE: Record<DecisionStatus, string> = {
  'Admission définitive':   'bg-[#021463] hover:bg-[#021463]/90 text-white shadow-sm shadow-[#021463]/20',
  'Admission sous réserve': 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm shadow-amber-600/20',
  'Dossier refusé':         'bg-slate-700 hover:bg-slate-800 text-white shadow-sm shadow-slate-700/20',
}

const FILENAME: Record<DecisionStatus, string> = {
  'Admission définitive':   'lettre-admission-definitive.pdf',
  'Admission sous réserve': 'lettre-admission-sous-reserve.pdf',
  'Dossier refusé':         'lettre-decision-admission.pdf',
}

export function PDFDownloadButton({ applicantName, applicantId, status, conditionalMessage }: Props) {
  const doc = (
    <DecisionLetterPDF
      applicantName={applicantName}
      applicantId={applicantId}
      status={status}
      conditionalMessage={conditionalMessage}
    />
  )

  return (
    <PDFDownloadLink
      document={doc}
      fileName={FILENAME[status]}
      className="inline-block"
    >
      {({ loading }) => (
        <span
          className={`inline-flex items-center gap-2.5 px-5 min-h-[48px] rounded-md text-sm font-semibold transition-all cursor-pointer select-none
            ${STYLE[status]}
            ${loading ? 'opacity-70 pointer-events-none' : ''}`}
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" />Génération du PDF…</>
            : <><FileDown className="w-4 h-4" />Télécharger ma lettre de décision</>}
        </span>
      )}
    </PDFDownloadLink>
  )
}
