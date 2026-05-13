create table if not exists public.produtos_faltando (
    id bigserial primary key,
    nome text not null,
    nome_normalizado text not null unique,
    faltando boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

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

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.produtos_faltando to anon, authenticated;
grant usage, select on sequence public.produtos_faltando_id_seq to anon, authenticated;
