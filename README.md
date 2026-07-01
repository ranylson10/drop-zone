# Meu Sistema

Monorepo com um backend/API central, um frontend web e um app mobile.

## Estrutura

```text
backend/
web/
mobile/
```

- `web/`: site Next.js, painel administrativo, formulários e rotas API em `web/app/api`.
- `mobile/`: app Expo/React Native consumindo a mesma API via `EXPO_PUBLIC_API_URL`.
- `backend/`: contratos, convenções e configuração do backend compartilhado. Hoje o runtime do backend está nas API Routes do Next em `web/app/api`.

## Rodar

```bash
npm run dev:web
npm run dev:mobile
```

No emulador Android, use uma URL acessível pelo dispositivo para a API, por exemplo:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000
```

Em produção, `EXPO_PUBLIC_API_URL` deve apontar para o domínio onde o backend/API está hospedado.
