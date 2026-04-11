-- Allow payment confirmation updates for mock payments and webhooks
-- This migration updates the RLS policy to allow payment_status and application_status updates

-- Drop the old restrictive policy
DROP POLICY IF EXISTS applications_update_own ON applications;

-- Create new policy that allows payment confirmation
CREATE POLICY applications_update_own
  ON applications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid() AND
    (
      -- Allow updating before payment is confirmed
      (payment_status != 'Confirmed' AND application_status = 'Dossier Créé')
      OR
      -- Allow confirming payment (for mock payments and webhooks)
      (payment_status = 'Confirmed' AND application_status IN ('Frais Réglés', 'Dossier Créé'))
    )
  );

COMMENT ON POLICY applications_update_own ON applications IS 'Applicants can update applications before payment, and payment can be confirmed via API';
