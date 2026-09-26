CREATE TABLE public.loan_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.loan_applications(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL,
  doc_type text NOT NULL DEFAULT 'other',
  file_name text NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.loan_documents TO authenticated;
GRANT ALL ON public.loan_documents TO service_role;
ALTER TABLE public.loan_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients read own docs" ON public.loan_documents FOR SELECT TO authenticated
  USING (auth.uid() = patient_id OR public.has_role(auth.uid(),'admin')
    OR application_id IN (SELECT la.id FROM public.loan_applications la JOIN public.clinic_affiliations ca ON ca.clinic_id = la.clinic_id WHERE ca.user_id = auth.uid()));
CREATE POLICY "Patients add own docs" ON public.loan_documents FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = patient_id AND EXISTS (SELECT 1 FROM public.loan_applications la WHERE la.id = application_id AND la.patient_id = auth.uid()));
CREATE POLICY "Patients delete own docs" ON public.loan_documents FOR DELETE TO authenticated
  USING (auth.uid() = patient_id);

CREATE TABLE public.fabrication_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.loan_applications(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL,
  model text NOT NULL,
  material text,
  notes text,
  status text NOT NULL DEFAULT 'requested',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.fabrication_orders TO authenticated;
GRANT ALL ON public.fabrication_orders TO service_role;
ALTER TABLE public.fabrication_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read fabrication orders" ON public.fabrication_orders FOR SELECT TO authenticated
  USING (auth.uid() = patient_id OR public.has_role(auth.uid(),'admin')
    OR application_id IN (SELECT la.id FROM public.loan_applications la JOIN public.clinic_affiliations ca ON ca.clinic_id = la.clinic_id WHERE ca.user_id = auth.uid()));
CREATE POLICY "Patients request fabrication" ON public.fabrication_orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = patient_id AND status = 'requested' AND EXISTS (SELECT 1 FROM public.loan_applications la WHERE la.id = application_id AND la.patient_id = auth.uid() AND la.status IN ('approved','paid')));
CREATE POLICY "Admins update fabrication" ON public.fabrication_orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER update_fabrication_orders_updated_at BEFORE UPDATE ON public.fabrication_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Patients upload own loan docs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'loan-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Read loan docs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'loan-documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.loan_documents d JOIN public.loan_applications la ON la.id = d.application_id JOIN public.clinic_affiliations ca ON ca.clinic_id = la.clinic_id WHERE d.storage_path = name AND ca.user_id = auth.uid())));
CREATE POLICY "Patients delete own loan docs" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'loan-documents' AND (storage.foldername(name))[1] = auth.uid()::text);