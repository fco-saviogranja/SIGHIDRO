import {
  Activity,
  BarChart3,
  ClipboardList,
  Database,
  FileBarChart,
  FileCog,
  Gauge,
  Map,
  MapPinned,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import type {
  AssetCategory,
  CategoryMeta,
  InternalProfile,
  ModuleArea,
  OperationalStatus,
} from './types';

export const statusLabel: Record<OperationalStatus, string> = {
  operando: 'Operando',
  atenção: 'Atenção',
  parado: 'Parado',
  manutenção: 'Manutenção',
};

export const statusOptions: OperationalStatus[] = ['operando', 'atenção', 'parado', 'manutenção'];

export const profileOptions: InternalProfile[] = [
  'Operador Hidráulico',
  'Técnico de Campo',
  'Gestor Hídrico',
  'Administração Central',
];

export const categoryOrder: AssetCategory[] = ['poço', 'bomba', 'reservatório', 'localidade'];

export const categoryMeta: Record<AssetCategory, CategoryMeta> = {
  poço: {
    label: 'Poço',
    plural: 'Poços',
    prefix: 'POC',
    description: 'Captação, profundidade, energia, vazão e situação operacional.',
    icon: Database,
  },
  bomba: {
    label: 'Bomba',
    plural: 'Bombas',
    prefix: 'BMB',
    description: 'Equipamentos, potência, status de operação e vida útil técnica.',
    icon: Wrench,
  },
  reservatório: {
    label: 'Reservatório',
    plural: 'Reservatórios',
    prefix: 'RES',
    description: 'Níveis, capacidade, localização e abastecimento por zona.',
    icon: Gauge,
  },
  localidade: {
    label: 'Localidade',
    plural: 'Localidades',
    prefix: 'LOC',
    description: 'Setores, comunidades e zonas operacionais monitoradas.',
    icon: MapPinned,
  },
};

export const systemModules: ModuleArea[] = [
  {
    id: 'cadastro',
    path: '/cadastro',
    title: 'Cadastro Hídrico',
    description: 'Base técnica de poços, bombas, reservatórios e localidades.',
    items: ['Poços', 'Bombas', 'Reservatórios', 'Localidades'],
    status: 'operando',
    accent: 'blue',
    icon: Database,
  },
  {
    id: 'monitoramento',
    path: '/monitoramento',
    title: 'Monitoramento Operacional',
    description: 'Acompanhamento diário de vazão, níveis e consumo energético.',
    items: ['Vazão', 'Nível da água', 'Horas de funcionamento', 'Energia'],
    status: 'atenção',
    accent: 'cyan',
    icon: Activity,
  },
  {
    id: 'manutencao',
    path: '/manutencao',
    title: 'Manutenção',
    description: 'Ordens de serviço, trocas, preventiva e histórico técnico.',
    items: ['Ordens de serviço', 'Trocas', 'Preventiva', 'Histórico'],
    status: 'operando',
    accent: 'green',
    icon: ClipboardList,
  },
  {
    id: 'mapa',
    path: '/mapa',
    title: 'Mapa Operacional',
    description: 'Visão territorial simulada da rede, ativos e pontos de alerta.',
    items: ['Zonas', 'Ativos', 'Rede', 'Alertas'],
    status: 'operando',
    accent: 'blue',
    icon: Map,
  },
  {
    id: 'relatorios',
    path: '/relatorios',
    title: 'Relatórios',
    description: 'Painéis administrativos para auditoria e prestação de contas.',
    items: ['Auditoria', 'Indicadores', 'Patrimônio', 'Exportação'],
    status: 'operando',
    accent: 'amber',
    icon: FileBarChart,
  },
  {
    id: 'administrativo',
    path: '/relatorios',
    title: 'Controle Administrativo',
    description: 'Usuários, auditoria, relatórios e patrimônio institucional.',
    items: ['Usuários', 'Auditoria', 'Relatórios', 'Patrimônio'],
    status: 'operando',
    accent: 'amber',
    icon: FileCog,
  },
];

export const navItems = [
  { label: 'Dashboard', path: '/', icon: Gauge },
  { label: 'Cadastro Hídrico', path: '/cadastro', icon: Database },
  { label: 'Monitoramento', path: '/monitoramento', icon: Activity },
  { label: 'Manutenção', path: '/manutencao', icon: ClipboardList },
  { label: 'Mapa', path: '/mapa', icon: Map },
  { label: 'Relatórios', path: '/relatorios', icon: FileBarChart },
];

export const userContext = {
  name: 'Carlos Oliveira',
  role: 'Gestor Hídrico',
  department: 'Administração Central',
  badgeIcon: ShieldCheck,
};
