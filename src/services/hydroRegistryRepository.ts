import { defaultHydroRegistry } from '../data';
import { categoryOrder } from '../metadata';
import type { HydroRegistry } from '../types';
import { buildApiUrl } from './apiClient';
import { readAuthToken } from './authStorage';

const STORAGE_KEY = 'sighidro:hydro-registry:v1';

export type HydroRegistryRepository = {
  backend: 'localStorage' | 'api';
  load: () => Promise<HydroRegistry>;
  save: (registry: HydroRegistry) => Promise<void>;
};

const cloneDefaultRegistry = (): HydroRegistry => JSON.parse(JSON.stringify(defaultHydroRegistry)) as HydroRegistry;

const buildRegistryUrl = () => buildApiUrl('/api/registry');

const buildAuthHeader = () => {
  const token = readAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const normalizeRegistryPayload = (payload: unknown): HydroRegistry | null => {
  if (!isRecord(payload)) {
    return null;
  }

  const registryPayload =
    (isRecord(payload.registry) && payload.registry) || (isRecord(payload.data) && payload.data) || payload;

  return categoryOrder.reduce((registry, category) => {
    const records = (registryPayload as Record<string, unknown>)[category];
    registry[category] = Array.isArray(records) ? (records as HydroRegistry[typeof category]) : [];
    return registry;
  }, {} as HydroRegistry);
};

const readJsonPayload = async (response: Response) => {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
};

export const localHydroRegistryRepository: HydroRegistryRepository = {
  backend: 'localStorage',
  async load() {
    if (typeof window === 'undefined') {
      return cloneDefaultRegistry();
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return cloneDefaultRegistry();
    }

    try {
      const parsed = JSON.parse(stored) as Partial<HydroRegistry>;
      return categoryOrder.reduce((registry, category) => {
        registry[category] = Array.isArray(parsed[category]) ? parsed[category]! : [];
        return registry;
      }, {} as HydroRegistry);
    } catch {
      return cloneDefaultRegistry();
    }
  },
  async save(registry) {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(registry));
  },
};

export const apiHydroRegistryRepository: HydroRegistryRepository = {
  backend: 'api',
  async load() {
    const authHeader = buildAuthHeader();
    if (!authHeader || typeof window === 'undefined' || typeof fetch === 'undefined') {
      return localHydroRegistryRepository.load();
    }

    try {
      const response = await fetch(buildRegistryUrl(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          ...authHeader,
        },
      });

      if (!response.ok) {
        throw new Error(`API load failed with status ${response.status}`);
      }

      const payload = await readJsonPayload(response);
      const registry = normalizeRegistryPayload(payload);
      if (!registry) {
        return localHydroRegistryRepository.load();
      }

      await localHydroRegistryRepository.save(registry);
      return registry;
    } catch {
      return localHydroRegistryRepository.load();
    }
  },
  async save(registry) {
    await localHydroRegistryRepository.save(registry);

    const authHeader = buildAuthHeader();
    if (!authHeader || typeof window === 'undefined' || typeof fetch === 'undefined') {
      return;
    }

    try {
      const response = await fetch(buildRegistryUrl(), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...authHeader,
        },
        body: JSON.stringify(registry),
      });

      if (!response.ok) {
        throw new Error(`API save failed with status ${response.status}`);
      }
    } catch {
      return;
    }
  },
};

export const hydroRegistryRepository =
  import.meta.env.VITE_SIGHIDRO_BACKEND === 'api'
    ? apiHydroRegistryRepository
    : localHydroRegistryRepository;
