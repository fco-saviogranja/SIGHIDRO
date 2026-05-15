import type { LucideIcon } from 'lucide-react';

export type OperationalStatus = 'operando' | 'atenção' | 'parado' | 'manutenção';

export type InternalProfile =
  | 'Operador Hidráulico'
  | 'Técnico de Campo'
  | 'Gestor Hídrico'
  | 'Administração Central';

export type ModuleArea = {
  id: string;
  title: string;
  description: string;
  items: string[];
  status: OperationalStatus;
  accent: 'blue' | 'cyan' | 'green' | 'amber';
  icon: LucideIcon;
};

export type WaterAsset = {
  id: string;
  name: string;
  type: 'Poço' | 'Bomba' | 'Reservatório' | 'Rede';
  location: string;
  status: OperationalStatus;
  flowRate: number;
  reservoirLevel?: number;
  lastReading: string;
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
