/**
 * Video URL Validation Tests
 */

import {
  validateVideoURL,
  videoURLSchema,
  isYouTubeURL,
  isVimeoURL,
  extractVideoId,
  getEmbedURL,
} from '../video-validation'

describe('validateVideoURL - YouTube', () => {
  it('should validate standard YouTube watch URL', () => {
    const result = validateVideoURL('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    
    expect(result.isValid).toBe(true)
    expect(result.platform).toBe('youtube')
    expect(result.videoId).toBe('dQw4w9WgXcQ')
    expect(result.embedUrl).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
  })

  it('should validate YouTube watch URL without www', () => {
    const result = validateVideoURL('https://youtube.com/watch?v=dQw4w9WgXcQ')
    
    expect(result.isValid).toBe(true)
    expect(result.videoId).toBe('dQw4w9WgXcQ')
  })

  it('should validate YouTube watch URL without https', () => {
    const result = validateVideoURL('youtube.com/watch?v=dQw4w9WgXcQ')
    
    expect(result.isValid).toBe(true)
    expect(result.videoId).toBe('dQw4w9WgXcQ')
  })

  it('should validate YouTube short URL (youtu.be)', () => {
    const result = validateVideoURL('https://youtu.be/dQw4w9WgXcQ')
    
    expect(result.isValid).toBe(true)
    expect(result.platform).toBe('youtube')
    expect(result.videoId).toBe('dQw4w9WgXcQ')
  })

  it('should validate YouTube embed URL', () => {
    const result = validateVideoURL('https://www.youtube.com/embed/dQw4w9WgXcQ')
    
    expect(result.isValid).toBe(true)
    expect(result.videoId).toBe('dQw4w9WgXcQ')
  })

  it('should validate YouTube shorts URL', () => {
    const result = validateVideoURL('https://www.youtube.com/shorts/dQw4w9WgXcQ')
    
    expect(result.isValid).toBe(true)
    expect(result.videoId).toBe('dQw4w9WgXcQ')
  })

  it('should validate YouTube URL with query parameters', () => {
    const result = validateVideoURL('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s')
    
    expect(result.isValid).toBe(true)
    expect(result.videoId).toBe('dQw4w9WgXcQ')
  })

  it('should validate YouTube URL with multiple query parameters', () => {
    const result = validateVideoURL('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=PLxyz')
    
    expect(result.isValid).toBe(true)
    expect(result.videoId).toBe('dQw4w9WgXcQ')
  })

  it('should handle YouTube video IDs with hyphens and underscores', () => {
    const result = validateVideoURL('https://www.youtube.com/watch?v=abc-DEF_123')
    
    expect(result.isValid).toBe(true)
    expect(result.videoId).toBe('abc-DEF_123')
  })
})

describe('validateVideoURL - Vimeo', () => {
  it('should validate standard Vimeo URL', () => {
    const result = validateVideoURL('https://vimeo.com/123456789')
    
    expect(result.isValid).toBe(true)
    expect(result.platform).toBe('vimeo')
    expect(result.videoId).toBe('123456789')
    expect(result.embedUrl).toBe('https://player.vimeo.com/video/123456789')
  })

  it('should validate Vimeo URL without www', () => {
    const result = validateVideoURL('https://vimeo.com/123456789')
    
    expect(result.isValid).toBe(true)
    expect(result.videoId).toBe('123456789')
  })

  it('should validate Vimeo URL without https', () => {
    const result = validateVideoURL('vimeo.com/123456789')
    
    expect(result.isValid).toBe(true)
    expect(result.videoId).toBe('123456789')
  })

  it('should validate Vimeo player URL', () => {
    const result = validateVideoURL('https://player.vimeo.com/video/123456789')
    
    expect(result.isValid).toBe(true)
    expect(result.videoId).toBe('123456789')
  })

  it('should validate Vimeo URL with path', () => {
    const result = validateVideoURL('https://vimeo.com/123456789/abc123def')
    
    expect(result.isValid).toBe(true)
    expect(result.videoId).toBe('123456789')
  })

  it('should validate Vimeo player URL with query parameters', () => {
    const result = validateVideoURL('https://player.vimeo.com/video/123456789?autoplay=1')
    
    expect(result.isValid).toBe(true)
    expect(result.videoId).toBe('123456789')
  })
})

describe('validateVideoURL - Invalid URLs', () => {
  it('should reject empty string', () => {
    const result = validateVideoURL('')
    
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('requise')
  })

  it('should reject whitespace only', () => {
    const result = validateVideoURL('   ')
    
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('requise')
  })

  it('should reject non-video URLs', () => {
    const result = validateVideoURL('https://google.com')
    
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('invalide')
  })

  it('should reject Facebook video URLs', () => {
    const result = validateVideoURL('https://www.facebook.com/watch?v=123456')
    
    expect(result.isValid).toBe(false)
  })

  it('should reject TikTok URLs', () => {
    const result = validateVideoURL('https://www.tiktok.com/@user/video/123456')
    
    expect(result.isValid).toBe(false)
  })

  it('should reject Instagram URLs', () => {
    const result = validateVideoURL('https://www.instagram.com/p/ABC123/')
    
    expect(result.isValid).toBe(false)
  })

  it('should reject malformed YouTube URLs', () => {
    const result = validateVideoURL('https://www.youtube.com/video/123')
    
    expect(result.isValid).toBe(false)
  })

  it('should reject YouTube URLs with invalid video ID length', () => {
    const result = validateVideoURL('https://www.youtube.com/watch?v=abc')
    
    expect(result.isValid).toBe(false)
  })

  it('should reject Vimeo URLs with non-numeric ID', () => {
    const result = validateVideoURL('https://vimeo.com/abc123')
    
    expect(result.isValid).toBe(false)
  })
})

describe('videoURLSchema (Zod)', () => {
  it('should validate valid YouTube URL', () => {
    const result = videoURLSchema.safeParse('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(result.success).toBe(true)
  })

  it('should validate valid Vimeo URL', () => {
    const result = videoURLSchema.safeParse('https://vimeo.com/123456789')
    expect(result.success).toBe(true)
  })

  it('should reject empty string', () => {
    const result = videoURLSchema.safeParse('')
    expect(result.success).toBe(false)
  })

  it('should reject invalid URL', () => {
    const result = videoURLSchema.safeParse('https://google.com')
    expect(result.success).toBe(false)
  })
})

describe('isYouTubeURL', () => {
  it('should return true for YouTube URLs', () => {
    expect(isYouTubeURL('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true)
    expect(isYouTubeURL('https://youtu.be/dQw4w9WgXcQ')).toBe(true)
  })

  it('should return false for non-YouTube URLs', () => {
    expect(isYouTubeURL('https://vimeo.com/123456789')).toBe(false)
    expect(isYouTubeURL('https://google.com')).toBe(false)
  })
})

describe('isVimeoURL', () => {
  it('should return true for Vimeo URLs', () => {
    expect(isVimeoURL('https://vimeo.com/123456789')).toBe(true)
    expect(isVimeoURL('https://player.vimeo.com/video/123456789')).toBe(true)
  })

  it('should return false for non-Vimeo URLs', () => {
    expect(isVimeoURL('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(false)
    expect(isVimeoURL('https://google.com')).toBe(false)
  })
})

describe('extractVideoId', () => {
  it('should extract YouTube video ID', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('should extract Vimeo video ID', () => {
    expect(extractVideoId('https://vimeo.com/123456789')).toBe('123456789')
  })

  it('should return null for invalid URLs', () => {
    expect(extractVideoId('https://google.com')).toBeNull()
  })
})

describe('getEmbedURL', () => {
  it('should generate YouTube embed URL', () => {
    const embedUrl = getEmbedURL('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(embedUrl).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
  })

  it('should generate Vimeo embed URL', () => {
    const embedUrl = getEmbedURL('https://vimeo.com/123456789')
    expect(embedUrl).toBe('https://player.vimeo.com/video/123456789')
  })

  it('should return null for invalid URLs', () => {
    expect(getEmbedURL('https://google.com')).toBeNull()
  })
})
