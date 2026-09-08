-- Compartilha todas as avaliações pediátricas existentes e futuras
-- entre os usuários autenticados da clínica, inclusive as criadas pelo e-mail George.
drop policy if exists "Usuário acessa apenas suas avaliações pediátricas"
on public.avaliacoes_pediatricas;

drop policy if exists "Usuários autenticados acessam avaliações pediátricas"
on public.avaliacoes_pediatricas;

create policy "Usuários autenticados acessam avaliações pediátricas"
on public.avaliacoes_pediatricas
for all
to authenticated
using (true)
with check (true);
