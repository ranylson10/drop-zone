alter table public.campeonatos
add column if not exists whatsapp_contatos jsonb not null default '[]'::jsonb;

comment on column public.campeonatos.whatsapp_contatos is
  'Lista de contatos de WhatsApp para compra de vaga. Formato: [{ "nome": "...", "numero": "..." }], maximo recomendado: 3.';
