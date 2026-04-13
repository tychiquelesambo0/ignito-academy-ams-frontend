'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

interface Props {
  href: string
  label?: string
}

export default function BackButton({ href, label = 'Retour' }: Props) {
  return (
    <Link
      href={href}
      className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium
                 text-slate-400 transition-colors hover:text-slate-700
                 focus-visible:outline-none focus-visible:ring-2
                 focus-visible:ring-[#4EA6F5] rounded"
    >
      <ChevronLeft className="h-4 w-4" />
      {label}
    </Link>
  )
}
