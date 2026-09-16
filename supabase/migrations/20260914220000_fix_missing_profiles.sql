-- Função para criar automaticamente um profile e user_role quando um usuário for criado no auth.users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, full_name, document, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'document',
    new.raw_user_meta_data->>'phone',
    coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'patient'::public.app_role)
  )
  on conflict (user_id) do nothing;
  
  insert into public.user_roles (user_id, role)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'patient'::public.app_role)
  )
  on conflict (user_id, role) do nothing;
  
  return new;
end;
$$ language plpgsql security definer;

-- Remove o trigger se já existir para recriar
drop trigger if exists on_auth_user_created on auth.users;

-- Cria o trigger na tabela auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Sincroniza usuários antigos que possam estar faltando na tabela profiles
insert into public.profiles (user_id, full_name, document, phone, role)
select 
  id,
  coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name'),
  raw_user_meta_data->>'document',
  raw_user_meta_data->>'phone',
  coalesce((raw_user_meta_data->>'role')::public.app_role, 'patient'::public.app_role)
from auth.users
where id not in (select user_id from public.profiles)
on conflict (user_id) do nothing;

-- Sincroniza usuários antigos que possam estar faltando na tabela user_roles
insert into public.user_roles (user_id, role)
select 
  id,
  coalesce((raw_user_meta_data->>'role')::public.app_role, 'patient'::public.app_role)
from auth.users
where id not in (select user_id from public.user_roles)
on conflict (user_id, role) do nothing;
