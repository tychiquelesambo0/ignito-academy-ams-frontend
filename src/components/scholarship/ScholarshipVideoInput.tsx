'use client'

/**
 * Scholarship Video Input Component
 * 
 * CRITICAL: URL input ONLY - NO file uploads
 * 
 * Allows applicants to paste YouTube or Vimeo URLs
 * Shows real-time validation and video preview
 */

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { validateVideoURL } from '@/lib/scholarship'
import type { VideoURLResult } from '@/lib/scholarship'

interface ScholarshipVideoInputProps {
  /** Current video URL value */
  value: string
  
  /** Callback when URL changes */
  onChange: (url: string) => void
  
  /** Error message from form validation */
  error?: string
  
  /** Is the field disabled? */
  disabled?: boolean
  
  /** Is the field required? */
  required?: boolean
}

/**
 * Video URL input component with real-time validation and preview
 * 
 * IMPORTANT: This is a TEXT input (type="url"), NOT a file upload
 */
export function ScholarshipVideoInput({
  value,
  onChange,
  error,
  disabled = false,
  required = false,
}: ScholarshipVideoInputProps) {
  const [validation, setValidation] = useState<VideoURLResult | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  // Validate URL in real-time
  useEffect(() => {
    if (value.trim()) {
      const result = validateVideoURL(value)
      setValidation(result)
      setShowPreview(result.isValid)
    } else {
      setValidation(null)
      setShowPreview(false)
    }
  }, [value])

  return (
    <div className="space-y-3">
      {/* URL Input Field */}
      <div className="space-y-2">
        <Label htmlFor="scholarship-video-url">
          Lien vidéo de motivation {required && <span className="text-red-500">*</span>}
        </Label>
        
        <Input
          id="scholarship-video-url"
          type="url"
          placeholder="https://www.youtube.com/watch?v=... ou https://vimeo.com/..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={error || (validation && !validation.isValid) ? 'border-red-500' : ''}
        />
        
        <p className="text-sm text-muted-foreground">
          Collez le lien de votre vidéo YouTube ou Vimeo (pas de téléchargement de fichier)
        </p>
      </div>

      {/* Validation Error */}
      {(error || (validation && !validation.isValid)) && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-800">
            {error || validation?.error}
          </p>
        </div>
      )}

      {/* Success Message */}
      {validation?.isValid && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3">
          <p className="text-sm text-green-800">
            ✓ Vidéo {validation.platform === 'youtube' ? 'YouTube' : 'Vimeo'} détectée
          </p>
        </div>
      )}

      {/* Video Preview */}
      {showPreview && validation?.embedUrl && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Aperçu de la vidéo</Label>
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Masquer
            </button>
          </div>
          
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <iframe
              src={validation.embedUrl}
              className="absolute top-0 left-0 w-full h-full rounded-lg border"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="Aperçu de la vidéo de motivation"
            />
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          📹 Comment obtenir le lien de votre vidéo ?
        </h4>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>
            <strong>YouTube :</strong> Téléchargez votre vidéo, puis copiez le lien depuis la barre d'adresse
          </li>
          <li>
            <strong>Vimeo :</strong> Téléchargez votre vidéo, puis copiez le lien de partage
          </li>
          <li>
            Vous pouvez utiliser une vidéo non répertoriée (unlisted) pour plus de confidentialité
          </li>
        </ul>
      </div>
    </div>
  )
}
