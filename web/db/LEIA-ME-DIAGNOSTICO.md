# Robô de diagnóstico do site

Este pacote adiciona testes automatizados com Playwright para verificar rotas, formulários, overlays, links OBS e vínculos básicos com o Supabase.

## Arquivos incluídos

```txt
package.json
playwright.config.ts
.env.test.example
tests/helpers/env.ts
tests/helpers/auth.ts
tests/helpers/diagnostics.ts
tests/e2e/diagnostico.spec.ts
tests/e2e/public-routes.spec.ts
tests/e2e/stream-overlays.spec.ts
tests/e2e/forms-smoke.spec.ts
tests/e2e/authenticated-editor.spec.ts
tests/e2e/supabase-data.spec.ts
.github/workflows/diagnostico.yml
```

## Instalação

Depois de copiar os arquivos para o projeto, rode no CMD:

```cmd
cd /d "C:\Users\Administrator\Desktop\meu-projeto-supabase"
npm install
npx playwright install chromium
```

## Rodar diagnóstico local

```cmd
npm run diagnostico
```

Se quiser testar as overlays:

```cmd
npm run diagnostico:overlays
```

Se quiser abrir o painel visual do Playwright:

```cmd
npm run test:e2e:ui
```

## Testar o site publicado na Vercel

No CMD, use:

```cmd
set TEST_BASE_URL=https://meu-projeto-supabase-nine.vercel.app
npm run diagnostico
npm run diagnostico:overlays
```

## Testar salvamento autenticado

Defina email e senha de uma conta de teste:

```cmd
set TEST_EMAIL=seu-email@email.com
set TEST_PASSWORD=sua-senha
npx playwright test tests/e2e/authenticated-editor.spec.ts
```

## Testar vínculo com Supabase

Defina as variáveis do Supabase:

```cmd
set NEXT_PUBLIC_SUPABASE_URL=SUA_URL
set NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_ANON_KEY
npm run diagnostico:db
```

O teste gera relatório em:

```txt
playwright-report/
test-results/
```

Para abrir o relatório:

```cmd
npm run test:e2e:report
```

## Enviar para o GitHub

```cmd
git add .
git commit -m "adiciona robo de diagnostico do site"
git push
```
