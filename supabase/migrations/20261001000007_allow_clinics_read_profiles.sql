-- Allow clinics to read profiles of patients who applied to their clinic
CREATE OR REPLACE FUNCTION can_clinic_read_profile(patient_user_id UUID, clinic_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM loan_applications la
    JOIN clinic_affiliations ca ON la.clinic_id = ca.clinic_id
    WHERE la.patient_id = patient_user_id AND ca.user_id = clinic_user_id
  );
$$;

DROP POLICY IF EXISTS "Clinics can read profiles of their patients" ON profiles;
CREATE POLICY "Clinics can read profiles of their patients"
ON profiles FOR SELECT
TO authenticated
USING (
  can_clinic_read_profile(user_id, auth.uid())
);
