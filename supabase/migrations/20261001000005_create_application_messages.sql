-- Create application_messages table
CREATE TABLE public.application_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.loan_applications(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT application_messages_pkey PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.application_messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Patients can view messages for their applications"
  ON public.application_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.loan_applications la
      WHERE la.id = application_messages.application_id
      AND la.patient_id = auth.uid()
    )
  );

CREATE POLICY "Patients can insert messages for their applications"
  ON public.application_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.loan_applications la
      WHERE la.id = application_messages.application_id
      AND la.patient_id = auth.uid()
    )
    AND sender_id = auth.uid()
  );

CREATE POLICY "Clinics can view messages for their applications"
  ON public.application_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.loan_applications la
      JOIN public.clinic_affiliations ca ON ca.clinic_id = la.clinic_id
      WHERE la.id = application_messages.application_id
      AND ca.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Clinics can insert messages for their applications"
  ON public.application_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      EXISTS (
        SELECT 1 FROM public.loan_applications la
        JOIN public.clinic_affiliations ca ON ca.clinic_id = la.clinic_id
        WHERE la.id = application_messages.application_id
        AND ca.user_id = auth.uid()
      )
      OR public.has_role(auth.uid(), 'admin')
    )
    AND sender_id = auth.uid()
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.application_messages;
