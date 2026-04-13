-- Run ONCE in the Supabase SQL Editor (linked project) if you previously hit:
--   duplicate key value violates unique constraint "schema_migrations_pkey"
--   Key (version)=(20260413) already exists
--
-- Cause: several files were named 20260413_*.sql; the CLI only used "20260413"
-- as the migration version key, so the second file collided.
--
-- After running this DELETE, pull the repo and run: supabase db push

DELETE FROM supabase_migrations.schema_migrations
WHERE version = '20260413';
