import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { defaultHydroRegistry } from './data';
import { categoryMeta, categoryOrder } from './metadata';
import { hydroRegistryRepository } from './services/hydroRegistryRepository';
import type { AssetCategory, HydroRecord, HydroRecordDraft, HydroRegistry } from './types';

type SyncStatus = 'idle' | 'syncing' | 'failed' | 'offline';

type HydroRegistryContextValue = {
  registry: HydroRegistry;
  allRecords: HydroRecord[];
  backend: 'localStorage' | 'api';
  syncStatus: SyncStatus;
  retrySync: () => Promise<boolean>;
  createRecord: (category: AssetCategory, draft: HydroRecordDraft) => void;
  updateRecord: (category: AssetCategory, id: string, draft: HydroRecordDraft) => void;
  deleteRecord: (category: AssetCategory, id: string) => void;
  resetRegistry: () => void;
};

const HydroRegistryContext = createContext<HydroRegistryContextValue | null>(null);

const makeId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `record-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const getNextCode = (category: AssetCategory, records: HydroRecord[]) => {
  const prefix = categoryMeta[category].prefix;
  const nextNumber =
    records.reduce((max, record) => {
      const current = Number(record.code.replace(/\D/g, ''));
      return Number.isFinite(current) ? Math.max(max, current) : max;
    }, 0) + 1;

  return `${prefix}-${String(nextNumber).padStart(3, '0')}`;
};

const cloneDefaults = (): HydroRegistry => JSON.parse(JSON.stringify(defaultHydroRegistry)) as HydroRegistry;

export function HydroRegistryProvider({ children }: { children: ReactNode }) {
  const [registry, setRegistry] = useState<HydroRegistry>(() => cloneDefaults());
  const [isHydrated, setIsHydrated] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const registryRef = useRef(registry);

  useEffect(() => {
    let isActive = true;
    let didLoad = false;
    const loadRegistry = async () => {
      try {
        const loaded = await hydroRegistryRepository.load();
        if (isActive) {
          setRegistry(loaded);
          registryRef.current = loaded;
          didLoad = true;
        }
      } catch {
        if (isActive) {
          setRegistry(cloneDefaults());
        }
      } finally {
        if (isActive) {
          setIsHydrated(true);
        }
      }
    };

    void loadRegistry();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    let active = true;

    const doSave = async () => {
      setSyncStatus('syncing');
      try {
        const ok = await hydroRegistryRepository.save(registry);
        if (active) {
          setSyncStatus(ok ? 'idle' : 'failed');
        }
      } catch {
        if (active) {
          setSyncStatus('failed');
        }
      }
    };

    void doSave();

    return () => {
      active = false;
    };
  }, [isHydrated, registry]);

  useEffect(() => {
    registryRef.current = registry;
  }, [registry]);

  // Background sync when backend is API and hydrated
  useEffect(() => {
    if (!isHydrated) return;
    if (hydroRegistryRepository.backend !== 'api') return;

    const syncIntervalMs = Number(import.meta.env.VITE_SYNC_INTERVAL_MS ?? 60000);
    const id = window.setInterval(() => {
      void hydroRegistryRepository.save(registryRef.current).then((ok) => {
        setSyncStatus(ok ? 'idle' : 'failed');
      });
    }, syncIntervalMs);

    const onOnline = () => {
      void hydroRegistryRepository.save(registryRef.current).then((ok) => {
        setSyncStatus(ok ? 'idle' : 'failed');
      });
    };

    window.addEventListener('online', onOnline);

    return () => {
      clearInterval(id);
      window.removeEventListener('online', onOnline);
    };
  }, [isHydrated]);

  const createRecord = useCallback((category: AssetCategory, draft: HydroRecordDraft) => {
    setRegistry((current) => {
      const records = current[category];
      const record: HydroRecord = {
        ...draft,
        id: makeId(),
        code: getNextCode(category, records),
        category,
      };

      return {
        ...current,
        [category]: [record, ...records],
      };
    });
  }, []);

  const updateRecord = useCallback((category: AssetCategory, id: string, draft: HydroRecordDraft) => {
    setRegistry((current) => ({
      ...current,
      [category]: current[category].map((record) =>
        record.id === id ? { ...record, ...draft, category } : record,
      ),
    }));
  }, []);

  const deleteRecord = useCallback((category: AssetCategory, id: string) => {
    setRegistry((current) => ({
      ...current,
      [category]: current[category].filter((record) => record.id !== id),
    }));
  }, []);

  const resetRegistry = useCallback(() => {
    setRegistry(cloneDefaults());
  }, []);

  const retrySync = useCallback(async () => {
    setSyncStatus('syncing');
    try {
      const ok = await hydroRegistryRepository.save(registryRef.current);
      setSyncStatus(ok ? 'idle' : 'failed');
      return ok;
    } catch {
      setSyncStatus('failed');
      return false;
    }
  }, []);

  const allRecords = useMemo(
    () => categoryOrder.flatMap((category) => registry[category]),
    [registry],
  );

  const value = useMemo(
    () => ({
      registry,
      allRecords,
      backend: hydroRegistryRepository.backend,
      syncStatus,
      retrySync,
      createRecord,
      updateRecord,
      deleteRecord,
      resetRegistry,
    }),
    [allRecords, createRecord, deleteRecord, registry, resetRegistry, updateRecord],
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
