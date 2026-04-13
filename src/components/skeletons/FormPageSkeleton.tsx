/**
 * FormPageSkeleton
 *
 * Generic pulsing skeleton for any dashboard form page
 * (Profile, Parcours Scolaire, Documents, Paiement, Bourse).
 *
 * Server Component — no 'use client' needed.
 */

interface Props {
  /** Number of field rows to render (default 5) */
  fields?: number
}

export default function FormPageSkeleton({ fields = 5 }: Props) {
  return (
    <div className="space-y-8 animate-pulse">

      {/* Page header */}
      <div className="space-y-2">
        <div className="h-8 w-64 rounded-md bg-slate-200" />
        <div className="h-4 w-96 max-w-full rounded-md bg-slate-100" />
      </div>

      {/* Card */}
      <div className="rounded-lg bg-white p-8 shadow-sm space-y-6">

        {/* Section label */}
        <div className="h-3 w-32 rounded-md bg-slate-200" />

        {/* Field rows */}
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-24 rounded-md bg-slate-200" />
            <div className="h-12 w-full rounded-md bg-slate-100" />
          </div>
        ))}

        {/* 2-col row (used by profile / academic pages) */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="h-3 w-20 rounded-md bg-slate-200" />
            <div className="h-12 rounded-md bg-slate-100" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-20 rounded-md bg-slate-200" />
            <div className="h-12 rounded-md bg-slate-100" />
          </div>
        </div>

        {/* Submit button placeholder */}
        <div className="pt-2">
          <div className="h-12 w-40 rounded-md bg-slate-200" />
        </div>
      </div>
    </div>
  )
}
