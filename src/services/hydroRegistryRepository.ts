import { defaultHydroRegistry } from '../data';
import { categoryMeta, categoryOrder } from '../metadata';
import type {
  AssetCategory,
  DailyFlowPoint,
  InternalProfile,
  HydroAsset,
  HydroAssetDraft,
  HydroAssetReading,
  HydroAssetReadingDraft,
  OperationalStatus,
  MaintenanceOrder,
  MaintenanceOrderDraft,
} from '../types';
import { buildApiUrl } from './apiClient';
import { readAuthToken } from './authStorage';

const STORAGE_KEY = 'sighidro:hydro-assets:v2';
const READINGS_KEY = 'sighidro:hydro-readings:v2';
const MAINTENANCE_KEY = 'sighidro:hydro-maintenance:v2';
const BUSINESS_TIME_ZONE = 'America/Fortaleza';

type AssetFilters = {
  category?: AssetCategory | 'all';
  location?: string;
  q?: string;
  responsible?: string;
  status?: string;
};

export type HydroRegistryRepository = {
  backend: 'localStorage' | 'api';
  createAsset: (category: AssetCategory, draft: HydroAssetDraft) => Promise<HydroAsset>;
  createMaintenance: (assetId: string, draft: MaintenanceOrderDraft) => Promise<MaintenanceOrder>;
  createReading: (assetId: string, draft: HydroAssetReadingDraft) => Promise<HydroAssetReading>;
  deleteAsset: (id: string) => Promise<void>;
  exportAssetsCsv: (filters?: AssetFilters) => Promise<string>;
  loadAllMaintenance: () => Promise<MaintenanceOrder[]>;
  loadAssets: (filters?: AssetFilters) => Promise<HydroAsset[]>;
  loadFlowSeries: (days?: number) => Promise<DailyFlowPoint[]>;
  loadMaintenance: (assetId: string) => Promise<MaintenanceOrder[]>;
  loadReadings: (assetId: string) => Promise<HydroAssetReading[]>;
  resetLocal: () => Promise<HydroAsset[]>;
  updateAsset: (id: string, draft: Partial<HydroAssetDraft>) => Promise<HydroAsset>;
  updateMaintenance: (assetId: string, orderId: string, draft: Partial<MaintenanceOrderDraft>) => Promise<MaintenanceOrder>;
};

const cloneDefaultAssets = (): HydroAsset[] =>
  categoryOrder.flatMap((category) => defaultHydroRegistry[category]).map((asset) => ({ ...asset }));

const makeId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const toRegistry = (assets: HydroAsset[]) =>
  categoryOrder.reduce((registry, category) => {
    registry[category] = assets.filter((asset) => asset.category === category);
    return registry;
  }, {} as Record<AssetCategory, HydroAsset[]>);

const getNextCode = (category: AssetCategory, assets: HydroAsset[]) => {
  const prefix = categoryMeta[category].prefix;
  const nextNumber =
    assets
      .filter((asset) => asset.category === category)
      .reduce((max, asset) => {
        const current = Number(asset.code.replace(/\D/g, ''));
        return Number.isFinite(current) ? Math.max(max, current) : max;
      }, 0) + 1;

  return `${prefix}-${String(nextNumber).padStart(3, '0')}`;
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

const buildAuthHeader = () => {
  const token = readAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : null;
};

const normalizeAsset = (value: unknown): HydroAsset | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const asset = value as Partial<HydroAsset>;
  if (!asset.id || !asset.code || !asset.category || !asset.name || !asset.location) {
    return null;
  }

  return {
    category: asset.category as AssetCategory,
    code: asset.code,
    createdAt: asset.createdAt ?? new Date().toISOString(),
    flowRate: asset.flowRate,
    capacityM3: asset.capacityM3,
    depthMeters: asset.depthMeters,
    energyType: asset.energyType,
    id: asset.id,
    lastReading: asset.lastReading ?? '',
    latitude: asset.latitude,
    location: asset.location,
    longitude: asset.longitude,
    name: asset.name,
    notes: asset.notes ?? '',
    powerHp: asset.powerHp,
    reservoirLevel: asset.reservoirLevel,
    responsible: (asset.responsible ?? 'Operador Hidráulico') as InternalProfile,
    status: (asset.status ?? 'operando') as OperationalStatus,
    updatedAt: asset.updatedAt ?? new Date().toISOString(),
  };
};

const normalizeAssetsPayload = (payload: unknown): HydroAsset[] => {
  const raw = payload && typeof payload === 'object' && 'data' in payload ? (payload as { data?: unknown }).data : payload;
  if (Array.isArray(raw)) {
    return raw.map(normalizeAsset).filter((asset): asset is HydroAsset => Boolean(asset));
  }

  if (raw && typeof raw === 'object') {
    const registry = raw as Record<string, unknown>;
    return categoryOrder.flatMap((category) =>
      Array.isArray(registry[category])
        ? (registry[category] as unknown[]).map(normalizeAsset).filter((asset): asset is HydroAsset => Boolean(asset))
        : [],
    );
  }

  return [];
};

const normalizeReading = (value: unknown): HydroAssetReading | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const reading = value as Partial<HydroAssetReading>;
  if (!reading.id || !reading.assetId) {
    return null;
  }

  return {
    assetId: reading.assetId,
    createdAt: reading.createdAt ?? new Date().toISOString(),
    flowRate: reading.flowRate,
    id: reading.id,
    notes: reading.notes ?? '',
    operatorName: reading.operatorName ?? '',
    readingAt: reading.readingAt ?? new Date().toISOString(),
    reservoirLevel: reading.reservoirLevel,
  };
};

const normalizeMaintenance = (value: unknown): MaintenanceOrder | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const order = value as Partial<MaintenanceOrder>;
  if (!order.id || !order.assetId || !order.service) {
    return null;
  }

  return {
    assetId: order.assetId,
    createdAt: order.createdAt ?? new Date().toISOString(),
    dueDate: order.dueDate,
    id: order.id,
    notes: order.notes ?? '',
    responsible: order.responsible ?? 'Técnico de Campo',
    service: order.service,
    status: order.status ?? 'aberta',
    updatedAt: order.updatedAt ?? new Date().toISOString(),
  };
};

const applyFilters = (assets: HydroAsset[], filters: AssetFilters = {}) => {
  const query = filters.q?.trim().toLowerCase();
  const location = filters.location?.trim().toLowerCase();

  return assets.filter((asset) => {
    if (filters.category && filters.category !== 'all' && asset.category !== filters.category) {
      return false;
    }

    if (filters.status && filters.status !== 'all' && asset.status !== filters.status) {
      return false;
    }

    if (filters.responsible && filters.responsible !== 'all' && asset.responsible !== filters.responsible) {
      return false;
    }

    if (location && !asset.location.toLowerCase().includes(location)) {
      return false;
    }

    if (!query) {
      return true;
    }

    return [asset.code, asset.name, asset.location, asset.responsible, asset.notes]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query));
  });
};

const readStoredAssets = (): HydroAsset[] => {
  if (typeof window === 'undefined') {
    return cloneDefaultAssets();
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    const defaults = cloneDefaultAssets();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
    return defaults;
  }

  try {
    const parsed = JSON.parse(stored) as unknown;
    const assets = normalizeAssetsPayload(parsed);
    return assets.length ? assets : cloneDefaultAssets();
  } catch {
    return cloneDefaultAssets();
  }
};

const writeStoredAssets = (assets: HydroAsset[]) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
    window.localStorage.setItem('sighidro:hydro-registry:v1', JSON.stringify(toRegistry(assets)));
  }
};

const readStoredReadings = () => {
  if (typeof window === 'undefined') {
    return [] as HydroAssetReading[];
  }

  try {
    return (JSON.parse(window.localStorage.getItem(READINGS_KEY) || '[]') as unknown[])
      .map(normalizeReading)
      .filter((reading): reading is HydroAssetReading => Boolean(reading));
  } catch {
    return [];
  }
};

const writeStoredReadings = (readings: HydroAssetReading[]) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(READINGS_KEY, JSON.stringify(readings));
  }
};

const readStoredMaintenance = () => {
  if (typeof window === 'undefined') {
    return [] as MaintenanceOrder[];
  }

  try {
    return (JSON.parse(window.localStorage.getItem(MAINTENANCE_KEY) || '[]') as unknown[])
      .map(normalizeMaintenance)
      .filter((order): order is MaintenanceOrder => Boolean(order));
  } catch {
    return [];
  }
};

const writeStoredMaintenance = (orders: MaintenanceOrder[]) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(MAINTENANCE_KEY, JSON.stringify(orders));
  }
};

const dateKeyInBusinessTimeZone = (value = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
  }).formatToParts(value);
  const part = (type: 'day' | 'month' | 'year') => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
};

const shiftDateKey = (dateKey: string, amount: number) => {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
};

const buildLocalFlowSeries = (requestedDays = 7): DailyFlowPoint[] => {
  const days = Math.min(Math.max(Math.trunc(requestedDays) || 7, 1), 31);
  const today = dateKeyInBusinessTimeZone();
  const dates = Array.from({ length: days }, (_, index) => shiftDateKey(today, index - days + 1));
  const byDate = new Map(dates.map((date) => [date, { date, readingCount: 0, value: 0 }]));
  const assets = readStoredAssets();
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  const dailyAssetValues = new Map<string, { count: number; date: string; sum: number }>();

  readStoredReadings().forEach((reading) => {
    const asset = assetsById.get(reading.assetId);
    const flowRate = Number(reading.flowRate);
    if (!asset || !['poço', 'reservatório'].includes(asset.category) || !Number.isFinite(flowRate)) return;

    const readingDate = new Date(reading.readingAt);
    if (Number.isNaN(readingDate.getTime())) return;
    const date = dateKeyInBusinessTimeZone(readingDate);
    if (!byDate.has(date)) return;

    const key = `${date}:${reading.assetId}`;
    const aggregate = dailyAssetValues.get(key) ?? { count: 0, date, sum: 0 };
    aggregate.count += 1;
    aggregate.sum += flowRate;
    dailyAssetValues.set(key, aggregate);
  });

  dailyAssetValues.forEach((aggregate) => {
    const point = byDate.get(aggregate.date);
    if (!point) return;
    point.value += aggregate.sum / aggregate.count;
    point.readingCount += aggregate.count;
  });

  const currentPoint = byDate.get(today);
  if (currentPoint) {
    currentPoint.value = assets
      .filter((asset) => asset.category === 'poço' || asset.category === 'reservatório')
      .reduce((total, asset) => total + Number(asset.flowRate || 0), 0);
  }

  return dates.map((date) => {
    const point = byDate.get(date) as DailyFlowPoint;
    return { ...point, value: Math.round(point.value * 100) / 100 };
  });
};

const normalizeFlowSeries = (value: unknown): DailyFlowPoint[] => {
  const raw = value && typeof value === 'object' && 'data' in value ? (value as { data?: unknown }).data : value;
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const point = item as Partial<DailyFlowPoint>;
    const value = Number(point.value);
    if (!point.date || !Number.isFinite(value)) return [];
    return [{
      date: point.date,
      readingCount: Math.max(0, Number(point.readingCount) || 0),
      value,
    }];
  });
};

const buildQuery = (filters: AssetFilters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== 'all') {
      params.set(key, value);
    }
  });

  return params.toString();
};

const csvEscape = (value: unknown) => {
  const text = value == null ? '' : String(value);
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const assetsToCsv = (assets: HydroAsset[]) => {
  const headers = ['Codigo', 'Nome', 'Tipo', 'Localizacao', 'Status', 'Responsavel', 'Vazao', 'Nivel', 'Atualizado em'];
  const rows = assets.map((asset) => [
    asset.code,
    asset.name,
    categoryMeta[asset.category].label,
    asset.location,
    asset.status,
    asset.responsible,
    asset.flowRate ?? '',
    asset.reservoirLevel ?? '',
    asset.updatedAt,
  ]);

  return [headers, ...rows].map((row) => row.map(csvEscape).join(';')).join('\n');
};

export const localHydroRegistryRepository: HydroRegistryRepository = {
  backend: 'localStorage',
  async createAsset(category, draft) {
    const assets = readStoredAssets();
    const now = new Date().toISOString();
    const asset: HydroAsset = {
      ...draft,
      category,
      code: getNextCode(category, assets),
      createdAt: now,
      id: makeId('asset'),
      updatedAt: now,
    };
    const next = [asset, ...assets];
    writeStoredAssets(next);
    return asset;
  },
  async createMaintenance(assetId, draft) {
    const now = new Date().toISOString();
    const order: MaintenanceOrder = {
      ...draft,
      assetId,
      createdAt: now,
      id: makeId('maintenance'),
      updatedAt: now,
    };
    writeStoredMaintenance([order, ...readStoredMaintenance()]);
    return order;
  },
  async createReading(assetId, draft) {
    const reading: HydroAssetReading = {
      ...draft,
      assetId,
      createdAt: new Date().toISOString(),
      id: makeId('reading'),
    };
    writeStoredReadings([reading, ...readStoredReadings()]);

    const assets = readStoredAssets().map((asset) =>
      asset.id === assetId
        ? {
            ...asset,
            flowRate: reading.flowRate ?? asset.flowRate,
            lastReading: reading.readingAt,
            reservoirLevel: reading.reservoirLevel ?? asset.reservoirLevel,
            updatedAt: new Date().toISOString(),
          }
        : asset,
    );
    writeStoredAssets(assets);
    return reading;
  },
  async deleteAsset(id) {
    writeStoredAssets(readStoredAssets().filter((asset) => asset.id !== id));
    writeStoredReadings(readStoredReadings().filter((reading) => reading.assetId !== id));
    writeStoredMaintenance(readStoredMaintenance().filter((order) => order.assetId !== id));
  },
  async exportAssetsCsv(filters) {
    return assetsToCsv(applyFilters(readStoredAssets(), filters));
  },
  async loadAllMaintenance() {
    return readStoredMaintenance();
  },
  async loadAssets(filters) {
    return applyFilters(readStoredAssets(), filters);
  },
  async loadFlowSeries(days = 7) {
    return buildLocalFlowSeries(days);
  },
  async loadMaintenance(assetId) {
    return readStoredMaintenance().filter((order) => order.assetId === assetId);
  },
  async loadReadings(assetId) {
    return readStoredReadings().filter((reading) => reading.assetId === assetId);
  },
  async resetLocal() {
    const defaults = cloneDefaultAssets();
    writeStoredAssets(defaults);
    writeStoredReadings([]);
    writeStoredMaintenance([]);
    return defaults;
  },
  async updateAsset(id, draft) {
    const now = new Date().toISOString();
    let updated: HydroAsset | null = null;
    const assets = readStoredAssets().map((asset) => {
      if (asset.id !== id) {
        return asset;
      }

      updated = {
        ...asset,
        ...draft,
        id: asset.id,
        code: asset.code,
        category: asset.category,
        createdAt: asset.createdAt,
        updatedAt: now,
      };
      return updated;
    });

    if (!updated) {
      throw new Error('Ativo não encontrado.');
    }

    writeStoredAssets(assets);
    return updated;
  },
  async updateMaintenance(assetId, orderId, draft) {
    const now = new Date().toISOString();
    let updated: MaintenanceOrder | null = null;
    const orders = readStoredMaintenance().map((order) => {
      if (order.id !== orderId || order.assetId !== assetId) {
        return order;
      }

      updated = {
        ...order,
        ...draft,
        assetId: order.assetId,
        createdAt: order.createdAt,
        id: order.id,
        updatedAt: now,
      };
      return updated;
    });

    if (!updated) {
      throw new Error('Ordem de manutenção não encontrada.');
    }

    writeStoredMaintenance(orders);
    return updated;
  },
};

const apiRequest = async <T>(path: string, init: RequestInit = {}) => {
  const authHeader = buildAuthHeader();
  if (!authHeader) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers: {
      Accept: 'application/json',
      ...authHeader,
      ...init.headers,
    },
  });

  if (!response.ok) {
    const payload = await readJsonPayload(response);
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error?: string }).error)
        : 'Falha ao comunicar com a API.';
    throw new Error(message);
  }

  return (await readJsonPayload(response)) as T;
};

export const apiHydroRegistryRepository: HydroRegistryRepository = {
  backend: 'api',
  async createAsset(category, draft) {
    const payload = await apiRequest<{ data?: HydroAsset }>('/api/assets', {
      body: JSON.stringify({ ...draft, category }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    const asset = normalizeAsset(payload.data);
    if (!asset) {
      throw new Error('Resposta inválida da API.');
    }
    return asset;
  },
  async createMaintenance(assetId, draft) {
    const payload = await apiRequest<{ data?: MaintenanceOrder }>(`/api/assets/${assetId}/maintenance`, {
      body: JSON.stringify(draft),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    const order = normalizeMaintenance(payload.data);
    if (!order) {
      throw new Error('Resposta inválida da API.');
    }
    return order;
  },
  async createReading(assetId, draft) {
    const payload = await apiRequest<{ data?: HydroAssetReading }>(`/api/assets/${assetId}/readings`, {
      body: JSON.stringify(draft),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    const reading = normalizeReading(payload.data);
    if (!reading) {
      throw new Error('Resposta inválida da API.');
    }
    return reading;
  },
  async deleteAsset(id) {
    await apiRequest(`/api/assets/${id}`, { method: 'DELETE' });
  },
  async exportAssetsCsv(filters) {
    const query = buildQuery(filters);
    const authHeader = buildAuthHeader();
    if (!authHeader) {
      throw new Error('Sessão expirada. Faça login novamente.');
    }

    const response = await fetch(buildApiUrl(`/api/assets/export.csv${query ? `?${query}` : ''}`), {
      headers: authHeader,
    });
    if (!response.ok) {
      throw new Error('Falha ao exportar CSV.');
    }

    return response.text();
  },
  async loadAllMaintenance() {
    const payload = await apiRequest<{ data?: unknown }>('/api/maintenance');
    const raw = Array.isArray(payload.data) ? payload.data : [];
    return raw.map(normalizeMaintenance).filter((order): order is MaintenanceOrder => Boolean(order));
  },
  async loadAssets(filters) {
    const query = buildQuery(filters);
    const payload = await apiRequest<{ data?: unknown }>(`/api/assets${query ? `?${query}` : ''}`);
    const assets = normalizeAssetsPayload(payload);
    writeStoredAssets(assets);
    return assets;
  },
  async loadFlowSeries(days = 7) {
    const payload = await apiRequest<{ data?: unknown }>(`/api/dashboard/flow-series?days=${Math.min(Math.max(Math.trunc(days) || 7, 1), 31)}`);
    return normalizeFlowSeries(payload);
  },
  async loadMaintenance(assetId) {
    const payload = await apiRequest<{ data?: unknown }>(`/api/assets/${assetId}/maintenance`);
    const raw = Array.isArray(payload.data) ? payload.data : [];
    return raw.map(normalizeMaintenance).filter((order): order is MaintenanceOrder => Boolean(order));
  },
  async loadReadings(assetId) {
    const payload = await apiRequest<{ data?: unknown }>(`/api/assets/${assetId}/readings`);
    const raw = Array.isArray(payload.data) ? payload.data : [];
    return raw.map(normalizeReading).filter((reading): reading is HydroAssetReading => Boolean(reading));
  },
  async resetLocal() {
    return this.loadAssets();
  },
  async updateAsset(id, draft) {
    const payload = await apiRequest<{ data?: HydroAsset }>(`/api/assets/${id}`, {
      body: JSON.stringify(draft),
      headers: { 'Content-Type': 'application/json' },
      method: 'PATCH',
    });
    const asset = normalizeAsset(payload.data);
    if (!asset) {
      throw new Error('Resposta inválida da API.');
    }
    return asset;
  },
  async updateMaintenance(assetId, orderId, draft) {
    const payload = await apiRequest<{ data?: MaintenanceOrder }>(`/api/assets/${assetId}/maintenance`, {
      body: JSON.stringify({ ...draft, id: orderId }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PATCH',
    });
    const order = normalizeMaintenance(payload.data);
    if (!order) {
      throw new Error('Resposta inválida da API.');
    }
    return order;
  },
};

export const hydroRegistryRepository =
  import.meta.env.VITE_SIGHIDRO_BACKEND === 'api'
    ? apiHydroRegistryRepository
    : localHydroRegistryRepository;
