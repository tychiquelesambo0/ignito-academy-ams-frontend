-- ============================================================================
-- IGNITO ACADEMY AMS — AUTO-CREATE APPLICANT PROFILE TRIGGER
-- ============================================================================
-- Migration: 20260410000005_auto_create_applicant_profile.sql
-- Created: 2026-04-10
-- Description: Automatically create applicant profile when user signs up
-- ============================================================================

-- Function to create applicant profile from auth.users metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_prenom VARCHAR(100);
  v_nom VARCHAR(100);
  v_phone VARCHAR(20);
  v_date_naissance DATE;
BEGIN
  -- Extract metadata from auth.users
  v_prenom := NEW.raw_user_meta_data->>'prenom';
  v_nom := NEW.raw_user_meta_data->>'nom';
  v_phone := NEW.raw_user_meta_data->>'phone_number';
  v_date_naissance := (NEW.raw_user_meta_data->>'date_naissance')::DATE;
  
  -- Only insert if all required fields are present
  IF v_prenom IS NOT NULL AND v_nom IS NOT NULL AND v_phone IS NOT NULL AND v_date_naissance IS NOT NULL THEN
    INSERT INTO public.applicants (
      id,
      email,
      prenom,
      nom,
      phone_number,
      date_naissance
    )
    VALUES (
      NEW.id,
      NEW.email,
      v_prenom,
      v_nom,
      v_phone,
      v_date_naissance
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create applicant profile on user signup
-- Idempotent: remote DBs may already have this trigger from a prior manual deploy.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Comment
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates applicant profile when user signs up via Supabase Auth';
