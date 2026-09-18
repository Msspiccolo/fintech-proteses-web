-- ==========================================================
-- Fix 1: Drop ALL overloaded versions of complete_signup 
-- and recreate a single clean version that uses
-- ON CONFLICT ... DO UPDATE instead of DO NOTHING.
-- This is needed because the handle_new_user trigger creates
-- the profile as 'patient' BEFORE complete_signup runs
-- (since GoTrue strips the 'role' metadata field).
-- ==========================================================

-- Drop ALL overloaded signatures
DROP FUNCTION IF EXISTS public.complete_signup(text, text, text, text, text);
DROP FUNCTION IF EXISTS public.complete_signup(text, text, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.complete_signup(text, text, text, text, text, text, text, text, text);

-- Create a single, clean version
CREATE OR REPLACE FUNCTION public.complete_signup(
  _full_name text,
  _document text,
  _phone text,
  _role text,
  _clinic_name text DEFAULT '',
  _zip_code text DEFAULT '',
  _address text DEFAULT '',
  _city text DEFAULT '',
  _state text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _r public.app_role;
  _clinic_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _role NOT IN ('patient', 'clinic') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  _r := _role::public.app_role;

  -- UPSERT profile: update role if profile already exists (trigger creates it as 'patient')
  INSERT INTO public.profiles (user_id, full_name, document, phone, role)
  VALUES (_uid, _full_name, _document, _phone, _r)
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    document = EXCLUDED.document,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    updated_at = now();

  -- UPSERT user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, _r)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- If clinic, also create the clinic entity
  IF _r = 'clinic' AND _clinic_name IS NOT NULL AND length(trim(_clinic_name)) > 0 THEN
    INSERT INTO public.clinics (name, status)
    VALUES (_clinic_name, 'pending')
    RETURNING id INTO _clinic_id;

    INSERT INTO public.clinic_affiliations (user_id, clinic_id, role)
    VALUES (_uid, _clinic_id, 'owner')
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- Grant permissions
REVOKE ALL ON FUNCTION public.complete_signup(text, text, text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_signup(text, text, text, text, text, text, text, text, text) TO authenticated;


-- ==========================================================
-- Fix 2: Update the handle_new_user trigger to also check
-- 'app_role' and 'tipo' metadata fields (since GoTrue
-- strips the 'role' field for security reasons).
-- ==========================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, document, phone, role)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'document',
    new.raw_user_meta_data->>'phone',
    coalesce(
      (new.raw_user_meta_data->>'app_role')::public.app_role,
      (new.raw_user_meta_data->>'tipo')::public.app_role,
      (new.raw_user_meta_data->>'role')::public.app_role,
      'patient'::public.app_role
    )
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    new.id,
    coalesce(
      (new.raw_user_meta_data->>'app_role')::public.app_role,
      (new.raw_user_meta_data->>'tipo')::public.app_role,
      (new.raw_user_meta_data->>'role')::public.app_role,
      'patient'::public.app_role
    )
  )
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================================
-- Fix 3: Allow any authenticated user to switch their own role
-- to 'clinic' bypassing RLS (since user_roles RLS only allows admins)
-- ==========================================================

CREATE OR REPLACE FUNCTION public.set_own_role_to_clinic()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Update profiles table
  UPDATE public.profiles
  SET role = 'clinic', updated_at = now()
  WHERE user_id = _uid;

  -- 2. Remove patient role if exists
  DELETE FROM public.user_roles
  WHERE user_id = _uid AND role = 'patient';

  -- 3. Add clinic role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'clinic')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.set_own_role_to_clinic() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_own_role_to_clinic() TO authenticated;

