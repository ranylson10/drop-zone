alter table wallet_kyc
add column if not exists score_verificacao integer,
add column if not exists resultado_automatico text,
add column if not exists flags_risco jsonb,
add column if not exists revisao_manual_necessaria boolean default false;
