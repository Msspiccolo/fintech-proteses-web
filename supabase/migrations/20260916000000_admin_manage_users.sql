-- Add RLS policies allowing admins to read and manage all profiles and user_roles

-- Profiles
CREATE POLICY "Admins can manage all profiles"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- User Roles
CREATE POLICY "Admins can manage all user_roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Also fix has_role function just in case a user has the admin role in profiles but not user_roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  ) OR EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = _user_id AND role = _role
  ) OR (
    auth.uid() = _user_id AND 
    (current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'role') = _role::text
  )
$$;

-- Force PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';
