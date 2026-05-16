create table if not exists public.gastos_mensais (
    id bigserial primary key,
    item text not null,
    valor numeric(12, 2) not null default 0,
    mes text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint gastos_mensais_mes_format check (mes ~ '^[0-9]{4}-[0-9]{2}$')
);

create index if not exists gastos_mensais_mes_idx on public.gastos_mensais (mes);

create or replace function public.set_gastos_mensais_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists gastos_mensais_updated_at on public.gastos_mensais;

create trigger gastos_mensais_updated_at
before update on public.gastos_mensais
for each row
execute function public.set_gastos_mensais_updated_at();

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.gastos_mensais to anon, authenticated;
grant usage, select on sequence public.gastos_mensais_id_seq to anon, authenticated;
