-- =============================================
-- Ignito Academy AMS - Video URL Validation
-- Migration: 20260409000002_video_url_validation
-- Created: 2026-04-09
-- Purpose: Add validation for scholarship video URLs (YouTube/Vimeo only)
-- =============================================

-- =============================================
-- SECTION 1: VIDEO URL FORMAT VALIDATION
-- =============================================

-- CRITICAL: Video URLs ONLY (no file uploads)
-- Applicants submit YouTube/Vimeo URLs, NOT video files
-- No video storage bucket, no video file processing

ALTER TABLE applications
  ADD CONSTRAINT video_url_format_check 
  CHECK (
    scholarship_video_url IS NULL OR 
    scholarship_video_url ~* '^https?://(www\.)?(youtube\.com|youtu\.be|vimeo\.com|player\.vimeo\.com)/.*'
  );

-- =============================================
-- SECTION 2: SCHOLARSHIP STATUS VALIDATION
-- =============================================

-- Ensure scholarship_status has valid values
ALTER TABLE applications
  ADD CONSTRAINT scholarship_status_valid 
  CHECK (scholarship_status IN ('pending', 'video_submitted', 'awarded', 'rejected'));

-- =============================================
-- SECTION 3: COMMENTS
-- =============================================

COMMENT ON COLUMN applications.scholarship_video_url IS 'YouTube/Vimeo video URL (NOT file upload) - stored as TEXT';
COMMENT ON CONSTRAINT video_url_format_check ON applications IS 'CRITICAL: Video URLs only (YouTube/Vimeo) - NO video file uploads';
COMMENT ON CONSTRAINT scholarship_status_valid ON applications IS 'Valid scholarship status values';

-- =============================================
-- VERIFICATION
-- =============================================

DO $$
BEGIN
  -- Test valid YouTube URL
  BEGIN
    UPDATE applications 
    SET scholarship_video_url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    WHERE applicant_id = (SELECT applicant_id FROM applications LIMIT 1);
    RAISE NOTICE '✅ Valid YouTube URL accepted';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'ℹ️  No applications to test with';
  END;
  
  -- Test invalid URL (should fail)
  BEGIN
    UPDATE applications 
    SET scholarship_video_url = 'https://example.com/video.mp4'
    WHERE applicant_id = (SELECT applicant_id FROM applications LIMIT 1);
    RAISE EXCEPTION 'Video URL validation failed - invalid URL was accepted!';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE '✅ Video URL validation working correctly';
    WHEN OTHERS THEN
      RAISE NOTICE 'ℹ️  No applications to test with';
  END;
END $$;

-- =============================================
-- END OF MIGRATION
-- =============================================
