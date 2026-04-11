'use client'

/**
 * Scholarship Video Player Component
 * 
 * For admissions officers to view applicant scholarship videos
 * 
 * CRITICAL: Displays videos from URLs ONLY - no file playback
 */

import { useState } from 'react'
import { validateVideoURL } from '@/lib/scholarship'
import { ExternalLink, AlertCircle } from 'lucide-react'

interface ScholarshipVideoPlayerProps {
  /** Video URL (YouTube or Vimeo) */
  videoUrl: string
  
  /** Applicant name (for display) */
  applicantName?: string
  
  /** Show raw URL link? */
  showRawUrl?: boolean
}

/**
 * Video player component for admissions officers
 * Embeds YouTube/Vimeo videos using iframe
 */
export function ScholarshipVideoPlayer({
  videoUrl,
  applicantName,
  showRawUrl = true,
}: ScholarshipVideoPlayerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const validation = validateVideoURL(videoUrl)

  // Handle invalid URL
  if (!validation.isValid) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-red-900">URL de vidéo invalide</h3>
            <p className="text-sm text-red-700 mt-1">
              {validation.error || 'Cette URL de vidéo ne peut pas être affichée.'}
            </p>
            {showRawUrl && (
              <div className="mt-3 p-3 bg-red-100 rounded border border-red-200">
                <p className="text-xs text-red-800 font-mono break-all">
                  {videoUrl}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      {applicantName && (
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-foreground">
            Vidéo de motivation - {applicantName}
          </h3>
          <span className="text-sm text-muted-foreground">
            {validation.platform === 'youtube' ? 'YouTube' : 'Vimeo'}
          </span>
        </div>
      )}

      {/* Video Player */}
      <div className="relative w-full rounded-lg overflow-hidden border bg-black" style={{ paddingBottom: '56.25%' }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Chargement de la vidéo...</p>
            </div>
          </div>
        )}
        
        <iframe
          src={validation.embedUrl}
          className="absolute top-0 left-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={`Vidéo de motivation${applicantName ? ` - ${applicantName}` : ''}`}
          onLoad={() => setIsLoading(false)}
        />
      </div>

      {/* Raw URL Link */}
      {showRawUrl && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline break-all"
          >
            {videoUrl}
          </a>
        </div>
      )}

      {/* Platform Info */}
      <div className="text-xs text-muted-foreground">
        <p>
          Plateforme : <strong>{validation.platform === 'youtube' ? 'YouTube' : 'Vimeo'}</strong>
          {validation.videoId && (
            <> • ID : <code className="bg-muted px-1 py-0.5 rounded">{validation.videoId}</code></>
          )}
        </p>
      </div>
    </div>
  )
}

/**
 * Compact video player (for lists/tables)
 */
export function ScholarshipVideoPlayerCompact({
  videoUrl,
  applicantName,
}: {
  videoUrl: string
  applicantName?: string
}) {
  const [showPlayer, setShowPlayer] = useState(false)
  const validation = validateVideoURL(videoUrl)

  if (!validation.isValid) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600">
        <AlertCircle className="h-4 w-4" />
        <span>URL invalide</span>
      </div>
    )
  }

  if (!showPlayer) {
    return (
      <button
        onClick={() => setShowPlayer(true)}
        className="flex items-center gap-2 text-sm text-primary hover:underline"
      >
        <ExternalLink className="h-4 w-4" />
        <span>Voir la vidéo ({validation.platform === 'youtube' ? 'YouTube' : 'Vimeo'})</span>
      </button>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {applicantName ? `Vidéo - ${applicantName}` : 'Vidéo de motivation'}
        </span>
        <button
          onClick={() => setShowPlayer(false)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Fermer
        </button>
      </div>
      
      <div className="relative w-full rounded overflow-hidden border" style={{ paddingBottom: '56.25%' }}>
        <iframe
          src={validation.embedUrl}
          className="absolute top-0 left-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={`Vidéo${applicantName ? ` - ${applicantName}` : ''}`}
        />
      </div>
    </div>
  )
}
