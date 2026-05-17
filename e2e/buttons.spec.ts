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

test('botões principais abrem modal, redirecionam e exportam', async ({ page }) => {
  await loginAsAdmin(page);

  await page.getByRole('button', { name: 'Abrir notificações' }).click();
  await expect(page.getByRole('heading', { name: 'Notificações operacionais' })).toBeVisible();
  await page.getByRole('link', { name: 'Abrir monitoramento' }).click();
  await page.waitForURL('**/monitoramento');
  await expect(page.getByRole('heading', { name: 'Leituras e indicadores conectados ao cadastro' })).toBeVisible();

  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Abrir menu do usuário' }).click();
  await page.getByRole('menuitem', { name: 'Configurações' }).click();
  await expect(page.getByRole('heading', { name: 'Configurações' })).toBeVisible();
  await page.getByRole('link', { name: 'Abrir cadastro' }).click();
  await page.waitForURL('**/cadastro');
  await expect(page.getByRole('heading', { name: 'Base real de ativos, leituras e manutenção' })).toBeVisible();

  await page.goto('/dashboard');
  await page.getByLabel('Abrir mapa operacional').click();
  await page.waitForURL('**/mapa');
  await expect(page.getByRole('heading', { name: 'Distribuição territorial dos ativos cadastrados' })).toBeVisible();

  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Aplicar filtros' }).click();
  await expect(page.getByText('Filtros aplicados para a sessão atual.')).toBeVisible();
  await page.getByRole('button', { name: 'Salvar visão' }).click();
  await expect(page.getByText('Visão salva neste navegador.')).toBeVisible();
  await page.getByRole('button', { name: 'Limpar' }).click();
  await expect(page.getByText('Filtros limpos.')).toBeVisible();

  const csvDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar' }).click();
  expect((await csvDownload).suggestedFilename()).toBe('sighidro-ativos.csv');

  const sheetDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Planilha' }).click();
  expect((await sheetDownload).suggestedFilename()).toBe('sighidro-planilha-ativos.tsv');
});
