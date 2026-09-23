create or replace function public.get_all_users_for_admin()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  _result json;
begin
  if not exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin') then
    raise exception 'Unauthorized';
  end if;

  select json_agg(
    json_build_object(
      'user_id', u.id,
      'email', u.email,
      'full_name', p.full_name,
      'document', p.document,
      'phone', p.phone,
      'role', p.role,
      'roles', (select coalesce(json_agg(r.role), '[]'::json) from public.user_roles r where r.user_id = u.id),
      'created_at', u.created_at
    ) order by u.created_at desc
  ) into _result
  from auth.users u
  left join public.profiles p on p.user_id = u.id;

  return coalesce(_result, '[]'::json);
end;
$$;

create or replace function public.update_user_role_by_admin(target_user_id uuid, new_role public.app_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin') then
    raise exception 'Unauthorized';
  end if;

  delete from public.user_roles where user_id = target_user_id;
  insert into public.user_roles (user_id, role) values (target_user_id, new_role);
  update public.profiles set role = new_role where user_id = target_user_id;
end;
$$;

revoke all on function public.get_all_users_for_admin() from public, anon;
grant execute on function public.get_all_users_for_admin() to authenticated;

revoke all on function public.update_user_role_by_admin(uuid, public.app_role) from public, anon;
grant execute on function public.update_user_role_by_admin(uuid, public.app_role) to authenticated;

-- Resetting admin roles so the user can claim the first admin again
delete from public.user_roles where role = 'admin';
update public.profiles set role = 'patient' where role = 'admin';
