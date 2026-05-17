import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { categoryOrder } from './metadata';
import { hydroRegistryRepository } from './services/hydroRegistryRepository';
import type {
  AssetCategory,
  HydroAsset,
  HydroAssetDraft,
  HydroAssetReading,
  HydroAssetReadingDraft,
  HydroRegistry,
  MaintenanceOrder,
  MaintenanceOrderDraft,
} from './types';

type SyncStatus = 'idle' | 'syncing' | 'failed' | 'offline';

type HydroRegistryContextValue = {
  allRecords: HydroAsset[];
  backend: 'localStorage' | 'api';
  createMaintenance: (assetId: string, draft: MaintenanceOrderDraft) => Promise<MaintenanceOrder>;
  createReading: (assetId: string, draft: HydroAssetReadingDraft) => Promise<HydroAssetReading>;
  createRecord: (category: AssetCategory, draft: HydroAssetDraft) => Promise<HydroAsset>;
  deleteRecord: (category: AssetCategory, id: string) => Promise<void>;
  exportAssetsCsv: (filters?: {
    category?: AssetCategory | 'all';
    location?: string;
    q?: string;
    responsible?: string;
    status?: string;
  }) => Promise<string>;
  isLoading: boolean;
  loadAssetDetails: (assetId: string) => Promise<void>;
  maintenanceByAsset: Record<string, MaintenanceOrder[]>;
  readingsByAsset: Record<string, HydroAssetReading[]>;
  registry: HydroRegistry;
  reloadAssets: () => Promise<boolean>;
  resetRegistry: () => Promise<void>;
  retrySync: () => Promise<boolean>;
  syncStatus: SyncStatus;
  updateMaintenance: (assetId: string, orderId: string, draft: Partial<MaintenanceOrderDraft>) => Promise<MaintenanceOrder>;
  updateRecord: (category: AssetCategory, id: string, draft: HydroAssetDraft) => Promise<HydroAsset>;
};

const HydroRegistryContext = createContext<HydroRegistryContextValue | null>(null);

const emptyRegistry = (): HydroRegistry =>
  categoryOrder.reduce((registry, category) => {
    registry[category] = [];
    return registry;
  }, {} as HydroRegistry);

const groupAssets = (assets: HydroAsset[]): HydroRegistry =>
  categoryOrder.reduce((registry, category) => {
    registry[category] = assets.filter((asset) => asset.category === category);
    return registry;
  }, {} as HydroRegistry);

export function HydroRegistryProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<HydroAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [readingsByAsset, setReadingsByAsset] = useState<Record<string, HydroAssetReading[]>>({});
  const [maintenanceByAsset, setMaintenanceByAsset] = useState<Record<string, MaintenanceOrder[]>>({});

  const reloadAssets = useCallback(async () => {
    setSyncStatus('syncing');
    setIsLoading(true);
    try {
      const loaded = await hydroRegistryRepository.loadAssets();
      setAssets(loaded);
      setSyncStatus('idle');
      return true;
    } catch {
      setSyncStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadAssets();
  }, [reloadAssets]);

  const loadAssetDetails = useCallback(async (assetId: string) => {
    try {
      const [readings, maintenance] = await Promise.all([
        hydroRegistryRepository.loadReadings(assetId),
        hydroRegistryRepository.loadMaintenance(assetId),
      ]);
      setReadingsByAsset((current) => ({ ...current, [assetId]: readings }));
      setMaintenanceByAsset((current) => ({ ...current, [assetId]: maintenance }));
    } catch {
      setSyncStatus('failed');
    }
  }, []);

  const createRecord = useCallback(async (category: AssetCategory, draft: HydroAssetDraft) => {
    setSyncStatus('syncing');
    try {
      const asset = await hydroRegistryRepository.createAsset(category, draft);
      setAssets((current) => [asset, ...current]);
      setSyncStatus('idle');
      return asset;
    } catch (error) {
      setSyncStatus('failed');
      throw error;
    }
  }, []);

  const updateRecord = useCallback(async (_category: AssetCategory, id: string, draft: HydroAssetDraft) => {
    setSyncStatus('syncing');
    try {
      const asset = await hydroRegistryRepository.updateAsset(id, draft);
      setAssets((current) => current.map((item) => (item.id === id ? asset : item)));
      setSyncStatus('idle');
      return asset;
    } catch (error) {
      setSyncStatus('failed');
      throw error;
    }
  }, []);

  const deleteRecord = useCallback(async (_category: AssetCategory, id: string) => {
    setSyncStatus('syncing');
    try {
      await hydroRegistryRepository.deleteAsset(id);
      setAssets((current) => current.filter((asset) => asset.id !== id));
      setReadingsByAsset((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setMaintenanceByAsset((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setSyncStatus('idle');
    } catch (error) {
      setSyncStatus('failed');
      throw error;
    }
  }, []);

  const resetRegistry = useCallback(async () => {
    setSyncStatus('syncing');
    const loaded = await hydroRegistryRepository.resetLocal();
    setAssets(loaded);
    setReadingsByAsset({});
    setMaintenanceByAsset({});
    setSyncStatus('idle');
  }, []);

  const createReading = useCallback(async (assetId: string, draft: HydroAssetReadingDraft) => {
    setSyncStatus('syncing');
    try {
      const reading = await hydroRegistryRepository.createReading(assetId, draft);
      setReadingsByAsset((current) => ({
        ...current,
        [assetId]: [reading, ...(current[assetId] ?? [])],
      }));
      setAssets((current) =>
        current.map((asset) =>
          asset.id === assetId
            ? {
                ...asset,
                flowRate: reading.flowRate ?? asset.flowRate,
                lastReading: reading.readingAt,
                reservoirLevel: reading.reservoirLevel ?? asset.reservoirLevel,
                updatedAt: new Date().toISOString(),
              }
            : asset,
        ),
      );
      setSyncStatus('idle');
      return reading;
    } catch (error) {
      setSyncStatus('failed');
      throw error;
    }
  }, []);

  const createMaintenance = useCallback(async (assetId: string, draft: MaintenanceOrderDraft) => {
    setSyncStatus('syncing');
    try {
      const order = await hydroRegistryRepository.createMaintenance(assetId, draft);
      setMaintenanceByAsset((current) => ({
        ...current,
        [assetId]: [order, ...(current[assetId] ?? [])],
      }));
      setSyncStatus('idle');
      return order;
    } catch (error) {
      setSyncStatus('failed');
      throw error;
    }
  }, []);

  const updateMaintenance = useCallback(async (assetId: string, orderId: string, draft: Partial<MaintenanceOrderDraft>) => {
    setSyncStatus('syncing');
    try {
      const order = await hydroRegistryRepository.updateMaintenance(assetId, orderId, draft);
      setMaintenanceByAsset((current) => ({
        ...current,
        [assetId]: (current[assetId] ?? []).map((item) => (item.id === orderId ? order : item)),
      }));
      setSyncStatus('idle');
      return order;
    } catch (error) {
      setSyncStatus('failed');
      throw error;
    }
  }, []);

  const exportAssetsCsv = useCallback(
    (filters?: Parameters<typeof hydroRegistryRepository.exportAssetsCsv>[0]) =>
      hydroRegistryRepository.exportAssetsCsv(filters),
    [],
  );

  const registry = useMemo(() => (assets.length ? groupAssets(assets) : emptyRegistry()), [assets]);

  const value = useMemo(
    () => ({
      allRecords: assets,
      backend: hydroRegistryRepository.backend,
      createMaintenance,
      createReading,
      createRecord,
      deleteRecord,
      exportAssetsCsv,
      isLoading,
      loadAssetDetails,
      maintenanceByAsset,
      readingsByAsset,
      registry,
      reloadAssets,
      resetRegistry,
      retrySync: reloadAssets,
      syncStatus,
      updateMaintenance,
      updateRecord,
    }),
    [
      assets,
      createMaintenance,
      createReading,
      createRecord,
      deleteRecord,
      exportAssetsCsv,
      isLoading,
      loadAssetDetails,
      maintenanceByAsset,
      readingsByAsset,
      registry,
      reloadAssets,
      resetRegistry,
      syncStatus,
      updateMaintenance,
      updateRecord,
    ],
  );

  return <HydroRegistryContext.Provider value={value}>{children}</HydroRegistryContext.Provider>;
}

export function useHydroRegistry() {
  const context = useContext(HydroRegistryContext);
  if (!context) {
    throw new Error('useHydroRegistry must be used inside HydroRegistryProvider');
  }

  return context;
}
