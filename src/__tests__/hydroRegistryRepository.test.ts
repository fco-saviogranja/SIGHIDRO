import { describe, it, expect, beforeEach, vi } from 'vitest';
import { defaultHydroRegistry } from '../data';
import { localHydroRegistryRepository, apiHydroRegistryRepository } from '../services/hydroRegistryRepository';
import * as authStorage from '../services/authStorage';

describe('localHydroRegistryRepository', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('saves and loads registry from localStorage', async () => {
    await localHydroRegistryRepository.save(defaultHydroRegistry);
    const loaded = await localHydroRegistryRepository.load();
    expect(loaded.poço.length).toBeGreaterThan(0);
    expect(loaded).toEqual(defaultHydroRegistry);
  });
});

describe('apiHydroRegistryRepository', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('loads registry from API and persists locally', async () => {
    // mock auth token
    vi.spyOn(authStorage, 'readAuthToken').mockImplementation(() => 'fake-token');

    // mock fetch
    const fakeResponse = {
      ok: true,
      text: async () => JSON.stringify({ data: defaultHydroRegistry }),
    } as unknown as Response;

    // @ts-ignore
    global.fetch = vi.fn().mockResolvedValue(fakeResponse);

    const loaded = await apiHydroRegistryRepository.load();
    expect(loaded.poço.length).toBeGreaterThan(0);

    // localStorage should have been updated
    const stored = JSON.parse(window.localStorage.getItem('sighidro:hydro-registry:v1') || '{}');
    expect(stored.poço).toBeDefined();
  });
});
