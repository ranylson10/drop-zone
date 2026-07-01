# Backend Compartilhado

O backend compartilhado do sistema e a unica camada com regras sensiveis:

- autenticacao e validacao de sessao;
- permissoes e autorizacao;
- regras de negocio;
- pagamentos e webhooks;
- acesso administrativo ao Supabase;
- integracoes externas.

## Runtime atual

As rotas HTTP estao em `web/app/api` porque o projeto web ja e Next.js e hospeda as API Routes. Isso mantem uma unica hospedagem de backend para web e mobile:

```text
Web    -> https://seu-dominio.com/api/* -> Supabase
Mobile -> https://seu-dominio.com/api/* -> Supabase
```

## Contrato para clientes

Clientes devem chamar a API com JSON e, quando autenticados, enviar:

```http
Authorization: Bearer <access_token>
```

Chaves secretas como `SUPABASE_SERVICE_ROLE_KEY`, tokens de pagamento e segredos de webhook ficam somente no backend. Web e mobile podem usar apenas variaveis publicas quando necessario.

## Mobile

Quando `EXPO_PUBLIC_API_URL` esta configurado, o app mobile nao usa `supabase.from`, `supabase.rpc` ou `supabase.storage.upload` diretamente contra o Supabase. O arquivo `mobile/src/lib/supabase.ts` mantem a interface usada pelas telas, mas encaminha essas operacoes para:

- `POST /api/mobile/supabase/query`
- `POST /api/mobile/supabase/storage`

Essas rotas tem allowlist de tabelas, RPCs e buckets usados pelo app. O proxy usa `NEXT_PUBLIC_SUPABASE_ANON_KEY` com o `Authorization` do usuario quando existir, preservando RLS. Ele nao usa `SUPABASE_SERVICE_ROLE_KEY`.

Rotas com regras sensiveis novas devem ser criadas como endpoints especificos em `web/app/api`, em vez de ampliar regras no app mobile.
