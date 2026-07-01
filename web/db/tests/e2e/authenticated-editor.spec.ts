import { test, expect } from '@playwright/test';
import { loginIfConfigured } from '../helpers/auth';
import { appUrl, env } from '../helpers/env';
import { attachDiagnostics, expectPageUsable, finishDiagnostics } from '../helpers/diagnostics';

test.describe('diagnóstico autenticado do editor', () => {
  test('salvar overlay não deve retornar Não autenticado', async ({ page }, testInfo) => {
    const diagnostics = attachDiagnostics(page);
    await loginIfConfigured(page);
    await page.goto(appUrl(`/stream/editor/${env.projectId}`));
    await expectPageUsable(page);

    const saveButton = page.getByRole('button', { name: /salvar|atualizar|aplicar/i }).first();
    await expect(saveButton, 'Botão de salvar/atualizar não encontrado').toBeVisible();

    const dialogs: string[] = [];
    page.on('dialog', async (dialog) => {
      dialogs.push(dialog.message());
      await dialog.accept();
    });

    await saveButton.click();
    await page.waitForTimeout(1500);

    expect(dialogs.join('\n')).not.toMatch(/não autenticado|nao autenticado/i);
    await finishDiagnostics(diagnostics, testInfo, { allowConsoleErrors: true });
  });
});
