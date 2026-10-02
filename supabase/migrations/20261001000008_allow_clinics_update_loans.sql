-- Allow clinics to update loan applications they are affiliated with
DROP POLICY IF EXISTS "Clinics can update their loan applications" ON loan_applications;
CREATE POLICY "Clinics can update their loan applications"
ON loan_applications FOR UPDATE
TO authenticated
USING (
  clinic_id IN (SELECT clinic_id FROM clinic_affiliations WHERE user_id = auth.uid())
)
WITH CHECK (
  clinic_id IN (SELECT clinic_id FROM clinic_affiliations WHERE user_id = auth.uid())
);
