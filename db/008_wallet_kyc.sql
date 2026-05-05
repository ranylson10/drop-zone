create table if not exists wallet_kyc (
  user_id uuid primary key references profiles(id) on delete cascade,
  status text default 'nao_iniciado',
  tipo_verificacao text default 'basica',
  nome_completo text,
  cpf text,
  telefone text,
  data_nascimento date,
  maioridade_confirmada boolean default false,
  termos_aceitos boolean default false,
  documento_frente_url text,
  documento_verso_url text,
  selfie_url text,
  documento_status text default 'nao_enviado',
  selfie_status text default 'nao_enviada',
  motivo_reprovacao text,
  analisado_por uuid,
  verificado_em timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_wallet_kyc_status on wallet_kyc(status);
create unique index if not exists idx_wallet_kyc_cpf_unique on wallet_kyc(cpf) where cpf is not null;

insert into wallet_saldo (user_id, saldo, saldo_retido)
select user_id, 0, 0
from usuarios_pagamento up
where not exists (
  select 1 from wallet_saldo ws where ws.user_id = up.user_id
);

insert into wallet_kyc (user_id, status, nome_completo, cpf, created_at, updated_at)
select
  up.user_id,
  'rascunho',
  up.nome,
  up.cpf,
  now(),
  now()
from usuarios_pagamento up
where not exists (
  select 1 from wallet_kyc wk where wk.user_id = up.user_id
);
