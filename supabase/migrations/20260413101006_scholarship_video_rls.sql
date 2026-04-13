-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: allow eligible applicants to submit their scholarship video URL
--
-- Problem:
--   applications_update_own only permits updates when
--   payment_status IN ('Pending', 'Failed').  The scholarship video is
--   submitted *after* payment is confirmed, so every write was silently
--   blocked, returning 0 rows and surfacing as a frontend error.
--
-- Solution:
--   A narrow supplemental policy that opens exactly one column
--   (scholarship_video_url) to the applicant themselves, provided:
--     • payment is Confirmed or Waived  (dossier is sealed)
--     • is_scholarship_eligible is TRUE
--     • scholarship_video_url IS NULL   (one-time write only — no overwrites)
--
--   The IS NULL guard in the USING clause enforces the "locked after submit"
--   rule at the database level, not just the UI level.
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS applications_update_scholarship_video ON applications;

CREATE POLICY applications_update_scholarship_video
  ON applications
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND payment_status IN ('Confirmed', 'Waived')
    AND is_scholarship_eligible = TRUE
    AND scholarship_video_url IS NULL   -- one-time write; prevents overwriting
  )
  WITH CHECK (
    auth.uid() = user_id
    AND payment_status IN ('Confirmed', 'Waived')
    AND is_scholarship_eligible = TRUE
  );
