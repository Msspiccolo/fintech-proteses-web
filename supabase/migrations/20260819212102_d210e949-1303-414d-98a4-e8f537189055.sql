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