/**
 * Dashboard overview loading skeleton.
 * Shown by Next.js App Router while the dashboard page suspends.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-72 rounded-md bg-slate-200" />
          <div className="h-4 w-56 rounded-md bg-slate-100" />
        </div>
        <div className="hidden h-14 w-36 rounded-md bg-slate-100 sm:block" />
      </div>

      {/* Progress tracker */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="mb-5 h-2.5 w-48 rounded-md bg-slate-200" />
        <div className="flex items-start gap-0">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-2.5">
              <div className="flex w-full items-center">
                {i > 1 && <div className="h-0.5 flex-1 bg-slate-200" />}
                <div className="h-8 w-8 shrink-0 rounded-md bg-slate-200" />
                {i < 4 && <div className="h-0.5 flex-1 bg-slate-200" />}
              </div>
              <div className="h-3 w-14 rounded-md bg-slate-100" />
            </div>
          ))}
        </div>
      </div>

      {/* 3-column action grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-start justify-between">
              <div className="h-10 w-10 rounded-md bg-slate-100" />
              <div className="h-5 w-20 rounded bg-slate-100" />
            </div>
            <div className="h-4 w-28 rounded-md bg-slate-200" />
            <div className="h-3 w-full rounded-md bg-slate-100" />
            <div className="h-3 w-3/4 rounded-md bg-slate-100" />
            <div className="h-10 w-full rounded-md bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  )
}
