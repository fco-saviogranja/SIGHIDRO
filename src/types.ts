import type { LucideIcon } from 'lucide-react';

export type OperationalStatus = 'operando' | 'atenção' | 'parado' | 'manutenção';
export type AssetCategory = 'poço' | 'bomba' | 'reservatório' | 'localidade';

export type InternalProfile =
  | 'Operador Hidráulico'
  | 'Técnico de Campo'
  | 'Gestor Hídrico'
  | 'Administração Central';

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

export type HydroRecord = {
  id: string;
  code: string;
  category: AssetCategory;
  name: string;
  location: string;
  status: OperationalStatus;
  responsible: InternalProfile;
  flowRate: number;
  reservoirLevel?: number;
  powerHp?: number;
  energyType?: string;
  depthMeters?: number;
  capacityM3?: number;
  lastReading: string;
  notes: string;
};

export type HydroRegistry = Record<AssetCategory, HydroRecord[]>;

export type HydroRecordDraft = Omit<HydroRecord, 'id' | 'code' | 'category'>;

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
