# Drop Zone App - Expo / React Native

Aplicativo nativo do Drop Zone, dentro do monorepo e consumindo o backend central.

## Telas

- Login
- Recuperacao de conta
- Criacao de conta
- Campeonatos
- Equipes
- Jogadores
- Calendario
- Feed
- Chat
- Carteira

## Configurar ambiente

Crie um arquivo `.env` na pasta `mobile` copiando `.env.example`:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000
EXPO_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=SUA_ANON_KEY
```

Com `EXPO_PUBLIC_API_URL` configurado, consultas, RPCs e uploads usados pelas telas passam pelo backend central. A URL e a chave publica do Supabase ficam no app apenas para autenticacao, sessao, links publicos e Realtime.

Nunca coloque `SUPABASE_SERVICE_ROLE_KEY` no app.

## Rodar no celular ou emulador

```bash
npm install
npm run android
```

## Gerar APK de teste

```bash
npm install -g eas-cli
npx eas login
npx eas build:configure
npx eas build -p android --profile preview
```
