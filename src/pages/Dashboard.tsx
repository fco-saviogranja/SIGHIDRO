import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  CircleGauge,
  Droplets,
  Gauge,
  Map,
  Waves,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { lazy, Suspense, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useHydroRegistry } from '../HydroRegistryContext';
import { flowSeries, productionSeries } from '../data';
import { categoryMeta, statusLabel, systemModules } from '../metadata';
import type { Alert, ChartPoint, HydroRecord, Indicator, Maintenance, OperationalStatus } from '../types';
import { PanelHeader } from '../components/PanelHeader';

const OperationalLeafletMap = lazy(() => import('../components/OperationalLeafletMap'));

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

function MapFallback() {
  return (
    <div className="operational-map-loading" role="status">
      Carregando camada geográfica
    </div>
  );
}

function Dashboard() {
  const { allRecords, registry, syncStatus, retrySync, backend, exportAssetsCsv } = useHydroRegistry();
  const [appliedFilters, setAppliedFilters] = useState<AppliedDashboardFilters | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const visibleRecords = useMemo(
    () => appliedFilters
      ? filterDashboardRecords(allRecords, appliedFilters.filters, appliedFilters.statuses)
      : allRecords,
    [allRecords, appliedFilters],
  );
  const indicators = useMemo(() => makeIndicators(registry), [registry]);
  const dashboardAlerts = useMemo(() => makeAlerts(allRecords), [allRecords]);
  const maintenanceRows = useMemo(() => makeMaintenances(allRecords), [allRecords]);
  const flowData = useMemo(
    () => flowSeries.map((point) => ({ day: point.label, Vazao: point.value })),
    [],
  );
  const productionData = useMemo(
    () => productionSeries.map((point) => ({ month: point.label, Producao: point.value })),
    [],
  );

  const exportDashboardCsv = async () => {
    const csv = await exportAssetsCsv();
    downloadTextFile(csv, 'sighidro-ativos.csv', 'text/csv;charset=utf-8');
  };

  const exportDashboardSheet = () => {
    const headers = ['Codigo', 'Ativo', 'Categoria', 'Localidade', 'Status', 'Responsavel', 'Vazao', 'Nivel', 'Energia', 'Ultima medicao'];
    const rows = allRecords.map((record) => [
      record.code,
      record.name,
      categoryMeta[record.category].label,
      record.location,
      statusLabel[record.status],
      record.responsible,
      record.flowRate ?? '',
      resolveLevelOrCapacity(record),
      record.energyType ?? '',
      record.lastReading,
    ]);
    const tsv = [headers, ...rows].map((row) => row.map((value) => String(value).replace(/\t/g, ' ')).join('\t')).join('\n');
    downloadTextFile(tsv, 'sighidro-planilha-ativos.tsv', 'text/tab-separated-values;charset=utf-8');
  };

  return (
    <motion.main
      animate="show"
      className="dashboard"
      id="main-content"
      initial={shouldReduceMotion ? false : 'hidden'}
      tabIndex={-1}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.36, ease: 'easeOut' }}
      variants={fadeUp}
    >
      <motion.section className="hero-strip" variants={fadeUp}>
        <div>
          <span className="eyebrow">Centro de Inteligência Hídrica Municipal</span>
          <h1>Operação integrada do abastecimento público</h1>
        </div>
        <div className="hero-actions" aria-label="Indicadores rápidos">
          <span>
            <CheckCircle2 size={18} />
            {Math.max(0, allRecords.filter((record) => record.status === 'operando').length)} ativos operando
          </span>
          <span>
            <CircleGauge size={18} />
            {dashboardAlerts.length} alertas em triagem
          </span>
          <span>
            {backend === 'api' ? (
              <>
                <strong>
                  {syncStatus === 'syncing' ? 'Sincronizando…' : syncStatus === 'failed' ? 'Sincronização pendente' : 'Sincronizado'}
                </strong>
                <button className="ghost-action sync-action" type="button" onClick={() => { void retrySync(); }}>
                  Sincronizar
                </button>
              </>
            ) : (
              <em>Modo local</em>
            )}
          </span>
        </div>
      </motion.section>

      <motion.section className="metrics-grid" aria-label="Indicadores operacionais" variants={fadeUp}>
        {indicators.map((indicator) => (
          <KpiCard key={indicator.label} indicator={indicator} />
        ))}
      </motion.section>

      <motion.section className="operations-grid" variants={fadeUp}>
        <OperationalMap records={allRecords} />
        <AlertPanel alerts={dashboardAlerts} />
      </motion.section>

      <section className="analytics-grid">
        <FlowChart data={flowData} />
        <ProductionChart data={productionData} />
        <MaintenancePanel rows={maintenanceRows} />
      </section>

      <section className="modules-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Estrutura modular</span>
            <h2>Módulos do SIGHIDRO</h2>
          </div>
          <span className="section-note">Base preparada para expansão operacional e administrativa.</span>
        </div>
        <div className="modules-grid">
          {systemModules.slice(0, 5).map((module) => {
            const Icon = module.icon;

            return (
              <Link className={`module-card accent-${module.accent}`} key={module.id} to={module.path}>
                <div className="module-topline">
                  <span className="module-icon">
                    <Icon size={22} />
                  </span>
                  <span className={`status-pill status-${module.status}`}>{statusLabel[module.status]}</span>
                </div>
                <h3>{module.title}</h3>
                <p>{module.description}</p>
                <div className="module-items">
                  {module.items.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <AdvancedFilters records={allRecords} onApply={setAppliedFilters} />
      <AssetTable records={visibleRecords} onExportCsv={exportDashboardCsv} onExportSheet={exportDashboardSheet} />
    </motion.main>
  );
}

const downloadTextFile = (content: string, filename: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

function makeIndicators(registry: ReturnType<typeof useHydroRegistry>['registry']): Indicator[] {
  const wells = registry.poço;
  const pumps = registry.bomba;
  const reservoirs = registry.reservatório;
  const activeWells = wells.filter((record) => record.status === 'operando').length;
  const attentionWells = wells.filter((record) => record.status === 'atenção').length;
  const reservoirLevels = reservoirs
    .map((record) => record.reservoirLevel)
    .filter((level): level is number => typeof level === 'number');
  const reservoirAverage = reservoirLevels.length
    ? Math.round(reservoirLevels.reduce((total, level) => total + level, 0) / reservoirLevels.length)
    : 0;
  const pumpMaintenance = pumps.filter((record) => record.status === 'manutenção').length;
  const totalFlow = [...wells, ...reservoirs].reduce((total, record) => total + Number(record.flowRate || 0), 0);

  return [
    {
      label: 'Poços ativos',
      value: String(activeWells),
      detail: `${attentionWells} com atenção operacional`,
      trend: attentionWells > 0 ? 'stable' : 'up',
    },
    {
      label: 'Reservatório médio',
      value: `${reservoirAverage}%`,
      detail: `${reservoirs.length} reservatório(s) cadastrado(s)`,
      trend: reservoirAverage >= 70 ? 'up' : 'down',
    },
    {
      label: 'Bombas em manutenção',
      value: String(pumpMaintenance),
      detail: `${pumps.length} bomba(s) no cadastro`,
      trend: pumpMaintenance > 0 ? 'down' : 'stable',
    },
    {
      label: 'Vazão cadastrada',
      value: `${totalFlow} m³/h`,
      detail: 'soma dos ativos monitorados',
      trend: totalFlow > 120 ? 'up' : 'stable',
    },
  ];
}

function makeAlerts(records: HydroRecord[]): Alert[] {
  const severityByStatus: Partial<Record<OperationalStatus, Alert['severity']>> = {
    atenção: 'warning',
    parado: 'critical',
    manutenção: 'warning',
  };

  return records
    .filter((record) => record.status !== 'operando')
    .slice(0, 3)
    .map((record, index) => ({
      id: `ALT-${record.id}`,
      title:
        record.status === 'parado'
          ? 'Ativo parado'
          : record.status === 'manutenção'
            ? 'Manutenção em andamento'
            : 'Atenção operacional',
      source: record.name,
      severity: severityByStatus[record.status] ?? 'info',
      time: index === 0 ? 'há 18 min' : index === 1 ? 'hoje' : 'há 2h',
    }));
}

function makeMaintenances(records: HydroRecord[]): Maintenance[] {
  return records
    .filter((record) => record.status === 'manutenção' || record.status === 'atenção')
    .slice(0, 3)
    .map((record, index) => ({
      id: `OS-${record.id}`,
      asset: record.name,
      service: record.status === 'manutenção' ? 'Intervenção técnica' : 'Verificação operacional',
      profile: record.responsible,
      dueIn: index === 0 ? 'Hoje' : `${index + 2} dias`,
      status: record.status,
    }));
}

function KpiCard({ indicator }: { indicator: Indicator }) {
  const TrendIcon = indicator.trend === 'up' ? ArrowUpRight : indicator.trend === 'down' ? ArrowDownRight : CircleGauge;
  const trendLabel = indicator.trend === 'up' ? 'Alta' : indicator.trend === 'down' ? 'Queda' : 'Estável';

  return (
    <article className={`kpi-card kpi-${indicator.trend}`}>
      <div className="kpi-topline">
        <span>{indicator.label}</span>
        <span className="kpi-trend">
          <TrendIcon size={15} />
          {trendLabel}
        </span>
      </div>
      <strong>{indicator.value}</strong>
      <small>{indicator.detail}</small>
    </article>
  );
}

function OperationalMap({ records }: { records: HydroRecord[] }) {
  return (
    <section className="panel map-panel" id="mapa">
      <PanelHeader title="Mapa operacional" icon={<Map size={19} />} actionTo="/mapa" actionLabel="Abrir mapa operacional" />
      <div className="map-canvas real-map-shell" aria-label="Mapa operacional com ativos georreferenciados">
        <Suspense fallback={<MapFallback />}>
          <OperationalLeafletMap records={records} />
        </Suspense>
        <div className="map-legend">
          <span>
            <i className="legend-dot operando" />
            Operando
          </span>
          <span>
            <i className="legend-dot atenção" />
            Atenção
          </span>
          <span>
            <i className="legend-dot parado" />
            Parado
          </span>
          <span>
            <i className="legend-line" />
            Rede
          </span>
        </div>
      </div>
    </section>
  );
}

function AlertPanel({ alerts }: { alerts: Alert[] }) {
  return (
    <section className="panel alert-panel">
      <PanelHeader title="Alertas críticos" icon={<AlertTriangle size={19} />} actionTo="/monitoramento" actionLabel="Abrir monitoramento" />
      <div className="alert-list">
        {alerts.length ? alerts.map((alert) => <AlertRow key={alert.id} alert={alert} />) : <EmptyState text="Sem alertas críticos no cadastro atual." />}
      </div>
    </section>
  );
}

function AlertRow({ alert }: { alert: Alert }) {
  return (
    <article className={`alert-row severity-${alert.severity}`}>
      <span className="severity-icon">
        <AlertTriangle size={18} />
      </span>
      <div>
        <strong>{alert.title}</strong>
        <span>{alert.source}</span>
      </div>
      <time>{alert.time}</time>
    </article>
  );
}

const flowValueFormatter = (value: number) => `${value} m³/h`;
const productionValueFormatter = (value: number) => `${value}%`;

function FlowChart({ data }: { data: Array<{ day: string; Vazao: number }> }) {
  const points = data.map((point) => ({ label: point.day, value: point.Vazao }));

  return (
    <section className="panel chart-panel">
      <PanelHeader title="Vazão hídrica diária" icon={<Waves size={19} />} actionTo="/monitoramento" actionLabel="Abrir monitoramento de vazão" />
      <AreaSparkline points={points} />
      <div className="chart-summary">
        <strong>{flowValueFormatter(data.at(-1)?.Vazao ?? 0)}</strong>
        <span>Última leitura consolidada</span>
      </div>
    </section>
  );
}

function ProductionChart({ data }: { data: Array<{ month: string; Producao: number }> }) {
  const points = data.map((point) => ({ label: point.month, value: point.Producao }));

  return (
    <section className="panel chart-panel">
      <PanelHeader title="Produção total mensal" icon={<CircleGauge size={19} />} actionTo="/relatorios" actionLabel="Abrir relatórios" />
      <BarVisualization points={points} />
      <div className="chart-summary">
        <strong>{productionValueFormatter(data.at(-1)?.Producao ?? 0)}</strong>
        <span>Produção acumulada no mês</span>
      </div>
    </section>
  );
}

function AreaSparkline({ points }: { points: ChartPoint[] }) {
  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const polylinePoints = points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * 100;
      const y = 92 - (point.value / maxValue) * 76;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="line-chart">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="flowGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#2aa6b5" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#2aa6b5" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline className="chart-area" points={`0,100 ${polylinePoints} 100,100`} />
        <polyline className="chart-line" points={polylinePoints} />
      </svg>
      <div className="axis-labels">
        {points.map((point) => (
          <span key={point.label}>{point.label}</span>
        ))}
      </div>
    </div>
  );
}

function BarVisualization({ points }: { points: ChartPoint[] }) {
  const maxValue = Math.max(...points.map((point) => point.value), 1);

  return (
    <div className="bar-chart">
      {points.map((point) => (
        <div className="bar-slot" key={point.label}>
          <span style={{ height: `${(point.value / maxValue) * 100}%` }} />
          <small>{point.label}</small>
        </div>
      ))}
    </div>
  );
}

function MaintenancePanel({ rows }: { rows: Maintenance[] }) {
  return (
    <section className="panel maintenance-panel">
      <PanelHeader title="Manutenção" icon={<Gauge size={19} />} actionTo="/manutencao" actionLabel="Abrir manutenção" />
      <div className="maintenance-list">
        {rows.length ? rows.map((maintenance) => <MaintenanceRow key={maintenance.id} maintenance={maintenance} />) : <EmptyState text="Sem manutenção pendente." />}
      </div>
      <div className="repair-time">
        <span>Tempo médio de reparo</span>
        <strong>4.2h</strong>
      </div>
    </section>
  );
}

function MaintenanceRow({ maintenance }: { maintenance: Maintenance }) {
  return (
    <article className="maintenance-row">
      <span className={`status-dot status-${maintenance.status}`} />
      <div>
        <strong>{maintenance.service}</strong>
        <span>{maintenance.asset}</span>
      </div>
      <time>{maintenance.dueIn}</time>
    </article>
  );
}

type DashboardFilters = {
  asset: string;
  type: string;
  location: string;
  responsible: string;
  period: string;
  minimumLevel: string;
};

type AppliedDashboardFilters = {
  filters: DashboardFilters;
  statuses: string[];
};

function AdvancedFilters({
  records,
  onApply,
}: {
  records: HydroRecord[];
  onApply: (filters: AppliedDashboardFilters | null) => void;
}) {
  const [feedback, setFeedback] = useState('');
  const [filters, setFilters] = useState({
    asset: '',
    type: 'all',
    location: '',
    responsible: 'all',
    period: 'week',
    minimumLevel: '',
  });
  const [activeStatuses, setActiveStatuses] = useState<string[]>([]);

  const updateFilter = (field: keyof typeof filters, value: string) => {
    setFilters((current) => ({ ...current, [field]: value }));
    setFeedback('');
  };

  const toggleStatus = (status: string) => {
    setActiveStatuses((current) =>
      current.includes(status) ? current.filter((item) => item !== status) : [...current, status],
    );
    setFeedback('');
  };

  const clearFilters = () => {
    setFilters({
      asset: '',
      type: 'all',
      location: '',
      responsible: 'all',
      period: 'week',
      minimumLevel: '',
    });
    setActiveStatuses([]);
    onApply(null);
    setFeedback('Filtros limpos.');
  };

  const saveView = () => {
    window.localStorage.setItem('sighidro:dashboard-view', JSON.stringify({ ...filters, statuses: activeStatuses }));
    setFeedback('Visão salva neste navegador.');
  };

  const applyFilters = () => {
    window.localStorage.setItem('sighidro:dashboard-active-filters', JSON.stringify({ ...filters, statuses: activeStatuses }));
    const filteredRecords = filterDashboardRecords(records, filters, activeStatuses);
    onApply({ filters: { ...filters }, statuses: [...activeStatuses] });
    setFeedback(`${filteredRecords.length} ativo(s) encontrado(s) com os filtros atuais.`);
  };

  return (
    <section className="panel filters-panel" aria-label="Filtros avançados do dashboard">
      <div className="filters-header">
        <div>
          <span className="eyebrow">Filtros avançados</span>
          <h2>Refino operacional</h2>
        </div>
        <div className="filters-actions">
          <button className="ghost-action" type="button" onClick={clearFilters}>
            Limpar
          </button>
          <button className="secondary-small" type="button" onClick={saveView}>
            Salvar visão
          </button>
          <button className="action-small" type="button" onClick={applyFilters}>
            Aplicar filtros
          </button>
        </div>
      </div>
      {feedback ? <div className="inline-feedback" role="status" aria-live="polite">{feedback}</div> : null}

      <div className="filters-grid">
        <label className="filter-field">
          <span>Ativo / código</span>
          <input value={filters.asset} onChange={(event) => updateFilter('asset', event.target.value)} placeholder="POC-001, BMB-012..." />
        </label>
        <label className="filter-field">
          <span>Tipo</span>
          <select value={filters.type} onChange={(event) => updateFilter('type', event.target.value)}>
            <option value="all">Todos</option>
            <option value="poço">Poços</option>
            <option value="bomba">Bombas</option>
            <option value="reservatório">Reservatórios</option>
            <option value="localidade">Localidades</option>
          </select>
        </label>
        <label className="filter-field">
          <span>Localidade</span>
          <input value={filters.location} onChange={(event) => updateFilter('location', event.target.value)} placeholder="Zona 1, Brejinho..." />
        </label>
        <label className="filter-field">
          <span>Responsável</span>
          <select value={filters.responsible} onChange={(event) => updateFilter('responsible', event.target.value)}>
            <option value="all">Todos</option>
            <option value="operador">Operador Hidráulico</option>
            <option value="tecnico">Técnico de Campo</option>
            <option value="gestor">Gestor Hídrico</option>
            <option value="admin">Administração Central</option>
          </select>
        </label>
        <label className="filter-field">
          <span>Período</span>
          <select value={filters.period} onChange={(event) => updateFilter('period', event.target.value)}>
            <option value="today">Hoje</option>
            <option value="week">Últimos 7 dias</option>
            <option value="month">Últimos 30 dias</option>
          </select>
        </label>
        <label className="filter-field">
          <span>Nível mínimo</span>
          <input
            min="0"
            inputMode="decimal"
            type="number"
            value={filters.minimumLevel}
            onChange={(event) => updateFilter('minimumLevel', event.target.value)}
            placeholder="% ou m³"
          />
        </label>
      </div>

      <div className="filters-chips" aria-label="Filtros por status">
        {[
          ['operando', 'Operando'],
          ['atenção', 'Atenção'],
          ['parado', 'Parado'],
          ['manutenção', 'Manutenção'],
        ].map(([value, label]) => (
          <button
            className={activeStatuses.includes(value) ? 'filter-chip active' : 'filter-chip'}
            key={value}
            type="button"
            aria-pressed={activeStatuses.includes(value)}
            onClick={() => toggleStatus(value)}
          >
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}

function AssetTable({
  onExportCsv,
  onExportSheet,
  records,
}: {
  onExportCsv: () => void;
  onExportSheet: () => void;
  records: HydroRecord[];
}) {
  return (
    <section className="panel table-panel">
      <PanelHeader title="Visão geral dos ativos" icon={<Droplets size={19} />} actionTo="/cadastro" actionLabel="Abrir cadastro hídrico" />
      <div className="table-toolbar">
        <div>
          <strong>{records.length} ativos monitorados</strong>
          <span>Atualizado agora pelo centro de controle</span>
        </div>
        <div className="table-actions">
          <button className="ghost-action" type="button" onClick={onExportCsv}>
            Exportar
          </button>
          <button className="ghost-action" type="button" onClick={onExportSheet}>
            Planilha
          </button>
        </div>
      </div>
      <div className="asset-table" role="table" aria-label="Visão geral dos ativos hídricos">
        <div className="asset-row table-head" role="row">
          <span role="columnheader">Código</span>
          <span role="columnheader">Ativo</span>
          <span role="columnheader">Categoria</span>
          <span role="columnheader">Localidade</span>
          <span role="columnheader">Status</span>
          <span role="columnheader">Responsável</span>
          <span role="columnheader">Vazão</span>
          <span role="columnheader">Nível/Capacidade</span>
          <span role="columnheader">Energia</span>
          <span role="columnheader">Última medição</span>
        </div>
        {!records.length ? <div className="empty-state" role="status">Nenhum ativo corresponde aos filtros atuais.</div> : null}
        {records.map((record) => (
          <div className="asset-row" key={record.id} role="row">
            <span role="cell" data-label="Código">{record.code}</span>
            <strong role="cell" data-label="Ativo" data-card-title>{record.name}</strong>
            <span role="cell" data-label="Categoria">{categoryMeta[record.category].label}</span>
            <span role="cell" data-label="Localidade">{record.location}</span>
            <span role="cell" data-label="Status" className="status-cell">
              <i className={`status-dot status-${record.status}`} />
              {statusLabel[record.status]}
            </span>
            <span role="cell" data-label="Responsável">{record.responsible}</span>
            <span role="cell" data-label="Vazão">{record.flowRate} m³/h</span>
            <span role="cell" data-label="Nível / capacidade">{resolveLevelOrCapacity(record)}</span>
            <span role="cell" data-label="Energia">{record.energyType ?? '-'}</span>
            <span role="cell" data-label="Última medição">{record.lastReading}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

const normalizeSearchText = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();

const parseRecordDate = (value: string) => {
  const brazilianDate = value.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);

  if (brazilianDate) {
    const [, day, month, year, hour = '0', minute = '0'] = brazilianDate;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

function filterDashboardRecords(records: HydroRecord[], filters: DashboardFilters, activeStatuses: string[]) {
  const assetQuery = normalizeSearchText(filters.asset);
  const locationQuery = normalizeSearchText(filters.location);
  const responsibleQuery = normalizeSearchText(filters.responsible);
  const minimumLevel = Number(filters.minimumLevel.replace(',', '.'));
  const datedRecords = records
    .map((record) => parseRecordDate(record.lastReading))
    .filter((date): date is Date => Boolean(date));
  const referenceDate = datedRecords.length
    ? new Date(Math.max(...datedRecords.map((date) => date.getTime())))
    : null;
  const periodInDays = filters.period === 'today' ? 1 : filters.period === 'month' ? 30 : 7;

  return records.filter((record) => {
    const searchableAsset = normalizeSearchText(`${record.code} ${record.name}`);
    const matchesAsset = !assetQuery || searchableAsset.includes(assetQuery);
    const matchesType = filters.type === 'all' || record.category === filters.type;
    const matchesLocation = !locationQuery || normalizeSearchText(record.location).includes(locationQuery);
    const matchesResponsible = filters.responsible === 'all'
      || normalizeSearchText(record.responsible).includes(responsibleQuery);
    const matchesStatus = !activeStatuses.length || activeStatuses.includes(record.status);
    const comparableLevel = record.reservoirLevel ?? record.capacityM3;
    const matchesMinimum = !filters.minimumLevel
      || (typeof comparableLevel === 'number' && comparableLevel >= minimumLevel);
    const recordDate = parseRecordDate(record.lastReading);
    const matchesPeriod = !referenceDate || !recordDate
      || referenceDate.getTime() - recordDate.getTime() < periodInDays * 24 * 60 * 60 * 1000;

    return matchesAsset
      && matchesType
      && matchesLocation
      && matchesResponsible
      && matchesStatus
      && matchesMinimum
      && matchesPeriod;
  });
}

const resolveLevelOrCapacity = (record: HydroRecord) => {
  if (typeof record.reservoirLevel === 'number') {
    return `${record.reservoirLevel}%`;
  }

  if (typeof record.capacityM3 === 'number') {
    return `${record.capacityM3} m³`;
  }

  return '-';
};

function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}

export default Dashboard;
