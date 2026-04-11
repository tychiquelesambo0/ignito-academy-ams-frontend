/**
 * Video URL Validation
 * 
 * CRITICAL: Video URLs ONLY - NO file uploads allowed
 * 
 * Architectural Pillar #3: Video URLs Only
 * - Only YouTube and Vimeo URLs accepted
 * - NO video file uploads to storage
 * - NO video MIME types
 * - NO video storage bucket
 */

import { z } from 'zod'

/**
 * Video platform type
 */
export type VideoPlatform = 'youtube' | 'vimeo'

/**
 * Video URL validation result
 */
export interface VideoURLResult {
  /** Is the URL valid? */
  isValid: boolean
  
  /** Platform (YouTube or Vimeo) */
  platform?: VideoPlatform
  
  /** Extracted video ID */
  videoId?: string
  
  /** Embed URL for iframe */
  embedUrl?: string
  
  /** Error message if invalid */
  error?: string
}

/**
 * YouTube URL patterns
 * Supports: watch, youtu.be, embed, shorts
 */
const YOUTUBE_PATTERNS = [
  // Standard watch URL: https://www.youtube.com/watch?v=VIDEO_ID
  /^(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})(?:&.*)?$/,
  
  // Short URL: https://youtu.be/VIDEO_ID
  /^(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})(?:\?.*)?$/,
  
  // Embed URL: https://www.youtube.com/embed/VIDEO_ID
  /^(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})(?:\?.*)?$/,
  
  // Shorts URL: https://www.youtube.com/shorts/VIDEO_ID
  /^(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})(?:\?.*)?$/,
]

/**
 * Vimeo URL patterns
 * Supports: standard, player
 */
const VIMEO_PATTERNS = [
  // Standard URL: https://vimeo.com/VIDEO_ID
  /^(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)(?:\/.*)?$/,
  
  // Player URL: https://player.vimeo.com/video/VIDEO_ID
  /^(?:https?:\/\/)?player\.vimeo\.com\/video\/(\d+)(?:\?.*)?$/,
]

/**
 * Validate YouTube URL and extract video ID
 * 
 * @param url - YouTube URL
 * @returns Video ID if valid, null otherwise
 */
function validateYouTubeURL(url: string): string | null {
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }
  return null
}

/**
 * Validate Vimeo URL and extract video ID
 * 
 * @param url - Vimeo URL
 * @returns Video ID if valid, null otherwise
 */
function validateVimeoURL(url: string): string | null {
  for (const pattern of VIMEO_PATTERNS) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }
  return null
}

/**
 * Generate YouTube embed URL
 * 
 * @param videoId - YouTube video ID
 * @returns Embed URL
 */
function generateYouTubeEmbedURL(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`
}

/**
 * Generate Vimeo embed URL
 * 
 * @param videoId - Vimeo video ID
 * @returns Embed URL
 */
function generateVimeoEmbedURL(videoId: string): string {
  return `https://player.vimeo.com/video/${videoId}`
}

/**
 * Validate video URL (YouTube or Vimeo only)
 * 
 * @param url - Video URL to validate
 * @returns Validation result with platform, video ID, and embed URL
 */
export function validateVideoURL(url: string): VideoURLResult {
  // Trim whitespace
  const trimmedUrl = url.trim()
  
  // Check if empty
  if (!trimmedUrl) {
    return {
      isValid: false,
      error: 'L\'URL de la vidéo est requise',
    }
  }
  
  // Try YouTube
  const youtubeId = validateYouTubeURL(trimmedUrl)
  if (youtubeId) {
    return {
      isValid: true,
      platform: 'youtube',
      videoId: youtubeId,
      embedUrl: generateYouTubeEmbedURL(youtubeId),
    }
  }
  
  // Try Vimeo
  const vimeoId = validateVimeoURL(trimmedUrl)
  if (vimeoId) {
    return {
      isValid: true,
      platform: 'vimeo',
      videoId: vimeoId,
      embedUrl: generateVimeoEmbedURL(vimeoId),
    }
  }
  
  // Invalid URL
  return {
    isValid: false,
    error: 'URL de vidéo invalide. Seuls les liens YouTube et Vimeo sont acceptés.',
  }
}

/**
 * Zod schema for video URL validation
 * Use this in forms with React Hook Form
 */
export const videoURLSchema = z
  .string()
  .min(1, 'L\'URL de la vidéo est requise')
  .refine(
    (url) => {
      const result = validateVideoURL(url)
      return result.isValid
    },
    {
      message: 'URL de vidéo invalide. Seuls les liens YouTube et Vimeo sont acceptés.',
    }
  )

/**
 * Check if a URL is a YouTube URL
 * 
 * @param url - URL to check
 * @returns True if YouTube URL
 */
export function isYouTubeURL(url: string): boolean {
  return validateYouTubeURL(url) !== null
}

/**
 * Check if a URL is a Vimeo URL
 * 
 * @param url - URL to check
 * @returns True if Vimeo URL
 */
export function isVimeoURL(url: string): boolean {
  return validateVimeoURL(url) !== null
}

/**
 * Extract video ID from URL
 * 
 * @param url - Video URL
 * @returns Video ID or null if invalid
 */
export function extractVideoId(url: string): string | null {
  const result = validateVideoURL(url)
  return result.videoId || null
}

/**
 * Get embed URL from video URL
 * 
 * @param url - Video URL
 * @returns Embed URL or null if invalid
 */
export function getEmbedURL(url: string): string | null {
  const result = validateVideoURL(url)
  return result.embedUrl || null
}
