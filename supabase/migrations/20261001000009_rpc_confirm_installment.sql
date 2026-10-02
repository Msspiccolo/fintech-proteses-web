CREATE OR REPLACE FUNCTION confirm_installment(application_id UUID, clinic_user_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_installments INT;
  v_paid INT;
  v_clinic_id UUID;
  v_is_authorized BOOLEAN;
BEGIN
  -- Fetch current status
  SELECT installments, installments_paid, clinic_id 
  INTO v_installments, v_paid, v_clinic_id
  FROM loan_applications
  WHERE id = application_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposta não encontrada';
  END IF;

  IF v_paid >= v_installments THEN
    RAISE EXCEPTION 'Todas as parcelas já foram pagas';
  END IF;

  -- Check authorization
  SELECT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = clinic_user_id AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM clinic_affiliations WHERE clinic_id = v_clinic_id AND user_id = clinic_user_id
  ) INTO v_is_authorized;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  -- Update
  UPDATE loan_applications
  SET installments_paid = COALESCE(installments_paid, 0) + 1
  WHERE id = application_id;

  RETURN json_build_object('success', true);
END;
$$;
