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
