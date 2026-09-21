-- Add address fields to profiles
ALTER TABLE public.profiles
ADD COLUMN zip_code text,
ADD COLUMN address text,
ADD COLUMN city text;

-- Update complete_signup RPC
CREATE OR REPLACE FUNCTION public.complete_signup(
  _full_name text,
  _document text,
  _phone text,
  _role text,
  _clinic_name text DEFAULT NULL,
  _zip_code text DEFAULT NULL,
  _address text DEFAULT NULL,
  _city text DEFAULT NULL
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

  -- Update profiles with address details if it exists, otherwise insert
  INSERT INTO public.profiles (user_id, full_name, document, phone, role, zip_code, address, city)
  VALUES (_uid, _full_name, _document, _phone, _r, _zip_code, _address, _city)
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    document = EXCLUDED.document,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    zip_code = COALESCE(EXCLUDED.zip_code, public.profiles.zip_code),
    address = COALESCE(EXCLUDED.address, public.profiles.address),
    city = COALESCE(EXCLUDED.city, public.profiles.city);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, _r)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF _r = 'clinic' AND _clinic_name IS NOT NULL AND length(trim(_clinic_name)) > 0 THEN
    INSERT INTO public.clinics (name, zip_code, address, city, status)
    VALUES (_clinic_name, _zip_code, _address, _city, 'pending')
    RETURNING id INTO _clinic_id;

    INSERT INTO public.clinic_affiliations (user_id, clinic_id, role)
    VALUES (_uid, _clinic_id, 'owner')
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- Update the handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, document, phone, role, zip_code, address, city)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'document',
    NEW.raw_user_meta_data->>'phone',
    COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'patient'::public.app_role),
    NEW.raw_user_meta_data->>'zip_code',
    NEW.raw_user_meta_data->>'address',
    NEW.raw_user_meta_data->>'city'
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'patient'::public.app_role)
  )
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
