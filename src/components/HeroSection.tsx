'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export function HeroSection() {
  const { t } = useLanguage()

  return (
    <section className="relative bg-background py-16 md:py-24 lg:py-32">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <div className="w-48 h-16 md:w-64 md:h-20 bg-primary rounded-md flex items-center justify-center">
              <span className="font-serif text-2xl md:text-3xl font-bold text-primary-foreground">
                Ignito Academy
              </span>
            </div>
          </div>

          {/* Hero Headline */}
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-primary mb-6 leading-tight">
            {t('landing.hero.title')}
          </h1>

          {/* Hero Subheadline */}
          <p className="text-lg md:text-xl lg:text-2xl text-foreground mb-8 max-w-3xl mx-auto">
            {t('landing.hero.subtitle')}
          </p>

          {/* Accent Line */}
          <div className="w-24 h-1 bg-accent mx-auto mb-8"></div>

          {/* CTA Button */}
          <Link href="/apply">
            <Button 
              size="lg" 
              className="min-h-[48px] px-8 text-lg font-semibold bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {t('landing.hero.cta')}
            </Button>
          </Link>

          {/* Partnership Badge */}
          <div className="mt-12 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span>Parcours structuré ·</span>
            <span className="font-semibold text-primary">Excellence Britannique — Cadre RQF</span>
          </div>
        </div>
      </div>

      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-accent/5 to-transparent pointer-events-none hidden lg:block"></div>
    </section>
  )
}
