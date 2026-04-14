-- ─────────────────────────────────────────────────────────────────────────────
-- Admin Notifications
--
-- Creates admin_notifications table and Postgres triggers that automatically
-- insert a notification row for every significant application event:
--
--   new_application      → INSERT on applications
--   documents_submitted  → documents_submitted changes FALSE → TRUE (initial)
--   additional_documents → conditional_message cleared (applicant confirmed
--                          supplementary upload)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Table -------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS admin_notifications (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type           TEXT        NOT NULL
                             CHECK (type IN (
                               'new_application',
                               'documents_submitted',
                               'additional_documents'
                             )),
  applicant_id   VARCHAR(20) NOT NULL,
  applicant_name TEXT,
  message        TEXT        NOT NULL,
  read_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_notifications_created_at_idx
  ON admin_notifications (created_at DESC);

CREATE INDEX IF NOT EXISTS admin_notifications_read_at_idx
  ON admin_notifications (read_at)
  WHERE read_at IS NULL;

-- 2. RLS ---------------------------------------------------------------------

ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Officers can read all notifications
CREATE POLICY "officers_select_notifications"
  ON admin_notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admissions_officers
      WHERE id = auth.uid() AND is_active = TRUE
    )
  );

-- Officers can mark notifications as read (UPDATE read_at only)
CREATE POLICY "officers_update_notifications"
  ON admin_notifications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admissions_officers
      WHERE id = auth.uid() AND is_active = TRUE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admissions_officers
      WHERE id = auth.uid() AND is_active = TRUE
    )
  );

-- Service role (triggers + server-side admin client) can insert freely
CREATE POLICY "service_insert_notifications"
  ON admin_notifications FOR INSERT
  TO service_role
  WITH CHECK (TRUE);

-- 3. Trigger function --------------------------------------------------------

CREATE OR REPLACE FUNCTION handle_application_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
BEGIN
  -- Resolve applicant full name from the applicants table
  SELECT CONCAT(a.prenom, ' ', a.nom)
  INTO   v_name
  FROM   applicants a
  WHERE  a.id = NEW.user_id;

  -- ── INSERT: new application created ──────────────────────────────────────
  IF TG_OP = 'INSERT' THEN
    INSERT INTO admin_notifications (type, applicant_id, applicant_name, message)
    VALUES (
      'new_application',
      NEW.applicant_id,
      COALESCE(NULLIF(TRIM(v_name), ''), NEW.applicant_id),
      'Nouveau dossier de candidature créé'
    );

  -- ── UPDATE: two events of interest ───────────────────────────────────────
  ELSIF TG_OP = 'UPDATE' THEN

    -- documents_submitted: FALSE → TRUE (initial document submission)
    IF NEW.documents_submitted = TRUE AND OLD.documents_submitted = FALSE THEN
      INSERT INTO admin_notifications (type, applicant_id, applicant_name, message)
      VALUES (
        'documents_submitted',
        NEW.applicant_id,
        COALESCE(NULLIF(TRIM(v_name), ''), NEW.applicant_id),
        'Dossier documentaire soumis'
      );
    END IF;

    -- conditional_message: non-null → null (applicant confirmed supplementary upload)
    IF ( OLD.conditional_message IS NOT NULL
         AND TRIM(OLD.conditional_message) <> ''
         AND (NEW.conditional_message IS NULL OR TRIM(NEW.conditional_message) = '') )
    THEN
      INSERT INTO admin_notifications (type, applicant_id, applicant_name, message)
      VALUES (
        'additional_documents',
        NEW.applicant_id,
        COALESCE(NULLIF(TRIM(v_name), ''), NEW.applicant_id),
        'Pièces complémentaires soumises'
      );
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

-- 4. Attach trigger to applications -----------------------------------------

DROP TRIGGER IF EXISTS trg_application_notification ON applications;

CREATE TRIGGER trg_application_notification
  AFTER INSERT OR UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION handle_application_notification();

-- 5. Enable Realtime for the table -------------------------------------------
-- (Allows the admin frontend to receive live INSERTs via Supabase Realtime)

ALTER PUBLICATION supabase_realtime ADD TABLE admin_notifications;
