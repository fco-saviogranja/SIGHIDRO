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
  const { allRecords, registry, syncStatus, retrySync, backend, exportAssetsCsv, flowSeries, maintenanceByAsset } = useHydroRegistry();
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
  const maintenanceRows = useMemo(() => makeMaintenances(allRecords, maintenanceByAsset), [allRecords, maintenanceByAsset]);
  const flowData = useMemo(
    () => flowSeries.map((point) => ({ day: formatFlowDay(point.date), readings: point.readingCount, Vazao: point.value })),
    [flowSeries],
  );
  const reservoirData = useMemo(
    () => registry.reservatório.map((record) => ({ label: record.code, value: Number(record.reservoirLevel || 0) })),
    [registry.reservatório],
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
      <motion.section className="hero-strip dashboard-hero" variants={fadeUp}>
        <div>
          <span className="eyebrow">Operação hídrica</span>
          <h1>Visão geral da operação</h1>
        </div>
        <div className="hero-actions" aria-label="Indicadores rápidos">
          <span>
            <CheckCircle2 size={18} />
            {Math.max(0, allRecords.filter((record) => record.status === 'operando').length)} ativos operando
          </span>
          <span>
            <CircleGauge size={18} />
            {dashboardAlerts.length} pendências
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

      <motion.section className="metrics-grid dashboard-metrics-grid" aria-label="Indicadores operacionais" variants={fadeUp}>
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
        <ReservoirChart data={reservoirData} />
        <MaintenancePanel rows={maintenanceRows} />
      </section>

      <section className="modules-section dashboard-quick-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Navegação</span>
            <h2>Acessos rápidos</h2>
          </div>
          <span className="section-note">Abra diretamente a área necessária.</span>
        </div>
        <nav className="dashboard-quick-links" aria-label="Acessos rápidos do dashboard">
          {systemModules.slice(0, 5).map((module) => {
            const Icon = module.icon;

            return (
              <Link className="dashboard-quick-link" key={module.id} to={module.path}>
                <span className="module-icon">
                  <Icon size={20} />
                </span>
                <span>
                  <strong>{module.title}</strong>
                  <small>Abrir módulo</small>
                </span>
              </Link>
            );
          })}
        </nav>
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
    .map((record) => ({
      id: `ALT-${record.id}`,
      title:
        record.status === 'parado'
          ? 'Ativo parado'
          : record.status === 'manutenção'
            ? 'Manutenção em andamento'
            : 'Atenção operacional',
      source: record.name,
      severity: severityByStatus[record.status] ?? 'info',
      time: formatRelativeUpdate(record.updatedAt),
    }));
}

function makeMaintenances(
  records: HydroRecord[],
  maintenanceByAsset: ReturnType<typeof useHydroRegistry>['maintenanceByAsset'],
): Maintenance[] {
  const recordsById = new globalThis.Map(records.map((record) => [record.id, record]));

  return Object.values(maintenanceByAsset)
    .flat()
    .filter((order) => order.status === 'aberta' || order.status === 'em_andamento')
    .sort((left, right) => String(left.dueDate ?? '9999-12-31').localeCompare(String(right.dueDate ?? '9999-12-31')))
    .map((order) => ({
      asset: recordsById.get(order.assetId)?.name ?? 'Ativo removido',
      dueIn: formatDueDate(order.dueDate),
      id: order.id,
      profile: order.responsible,
      service: order.service,
      status: order.status === 'em_andamento' ? 'manutenção' : 'atenção',
    }));
}

const formatFlowDay = (date: string) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Fortaleza' })
    .format(new Date(`${date}T12:00:00-03:00`));

const formatRelativeUpdate = (updatedAt: string) => {
  const timestamp = new Date(updatedAt).getTime();
  if (!Number.isFinite(timestamp)) return 'data não informada';
  const elapsedMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000));
  if (elapsedMinutes < 1) return 'agora';
  if (elapsedMinutes < 60) return `há ${elapsedMinutes} min`;
  const elapsedHours = Math.round(elapsedMinutes / 60);
  if (elapsedHours < 24) return `há ${elapsedHours}h`;
  const elapsedDays = Math.round(elapsedHours / 24);
  return `há ${elapsedDays} dia${elapsedDays === 1 ? '' : 's'}`;
};

const formatDueDate = (dueDate?: string) => {
  if (!dueDate) return 'Sem prazo';
  const today = new Date();
  const todayKey = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const due = new Date(`${dueDate}T12:00:00`);
  if (Number.isNaN(due.getTime())) return dueDate;
  const dueKey = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  const days = Math.round((dueKey - todayKey) / 86_400_000);
  if (days < 0) return `${Math.abs(days)}d atrasada`;
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Amanhã';
  return `${days} dias`;
};

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

function FlowChart({ data }: { data: Array<{ day: string; readings: number; Vazao: number }> }) {
  const points = data.map((point) => ({ label: point.day, value: point.Vazao }));
  const lastPoint = data.at(-1);

  return (
    <section className="panel chart-panel">
      <PanelHeader title="Vazão hídrica diária" icon={<Waves size={19} />} actionTo="/monitoramento" actionLabel="Abrir monitoramento de vazão" />
      {points.length ? <AreaSparkline points={points} /> : <EmptyState text="Carregando histórico de vazão..." />}
      <div className="chart-summary">
        <strong>{flowValueFormatter(lastPoint?.Vazao ?? 0)}</strong>
        <span>{lastPoint?.readings ? `${lastPoint.readings} leitura(s) registrada(s) hoje` : 'Vazão atual consolidada dos ativos'}</span>
      </div>
    </section>
  );
}

function ReservoirChart({ data }: { data: ChartPoint[] }) {
  const average = data.length
    ? Math.round(data.reduce((total, point) => total + point.value, 0) / data.length)
    : 0;

  return (
    <section className="panel chart-panel">
      <PanelHeader title="Nível dos reservatórios" icon={<CircleGauge size={19} />} actionTo="/monitoramento" actionLabel="Abrir monitoramento de níveis" />
      {data.length ? <BarVisualization points={data} /> : <EmptyState text="Nenhum reservatório cadastrado." />}
      <div className="chart-summary">
        <strong>{average}%</strong>
        <span>Média atual dos reservatórios cadastrados</span>
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
        {rows.length ? rows.slice(0, 3).map((maintenance) => <MaintenanceRow key={maintenance.id} maintenance={maintenance} />) : <EmptyState text="Sem ordens de manutenção pendentes." />}
      </div>
      <div className="repair-time">
        <span>Ordens abertas ou em andamento</span>
        <strong>{rows.length}</strong>
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
    <details className="panel filters-panel dashboard-filter-details">
      <summary className="dashboard-filter-summary">
        <span>
          <span className="eyebrow">Consulta</span>
          <strong>Filtros avançados</strong>
        </span>
        <small>Expandir filtros</small>
      </summary>
      <div className="dashboard-filter-content" aria-label="Filtros avançados do dashboard">
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
      </div>
    </details>
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
