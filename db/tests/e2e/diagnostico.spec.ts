import { test, expect } from '@playwright/test';
import { appUrl, env } from '../helpers/env';
import { attachDiagnostics, expectPageUsable, finishDiagnostics } from '../helpers/diagnostics';

const criticalRoutes = [
  '/',
  '/login',
  '/campeonatos',
  '/stream/projects',
  `/stream/render/${process.env.STREAM_OVERLAY_ID || ''}`,
].filter((route) => !route.endsWith('/'));

test.describe('diagnóstico rápido geral', () => {
  test('rotas principais não quebram com erro 500 ou tela vazia', async ({ page }, testInfo) => {
    const diagnostics = attachDiagnostics(page);
    const results: Array<{ route: string; status?: number; title?: string }> = [];

    for (const route of criticalRoutes) {
      const response = await page.goto(appUrl(route));
      await expectPageUsable(page);
      results.push({ route, status: response?.status(), title: await page.title().catch(() => '') });
      expect(response?.status() || 200, `Status HTTP em ${route}`).toBeLessThan(500);
    }

    await testInfo.attach('rotas-testadas', {
      body: JSON.stringify(results, null, 2),
      contentType: 'application/json',
    });
    await finishDiagnostics(diagnostics, testInfo, { allowConsoleErrors: true });
  });

  test('editor de overlays abre e mostra área de edição', async ({ page }, testInfo) => {
    const diagnostics = attachDiagnostics(page);
    const response = await page.goto(appUrl(`/stream/editor/${env.projectId}`));
    expect(response?.status() || 200).toBeLessThan(500);
    await expectPageUsable(page);

    const body = page.locator('body');
    await expect(body).toContainText(/overlay|editor|preview|tabela|mvp/i);
    await finishDiagnostics(diagnostics, testInfo, { allowConsoleErrors: true });
  });
});
