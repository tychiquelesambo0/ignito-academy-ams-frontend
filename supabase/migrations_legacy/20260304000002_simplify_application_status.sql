-- Simplify application lifecycle to 3 core phases
-- Phase 1: initial creation  → 'Dossier Créé'   (existing)
-- Phase 2: under evaluation  → 'en_cours_devaluation' (new)
-- Phase 3: final decision    → existing decision statuses

-- 1. Add new enum values
ALTER TYPE application_status_enum ADD VALUE IF NOT EXISTS 'en_cours_devaluation';
ALTER TYPE payment_status_enum     ADD VALUE IF NOT EXISTS 'paid';

-- 2. Replace payment consistency constraint to accept both 'Confirmed' (legacy) and 'paid'
ALTER TABLE applications DROP CONSTRAINT payment_confirmed_when_status_paid;
ALTER TABLE applications ADD CONSTRAINT payment_confirmed_when_status_paid CHECK (
  (payment_status IN ('Confirmed', 'paid') AND payment_confirmed_at IS NOT NULL) OR
  (payment_status NOT IN ('Confirmed', 'paid') AND payment_confirmed_at IS NULL)
);

-- 3. Migrate any existing 'Frais Réglés' records to 'en_cours_devaluation'
UPDATE applications
  SET application_status = 'en_cours_devaluation'
  WHERE application_status = 'Frais Réglés';
