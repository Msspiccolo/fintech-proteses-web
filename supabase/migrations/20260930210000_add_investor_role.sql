-- Add 'investor' to app_role ENUM type
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'investor';

-- Update the complete_signup function to accept 'investor'
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

  IF _role NOT IN ('patient', 'clinic', 'investor') THEN
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
