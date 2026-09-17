-- Fix permissions for delete_own_account so it becomes visible to the API
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function public.delete_own_account() to authenticated;

-- Force PostgREST to reload the schema cache so it picks up the new permissions
NOTIFY pgrst, 'reload schema';
