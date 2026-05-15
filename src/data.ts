import {
  Activity,
  BarChart3,
  ClipboardList,
  Database,
  FileCog,
  ShieldCheck,
} from 'lucide-react';
import type { Alert, ChartPoint, Indicator, Maintenance, ModuleArea, WaterAsset } from './types';

export const systemModules: ModuleArea[] = [
  {
    id: 'cadastro',
    title: 'Cadastro Hídrico',
    description: 'Base técnica de poços, bombas, reservatórios e localidades.',
    items: ['Poços', 'Bombas', 'Reservatórios', 'Localidades'],
    status: 'operando',
    accent: 'blue',
    icon: Database,
  },
  {
    id: 'monitoramento',
    title: 'Monitoramento Operacional',
    description: 'Acompanhamento diário de vazão, níveis e consumo energético.',
    items: ['Vazão', 'Nível da água', 'Horas de funcionamento', 'Energia'],
    status: 'atenção',
    accent: 'cyan',
    icon: Activity,
  },
  {
    id: 'manutencao',
    title: 'Manutenção',
    description: 'Ordens de serviço, trocas, preventiva e histórico técnico.',
    items: ['Ordens de serviço', 'Trocas', 'Preventiva', 'Histórico'],
    status: 'operando',
    accent: 'green',
    icon: ClipboardList,
  },
  {
    id: 'inteligencia',
    title: 'Inteligência Hídrica',
    description: 'Indicadores, alertas e mapa operacional para decisão rápida.',
    items: ['Gráficos', 'Alertas', 'Indicadores', 'Mapa operacional'],
    status: 'operando',
    accent: 'blue',
    icon: BarChart3,
  },
  {
    id: 'administrativo',
    title: 'Controle Administrativo',
    description: 'Usuários, auditoria, relatórios e patrimônio institucional.',
    items: ['Usuários', 'Auditoria', 'Relatórios', 'Patrimônio'],
    status: 'operando',
    accent: 'amber',
    icon: FileCog,
  },
];

export const indicators: Indicator[] = [
  {
    label: 'Poços ativos',
    value: '35',
    detail: '3 com atenção operacional',
    trend: 'stable',
  },
  {
    label: 'Reservatório médio',
    value: '78%',
    detail: '+4% nas últimas 24h',
    trend: 'up',
  },
  {
    label: 'Bombas em manutenção',
    value: '2',
    detail: '1 preventiva programada',
    trend: 'down',
  },
  {
    label: 'Vazão diária',
    value: '146 m³/h',
    detail: 'queda localizada em Brejinho',
    trend: 'down',
  },
];

export const assets: WaterAsset[] = [
  {
    id: 'POC-001',
    name: 'Poço Brejinho',
    type: 'Poço',
    location: 'Zona 1 - Brejinho',
    status: 'atenção',
    flowRate: 72,
    reservoirLevel: 68,
    lastReading: '14/05/2026 09:20',
  },
  {
    id: 'POC-014',
    name: 'Sítio Serra Boa',
    type: 'Poço',
    location: 'Zona 2 - Serra Boa',
    status: 'operando',
    flowRate: 91,
    reservoirLevel: 81,
    lastReading: '14/05/2026 08:55',
  },
  {
    id: 'BMB-012',
    name: 'Bomba SP 17-10',
    type: 'Bomba',
    location: 'Estação Centro',
    status: 'manutenção',
    flowRate: 0,
    lastReading: '13/05/2026 17:40',
  },
  {
    id: 'RES-003',
    name: 'Reservatório São Francisco',
    type: 'Reservatório',
    location: 'Zona 3 - São Francisco',
    status: 'operando',
    flowRate: 64,
    reservoirLevel: 86,
    lastReading: '14/05/2026 09:10',
  },
];

export const alerts: Alert[] = [
  {
    id: 'ALT-001',
    title: 'Queda de vazão acentuada',
    source: 'Poço Brejinho',
    severity: 'critical',
    time: 'há 18 min',
  },
  {
    id: 'ALT-002',
    title: 'Manutenção vencida',
    source: 'Bomba SP 17-10',
    severity: 'warning',
    time: 'hoje',
  },
  {
    id: 'ALT-003',
    title: 'Poço sem atualização',
    source: 'São Francisco',
    severity: 'warning',
    time: 'há 2h',
  },
];

export const maintenances: Maintenance[] = [
  {
    id: 'OS-2401',
    asset: 'Bomba SP 17-10',
    service: 'Troca de rolamento',
    profile: 'Técnico de Campo',
    dueIn: '1 dia',
    status: 'manutenção',
  },
  {
    id: 'OS-2402',
    asset: 'Poço Brejinho',
    service: 'Verificação de queda de vazão',
    profile: 'Operador Hidráulico',
    dueIn: 'Hoje',
    status: 'atenção',
  },
  {
    id: 'OS-2403',
    asset: 'Reservatório São Francisco',
    service: 'Inspeção preventiva',
    profile: 'Gestor Hídrico',
    dueIn: '5 dias',
    status: 'operando',
  },
];

export const flowSeries: ChartPoint[] = [
  { label: 'Seg', value: 118 },
  { label: 'Ter', value: 142 },
  { label: 'Qua', value: 132 },
  { label: 'Qui', value: 146 },
  { label: 'Sex', value: 121 },
  { label: 'Sáb', value: 154 },
  { label: 'Dom', value: 139 },
];

export const productionSeries: ChartPoint[] = [
  { label: 'Jan', value: 62 },
  { label: 'Fev', value: 68 },
  { label: 'Mar', value: 71 },
  { label: 'Abr', value: 76 },
  { label: 'Mai', value: 82 },
  { label: 'Jun', value: 88 },
];

export const userContext = {
  name: 'Carlos Oliveira',
  role: 'Gestor Hídrico',
  department: 'Administração Central',
  badgeIcon: ShieldCheck,
};
