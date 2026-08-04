create table if not exists public.avaliacoes_pediatricas (
    id bigserial primary key,
    owner_id uuid not null default auth.uid(),
    nome text not null,
    data_nascimento date,
    responsavel text,
    telefone text,
    dados jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Compatibilidade com a tabela caso ela tenha sido criada antes desta migration.
alter table public.avaliacoes_pediatricas
add column if not exists owner_id uuid default auth.uid();

alter table public.avaliacoes_pediatricas enable row level security;

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

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.avaliacoes_pediatricas to authenticated;
grant usage, select on sequence public.avaliacoes_pediatricas_id_seq to authenticated;

create policy "Usuário acessa apenas suas avaliações pediátricas"
on public.avaliacoes_pediatricas
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());
