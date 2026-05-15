import { test, expect } from '@playwright/test';

test('registro e login redirecionam para dashboard', async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;
  const password = 'Test12345';

  await page.goto('/login');

  // mudar para modo register
  await page.click('button.auth-toggle');

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  await page.click('button:has-text("Criar conta")');

  // aguardar redirecionamento para /dashboard
  await page.waitForURL('**/dashboard', { timeout: 10000 });

  // verificar texto do dashboard
  await expect(page.getByText('Centro de Inteligência Hídrica Municipal')).toBeVisible();
});
