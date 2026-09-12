create type public.app_role as enum ('patient', 'clinic', 'admin');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

create policy "Users can read their own roles"
  on public.user_roles
  for select
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  full_name text,
  document text,
  phone text,
  birth_date date,
  role public.app_role not null default 'patient',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own profile"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  document text unique,
  phone text,
  email text,
  address text,
  city text,
  state text,
  zip_code text,
  status text not null default 'pending',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

grant select on public.clinics to authenticated;
grant all on public.clinics to service_role;

alter table public.clinics enable row level security;

create policy "Approved clinics are readable by authenticated users"
  on public.clinics
  for select
  to authenticated
  using (status = 'approved' or public.has_role(auth.uid(), 'admin'));

create policy "Admins can manage clinics"
  on public.clinics
  for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table public.clinic_affiliations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  clinic_id uuid references public.clinics(id) on delete cascade not null,
  role text not null default 'staff',
  created_at timestamp with time zone not null default now(),
  unique (user_id, clinic_id)
);

grant select, insert, update, delete on public.clinic_affiliations to authenticated;
grant all on public.clinic_affiliations to service_role;

alter table public.clinic_affiliations enable row level security;

create policy "Users can read their own clinic affiliations"
  on public.clinic_affiliations
  for select
  to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create policy "Admins can manage clinic affiliations"
  on public.clinic_affiliations
  for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table public.loan_applications (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references auth.users(id) on delete cascade not null,
  clinic_id uuid references public.clinics(id) on delete set null,
  requested_amount decimal(12,2) not null,
  down_payment decimal(12,2) not null default 0,
  installments integer not null,
  monthly_payment decimal(12,2) not null,
  interest_rate decimal(5,2) not null,
  total_cost decimal(12,2) not null,
  status text not null default 'pending',
  purpose text,
  notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

grant select, insert, update on public.loan_applications to authenticated;
grant all on public.loan_applications to service_role;

alter table public.loan_applications enable row level security;

create policy "Patients can read their own applications"
  on public.loan_applications
  for select
  to authenticated
  using (auth.uid() = patient_id);

create policy "Clinic staff can read their clinic applications"
  on public.loan_applications
  for select
  to authenticated
  using (
    clinic_id in (
      select clinic_id from public.clinic_affiliations where user_id = auth.uid()
    )
    or public.has_role(auth.uid(), 'admin')
  );

create policy "Patients can create their own applications"
  on public.loan_applications
  for insert
  to authenticated
  with check (auth.uid() = patient_id);

create policy "Admins can update applications"
  on public.loan_applications
  for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();

create trigger update_clinics_updated_at
  before update on public.clinics
  for each row execute function public.update_updated_at_column();

create trigger update_loan_applications_updated_at
  before update on public.loan_applications
  for each row execute function public.update_updated_at_column();
revoke execute on function public.has_role(uuid, public.app_role) from anon;
revoke execute on function public.has_role(uuid, public.app_role) from authenticated;
revoke execute on function public.has_role(uuid, public.app_role) from public;
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
GRANT SELECT ON public.clinics TO anon;

CREATE POLICY "Anyone can read approved clinics"
ON public.clinics
FOR SELECT
TO anon
USING (status = 'approved');

CREATE OR REPLACE FUNCTION public.complete_signup(
  _full_name text,
  _document text,
  _phone text,
  _role text,
  _clinic_name text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _r public.app_role;
  _clinic_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _role NOT IN ('patient', 'clinic') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  _r := _role::public.app_role;

  INSERT INTO public.profiles (user_id, full_name, document, phone, role)
  VALUES (_uid, _full_name, _document, _phone, _r)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, _r)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF _r = 'clinic' AND _clinic_name IS NOT NULL AND length(trim(_clinic_name)) > 0 THEN
    INSERT INTO public.clinics (name, status)
    VALUES (_clinic_name, 'pending')
    RETURNING id INTO _clinic_id;

    INSERT INTO public.clinic_affiliations (user_id, clinic_id, role)
    VALUES (_uid, _clinic_id, 'owner')
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_signup(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_signup(text, text, text, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.complete_signup(text, text, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
INSERT INTO public.clinics (name, legal_name, document, phone, email, address, city, state, zip_code, status) VALUES
('Instituto Ortopédico Paulista', 'Instituto Ortopédico Paulista LTDA', '12.345.678/0001-90', '(11) 3555-1200', 'contato@iop.com.br', 'Av. Paulista, 1200', 'São Paulo', 'SP', '01310-100', 'approved'),
('Clínica Movimento Reabilitação', 'Movimento Reabilitação ME', '23.456.789/0001-01', '(21) 2555-3400', 'atendimento@movimento.com.br', 'Rua Voluntários da Pátria, 340', 'Rio de Janeiro', 'RJ', '22270-000', 'approved'),
('Centro OrtoVida', 'OrtoVida Serviços Médicos LTDA', '34.567.890/0001-12', '(31) 3255-7800', 'contato@ortovida.com.br', 'Av. Afonso Pena, 2200', 'Belo Horizonte', 'MG', '30130-007', 'approved'),
('Clínica Passo Certo', 'Passo Certo Próteses LTDA', '45.678.901/0001-23', '(41) 3355-9100', 'contato@passocerto.com.br', 'Rua XV de Novembro, 900', 'Curitiba', 'PR', '80020-310', 'approved'),
('Reabilitar Sul', 'Reabilitar Sul Clínica LTDA', '56.789.012/0001-34', '(51) 3255-4700', 'contato@reabilitarsul.com.br', 'Av. Ipiranga, 5000', 'Porto Alegre', 'RS', '90610-000', 'approved'),
('NordOrto Recife', 'NordOrto Clínica Ortopédica LTDA', '67.890.123/0001-45', '(81) 3455-2200', 'contato@nordorto.com.br', 'Av. Boa Viagem, 1500', 'Recife', 'PE', '51011-000', 'approved');
create or replace function public.admin_exists()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where role = 'admin')
$$;

create or replace function public.claim_first_admin()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
begin
  if _uid is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from public.user_roles where role = 'admin') then
    raise exception 'Ja existe um administrador cadastrado';
  end if;

  insert into public.user_roles (user_id, role)
  values (_uid, 'admin')
  on conflict (user_id, role) do nothing;

  update public.profiles set role = 'admin' where user_id = _uid;
end;
$$;

revoke all on function public.admin_exists() from public, anon;
revoke all on function public.claim_first_admin() from public, anon;
grant execute on function public.admin_exists() to authenticated;
grant execute on function public.claim_first_admin() to authenticated;
create or replace function public.is_clinic_member(_user_id uuid, _clinic_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.clinic_affiliations
    where user_id = _user_id and clinic_id = _clinic_id
  )
$$;

revoke all on function public.is_clinic_member(uuid, uuid) from public, anon;
grant execute on function public.is_clinic_member(uuid, uuid) to authenticated;

create policy "Authenticated users can create clinics"
on public.clinics for insert to authenticated
with check (status = 'pending');

create policy "Members can read their own clinic"
on public.clinics for select to authenticated
using (public.is_clinic_member(auth.uid(), id));

create policy "Members can update their own clinic"
on public.clinics for update to authenticated
using (public.is_clinic_member(auth.uid(), id))
with check (public.is_clinic_member(auth.uid(), id) and status = 'pending');

create policy "Users can affiliate themselves to a clinic"
on public.clinic_affiliations for insert to authenticated
with check (auth.uid() = user_id);
CREATE POLICY "Admins can read all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));


-- Sincroniza usu�rios do auth.users para a tabela profiles
INSERT INTO public.profiles (user_id, full_name, role)
SELECT id, raw_user_meta_data->>'full_name', COALESCE((raw_user_meta_data->>'role')::public.app_role, 'patient'::public.app_role)
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Permite que o usu�rio delete a pr�pria conta
create or replace function public.delete_own_account()
returns void
language sql
security definer
set search_path = public
as $$
  delete from auth.users where id = auth.uid();
$$;

grant execute on function public.delete_own_account() to authenticated;

