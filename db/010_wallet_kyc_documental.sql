alter table wallet_kyc
add column if not exists tipo_documento text,
add column if not exists numero_documento text,
add column if not exists orgao_emissor text,
add column if not exists uf_documento text,
add column if not exists data_emissao_documento date,
add column if not exists documento_frente_url text,
add column if not exists documento_verso_url text,
add column if not exists selfie_url text;

insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', true)
on conflict (id) do nothing;
