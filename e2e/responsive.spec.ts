import { expect, test, type Page } from '@playwright/test';

const loginAsAdmin = async (page: Page) => {
  await page.goto('/login');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.fill('input[type="email"]', 'admin@sighidro.gov.br');
  await page.fill('input[type="password"]', 'Admin@2026');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
};

const expectNoDocumentOverflow = async (page: Page) => {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
};

test('landing e login se adaptam ao viewport sem conteúdo cortado', async ({ page }) => {
  const viewportWidth = page.viewportSize()?.width ?? 1280;

  await page.goto('/');
  await expectNoDocumentOverflow(page);

  const landingMenu = page.getByRole('button', { name: 'Abrir menu' });
  if (viewportWidth <= 820) {
    await expect(landingMenu).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Navegação pública' })).toBeHidden();
    await landingMenu.click();
    await expect(page.getByRole('navigation', { name: 'Navegação pública' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Acessar Sistema', exact: true }).first()).toHaveCSS('min-height', '44px');
    const learnMoreBox = await page.getByRole('link', { name: 'Saiba mais' }).first().boundingBox();
    expect(learnMoreBox?.height).toBeGreaterThanOrEqual(44);
  } else {
    await expect(landingMenu).toBeHidden();
  }

  await page.goto('/login');
  await expectNoDocumentOverflow(page);

  if (viewportWidth <= 640 || (page.viewportSize()?.height ?? 1000) <= 500) {
    await expect(page.locator('.auth-intro')).toBeHidden();
    await expect(page.locator('.auth-card')).toHaveCSS('min-height', `${page.viewportSize()?.height}px`);
  }

  if (viewportWidth <= 900) {
    for (const input of await page.locator('.auth-login-card input').all()) {
      expect(Number.parseFloat(await input.evaluate((element) => getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
    }
  }
});

test('área autenticada mantém menu, formulários e tabelas utilizáveis no mobile', async ({ page }) => {
  const viewportWidth = page.viewportSize()?.width ?? 1280;
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });

  await loginAsAdmin(page);
  await expectNoDocumentOverflow(page);

  await page.locator('.filters-grid select').first().selectOption('poço');
  await page.getByRole('button', { name: 'Aplicar filtros' }).click();
  await expect(page.getByRole('status').filter({ hasText: /ativo\(s\) encontrado\(s\)/ })).toBeVisible();
  const filteredCategories = page.locator('.asset-row:not(.table-head) [data-label="Categoria"]');
  expect(await filteredCategories.count()).toBeGreaterThan(0);
  for (const category of await filteredCategories.all()) {
    await expect(category).toHaveText('Poço');
  }
  await page.getByRole('button', { name: 'Limpar' }).click();

  if (viewportWidth <= 640) {
    await expect(page.getByRole('button', { name: 'Abrir notificações' })).toBeHidden();
    const menuButton = page.getByRole('button', { name: 'Abrir menu' });
    const menuButtonBox = await menuButton.boundingBox();
    expect(menuButtonBox?.width).toBeGreaterThanOrEqual(44);
    expect(menuButtonBox?.height).toBeGreaterThanOrEqual(44);
    await menuButton.click();
    await expect(page.getByRole('heading', { name: 'Menu principal' })).toBeAttached();
    await expect(page.getByRole('button', { name: 'Notificações' })).toBeVisible();
    await page.getByRole('button', { name: 'Fechar' }).click();
  }

  await page.goto('/cadastro');
  await expect(page.getByRole('heading', { name: /Base real de ativos/i })).toBeVisible();
  await expectNoDocumentOverflow(page);

  if (viewportWidth <= 900) {
    for (const formGrid of await page.locator('.form-grid').all()) {
      const formColumns = await formGrid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length);
      expect(formColumns).toBe(1);
    }

    for (const field of await page.locator('.registry-form input, .registry-form select, .registry-form textarea').all()) {
      expect(Number.parseFloat(await field.evaluate((element) => getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
    }
  }

  const nativeOptionColors = await page.locator('.registry-form select option').first().evaluate((element) => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, color: style.color };
  });
  expect(nativeOptionColors.background).not.toBe(nativeOptionColors.color);

  if (viewportWidth <= 900) {
    const registryCard = page.locator('.registry-row:not(.table-head)').first();
    await expect(registryCard).toBeVisible();
    expect(await registryCard.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBeGreaterThanOrEqual(1);
    await expect(registryCard.locator('[data-card-title]')).toHaveAttribute('data-label', 'Nome');
  }

  for (const route of ['/dashboard', '/monitoramento', '/manutencao', '/mapa', '/relatorios']) {
    await page.goto(route);
    await page.locator('main').waitFor();
    await expectNoDocumentOverflow(page);

    if (viewportWidth <= 900) {
      const firstCard = page.locator('.asset-row:not(.table-head)').first();
      if (await firstCard.count()) {
        await expect(firstCard.locator('[data-card-title]')).toBeVisible();
      }
    }
  }

  expect(consoleErrors).toEqual([]);
});

test('modal de usuários cabe na tela e o formulário responde ao teclado mobile', async ({ page }) => {
  const viewport = page.viewportSize();
  test.skip(!viewport || viewport.width > 640, 'Fluxo específico para celular em modo retrato.');

  await loginAsAdmin(page);
  await page.getByRole('button', { name: 'Abrir menu' }).click();
  await page.getByRole('button', { name: 'Gerenciar usuários' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const dialogBox = await dialog.boundingBox();
  expect(dialogBox?.height).toBeLessThanOrEqual((viewport?.height ?? 0) - 12);

  await page.getByRole('button', { name: 'Novo Usuário' }).click();
  await page.getByRole('button', { name: 'Cadastrar', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Nome é obrigatório' })).toBeVisible();
  await expect(page.getByRole('alert').filter({ hasText: 'Email é obrigatório' })).toBeVisible();

  await page.getByLabel('Nome Completo').fill('Usuário Mobile');
  await page.getByLabel('Email').fill('mobile@sighidro.gov.br');
  await page.getByLabel('Email').press('Enter');
  await expect(page.getByText('Usuário Mobile')).toBeVisible();
  await expectNoDocumentOverflow(page);
});
