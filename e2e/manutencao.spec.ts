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

test('manutenção abre, prioriza e conclui ordem de serviço', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/manutencao');

  await expect(page.getByRole('heading', { name: 'Ordens de serviço, prazos e triagem técnica' })).toBeVisible();

  const workPanel = page.locator('.maintenance-work-panel');
  await expect(workPanel.locator('.maintenance-asset-summary')).toContainText('Bomba SP 17-10');

  await workPanel.getByLabel('Serviço').fill('Troca E2E de rolamento');
  await workPanel.getByLabel('Observação').fill('OS E2E manutenção');
  await workPanel.getByLabel('Status').selectOption('em_andamento');
  await workPanel.getByRole('button', { name: 'Abrir OS' }).click();

  await expect(page.getByText('OS de BMB-012 aberta na manutenção.')).toBeVisible();
  await expect(page.locator('.maintenance-queue-card').filter({ hasText: 'Troca E2E de rolamento' })).toBeVisible();

  await workPanel.getByRole('button', { name: 'Concluir' }).click();

  await expect(page.getByText('OS concluída para BMB-012.')).toBeVisible();
  await expect(page.locator('.maintenance-history-table').filter({ hasText: 'Troca E2E de rolamento' })).toContainText('Concluída');
  await expect(workPanel.locator('.maintenance-asset-summary')).toContainText('Operando');
});
