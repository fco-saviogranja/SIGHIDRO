import { useCallback, useEffect, useMemo, useState } from 'react';
import { useHydroRegistry } from '../HydroRegistryContext';
import type { HydroAsset, MaintenanceOrder } from '../types';

export type OperationalNotification = {
  createdAt: string;
  description: string;
  id: string;
  isRead: boolean;
  severity: 'critical' | 'warning' | 'info';
  time: string;
  title: string;
  to: string;
};

const readStorageKey = (userEmail?: string | null) =>
  `sighidro:notifications:read:${userEmail?.trim().toLowerCase() || 'session'}`;

const loadReadIds = (storageKey: string) => {
  if (typeof window === 'undefined') return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [];
  }
};

const relativeTime = (value: string) => {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 'agora';
  const elapsedMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000));
  if (elapsedMinutes < 1) return 'agora';
  if (elapsedMinutes < 60) return `há ${elapsedMinutes} min`;
  const elapsedHours = Math.round(elapsedMinutes / 60);
  if (elapsedHours < 24) return `há ${elapsedHours}h`;
  const elapsedDays = Math.round(elapsedHours / 24);
  return `há ${elapsedDays} dia${elapsedDays === 1 ? '' : 's'}`;
};

const assetNotification = (asset: HydroAsset): Omit<OperationalNotification, 'isRead'> | null => {
  if (asset.status === 'operando') return null;

  const title = asset.status === 'parado'
    ? 'Ativo parado'
    : asset.status === 'manutenção'
      ? 'Ativo em manutenção'
      : 'Atenção operacional';

  return {
    createdAt: asset.updatedAt,
    description: `${asset.name} · ${asset.location}`,
    id: `asset:${asset.id}:${asset.status}:${asset.updatedAt}`,
    severity: asset.status === 'parado' ? 'critical' : 'warning',
    time: relativeTime(asset.updatedAt),
    title,
    to: '/cadastro',
  };
};

const maintenanceNotification = (
  order: MaintenanceOrder,
  assetName: string,
): Omit<OperationalNotification, 'isRead'> | null => {
  if (order.status !== 'aberta' && order.status !== 'em_andamento') return null;

  return {
    createdAt: order.updatedAt,
    description: `${order.service} · ${assetName}`,
    id: `maintenance:${order.id}:${order.status}:${order.updatedAt}`,
    severity: order.status === 'aberta' ? 'warning' : 'info',
    time: relativeTime(order.updatedAt),
    title: order.status === 'aberta' ? 'Ordem de serviço aberta' : 'Manutenção em andamento',
    to: '/manutencao',
  };
};

export function useOperationalNotifications(userEmail?: string | null) {
  const { allRecords, maintenanceByAsset, syncStatus } = useHydroRegistry();
  const storageKey = useMemo(() => readStorageKey(userEmail), [userEmail]);
  const [readIds, setReadIds] = useState<string[]>(() => loadReadIds(storageKey));

  useEffect(() => {
    setReadIds(loadReadIds(storageKey));
  }, [storageKey]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(readIds.slice(-200)));
  }, [readIds, storageKey]);

  const rawNotifications = useMemo(() => {
    const assetsById = new Map(allRecords.map((asset) => [asset.id, asset]));
    const assetNotifications = allRecords
      .map(assetNotification)
      .filter((notification): notification is Omit<OperationalNotification, 'isRead'> => Boolean(notification));
    const maintenanceNotifications = Object.values(maintenanceByAsset)
      .flat()
      .map((order) => maintenanceNotification(order, assetsById.get(order.assetId)?.name ?? 'Ativo removido'))
      .filter((notification): notification is Omit<OperationalNotification, 'isRead'> => Boolean(notification));
    const syncNotification: Omit<OperationalNotification, 'isRead'>[] = syncStatus === 'failed' || syncStatus === 'offline'
      ? [{
          createdAt: new Date().toISOString(),
          description: syncStatus === 'offline'
            ? 'O dispositivo está sem conexão. Os dados serão atualizados quando a rede voltar.'
            : 'Não foi possível concluir a última sincronização dos dados operacionais.',
          id: `sync:${syncStatus}`,
          severity: 'critical',
          time: 'agora',
          title: syncStatus === 'offline' ? 'Sistema offline' : 'Sincronização pendente',
          to: '/dashboard',
        }]
      : [];

    return [...syncNotification, ...assetNotifications, ...maintenanceNotifications]
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, 20);
  }, [allRecords, maintenanceByAsset, syncStatus]);

  const readIdSet = useMemo(() => new Set(readIds), [readIds]);
  const notifications = useMemo(
    () => rawNotifications.map((notification) => ({ ...notification, isRead: readIdSet.has(notification.id) })),
    [rawNotifications, readIdSet],
  );
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  const markAsRead = useCallback((notificationId: string) => {
    setReadIds((current) => current.includes(notificationId) ? current : [...current, notificationId]);
  }, []);

  const markAllAsRead = useCallback(() => {
    setReadIds((current) => Array.from(new Set([...current, ...rawNotifications.map((notification) => notification.id)])));
  }, [rawNotifications]);

  return { markAllAsRead, markAsRead, notifications, unreadCount };
}
