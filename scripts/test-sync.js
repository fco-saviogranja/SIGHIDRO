#!/usr/bin/env node

const base = 'http://127.0.0.1:4000';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const fetchJson = async (path, opts = {}) => {
  const res = await fetch(`${base}${path}`, opts);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
};

(async () => {
  try {
    console.log('Aguardando /api/health...');
    let healthy = false;
    for (let i = 0; i < 30; i++) {
      try {
        const r = await fetchJson('/api/health');
        if (r.status === 200) {
          console.log('Health OK:', r.data);
          healthy = true;
          break;
        }
      } catch (e) {
        // ignore
      }
      await sleep(1000);
    }

    if (!healthy) {
      console.error('Não foi possível contactar /api/health no tempo esperado. Abortando.');
      process.exit(2);
    }

    const email = `sighidro-e2e-${Date.now()}@example.com`;
    const password = 'Test12345';

    console.log('Tentando registrar usuário de teste:', email);
    const reg = await fetch(`${base}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    console.log('Register status', reg.status);

    console.log('Efetuando login...');
    const loginResp = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const loginJson = await loginResp.json().catch(() => null);
    console.log('Login status', loginResp.status, loginJson ? 'token-ok' : 'no-json');

    if (!loginResp.ok) {
      console.error('Login falhou, saindo.');
      process.exit(3);
    }

    const token = loginJson.token;
    console.log('Token recebido (abreviado):', token ? token.slice(0, 20) + '...' : 'nenhum');

    const payload = {
      'poço': [
        {
          id: 'e2e-1',
          code: 'POC-E2E-001',
          name: 'Teste E2E',
          category: 'poço',
          location: 'Teste automático',
          status: 'operando',
          responsible: 'Tester',
          flowRate: 1,
          latitude: -7.57,
          longitude: -39.28,
          lastReading: new Date().toISOString(),
          notes: 'Registro criado por script de teste',
        },
      ],
      bomba: [],
      'reservatório': [],
      localidade: [],
    };

    console.log('Enviando PUT /api/registry');
    const put = await fetch(`${base}/api/registry`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    console.log('PUT status', put.status);
    const putText = await put.text();
    console.log('PUT response', putText);

    console.log('Buscando GET /api/registry');
    const get = await fetch(`${base}/api/registry`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    const getJson = await get.json().catch(() => null);
    console.log('GET status', get.status, 'data keys:', getJson ? Object.keys(getJson).slice(0, 5) : 'no-json');
    console.log('GET payload excerpt', JSON.stringify(getJson).slice(0, 400));

    console.log('Teste concluído com sucesso.');
    process.exit(0);
  } catch (err) {
    console.error('Erro no teste:', err);
    process.exit(4);
  }
})();
