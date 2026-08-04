create table if not exists public.avaliacoes_pediatricas (
    id bigserial primary key,
    nome text not null,
    data_nascimento date,
    responsavel text,
    telefone text,
    dados jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists avaliacoes_pediatricas_created_at_idx
on public.avaliacoes_pediatricas (created_at desc);

create or replace function public.set_avaliacoes_pediatricas_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists avaliacoes_pediatricas_updated_at on public.avaliacoes_pediatricas;
create trigger avaliacoes_pediatricas_updated_at
before update on public.avaliacoes_pediatricas
for each row execute function public.set_avaliacoes_pediatricas_updated_at();

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.avaliacoes_pediatricas to anon, authenticated;
grant usage, select on sequence public.avaliacoes_pediatricas_id_seq to anon, authenticated;
