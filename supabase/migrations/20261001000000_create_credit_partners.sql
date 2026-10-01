CREATE TABLE IF NOT EXISTS public.credit_partners (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text DEFAULT 'Investidor Individual',
  acquired numeric DEFAULT 1500000,
  used numeric DEFAULT 0,
  status text DEFAULT 'Ativo',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.credit_partners ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage credit partners"
  ON public.credit_partners
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Partners can view their own data"
  ON public.credit_partners
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Force PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
