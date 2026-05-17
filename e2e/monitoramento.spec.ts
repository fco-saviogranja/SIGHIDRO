import { expect, test, type Page } from '@playwright/test';

const loginAsAdmin = async (page: Page) => {
  await page.goto('/login');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();

  await page.fill('input[type="email"]', 'admin@sighidro.gov.br');
  await page.fill('input[type="password"]', 'Admin@2026');
  await page.click('button:has-text("Entrar")');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
};

test('monitoramento registra leitura e atualiza painel operacional', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/monitoramento');

  await expect(page.getByRole('heading', { name: 'Telemetria, alertas e leituras dos ativos hídricos' })).toBeVisible();

  const readingPanel = page.locator('.monitoring-reading-panel');
  await expect(readingPanel.getByRole('heading', { name: 'Bomba SP 17-10' })).toBeVisible();

  await readingPanel.getByLabel('Vazão').fill('18');
  await readingPanel.getByLabel('Observação').fill('Leitura E2E Monitoramento');
  await readingPanel.getByRole('button', { name: 'Registrar leitura' }).click();

  await expect(page.getByText('Leitura de BMB-012 registrada no monitoramento.')).toBeVisible();
  await expect(page.locator('.mini-table').filter({ hasText: 'Leitura E2E Monitoramento' })).toBeVisible();
  await expect(page.locator('.monitoring-table-panel .asset-row').filter({ hasText: 'BMB-012' })).toContainText('18 m³/h');
});
