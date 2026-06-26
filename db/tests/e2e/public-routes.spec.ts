import { test, expect } from '@playwright/test';
import { appUrl } from '../helpers/env';
import { attachDiagnostics, expectPageUsable, finishDiagnostics } from '../helpers/diagnostics';

const routes = [
  '/',
  '/login',
  '/cadastro',
  '/campeonatos',
  '/ranking',
  '/stream',
  '/stream/projects',
];

test.describe('diagnóstico de rotas públicas', () => {
  for (const route of routes) {
    test(`rota pública carrega sem erro: ${route}`, async ({ page }, testInfo) => {
      const diagnostics = attachDiagnostics(page);
      const response = await page.goto(appUrl(route));
      expect(response?.status(), `Status HTTP inesperado em ${route}`).toBeLessThan(500);
      await expectPageUsable(page);
      await finishDiagnostics(diagnostics, testInfo, { allowConsoleErrors: true });
    });
  }
});
