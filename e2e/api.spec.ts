import { expect, test } from '@playwright/test';

test('API entrega séries operacionais e ordens de manutenção autenticadas', async ({ request }) => {
  const loginResponse = await request.post('http://127.0.0.1:4000/api/auth/login', {
    data: {
      email: 'admin@sighidro.gov.br',
      password: 'Admin@2026',
    },
  });
  expect(loginResponse.ok()).toBe(true);
  const login = await loginResponse.json() as { token: string };
  const headers = { Authorization: `Bearer ${login.token}` };

  const flowResponse = await request.get('http://127.0.0.1:4000/api/dashboard/flow-series?days=7', { headers });
  expect(flowResponse.ok()).toBe(true);
  const flow = await flowResponse.json() as {
    data: Array<{ date: string; readingCount: number; value: number }>;
    timeZone: string;
  };
  expect(flow.timeZone).toBe('America/Fortaleza');
  expect(flow.data).toHaveLength(7);
  expect(flow.data.every((point) => /^\d{4}-\d{2}-\d{2}$/.test(point.date))).toBe(true);
  expect(flow.data.every((point) => point.value >= 0 && point.readingCount >= 0)).toBe(true);

  const maintenanceResponse = await request.get('http://127.0.0.1:4000/api/maintenance', { headers });
  expect(maintenanceResponse.ok()).toBe(true);
  const maintenance = await maintenanceResponse.json() as { data: unknown[] };
  expect(Array.isArray(maintenance.data)).toBe(true);
});
