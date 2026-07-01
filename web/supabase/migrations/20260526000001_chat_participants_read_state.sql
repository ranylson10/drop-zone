alter table public.chat_participantes
drop constraint if exists chat_participantes_papel_check;

alter table public.chat_participantes
add constraint chat_participantes_papel_check
check (
  papel = any (
    array[
      'dono'::text,
      'admin'::text,
      'moderador'::text,
      'membro'::text,
      'organizador'::text,
      'produtora'::text,
      'staff'::text,
      'inscrito'::text
    ]
  )
);

drop policy if exists chat_participantes_select_conversa_compartilhada on public.chat_participantes;

create policy chat_participantes_select_conversa_compartilhada
on public.chat_participantes
for select
using (
  exists (
    select 1
    from public.chat_participantes meu_acesso
    where meu_acesso.conversa_id = chat_participantes.conversa_id
      and meu_acesso.user_id = auth.uid()
  )
);
