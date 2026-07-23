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

const createWell = async (
  page: Page,
  record: {
    flowRate?: string;
    latitude?: string;
    location: string;
    longitude?: string;
    name: string;
    status?: string;
  },
) => {
  const form = page.locator('form.registry-form');
  await form.getByLabel('Nome', { exact: true }).fill(record.name);
  await form.getByLabel('Localização / setor').fill(record.location);
  await form.getByLabel('Status').selectOption(record.status ?? 'atenção');
  await form.getByLabel('Vazão atual (m³/h)').fill(record.flowRate ?? '42');
  await form.getByLabel('Latitude').fill(record.latitude ?? '-7.571111');
  await form.getByLabel('Longitude').fill(record.longitude ?? '-39.281111');
  await form.getByRole('button', { name: 'Cadastrar Poço' }).click();
};

const readStoredWells = async (page: Page) =>
  page.evaluate(() => {
    const stored = window.localStorage.getItem('sighidro:hydro-registry:v1');
    const parsed = stored ? JSON.parse(stored) : null;
    return parsed?.poço ?? [];
  });

test('cadastro de poço persiste e aparece no dashboard', async ({ page }) => {
  const assetName = `Poço E2E ${Date.now()}`;
  const locationName = 'Zona E2E - Teste';

  await loginAsAdmin(page);
  await page.goto('/cadastro');

  await expect(page.getByText('Identificação exibida nas listas, no mapa e nos relatórios.')).toBeVisible();
  await expect(page.getByText('Volume de água movimentado por hora; alimenta os indicadores de vazão.')).toBeVisible();

  await createWell(page, { name: assetName, location: locationName });

  const registryRow = page.locator('.registry-table .registry-row').filter({ hasText: assetName });
  await expect(registryRow).toBeVisible();

  const storedWells = await readStoredWells(page);

  expect(storedWells.some((record: { name?: string }) => record.name === assetName)).toBe(true);

  await page.goto('/dashboard');
  const dashboardRow = page.locator('.asset-table .asset-row').filter({ hasText: assetName });
  await expect(dashboardRow).toBeVisible();
  await expect(dashboardRow).toContainText(locationName);
  await expect(dashboardRow).toContainText('42 m³/h');
});

test('cadastro registra leitura e manutenção vinculada ao ativo', async ({ page }) => {
  const assetName = `Poço Completo ${Date.now()}`;

  await loginAsAdmin(page);
  await page.goto('/cadastro');
  await createWell(page, { name: assetName, location: 'Zona Completa E2E' });

  await page.locator('.registry-table .registry-row').filter({ hasText: assetName }).click();
  await page.getByLabel('Vazão', { exact: true }).fill('66');
  await page.getByLabel('Nível', { exact: true }).fill('73');
  await page.getByLabel('Operador', { exact: true }).fill('Operador E2E');
  await page.getByRole('button', { name: 'Registrar leitura' }).click();
  await expect(page.locator('.mini-table').filter({ hasText: '66 m³/h' })).toBeVisible();

  await page.goto('/dashboard');
  const flowPanel = page.locator('.chart-panel').filter({ hasText: 'Vazão hídrica diária' });
  await expect(flowPanel).toContainText('293 m³/h');
  await expect(flowPanel).toContainText('1 leitura(s) registrada(s) hoje');

  await page.goto('/cadastro');
  await page.locator('.registry-table .registry-row').filter({ hasText: assetName }).click();

  await page.getByLabel('Serviço').fill('Inspeção E2E');
  await page.getByRole('button', { name: 'Abrir OS' }).click();
  await expect(page.locator('.maintenance-mini-table').filter({ hasText: 'Inspeção E2E' })).toBeVisible();
});

test('edição e exclusão de poço atualizam cadastro e persistência local', async ({ page }) => {
  const timestamp = Date.now();
  const originalName = `Poço Editável ${timestamp}`;
  const editedName = `Poço Editado ${timestamp}`;

  await loginAsAdmin(page);
  await page.goto('/cadastro');
  await createWell(page, {
    name: originalName,
    location: 'Zona Original E2E',
    flowRate: '21',
    status: 'atenção',
  });

  await page.getByRole('button', { name: `Editar ${originalName}` }).click();
  const form = page.locator('form.registry-form');
  await form.getByLabel('Nome', { exact: true }).fill(editedName);
  await form.getByLabel('Localização / setor').fill('Zona Editada E2E');
  await form.getByLabel('Status').selectOption('parado');
  await form.getByLabel('Vazão atual (m³/h)').fill('55');
  await form.getByLabel('Latitude').fill('-7.572222');
  await form.getByLabel('Longitude').fill('-39.282222');
  await form.getByRole('button', { name: 'Salvar alterações' }).click();

  const editedRegistryRow = page.locator('.registry-table .registry-row').filter({ hasText: editedName });
  await expect(editedRegistryRow).toBeVisible();
  await expect(editedRegistryRow).toContainText('Parado');
  await expect(editedRegistryRow).toContainText('55 m³/h');

  let storedWells = await readStoredWells(page);
  expect(storedWells.some((record: { name?: string }) => record.name === originalName)).toBe(false);
  expect(
    storedWells.some(
      (record: { flowRate?: number; latitude?: number; longitude?: number; name?: string; status?: string }) =>
        record.name === editedName &&
        record.status === 'parado' &&
        record.flowRate === 55 &&
        record.latitude === -7.572222 &&
        record.longitude === -39.282222,
    ),
  ).toBe(true);

  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain(editedName);
    await dialog.accept();
  });
  await page.getByRole('button', { name: `Excluir ${editedName}` }).click();

  await expect(editedRegistryRow).toHaveCount(0);
  storedWells = await readStoredWells(page);
  expect(storedWells.some((record: { name?: string }) => record.name === editedName)).toBe(false);
});
