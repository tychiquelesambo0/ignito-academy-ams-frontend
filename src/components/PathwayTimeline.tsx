'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function PathwayTimeline() {
  const { t } = useLanguage()

  const stages = [
    {
      year: '1-2',
      title: t('landing.pathway.year1'),
      description: t('landing.pathway.year1_desc'),
      icon: '📚',
      color: 'bg-primary/10 border-primary/20',
    },
    {
      year: '3',
      title: t('landing.pathway.year3'),
      description: t('landing.pathway.year3_desc'),
      icon: '🎓',
      color: 'bg-accent/10 border-accent/20',
    },
    {
      year: '4',
      title: t('landing.pathway.year4'),
      description: t('landing.pathway.year4_desc'),
      icon: '🏆',
      color: 'bg-primary/10 border-primary/20',
    },
  ]

  return (
    <section className="py-16 md:py-24 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Section Title */}
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-primary text-center mb-4">
            {t('landing.pathway.title')}
          </h2>

          {/* Accent Line */}
          <div className="w-24 h-1 bg-accent mx-auto mb-12"></div>

          {/* Timeline Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 relative">
            {/* Progress Line (Desktop) */}
            <div className="hidden md:block absolute top-24 left-0 right-0 h-1 bg-accent/30 -z-10"></div>
            
            {stages.map((stage, index) => (
              <div key={index} className="relative flex flex-col">
                {/* Timeline Card */}
                <Card className={`${stage.color} border-2 transition-all hover:shadow-lg hover:-translate-y-1 h-full flex flex-col`}>
                  <CardHeader className="text-center">
                    {/* Icon */}
                    <div className="text-5xl mb-4 flex justify-center">
                      {stage.icon}
                    </div>
                    
                    {/* Stage Number */}
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent text-accent-foreground font-bold text-lg mx-auto mb-4">
                      {stage.year}
                    </div>
                    
                    <CardTitle className="font-serif text-xl md:text-2xl text-primary">
                      {stage.title}
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="flex-grow flex items-center">
                    <CardDescription className="text-center text-base">
                      {stage.description}
                    </CardDescription>
                  </CardContent>
                </Card>

                {/* Arrow Connector (Mobile) */}
                {index < stages.length - 1 && (
                  <div className="md:hidden flex justify-center my-4">
                    <div className="text-accent text-3xl">↓</div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Partnership Badge */}
          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-background rounded-lg border-2 border-primary/20">
              <span className="text-sm text-muted-foreground">Parcours structuré ·</span>
              <span className="font-semibold text-primary text-lg">Excellence Britannique</span>
              <span className="text-2xl">🇬🇧</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
