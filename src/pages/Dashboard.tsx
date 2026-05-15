import {
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  CircleGauge,
  Droplets,
  Gauge,
  Map,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import {
  AreaChart,
  BarChart as TremorBarChart,
  Card as TremorCard,
  Metric,
  Text,
} from '@tremor/react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { useHydroRegistry } from '../HydroRegistryContext';
import { flowSeries, productionSeries } from '../data';
import { categoryMeta, statusLabel, systemModules } from '../metadata';
import type { Alert, HydroRecord, Indicator, Maintenance, OperationalStatus } from '../types';
import { PanelHeader } from '../components/PanelHeader';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';

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
  const trendVariant =
    indicator.trend === 'up' ? 'success' : indicator.trend === 'down' ? 'warning' : 'secondary';
  const trendLabel = indicator.trend === 'up' ? 'Alta' : indicator.trend === 'down' ? 'Queda' : 'Estavel';

  return (
    <TremorCard className="kpi-card">
      <div className="kpi-topline">
        <Text>{indicator.label}</Text>
        <Badge variant={trendVariant}>{trendLabel}</Badge>
      </div>
      <Metric>{indicator.value}</Metric>
      <Text className="kpi-detail">{indicator.detail}</Text>
    </TremorCard>
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
  return (
    <section className="panel chart-panel">
      <PanelHeader title="Vazão hídrica diária" icon={<CircleGauge size={19} />} />
      <div className="tremor-chart">
        <AreaChart
          data={data}
          index="day"
          categories={["Vazao"]}
          colors={['cyan']}
          valueFormatter={flowValueFormatter}
          showLegend={false}
          showAnimation
        />
      </div>
      <div className="chart-summary">
        <strong>{flowValueFormatter(data.at(-1)?.Vazao ?? 0)}</strong>
        <span>Última leitura consolidada</span>
      </div>
    </section>
  );
}

function ProductionChart({ data }: { data: Array<{ month: string; Producao: number }> }) {
  return (
    <section className="panel chart-panel">
      <PanelHeader title="Produção total mensal" icon={<CircleGauge size={19} />} />
      <div className="tremor-chart">
        <TremorBarChart
          data={data}
          index="month"
          categories={["Producao"]}
          colors={['blue']}
          valueFormatter={productionValueFormatter}
          showLegend={false}
        />
      </div>
      <div className="chart-summary">
        <strong>{productionValueFormatter(data.at(-1)?.Producao ?? 0)}</strong>
        <span>Produção acumulada no mês</span>
      </div>
    </section>
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
          <Button variant="ghost" size="sm" className="ghost-action" type="button">
            Limpar
          </Button>
          <Button variant="secondary" size="sm" className="action-small" type="button">
            Salvar visão
          </Button>
          <Button size="sm" className="action-small" type="button">
            Aplicar filtros
          </Button>
        </div>
      </div>

      <div className="filters-grid">
        <label className="filter-field">
          <span>Ativo / código</span>
          <Input placeholder="POC-001, BMB-012..." />
        </label>
        <label className="filter-field">
          <span>Tipo</span>
          <select
            defaultValue="all"
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"
          >
            <option value="all">Todos</option>
            <option value="poço">Poços</option>
            <option value="bomba">Bombas</option>
            <option value="reservatório">Reservatórios</option>
            <option value="localidade">Localidades</option>
          </select>
        </label>
        <label className="filter-field">
          <span>Localidade</span>
          <Input placeholder="Zona 1, Brejinho..." />
        </label>
        <label className="filter-field">
          <span>Responsável</span>
          <select
            defaultValue="all"
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"
          >
            <option value="all">Todos</option>
            <option value="operador">Operador Hidráulico</option>
            <option value="tecnico">Técnico de Campo</option>
            <option value="gestor">Gestor Hídrico</option>
            <option value="admin">Administração Central</option>
          </select>
        </label>
        <label className="filter-field">
          <span>Período</span>
          <select
            defaultValue="week"
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"
          >
            <option value="today">Hoje</option>
            <option value="week">Últimos 7 dias</option>
            <option value="month">Últimos 30 dias</option>
          </select>
        </label>
        <label className="filter-field">
          <span>Nível mínimo</span>
          <Input placeholder="% ou m³" />
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
  const [sorting, setSorting] = useState<SortingState>([]);
  const columns = useMemo<ColumnDef<HydroRecord>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Código',
      },
      {
        accessorKey: 'name',
        header: 'Ativo',
        cell: ({ getValue }) => <span className="font-semibold text-slate-900">{getValue<string>()}</span>,
      },
      {
        id: 'category',
        header: 'Categoria',
        accessorFn: (row) => categoryMeta[row.category].label,
      },
      {
        accessorKey: 'location',
        header: 'Localidade',
      },
      {
        id: 'status',
        header: 'Status',
        accessorFn: (row) => statusLabel[row.status],
        cell: ({ row }) => {
          const status = row.original.status;
          const variant =
            status === 'operando'
              ? 'success'
              : status === 'atenção'
                ? 'warning'
                : status === 'parado'
                  ? 'danger'
                  : 'secondary';

          return (
            <span className="inline-flex items-center gap-2">
              <i className={`status-dot status-${status}`} />
              <Badge variant={variant}>{statusLabel[status]}</Badge>
            </span>
          );
        },
      },
      {
        accessorKey: 'responsible',
        header: 'Responsável',
      },
      {
        id: 'flowRate',
        header: 'Vazão',
        accessorFn: (row) => row.flowRate,
        cell: ({ getValue }) => `${getValue<number>()} m³/h`,
      },
      {
        id: 'level',
        header: 'Nível/Capacidade',
        accessorFn: (row) => resolveLevelOrCapacity(row),
      },
      {
        id: 'energy',
        header: 'Energia',
        accessorFn: (row) => row.energyType ?? '-',
      },
      {
        accessorKey: 'lastReading',
        header: 'Última medição',
      },
    ],
    [],
  );

  const table = useReactTable({
    data: records,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <section className="panel table-panel">
      <PanelHeader title="Visão geral dos ativos" icon={<Droplets size={19} />} />
      <div className="table-toolbar">
        <div>
          <strong>{records.length} ativos monitorados</strong>
          <span>Atualizado agora pelo centro de controle</span>
        </div>
        <div className="table-actions">
          <Button variant="ghost" size="sm" className="ghost-action" type="button">
            Exportar
          </Button>
          <Button variant="ghost" size="sm" className="ghost-action" type="button">
            Planilha
          </Button>
        </div>
      </div>
      <div className="asset-table" aria-label="Visão geral dos ativos hídricos">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="table-head">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="table-sort"
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <ArrowUpDown size={14} />
                      </Button>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="asset-row">
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
