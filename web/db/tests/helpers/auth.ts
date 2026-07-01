import { expect, Page, test } from '@playwright/test';
import { appUrl, env, hasLoginCredentials } from './env';

export async function loginIfConfigured(page: Page) {
  test.skip(!hasLoginCredentials(), 'Defina TEST_EMAIL e TEST_PASSWORD para testar áreas autenticadas.');

  await page.goto(appUrl('/login'));
  await page.waitForLoadState('domcontentloaded');

  const emailInput = page.locator('input[type="email"], input[name*="email" i], input[placeholder*="email" i]').first();
  const passwordInput = page.locator('input[type="password"], input[name*="senha" i], input[placeholder*="senha" i], input[name*="password" i]').first();

  await expect(emailInput, 'Campo de email não encontrado no login').toBeVisible();
  await expect(passwordInput, 'Campo de senha não encontrado no login').toBeVisible();

  await emailInput.fill(env.email);
  await passwordInput.fill(env.password);

  const submit = page.getByRole('button', { name: /entrar|login|acessar|continuar/i }).first();
  await expect(submit, 'Botão de login não encontrado').toBeVisible();
  await Promise.all([
    page.waitForLoadState('networkidle').catch(() => null),
    submit.click(),
  ]);
}
