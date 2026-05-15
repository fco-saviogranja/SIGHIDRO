import {
  AlertTriangle,
  BarChart3,
  ClipboardList,
  Download,
  FileBarChart,
  Map,
  Waves,
} from 'lucide-react';
import { useMemo } from 'react';
import { useHydroRegistry } from '../HydroRegistryContext';
import { PanelHeader } from '../components/PanelHeader';
import { categoryMeta, statusLabel } from '../metadata';
import type { HydroRecord } from '../types';

type ModuleVariant = 'monitoramento' | 'manutencao' | 'mapa' | 'relatorios';

type ModuleConfig = {
  eyebrow: string;
  title: string;
  description: string;
  icon: typeof Waves;
};

const moduleConfig: Record<ModuleVariant, ModuleConfig> = {
  monitoramento: {
    eyebrow: 'Monitoramento Operacional',
    title: 'Leituras e indicadores conectados ao cadastro',
    description: 'Acompanhamento de vazão, nível, última medição e situação operacional dos ativos cadastrados.',
    icon: Waves,
  },
  manutencao: {
    eyebrow: 'Manutenção',
    title: 'Triagem técnica dos ativos com pendência',
    description: 'Fila operacional simulada para ativos em atenção, parados ou em manutenção.',
    icon: ClipboardList,
  },
  mapa: {
    eyebrow: 'Mapa Operacional',
    title: 'Distribuição territorial dos ativos cadastrados',
    description: 'Representação visual simulada para validar a futura camada geográfica do SIGHIDRO.',
    icon: Map,
  },
  relatorios: {
    eyebrow: 'Relatórios',
    title: 'Resumo administrativo e operacional',
    description: 'Base inicial para relatórios, auditoria, exportações e prestação de contas.',
    icon: FileBarChart,
  },
};

function ModulePage({ variant }: { variant: ModuleVariant }) {
  const { allRecords } = useHydroRegistry();
  const config = moduleConfig[variant];
  const Icon = config.icon;
  const visibleRecords = useMemo(() => filterRecords(variant, allRecords), [allRecords, variant]);
  const metrics = useMemo(() => makeModuleMetrics(variant, allRecords, visibleRecords), [allRecords, variant, visibleRecords]);

  return (
    <main className="dashboard route-page">
      <section className="page-hero">
        <div>
          <span className="eyebrow">{config.eyebrow}</span>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
        </div>
        <span className="module-route-icon">
          <Icon size={30} />
        </span>
      </section>

      <section className="page-metrics-grid" aria-label="Indicadores do módulo">
        {metrics.map((metric) => (
          <article className="page-metric-card" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.detail}</small>
          </article>
        ))}
      </section>

      {variant === 'mapa' ? <MapWorkspace records={allRecords} /> : null}
      {variant === 'relatorios' ? <ReportsWorkspace records={allRecords} /> : null}

      <section className="panel table-panel">
        <PanelHeader title={variant === 'manutencao' ? 'Fila operacional' : 'Registros conectados'} icon={<BarChart3 size={19} />} />
        <div className="asset-table" role="table" aria-label="Registros conectados ao módulo">
          <div className="asset-row table-head" role="row">
            <span>Código</span>
            <span>Nome</span>
            <span>Tipo</span>
            <span>Status</span>
            <span>Vazão</span>
            <span>Última medição</span>
          </div>
          {visibleRecords.map((record) => (
            <div className="asset-row" key={record.id} role="row">
              <span>{record.code}</span>
              <strong>{record.name}</strong>
              <span>{categoryMeta[record.category].label}</span>
              <span>
                <i className={`status-dot status-${record.status}`} />
                {statusLabel[record.status]}
              </span>
              <span>{record.flowRate} m³/h</span>
              <span>{record.lastReading}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function filterRecords(variant: ModuleVariant, records: HydroRecord[]) {
  if (variant === 'manutencao') {
    return records.filter((record) => record.status !== 'operando');
  }

  return records;
}

function makeModuleMetrics(variant: ModuleVariant, allRecords: HydroRecord[], visibleRecords: HydroRecord[]) {
  const totalFlow = visibleRecords.reduce((total, record) => total + Number(record.flowRate || 0), 0);
  const alertCount = allRecords.filter((record) => record.status !== 'operando').length;
  const averageLevelValues = allRecords
    .map((record) => record.reservoirLevel)
    .filter((level): level is number => typeof level === 'number');
  const averageLevel = averageLevelValues.length
    ? Math.round(averageLevelValues.reduce((total, level) => total + level, 0) / averageLevelValues.length)
    : 0;

  if (variant === 'relatorios') {
    return [
      { label: 'Ativos no relatório', value: String(allRecords.length), detail: 'registros locais' },
      { label: 'Ocorrências abertas', value: String(alertCount), detail: 'simuladas pelo status' },
      { label: 'Nível médio', value: `${averageLevel}%`, detail: 'reservatórios e zonas' },
    ];
  }

  return [
    { label: 'Registros do módulo', value: String(visibleRecords.length), detail: 'base do cadastro hídrico' },
    { label: 'Vazão monitorada', value: `${totalFlow} m³/h`, detail: 'somatório local' },
    { label: 'Pontos em alerta', value: String(alertCount), detail: 'atenção, parado ou manutenção' },
  ];
}

function MapWorkspace({ records }: { records: HydroRecord[] }) {
  const markers = records.slice(0, 6);

  return (
    <section className="panel route-map-panel">
      <PanelHeader title="Camada geográfica simulada" icon={<Map size={19} />} />
      <div className="module-map-layout">
        <div className="map-canvas map-canvas-large" role="img" aria-label="Mapa operacional ampliado">
          <svg className="pipeline-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path className="main-pipeline" d="M8 66 C25 55, 36 49, 51 48 S78 41, 94 29" />
            <path className="secondary-pipeline" d="M28 75 C39 67, 45 57, 49 49 S60 38, 67 34" />
            <path className="pressure-line" d="M49 48 C54 57, 61 62, 73 66" />
            <path className="warning-line" d="M31 72 C25 66, 22 59, 25 52" />
          </svg>
          {markers.map((record, index) => (
            <button
              className={`map-marker status-${record.status}`}
              key={record.id}
              style={{ left: `${24 + ((index * 13) % 52)}%`, top: `${30 + ((index * 17) % 44)}%` }}
              type="button"
              aria-label={`${record.name}: ${statusLabel[record.status]}`}
            >
              <span />
            </button>
          ))}
        </div>
        <div className="map-side-list">
          {markers.map((record) => (
            <article key={record.id}>
              <span className={`status-dot status-${record.status}`} />
              <div>
                <strong>{record.name}</strong>
                <small>{record.location}</small>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ReportsWorkspace({ records }: { records: HydroRecord[] }) {
  return (
    <section className="reports-grid">
      <article className="panel report-card">
        <PanelHeader title="Exportação futura" icon={<Download size={19} />} />
        <p>Estrutura preparada para PDF, planilhas e prestação de contas com dados sincronizados via API.</p>
      </article>
      <article className="panel report-card">
        <PanelHeader title="Auditoria operacional" icon={<AlertTriangle size={19} />} />
        <p>{records.filter((record) => record.status !== 'operando').length} registro(s) exigem acompanhamento no cadastro atual.</p>
      </article>
    </section>
  );
}

export default ModulePage;
