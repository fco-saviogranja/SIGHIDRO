import type { LucideIcon } from 'lucide-react';

export type OperationalStatus = 'operando' | 'atenção' | 'parado' | 'manutenção';
export type AssetCategory = 'poço' | 'bomba' | 'reservatório' | 'localidade';

export type InternalProfile =
  | 'Operador Hidráulico'
  | 'Técnico de Campo'
  | 'Gestor Hídrico'
  | 'Administração Central';

export type MaintenanceStatus = 'aberta' | 'em_andamento' | 'concluida' | 'cancelada';

export type AuditAction = 'create' | 'update' | 'delete';

export type EntityType = 'asset' | 'reading' | 'maintenance';

export type ModuleArea = {
  id: string;
  path: string;
  title: string;
  description: string;
  items: string[];
  status: OperationalStatus;
  accent: 'blue' | 'cyan' | 'green' | 'amber';
  icon: LucideIcon;
};

export type HydroAsset = {
  id: string;
  code: string;
  category: AssetCategory;
  name: string;
  location: string;
  status: OperationalStatus;
  responsible: InternalProfile;
  flowRate?: number;
  reservoirLevel?: number;
  powerHp?: number;
  energyType?: string;
  depthMeters?: number;
  capacityM3?: number;
  latitude?: number;
  longitude?: number;
  lastReading: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type HydroRegistry = Record<AssetCategory, HydroAsset[]>;

export type HydroAssetDraft = Omit<HydroAsset, 'id' | 'code' | 'category' | 'createdAt' | 'updatedAt'>;

export type HydroRecord = HydroAsset;

export type HydroRecordDraft = HydroAssetDraft;

export type HydroAssetReading = {
  id: string;
  assetId: string;
  readingAt: string;
  flowRate?: number;
  reservoirLevel?: number;
  operatorName: string;
  notes: string;
  createdAt: string;
};

export type HydroAssetReadingDraft = Omit<HydroAssetReading, 'id' | 'assetId' | 'createdAt'>;

export type MaintenanceOrder = {
  id: string;
  assetId: string;
  service: string;
  status: MaintenanceStatus;
  responsible: InternalProfile;
  dueDate?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type MaintenanceOrderDraft = Omit<MaintenanceOrder, 'id' | 'assetId' | 'createdAt' | 'updatedAt'>;

export type AuditLogEntry = {
  id: string;
  userId: string;
  email: string;
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  before?: unknown;
  after?: unknown;
  createdAt: string;
};

export type CategoryMeta = {
  label: string;
  plural: string;
  prefix: string;
  description: string;
  icon: LucideIcon;
};

export type Indicator = {
  label: string;
  value: string;
  detail: string;
  trend: 'up' | 'down' | 'stable';
};

export type Alert = {
  id: string;
  title: string;
  source: string;
  severity: 'critical' | 'warning' | 'info';
  time: string;
};

export type Maintenance = {
  id: string;
  asset: string;
  service: string;
  profile: InternalProfile;
  dueIn: string;
  status: OperationalStatus;
};

export type ChartPoint = {
  label: string;
  value: number;
};
