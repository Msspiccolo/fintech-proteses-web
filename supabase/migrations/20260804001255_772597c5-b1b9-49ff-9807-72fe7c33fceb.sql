-- user_roles: admin-only management
CREATE POLICY "Admins can insert user roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update user roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete user roles"
ON public.user_roles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- loan_applications: only admins may modify applications (restrictive guard)
CREATE POLICY "Only admins can modify applications"
ON public.loan_applications AS RESTRICTIVE FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- loan_applications: explicitly deny deletes for all client roles
CREATE POLICY "No one can delete applications"
ON public.loan_applications AS RESTRICTIVE FOR DELETE TO authenticated, anon
USING (false);

REVOKE DELETE ON public.loan_applications FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon;