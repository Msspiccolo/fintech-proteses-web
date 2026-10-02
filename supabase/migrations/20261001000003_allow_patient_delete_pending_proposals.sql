-- 1. Permite o comando DELETE na tabela para usuários autenticados
GRANT DELETE ON public.loan_applications TO authenticated;

-- 2. Remove as políticas restritivas que bloqueavam a exclusão no banco
DROP POLICY IF EXISTS "No one can delete applications" ON public.loan_applications;
DROP POLICY IF EXISTS "deny_deletes_loan_applications" ON public.loan_applications;
DROP POLICY IF EXISTS "patients_can_delete_own_pending_loan_applications" ON public.loan_applications;
DROP POLICY IF EXISTS "admins_can_delete_loan_applications" ON public.loan_applications;

-- 3. Cria política permitindo que o paciente exclua suas próprias propostas pendentes
CREATE POLICY "patients_can_delete_own_pending_loan_applications"
ON public.loan_applications
FOR DELETE
TO authenticated
USING (
  auth.uid() = patient_id 
  AND status = 'pending'
);

-- 4. Cria política permitindo que administradores também possam excluir propostas se necessário
CREATE POLICY "admins_can_delete_loan_applications"
ON public.loan_applications
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
);
