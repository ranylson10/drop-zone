import { expect, Page, TestInfo } from '@playwright/test';

type DiagnosticState = {
  consoleErrors: string[];
  pageErrors: string[];
  httpErrors: string[];
  failedRequests: string[];
};

const ignoredConsoleFragments = [
  'ResizeObserver loop',
  'favicon',
  'Hydration failed',
  'React DevTools',
  'Download the React DevTools',
  'Warning: Extra attributes from the server',
];

function isIgnored(message: string) {
  return ignoredConsoleFragments.some((fragment) =>
    message.toLowerCase().includes(fragment.toLowerCase()),
  );
}

function isIgnoredRequestFailure(url: string, errorText?: string | null) {
  return url.includes('_rsc=') && (errorText || '').includes('ERR_ABORTED');
}

export function attachDiagnostics(page: Page): DiagnosticState {
  const state: DiagnosticState = {
    consoleErrors: [],
    pageErrors: [],
    httpErrors: [],
    failedRequests: [],
  };

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!isIgnored(text)) state.consoleErrors.push(text);
    }
  });

  page.on('pageerror', (error) => {
    const text = error.message || String(error);
    if (!isIgnored(text)) state.pageErrors.push(text);
  });

  page.on('response', (response) => {
    const request = response.request();
    const resourceType = request.resourceType();
    const status = response.status();
    if (status >= 500 && ['document', 'xhr', 'fetch', 'script'].includes(resourceType)) {
      state.httpErrors.push(`${status} ${request.method()} ${response.url()}`);
    }
  });

  page.on('requestfailed', (request) => {
    const resourceType = request.resourceType();
    if (['document', 'xhr', 'fetch', 'script'].includes(resourceType)) {
      const errorText = request.failure()?.errorText || 'failed';
      if (!isIgnoredRequestFailure(request.url(), errorText)) {
        state.failedRequests.push(`${request.method()} ${request.url()} :: ${errorText}`);
      }
    }
  });

  return state;
}

export async function finishDiagnostics(state: DiagnosticState, testInfo: TestInfo, options?: { allowConsoleErrors?: boolean }) {
  await testInfo.attach('diagnostico', {
    body: JSON.stringify(state, null, 2),
    contentType: 'application/json',
  });

  expect(state.pageErrors, 'Erros JavaScript fatais na página').toEqual([]);
  expect(state.httpErrors, 'APIs/rotas com erro 500+').toEqual([]);
  expect(state.failedRequests, 'Requisições críticas falharam').toEqual([]);

  if (!options?.allowConsoleErrors) {
    expect(state.consoleErrors, 'Erros no console do navegador').toEqual([]);
  }
}

export async function expectPageUsable(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => null);
  await expect(page.locator('body')).toBeVisible();
  const bodyText = (await page.locator('body').innerText().catch(() => '')).trim();
  const imageCount = await page.locator('img').count().catch(() => 0);
  const canvasCount = await page.locator('canvas').count().catch(() => 0);
  expect(bodyText.length + imageCount + canvasCount, 'Página aparentemente vazia').toBeGreaterThan(0);
}
