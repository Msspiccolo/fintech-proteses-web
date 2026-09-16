-- Create an RPC to allow admins to delete other users
create or replace function public.delete_user_by_admin(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Check if the caller is an admin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Unauthorized';
  end if;

  -- Prevent deleting oneself (they can use delete_own_account for that)
  if auth.uid() = target_user_id then
    raise exception 'Use delete_own_account to delete yourself';
  end if;

  -- Delete the user from auth.users (cascade will handle profiles etc)
  delete from auth.users where id = target_user_id;
end;
$$;

grant execute on function public.delete_user_by_admin(uuid) to authenticated;

-- Force PostgREST to reload the schema cache so both delete_own_account and delete_user_by_admin are instantly available
NOTIFY pgrst, reload_schema;
