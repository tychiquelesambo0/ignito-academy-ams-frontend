'use client'

import { FileText, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

interface UploadedDocument {
  id: string
  file_name: string
  file_size: number
  file_type: string
  uploaded_at: string
  file_path?: string
}

interface UploadedDocumentsListProps {
  documents: UploadedDocument[]
  applicantId: string
}

export function UploadedDocumentsList({ documents, applicantId }: UploadedDocumentsListProps) {
  const [downloading, setDownloading] = useState<string | null>(null)

  const handleDownload = async (doc: UploadedDocument) => {
    setDownloading(doc.id)
    
    try {
      const supabase = createClient()
      
      // Get signed URL for download
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.file_path || '', 60) // 60 seconds expiry

      if (error) {
        console.error('Error getting download URL:', error)
        alert('Erreur lors du téléchargement du fichier')
        setDownloading(null)
        return
      }

      // Download the file
      const response = await fetch(data.signedUrl)
      const blob = await response.blob()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.file_name
      document.body.appendChild(a)
      a.click()
      
      // Cleanup
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
    } catch (error) {
      console.error('Download error:', error)
      alert('Erreur lors du téléchargement du fichier')
    } finally {
      setDownloading(null)
    }
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground">
        Aucun document téléchargé
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h5 className="font-semibold text-sm text-primary">Documents téléchargés ({documents.length})</h5>
      <div className="space-y-2">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between p-3 border rounded-md bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {(doc.file_size / 1048576).toFixed(2)} MB • {new Date(doc.uploaded_at).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleDownload(doc)}
              disabled={downloading === doc.id}
              className="disabled:opacity-50"
            >
              {downloading === doc.id ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
              ) : (
                <Download className="w-5 h-5 text-muted-foreground hover:text-primary cursor-pointer flex-shrink-0" />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
