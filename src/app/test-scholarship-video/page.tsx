'use client'

/**
 * Scholarship Video Components Test Page
 * 
 * Demonstrates the video URL input and player components
 * 
 * IMPORTANT: This page is for testing ONLY - remove in production
 */

import { useState } from 'react'
import { ScholarshipVideoInput, ScholarshipVideoPlayer, ScholarshipVideoPlayerCompact } from '@/components/scholarship'

export default function TestScholarshipVideoPage() {
  const [videoUrl, setVideoUrl] = useState('')
  const [savedUrl, setSavedUrl] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSavedUrl(videoUrl)
  }

  // Example URLs for testing
  const exampleUrls = [
    {
      label: 'YouTube Standard',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    },
    {
      label: 'YouTube Short',
      url: 'https://youtu.be/dQw4w9WgXcQ',
    },
    {
      label: 'Vimeo',
      url: 'https://vimeo.com/148751763',
    },
  ]

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">🎥 Test: Composants Vidéo Bourse</h1>
          <p className="text-muted-foreground">
            Page de test pour les composants d'entrée et de lecture vidéo (URL uniquement)
          </p>
        </div>

        {/* Example URLs */}
        <div className="rounded-lg border p-4 bg-muted/50">
          <h2 className="font-medium mb-3">URLs d'exemple :</h2>
          <div className="flex flex-wrap gap-2">
            {exampleUrls.map((example) => (
              <button
                key={example.url}
                onClick={() => setVideoUrl(example.url)}
                className="px-3 py-1.5 text-sm bg-background border rounded-md hover:bg-accent"
              >
                {example.label}
              </button>
            ))}
          </div>
        </div>

        {/* Video Input Component */}
        <div className="rounded-lg border p-6 bg-card">
          <h2 className="text-xl font-semibold mb-4">1. Composant d'entrée (Applicant)</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <ScholarshipVideoInput
              value={videoUrl}
              onChange={setVideoUrl}
              required
            />
            
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              disabled={!videoUrl}
            >
              Enregistrer la vidéo
            </button>
          </form>
        </div>

        {/* Video Player Component */}
        {savedUrl && (
          <div className="rounded-lg border p-6 bg-card">
            <h2 className="text-xl font-semibold mb-4">2. Composant de lecture (Admin)</h2>
            
            <ScholarshipVideoPlayer
              videoUrl={savedUrl}
              applicantName="Jean Dupont"
              showRawUrl
            />
          </div>
        )}

        {/* Compact Player */}
        {savedUrl && (
          <div className="rounded-lg border p-6 bg-card">
            <h2 className="text-xl font-semibold mb-4">3. Lecteur compact (Liste)</h2>
            
            <ScholarshipVideoPlayerCompact
              videoUrl={savedUrl}
              applicantName="Jean Dupont"
            />
          </div>
        )}

        {/* Instructions */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
          <h3 className="font-medium text-blue-900 mb-3">📋 Instructions de test :</h3>
          <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
            <li>Cliquez sur un bouton "URL d'exemple" ou collez votre propre URL</li>
            <li>Observez la validation en temps réel et l'aperçu de la vidéo</li>
            <li>Cliquez sur "Enregistrer la vidéo" pour voir le composant de lecture</li>
            <li>Testez avec des URLs invalides pour voir la gestion des erreurs</li>
          </ol>
        </div>

        {/* Verification */}
        <div className="rounded-lg border border-green-200 bg-green-50 p-6">
          <h3 className="font-medium text-green-900 mb-3">✅ Vérification :</h3>
          <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
            <li>✓ Aucun élément <code>&lt;input type="file"&gt;</code> présent</li>
            <li>✓ Aucune validation de fichier vidéo (taille, format, durée)</li>
            <li>✓ Aucune référence à un bucket de stockage vidéo</li>
            <li>✓ Uniquement des URLs YouTube et Vimeo acceptées</li>
            <li>✓ Aperçu vidéo via iframe (pas de lecteur vidéo HTML5)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
