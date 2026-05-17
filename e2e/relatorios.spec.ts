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

const seedReportDetails = async (page: Page) => {
  await page.evaluate(() => {
    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    window.localStorage.setItem(
      'sighidro:hydro-readings:v2',
      JSON.stringify([
        {
          assetId: 'pump-sp-17-10',
          createdAt: now,
          flowRate: 18,
          id: 'reading-report-e2e',
          notes: 'Leitura Relatório E2E',
          operatorName: 'Operador E2E',
          readingAt: now,
          reservoirLevel: 44,
        },
      ]),
    );

    window.localStorage.setItem(
      'sighidro:hydro-maintenance:v2',
      JSON.stringify([
        {
          assetId: 'pump-sp-17-10',
          createdAt: now,
          dueDate: today,
          id: 'maintenance-report-e2e',
          notes: 'OS Relatório E2E',
          responsible: 'Técnico de Campo',
          service: 'Relatório E2E Manutenção',
          status: 'aberta',
          updatedAt: now,
        },
      ]),
    );
  });
};

test('relatórios filtram dados e exportam arquivos', async ({ page }) => {
  await loginAsAdmin(page);
  await seedReportDetails(page);
  await page.goto('/relatorios');

  await expect(page.getByRole('heading', { name: 'Relatórios administrativos e operacionais' })).toBeVisible();
  await expect(page.locator('.reports-summary-panel')).toContainText('5 ativo(s), 1 leitura(s), 1 OS');

  await page.getByRole('button', { name: 'Operacional' }).click();
  await expect(page.locator('.reports-operational-table')).toContainText('Leitura Relatório E2E');
  await expect(page.locator('.reports-operational-table')).toContainText('18 m³/h');

  await page.getByRole('button', { name: 'Manutenção' }).click();
  await expect(page.locator('.reports-maintenance-table')).toContainText('Relatório E2E Manutenção');

  const filters = page.locator('.reports-tools');
  await filters.getByLabel('Busca').fill('BMB-012');
  await expect(page.locator('.reports-summary-panel')).toContainText('1 ativo(s), 1 leitura(s), 1 OS');

  const csvDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar CSV' }).click();
  expect((await csvDownload).suggestedFilename()).toBe('relatorio-manutencao.csv');
  await expect(page.getByText('CSV de manutenção exportado.')).toBeVisible();

  const jsonDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar JSON' }).click();
  expect((await jsonDownload).suggestedFilename()).toBe('relatorio-manutencao.json');
  await expect(page.getByText('JSON de manutenção exportado.')).toBeVisible();
});
