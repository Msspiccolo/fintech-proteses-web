<<<<<<< HEAD
-- 1. Permite o comando DELETE na tabela para usuários autenticados
GRANT DELETE ON public.loan_applications TO authenticated;

-- 2. Remove as políticas restritivas que bloqueavam a exclusão no banco
=======
﻿-- 1. Permite o comando DELETE na tabela para usuÃ¡rios autenticados
GRANT DELETE ON public.loan_applications TO authenticated;

-- 2. Remove as polÃ­ticas restritivas que bloqueavam a exclusÃ£o no banco
>>>>>>> cb822e4a48025882199f319cb737f38b9afda680
DROP POLICY IF EXISTS "No one can delete applications" ON public.loan_applications;
DROP POLICY IF EXISTS "deny_deletes_loan_applications" ON public.loan_applications;
DROP POLICY IF EXISTS "patients_can_delete_own_pending_loan_applications" ON public.loan_applications;
DROP POLICY IF EXISTS "admins_can_delete_loan_applications" ON public.loan_applications;

<<<<<<< HEAD
-- 3. Cria política permitindo que o paciente exclua suas próprias propostas pendentes
=======
-- 3. Cria polÃ­tica permitindo que o paciente exclua suas prÃ³prias propostas pendentes
>>>>>>> cb822e4a48025882199f319cb737f38b9afda680
CREATE POLICY "patients_can_delete_own_pending_loan_applications"
ON public.loan_applications
FOR DELETE
TO authenticated
USING (
  auth.uid() = patient_id 
  AND status = 'pending'
);

<<<<<<< HEAD
-- 4. Cria política permitindo que administradores também possam excluir propostas se necessário
=======
-- 4. Cria polÃ­tica permitindo que administradores tambÃ©m possam excluir propostas se necessÃ¡rio
>>>>>>> cb822e4a48025882199f319cb737f38b9afda680
CREATE POLICY "admins_can_delete_loan_applications"
ON public.loan_applications
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
);
