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
