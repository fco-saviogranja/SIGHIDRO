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
import { useMemo } from 'react';
import { useHydroRegistry } from '../HydroRegistryContext';
import { flowSeries, productionSeries } from '../data';
import { categoryMeta, statusLabel, systemModules } from '../metadata';
import type { Alert, ChartPoint, HydroRecord, Indicator, Maintenance, OperationalStatus } from '../types';
import { PanelHeader } from '../components/PanelHeader';

function Dashboard() {
  const { allRecords, registry } = useHydroRegistry();
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

  return (
    <main className="dashboard">
      <section className="hero-strip">
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
        </div>
      </section>

      <section className="metrics-grid" aria-label="Indicadores operacionais">
        {indicators.map((indicator) => (
          <KpiCard key={indicator.label} indicator={indicator} />
        ))}
      </section>

      <section className="operations-grid">
        <OperationalMap records={allRecords} />
        <AlertPanel alerts={dashboardAlerts} />
      </section>

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

      <AdvancedFilters />
      <AssetTable records={allRecords} />
    </main>
  );
}

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
  const markerPositions = ['marker-pos-1', 'marker-pos-2', 'marker-pos-3', 'marker-pos-4', 'marker-pos-5'];
  const mapMarkers = records.slice(0, 5);

  return (
    <section className="panel map-panel" id="mapa">
      <PanelHeader title="Mapa operacional" icon={<Map size={19} />} />
      <div className="map-canvas" aria-label="Mapa operacional simulado com poços, reservatórios e rede">
        <svg className="pipeline-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path className="main-pipeline" d="M8 66 C25 55, 36 49, 51 48 S78 41, 94 29" />
          <path className="secondary-pipeline" d="M28 75 C39 67, 45 57, 49 49 S60 38, 67 34" />
          <path className="pressure-line" d="M49 48 C54 57, 61 62, 73 66" />
          <path className="warning-line" d="M31 72 C25 66, 22 59, 25 52" />
        </svg>
        <div className="terrain-label label-north">Serra Boa</div>
        <div className="terrain-label label-center">Jardim Centro</div>
        <div className="terrain-label label-east">Brejinho</div>
        {mapMarkers.map((marker, index) => (
          <button
            className={`map-marker ${markerPositions[index]} status-${marker.status}`}
            key={marker.id}
            type="button"
            aria-label={`${marker.name}: ${statusLabel[marker.status]}`}
          >
            <span />
          </button>
        ))}
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
      <PanelHeader title="Alertas críticos" icon={<AlertTriangle size={19} />} />
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
      <PanelHeader title="Vazão hídrica diária" icon={<Waves size={19} />} />
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
      <PanelHeader title="Produção total mensal" icon={<CircleGauge size={19} />} />
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
      <PanelHeader title="Manutenção" icon={<Gauge size={19} />} />
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

function AdvancedFilters() {
  return (
    <section className="panel filters-panel" aria-label="Filtros avançados do dashboard">
      <div className="filters-header">
        <div>
          <span className="eyebrow">Filtros avançados</span>
          <h2>Refino operacional</h2>
        </div>
        <div className="filters-actions">
          <button className="ghost-action" type="button">
            Limpar
          </button>
          <button className="secondary-small" type="button">
            Salvar visão
          </button>
          <button className="action-small" type="button">
            Aplicar filtros
          </button>
        </div>
      </div>

      <div className="filters-grid">
        <label className="filter-field">
          <span>Ativo / código</span>
          <input placeholder="POC-001, BMB-012..." />
        </label>
        <label className="filter-field">
          <span>Tipo</span>
          <select defaultValue="all">
            <option value="all">Todos</option>
            <option value="poço">Poços</option>
            <option value="bomba">Bombas</option>
            <option value="reservatório">Reservatórios</option>
            <option value="localidade">Localidades</option>
          </select>
        </label>
        <label className="filter-field">
          <span>Localidade</span>
          <input placeholder="Zona 1, Brejinho..." />
        </label>
        <label className="filter-field">
          <span>Responsável</span>
          <select defaultValue="all">
            <option value="all">Todos</option>
            <option value="operador">Operador Hidráulico</option>
            <option value="tecnico">Técnico de Campo</option>
            <option value="gestor">Gestor Hídrico</option>
            <option value="admin">Administração Central</option>
          </select>
        </label>
        <label className="filter-field">
          <span>Período</span>
          <select defaultValue="week">
            <option value="today">Hoje</option>
            <option value="week">Últimos 7 dias</option>
            <option value="month">Últimos 30 dias</option>
          </select>
        </label>
        <label className="filter-field">
          <span>Nível mínimo</span>
          <input placeholder="% ou m³" />
        </label>
      </div>

      <div className="filters-chips" aria-label="Filtros por status">
        <button className="filter-chip active" type="button">
          Operando
        </button>
        <button className="filter-chip" type="button">
          Atenção
        </button>
        <button className="filter-chip" type="button">
          Parado
        </button>
        <button className="filter-chip" type="button">
          Manutenção
        </button>
      </div>
    </section>
  );
}

function AssetTable({ records }: { records: HydroRecord[] }) {
  return (
    <section className="panel table-panel">
      <PanelHeader title="Visão geral dos ativos" icon={<Droplets size={19} />} />
      <div className="table-toolbar">
        <div>
          <strong>{records.length} ativos monitorados</strong>
          <span>Atualizado agora pelo centro de controle</span>
        </div>
        <div className="table-actions">
          <button className="ghost-action" type="button">
            Exportar
          </button>
          <button className="ghost-action" type="button">
            Planilha
          </button>
        </div>
      </div>
      <div className="asset-table" role="table" aria-label="Visão geral dos ativos hídricos">
        <div className="asset-row table-head" role="row">
          <span>Código</span>
          <span>Ativo</span>
          <span>Categoria</span>
          <span>Localidade</span>
          <span>Status</span>
          <span>Responsável</span>
          <span>Vazão</span>
          <span>Nível/Capacidade</span>
          <span>Energia</span>
          <span>Última medição</span>
        </div>
        {records.map((record) => (
          <div className="asset-row" key={record.id} role="row">
            <span>{record.code}</span>
            <strong>{record.name}</strong>
            <span>{categoryMeta[record.category].label}</span>
            <span>{record.location}</span>
            <span className="status-cell">
              <i className={`status-dot status-${record.status}`} />
              {statusLabel[record.status]}
            </span>
            <span>{record.responsible}</span>
            <span>{record.flowRate} m³/h</span>
            <span>{resolveLevelOrCapacity(record)}</span>
            <span>{record.energyType ?? '-'}</span>
            <span>{record.lastReading}</span>
          </div>
        ))}
      </div>
    </section>
  );
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
