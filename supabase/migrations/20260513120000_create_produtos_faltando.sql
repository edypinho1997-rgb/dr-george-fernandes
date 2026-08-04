create table if not exists public.produtos_faltando (
    id bigserial primary key,
    owner_id uuid not null default auth.uid(),
    nome text not null,
    nome_normalizado text not null unique,
    faltando boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- A tabela pode já existir no projeto remoto, criada antes desta migration.
-- Nesse caso, adiciona a coluna de proprietário sem tocar nos registros existentes.
alter table public.produtos_faltando
add column if not exists owner_id uuid default auth.uid();

alter table public.produtos_faltando enable row level security;

create or replace function public.set_produtos_faltando_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists produtos_faltando_updated_at on public.produtos_faltando;

create trigger produtos_faltando_updated_at
before update on public.produtos_faltando
for each row
execute function public.set_produtos_faltando_updated_at();

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.produtos_faltando to authenticated;
grant usage, select on sequence public.produtos_faltando_id_seq to authenticated;

create policy "Usuário acessa apenas seus produtos"
on public.produtos_faltando
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());
