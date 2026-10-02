-- Allow investors (users in credit_partners) to view all loan applications
CREATE POLICY "Investors can view all applications"
  ON public.loan_applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.credit_partners WHERE user_id = auth.uid())
  );

NOTIFY pgrst, 'reload schema';
