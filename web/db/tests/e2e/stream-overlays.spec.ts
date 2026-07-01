import { test, expect } from '@playwright/test';
import { appUrl, env } from '../helpers/env';
import { attachDiagnostics, expectPageUsable, finishDiagnostics } from '../helpers/diagnostics';

const overlayTypes = [
  'tabela-geral',
  'mvp-geral',
  'tabela-dia',
  'mvp-dia',
  'tabela-queda',
  'mvp-queda',
  'booyahs-dia',
  'countdown',
  'agradecimentos',
];

async function assertOverlayHasContent(page: import('@playwright/test').Page) {
  await expectPageUsable(page);
  const text = (await page.locator('body').innerText().catch(() => '')).trim();
  const images = await page.locator('img').count().catch(() => 0);
  const nodes = await page.locator('body *').count().catch(() => 0);
  expect(text.length + images + nodes, 'Overlay sem conteúdo visual detectável').toBeGreaterThan(3);
}

test.describe('diagnóstico das overlays e OBS', () => {
  for (const type of overlayTypes) {
    test(`link OBS renderiza overlay: ${type}`, async ({ page }, testInfo) => {
      const diagnostics = attachDiagnostics(page);
      const response = await page.goto(appUrl(`/stream/overlay/${env.streamKey}/${type}`));
      expect(response?.status() || 200, `Status HTTP inesperado em overlay ${type}`).toBeLessThan(500);
      await assertOverlayHasContent(page);
      await page.screenshot({ path: `test-results/overlay-${type}.png`, fullPage: true });
      await finishDiagnostics(diagnostics, testInfo, { allowConsoleErrors: true });
    });
  }

  test('editor lista overlays principais e permite selecionar', async ({ page }, testInfo) => {
    const diagnostics = attachDiagnostics(page);
    await page.goto(appUrl(`/stream/editor/${env.projectId}`));
    await expectPageUsable(page);

    const body = page.locator('body');
    await expect(body).toContainText(/tabela geral/i);
    await expect(body).toContainText(/mvp geral/i);

    const tabela = page.getByText(/tabela geral/i).first();
    await tabela.click().catch(() => null);
    await expect(body).toContainText(/colunas|rank|pontos|kill/i);

    await finishDiagnostics(diagnostics, testInfo, { allowConsoleErrors: true });
  });
});
