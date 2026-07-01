import { test, expect } from '@playwright/test';
import { appUrl } from '../helpers/env';
import { attachDiagnostics, expectPageUsable, finishDiagnostics } from '../helpers/diagnostics';

const formRoutes = [
  '/login',
  '/cadastro',
  '/equipe/nova',
  '/campeonatos/nova',
  '/produtora/nova',
];

test.describe('diagnóstico básico de formulários', () => {
  for (const route of formRoutes) {
    test(`formulário não quebra: ${route}`, async ({ page }, testInfo) => {
      const diagnostics = attachDiagnostics(page);
      const response = await page.goto(appUrl(route));
      expect(response?.status() || 200, `Status HTTP inesperado em ${route}`).toBeLessThan(500);
      await expectPageUsable(page);

      const buttons = page.getByRole('button');
      const buttonCount = await buttons.count();
      expect(buttonCount, `Nenhum botão encontrado em ${route}`).toBeGreaterThan(0);

      await finishDiagnostics(diagnostics, testInfo, { allowConsoleErrors: true });
    });
  }
});
