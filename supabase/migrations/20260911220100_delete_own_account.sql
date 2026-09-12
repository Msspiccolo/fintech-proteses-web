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
  
  -- Apaga o usuário do auth.users.
  -- O Supabase automaticamente vai fazer o cascade para public.profiles 
  -- e outras tabelas assumindo que as chaves estrangeiras estejam com ON DELETE CASCADE.
  delete from auth.users where id = auth.uid();
end;
$$;
