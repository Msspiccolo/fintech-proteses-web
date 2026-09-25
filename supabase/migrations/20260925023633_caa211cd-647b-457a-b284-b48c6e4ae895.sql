ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS zip_code text;

CREATE OR REPLACE FUNCTION public.get_all_users_for_admin()
RETURNS TABLE(user_id uuid, email text, full_name text, role text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY
    SELECT u.id, u.email::text, p.full_name, COALESCE(p.role::text, 'patient'), u.created_at
    FROM auth.users u LEFT JOIN public.profiles p ON p.user_id = u.id
    ORDER BY u.created_at DESC;
END $$;

CREATE OR REPLACE FUNCTION public.update_user_role_by_admin(target_user_id uuid, new_role public.app_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  INSERT INTO public.user_roles(user_id, role) VALUES (target_user_id, new_role);
  UPDATE public.profiles SET role = new_role::text::public.app_role WHERE user_id = target_user_id;
END $$;

CREATE OR REPLACE FUNCTION public.delete_user_by_admin(target_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete yourself';
  END IF;
  DELETE FROM auth.users WHERE id = target_user_id;
END $$;

CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  DELETE FROM auth.users WHERE id = auth.uid();
END $$;

REVOKE ALL ON FUNCTION public.get_all_users_for_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_user_role_by_admin(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_user_by_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_all_users_for_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_role_by_admin(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_by_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;