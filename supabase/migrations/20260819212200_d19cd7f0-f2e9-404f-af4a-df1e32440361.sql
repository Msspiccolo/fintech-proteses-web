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