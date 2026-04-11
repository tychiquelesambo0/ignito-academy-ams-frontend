'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { Globe } from 'lucide-react'

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  const toggle = () => setLanguage(language === 'fr' ? 'en' : 'fr')

  return (
    <button
      onClick={toggle}
      aria-label="Toggle language"
      className="flex items-center gap-1.5 text-[#1E293B]/70 hover:text-[#021463] transition-colors min-h-[48px] px-2 text-sm font-medium"
    >
      <Globe className="w-4 h-4" />
      <span>{language.toUpperCase()}</span>
    </button>
  )
}
