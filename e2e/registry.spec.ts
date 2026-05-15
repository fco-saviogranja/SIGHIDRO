import { expect, test, type Page } from '@playwright/test';

const registerAndLogin = async (page: Page) => {
  const email = `registry-${Date.now()}@example.com`;
  const password = 'Test12345';

  await page.goto('/login');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();

  await page.click('button.auth-toggle');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button:has-text("Criar conta")');
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
  await page.getByLabel('Nome', { exact: true }).fill(record.name);
  await page.getByLabel('Localização / setor').fill(record.location);
  await page.getByLabel('Status').selectOption(record.status ?? 'atenção');
  await page.getByLabel('Vazão atual (m³/h)').fill(record.flowRate ?? '42');
  await page.getByLabel('Latitude').fill(record.latitude ?? '-7.571111');
  await page.getByLabel('Longitude').fill(record.longitude ?? '-39.281111');
  await page.getByRole('button', { name: 'Cadastrar Poço' }).click();
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

  await registerAndLogin(page);
  await page.goto('/cadastro');

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

test('edição e exclusão de poço atualizam cadastro e persistência local', async ({ page }) => {
  const timestamp = Date.now();
  const originalName = `Poço Editável ${timestamp}`;
  const editedName = `Poço Editado ${timestamp}`;

  await registerAndLogin(page);
  await page.goto('/cadastro');
  await createWell(page, {
    name: originalName,
    location: 'Zona Original E2E',
    flowRate: '21',
    status: 'atenção',
  });

  await page.getByRole('button', { name: `Editar ${originalName}` }).click();
  await page.getByLabel('Nome', { exact: true }).fill(editedName);
  await page.getByLabel('Localização / setor').fill('Zona Editada E2E');
  await page.getByLabel('Status').selectOption('parado');
  await page.getByLabel('Vazão atual (m³/h)').fill('55');
  await page.getByLabel('Latitude').fill('-7.572222');
  await page.getByLabel('Longitude').fill('-39.282222');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();

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
