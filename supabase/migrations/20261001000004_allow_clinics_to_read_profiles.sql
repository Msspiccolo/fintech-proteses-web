-- Allow clinics and admins to read all profiles
CREATE POLICY "Clinics and admins can read all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'clinic') OR public.has_role(auth.uid(), 'admin')
  );
