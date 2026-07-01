create or replace function public.chat_usuario_participa_conversa(
  p_conversa_id uuid,
  p_user_id uuid
)
returns boolean
language sql
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.chat_participantes cp
    where cp.conversa_id = p_conversa_id
      and cp.user_id = p_user_id
  );
$$;

drop policy if exists chat_participantes_select_conversa_compartilhada on public.chat_participantes;

create policy chat_participantes_select_conversa_compartilhada
on public.chat_participantes
for select
using (
  public.chat_usuario_participa_conversa(conversa_id, auth.uid())
);
