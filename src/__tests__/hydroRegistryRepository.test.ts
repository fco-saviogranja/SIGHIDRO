import { describe, it, expect, beforeEach, vi } from 'vitest';
import { defaultHydroRegistry } from '../data';
import { localHydroRegistryRepository, apiHydroRegistryRepository } from '../services/hydroRegistryRepository';
import * as authStorage from '../services/authStorage';

describe('localHydroRegistryRepository', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('loads and mutates assets from localStorage', async () => {
    const loaded = await localHydroRegistryRepository.loadAssets();
    expect(loaded.some((asset) => asset.category === 'poço')).toBe(true);

    const created = await localHydroRegistryRepository.createAsset('poço', {
      name: 'Poço Teste',
      location: 'Zona Teste',
      status: 'operando',
      responsible: 'Operador Hidráulico',
      flowRate: 10,
      lastReading: 'agora',
      notes: '',
    });

    expect(created.code).toMatch(/^POC-/);
    const afterCreate = await localHydroRegistryRepository.loadAssets({ q: 'Poço Teste' });
    expect(afterCreate).toHaveLength(1);
  });

  it('builds the current daily flow from persisted readings and assets', async () => {
    const asset = await localHydroRegistryRepository.createAsset('poço', {
      flowRate: 10,
      lastReading: 'agora',
      location: 'Zona Teste',
      name: 'Poço de vazão',
      notes: '',
      responsible: 'Operador Hidráulico',
      status: 'operando',
    });

    await localHydroRegistryRepository.createReading(asset.id, {
      flowRate: 25,
      notes: 'Leitura atual',
      operatorName: 'Operador Hidráulico',
      readingAt: new Date().toISOString(),
    });

    const assets = await localHydroRegistryRepository.loadAssets();
    const expectedCurrentFlow = assets
      .filter((item) => item.category === 'poço' || item.category === 'reservatório')
      .reduce((total, item) => total + Number(item.flowRate || 0), 0);
    const series = await localHydroRegistryRepository.loadFlowSeries();

    expect(series).toHaveLength(7);
    expect(series.at(-1)?.value).toBe(expectedCurrentFlow);
    expect(series.at(-1)?.readingCount).toBe(1);
  });
});

describe('apiHydroRegistryRepository', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('loads assets from API and persists locally', async () => {
    vi.spyOn(authStorage, 'readAuthToken').mockImplementation(() => 'fake-token');

    const assets = Object.values(defaultHydroRegistry).flat();
    const fakeResponse = {
      ok: true,
      text: async () => JSON.stringify({ data: assets }),
    } as unknown as Response;

    global.fetch = vi.fn().mockResolvedValue(fakeResponse);

    const loaded = await apiHydroRegistryRepository.loadAssets();
    expect(loaded.some((asset) => asset.category === 'poço')).toBe(true);

    const stored = JSON.parse(window.localStorage.getItem('sighidro:hydro-assets:v2') || '[]');
    expect(stored.length).toBeGreaterThan(0);
  });
});
