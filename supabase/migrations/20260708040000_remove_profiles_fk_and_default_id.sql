-- Remove FK from profiles.id referencing auth.users and set default UUID
-- This allows inserting profiles without a corresponding auth.users row.

DO $$
BEGIN
  -- drop foreign key constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public' AND tc.table_name = 'profiles' AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'id'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
  END IF;
EXCEPTION WHEN others THEN
  -- ignore
  RAISE NOTICE 'Could not drop fk if exists: %', SQLERRM;
END$$;

-- Ensure id has a default generator
ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- If id column was defined as referencing auth.users, dropping the FK leaves it as primary key.
-- New standalone profiles will use generated UUIDs allowing server-side creation without auth user.
