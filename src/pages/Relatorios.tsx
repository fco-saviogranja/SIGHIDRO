import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Database,
  Download,
  FileBarChart,
  FileJson,
  Gauge,
  Printer,
  RefreshCcw,
  Search,
  ShieldCheck,
  Waves,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useHydroRegistry } from '../HydroRegistryContext';
import { PanelHeader } from '../components/PanelHeader';
import { categoryMeta, categoryOrder, profileOptions, statusLabel, statusOptions } from '../metadata';
import type {
  AssetCategory,
  HydroAsset,
  HydroAssetReading,
  InternalProfile,
  MaintenanceOrder,
  OperationalStatus,
} from '../types';

type CategoryFilter = AssetCategory | 'all';
type StatusFilter = OperationalStatus | 'all';
type PeriodFilter = 'all' | '7' | '30' | '90';
type ReportMode = 'resumo' | 'ativos' | 'operacional' | 'manutencao';
type Feedback = { tone: 'success' | 'error' | 'info'; text: string };

type ReadingReportRow = HydroAssetReading & {
  asset: HydroAsset;
};

type MaintenanceReportRow = MaintenanceOrder & {
  asset: HydroAsset;
};

const reportModeLabels: Record<ReportMode, string> = {
  ativos: 'Ativos',
  manutencao: 'Manutenção',
  operacional: 'Operacional',
  resumo: 'Resumo',
};

const reportModeOrder: ReportMode[] = ['resumo', 'ativos', 'operacional', 'manutencao'];

const periodLabels: Record<PeriodFilter, string> = {
  '7': 'Últimos 7 dias',
  '30': 'Últimos 30 dias',
  '90': 'Últimos 90 dias',
  all: 'Todo período',
};

const maintenanceStatusLabel: Record<MaintenanceOrder['status'], string> = {
  aberta: 'Aberta',
  cancelada: 'Cancelada',
  concluida: 'Concluída',
  em_andamento: 'Em andamento',
};

const numberFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 1,
});

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const parseDate = (value?: string) => {
  if (!value) {
    return null;
  }

  const directDate = new Date(value);
  if (Number.isFinite(directDate.getTime())) {
    return directDate;
  }

  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  if (!match) {
    return null;
  }

  const [, day, month, year, hour = '00', minute = '00'] = match;
  const parsedDate = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  return Number.isFinite(parsedDate.getTime()) ? parsedDate : null;
};

const formatDateTime = (value?: string) => {
  const date = parseDate(value);
  return date ? dateTimeFormatter.format(date) : value || '-';
};

const formatDateOnly = (value?: string) => {
  const date = parseDate(value);
  return date ? dateFormatter.format(date) : value || '-';
};

const isWithinPeriod = (value: string | undefined, period: PeriodFilter) => {
  if (period === 'all') {
    return true;
  }

  const date = parseDate(value);
  if (!date) {
    return false;
  }

  const days = Number(period);
  return Date.now() - date.getTime() <= days * 24 * 60 * 60 * 1000;
};

const csvEscape = (value: unknown) => {
  const text = value == null ? '' : String(value);
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

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

function Relatorios() {
  const {
    allRecords,
    backend,
    isLoading,
    loadAssetDetails,
    maintenanceByAsset,
    readingsByAsset,
    retrySync,
    syncStatus,
  } = useHydroRegistry();
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [profileFilter, setProfileFilter] = useState<InternalProfile | 'all'>('all');
  const [query, setQuery] = useState('');
  const [reportMode, setReportMode] = useState<ReportMode>('resumo');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    if (!allRecords.length) {
      return;
    }

    void Promise.all(allRecords.map((record) => loadAssetDetails(record.id)));
  }, [allRecords, loadAssetDetails]);

  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return allRecords.filter((record) => {
      if (categoryFilter !== 'all' && record.category !== categoryFilter) {
        return false;
      }

      if (statusFilter !== 'all' && record.status !== statusFilter) {
        return false;
      }

      if (profileFilter !== 'all' && record.responsible !== profileFilter) {
        return false;
      }

      if (!isWithinPeriod(record.updatedAt || record.lastReading, periodFilter)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [record.code, record.name, record.location, record.responsible, record.notes]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    });
  }, [allRecords, categoryFilter, periodFilter, profileFilter, query, statusFilter]);

  const filteredIds = useMemo(() => new Set(filteredRecords.map((record) => record.id)), [filteredRecords]);

  const readingRows = useMemo(
    () =>
      filteredRecords
        .flatMap((asset) =>
          (readingsByAsset[asset.id] ?? []).map((reading) => ({
            ...reading,
            asset,
          })),
        )
        .filter((reading) => isWithinPeriod(reading.readingAt, periodFilter))
        .sort((first, second) => (parseDate(second.readingAt)?.getTime() ?? 0) - (parseDate(first.readingAt)?.getTime() ?? 0)),
    [filteredRecords, periodFilter, readingsByAsset],
  );

  const maintenanceRows = useMemo(
    () =>
      allRecords
        .filter((asset) => filteredIds.has(asset.id))
        .flatMap((asset) =>
          (maintenanceByAsset[asset.id] ?? []).map((order) => ({
            ...order,
            asset,
          })),
        )
        .filter((order) => isWithinPeriod(order.updatedAt || order.createdAt, periodFilter))
        .sort((first, second) => (parseDate(second.updatedAt)?.getTime() ?? 0) - (parseDate(first.updatedAt)?.getTime() ?? 0)),
    [allRecords, filteredIds, maintenanceByAsset, periodFilter],
  );

  const metrics = useMemo(() => makeReportMetrics(filteredRecords, readingRows, maintenanceRows), [filteredRecords, maintenanceRows, readingRows]);
  const categoryBreakdown = useMemo(() => makeCategoryBreakdown(filteredRecords), [filteredRecords]);
  const statusBreakdown = useMemo(() => makeStatusBreakdown(filteredRecords), [filteredRecords]);

  const clearFilters = () => {
    setCategoryFilter('all');
    setPeriodFilter('all');
    setProfileFilter('all');
    setQuery('');
    setStatusFilter('all');
  };

  const reloadData = async () => {
    const success = await retrySync();
    if (success) {
      await Promise.all(allRecords.map((record) => loadAssetDetails(record.id)));
    }

    setFeedback({
      tone: success ? 'success' : 'error',
      text: success ? 'Relatórios atualizados com a base mais recente.' : 'Não foi possível atualizar os relatórios agora.',
    });
  };

  const buildReportPayload = () => ({
    assets: filteredRecords,
    filters: {
      category: categoryFilter,
      period: periodFilter,
      profile: profileFilter,
      query,
      status: statusFilter,
    },
    generatedAt: new Date().toISOString(),
    maintenance: maintenanceRows,
    metrics,
    readings: readingRows,
    reportMode,
  });

  const exportCsv = () => {
    const csv = buildCsv(reportMode, filteredRecords, readingRows, maintenanceRows, metrics);
    downloadTextFile(csv, `relatorio-${reportMode}.csv`, 'text/csv;charset=utf-8');
    setFeedback({ tone: 'success', text: `CSV de ${reportModeLabels[reportMode].toLowerCase()} exportado.` });
  };

  const exportJson = () => {
    downloadTextFile(JSON.stringify(buildReportPayload(), null, 2), `relatorio-${reportMode}.json`, 'application/json;charset=utf-8');
    setFeedback({ tone: 'success', text: `JSON de ${reportModeLabels[reportMode].toLowerCase()} exportado.` });
  };

  const printReport = () => {
    setFeedback({ tone: 'info', text: 'Abrindo impressão do relatório atual.' });
    window.setTimeout(() => window.print(), 50);
  };

  return (
    <main className="dashboard route-page reports-page">
      <section className="page-hero">
        <div>
          <span className="eyebrow">Relatórios</span>
          <h1>Relatórios administrativos e operacionais</h1>
          <p>
            Consolide ativos, leituras, manutenção e indicadores filtrados para auditoria, prestação de contas e acompanhamento
            executivo.
          </p>
        </div>
        <div className="page-hero-actions">
          <div className="sync-info">
            {backend === 'api' ? (
              <>
                <strong>
                  {syncStatus === 'syncing'
                    ? 'Sincronizando...'
                    : syncStatus === 'failed'
                      ? 'Sincronização pendente'
                      : syncStatus === 'offline'
                        ? 'Offline'
                        : 'Sincronizado'}
                </strong>
                <button className="ghost-action sync-action" type="button" onClick={() => { void reloadData(); }}>
                  Sincronizar
                </button>
              </>
            ) : (
              <em>Modo local</em>
            )}
          </div>
          <button className="secondary-action" type="button" onClick={exportCsv}>
            <Download size={18} />
            Exportar CSV
          </button>
          <button className="secondary-action" type="button" onClick={exportJson}>
            <FileJson size={18} />
            Exportar JSON
          </button>
          <button className="secondary-action" type="button" onClick={printReport}>
            <Printer size={18} />
            Imprimir
          </button>
          <button className="secondary-action" type="button" onClick={() => { void reloadData(); }}>
            <RefreshCcw size={18} />
            Atualizar
          </button>
        </div>
      </section>

      <section className="page-metrics-grid reports-metrics-grid" aria-label="Indicadores dos relatórios">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <article className="page-metric-card" key={metric.label}>
              <Icon size={20} />
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <small>{metric.detail}</small>
            </article>
          );
        })}
      </section>

      <section className="panel registry-tools reports-tools" aria-label="Filtros de relatórios">
        <label className="search-field registry-search-field">
          <span>Busca</span>
          <div className="input-with-icon">
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Código, ativo, localidade ou observação" />
          </div>
        </label>
        <label className="filter-field">
          <span>Tipo</span>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as CategoryFilter)}>
            <option value="all">Todos</option>
            {categoryOrder.map((category) => (
              <option key={category} value={category}>
                {categoryMeta[category].label}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field">
          <span>Status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
            <option value="all">Todos</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {statusLabel[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field">
          <span>Responsável</span>
          <select value={profileFilter} onChange={(event) => setProfileFilter(event.target.value as InternalProfile | 'all')}>
            <option value="all">Todos</option>
            {profileOptions.map((profile) => (
              <option key={profile} value={profile}>
                {profile}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field">
          <span>Período</span>
          <select value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value as PeriodFilter)}>
            {Object.entries(periodLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button className="secondary-action reports-clear-action" type="button" onClick={clearFilters}>
          Limpar filtros
        </button>
      </section>

      {feedback ? <div className={`feedback-banner feedback-${feedback.tone}`}>{feedback.text}</div> : null}

      <section className="panel reports-mode-panel" aria-label="Tipo de relatório">
        {reportModeOrder.map((mode) => (
          <button
            className={reportMode === mode ? 'filter-chip active' : 'filter-chip'}
            key={mode}
            type="button"
            onClick={() => setReportMode(mode)}
          >
            {reportModeLabels[mode]}
          </button>
        ))}
      </section>

      <section className="reports-layout">
        <section className="panel reports-summary-panel">
          <PanelHeader title="Resumo consolidado" icon={<FileBarChart size={19} />} />
          <div className="reports-statement">
            <span>Relatório atual</span>
            <strong>{reportModeLabels[reportMode]}</strong>
            <small>{filteredRecords.length} ativo(s), {readingRows.length} leitura(s), {maintenanceRows.length} OS</small>
          </div>
          <div className="reports-breakdown-grid">
            <ReportBreakdown title="Por tipo de ativo" items={categoryBreakdown} />
            <ReportBreakdown title="Por status operacional" items={statusBreakdown} />
          </div>
        </section>

        <section className="panel reports-insight-panel">
          <PanelHeader title="Leitura executiva" icon={<ShieldCheck size={19} />} />
          <div className="reports-insight-list">
            {makeInsights(filteredRecords, readingRows, maintenanceRows).map((insight) => (
              <article className={`reports-insight-row insight-${insight.tone}`} key={insight.title}>
                <span>{insight.label}</span>
                <strong>{insight.title}</strong>
                <small>{insight.detail}</small>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="panel table-panel reports-table-panel">
        <PanelHeader title={`Tabela de ${reportModeLabels[reportMode].toLowerCase()}`} icon={<BarChart3 size={19} />} />
        <div className="table-toolbar">
          <div>
            <strong>{isLoading ? 'Carregando base...' : getTableCount(reportMode, filteredRecords, readingRows, maintenanceRows)}</strong>
            <span>{periodLabels[periodFilter]} com os filtros atuais</span>
          </div>
        </div>
        <ReportTable mode={reportMode} assets={filteredRecords} readings={readingRows} maintenance={maintenanceRows} metrics={metrics} />
      </section>
    </main>
  );
}

function makeReportMetrics(records: HydroAsset[], readings: ReadingReportRow[], maintenance: MaintenanceReportRow[]) {
  const totalFlow = records.reduce((total, record) => total + (record.flowRate ?? 0), 0);
  const levels = records
    .map((record) => record.reservoirLevel)
    .filter((level): level is number => typeof level === 'number' && Number.isFinite(level));
  const averageLevel = levels.length ? levels.reduce((total, level) => total + level, 0) / levels.length : 0;
  const activeMaintenance = maintenance.filter((order) => order.status === 'aberta' || order.status === 'em_andamento').length;

  return [
    {
      detail: 'na base filtrada',
      icon: Database,
      label: 'Ativos',
      value: String(records.length),
    },
    {
      detail: 'fora da operação normal',
      icon: AlertTriangle,
      label: 'Ocorrências',
      value: String(records.filter((record) => record.status !== 'operando').length),
    },
    {
      detail: `${readings.length} leitura(s) filtradas`,
      icon: Gauge,
      label: 'Nível médio',
      value: `${numberFormatter.format(averageLevel)}%`,
    },
    {
      detail: `${numberFormatter.format(totalFlow)} m³/h monitorados`,
      icon: Waves,
      label: 'OS ativas',
      value: String(activeMaintenance),
    },
  ];
}

function makeCategoryBreakdown(records: HydroAsset[]) {
  const total = Math.max(records.length, 1);
  return categoryOrder.map((category) => ({
    label: categoryMeta[category].label,
    value: records.filter((record) => record.category === category).length,
    width: `${(records.filter((record) => record.category === category).length / total) * 100}%`,
  }));
}

function makeStatusBreakdown(records: HydroAsset[]) {
  const total = Math.max(records.length, 1);
  return statusOptions.map((status) => ({
    label: statusLabel[status],
    value: records.filter((record) => record.status === status).length,
    width: `${(records.filter((record) => record.status === status).length / total) * 100}%`,
  }));
}

function makeInsights(records: HydroAsset[], readings: ReadingReportRow[], maintenance: MaintenanceReportRow[]) {
  const alertAssets = records.filter((record) => record.status !== 'operando');
  const criticalMaintenance = maintenance.filter((order) => order.status === 'aberta' || order.status === 'em_andamento');
  const missingReadings = records.filter((record) => !record.lastReading);

  return [
    {
      detail: alertAssets.length ? 'Há ativos que exigem acompanhamento técnico.' : 'A base filtrada está sem alerta operacional.',
      label: 'Operação',
      title: alertAssets.length ? `${alertAssets.length} ativo(s) em atenção` : 'Operação estável',
      tone: alertAssets.length ? 'warning' : 'stable',
    },
    {
      detail: criticalMaintenance.length ? 'Priorize conclusão ou atualização de prazo.' : 'Não há OS ativa nos filtros atuais.',
      label: 'Manutenção',
      title: criticalMaintenance.length ? `${criticalMaintenance.length} OS ativa(s)` : 'Sem pendência ativa',
      tone: criticalMaintenance.length ? 'warning' : 'stable',
    },
    {
      detail: readings.length ? 'Leituras registradas aparecem no relatório operacional.' : 'Sem leitura carregada para a seleção atual.',
      label: 'Telemetria',
      title: readings.length ? `${readings.length} leitura(s)` : `${missingReadings.length} sem leitura`,
      tone: readings.length ? 'stable' : 'warning',
    },
  ];
}

function getTableCount(mode: ReportMode, assets: HydroAsset[], readings: ReadingReportRow[], maintenance: MaintenanceReportRow[]) {
  if (mode === 'operacional') {
    return `${readings.length} leitura(s)`;
  }

  if (mode === 'manutencao') {
    return `${maintenance.length} ordem(ns)`;
  }

  if (mode === 'resumo') {
    return 'Resumo consolidado';
  }

  return `${assets.length} ativo(s)`;
}

function ReportBreakdown({ items, title }: { items: { label: string; value: number; width: string }[]; title: string }) {
  return (
    <div className="reports-breakdown">
      <strong>{title}</strong>
      {items.map((item) => (
        <article key={item.label}>
          <div>
            <span>{item.label}</span>
            <small>{item.value}</small>
          </div>
          <span className="reports-progress">
            <i style={{ width: item.width }} />
          </span>
        </article>
      ))}
    </div>
  );
}

function ReportTable({
  assets,
  maintenance,
  metrics,
  mode,
  readings,
}: {
  assets: HydroAsset[];
  maintenance: MaintenanceReportRow[];
  metrics: ReturnType<typeof makeReportMetrics>;
  mode: ReportMode;
  readings: ReadingReportRow[];
}) {
  if (mode === 'resumo') {
    return (
      <div className="asset-table reports-summary-table" role="table" aria-label="Resumo consolidado">
        <div className="asset-row table-head" role="row">
          <span>Indicador</span>
          <span>Valor</span>
          <span>Detalhe</span>
        </div>
        {metrics.map((metric) => (
          <div className="asset-row" key={metric.label} role="row">
            <strong>{metric.label}</strong>
            <span>{metric.value}</span>
            <span>{metric.detail}</span>
          </div>
        ))}
      </div>
    );
  }

  if (mode === 'operacional') {
    return (
      <div className="asset-table reports-operational-table" role="table" aria-label="Leituras operacionais">
        <div className="asset-row table-head" role="row">
          <span>Data</span>
          <span>Ativo</span>
          <span>Tipo</span>
          <span>Vazão</span>
          <span>Nível</span>
          <span>Operador</span>
          <span>Observação</span>
        </div>
        {readings.length ? (
          readings.map((reading) => (
            <div className="asset-row" key={reading.id} role="row">
              <span>{formatDateTime(reading.readingAt)}</span>
              <strong>{reading.asset.code} · {reading.asset.name}</strong>
              <span>{categoryMeta[reading.asset.category].label}</span>
              <span>{reading.flowRate == null ? '-' : `${numberFormatter.format(reading.flowRate)} m³/h`}</span>
              <span>{reading.reservoirLevel == null ? '-' : `${numberFormatter.format(reading.reservoirLevel)}%`}</span>
              <span>{reading.operatorName || '-'}</span>
              <span>{reading.notes || '-'}</span>
            </div>
          ))
        ) : (
          <EmptyState text="Sem leituras registradas para os filtros atuais." />
        )}
      </div>
    );
  }

  if (mode === 'manutencao') {
    return (
      <div className="asset-table reports-maintenance-table" role="table" aria-label="Ordens de manutenção">
        <div className="asset-row table-head" role="row">
          <span>Ativo</span>
          <span>Serviço</span>
          <span>Status</span>
          <span>Responsável</span>
          <span>Prazo</span>
          <span>Atualizado</span>
          <span>Observação</span>
        </div>
        {maintenance.length ? (
          maintenance.map((order) => (
            <div className="asset-row" key={order.id} role="row">
              <strong>{order.asset.code} · {order.asset.name}</strong>
              <span>{order.service}</span>
              <span>{maintenanceStatusLabel[order.status]}</span>
              <span>{order.responsible}</span>
              <span>{formatDateOnly(order.dueDate)}</span>
              <span>{formatDateTime(order.updatedAt)}</span>
              <span>{order.notes || '-'}</span>
            </div>
          ))
        ) : (
          <EmptyState text="Sem manutenção registrada para os filtros atuais." />
        )}
      </div>
    );
  }

  return (
    <div className="asset-table reports-assets-table" role="table" aria-label="Ativos do relatório">
      <div className="asset-row table-head" role="row">
        <span>Código</span>
        <span>Ativo</span>
        <span>Tipo</span>
        <span>Status</span>
        <span>Responsável</span>
        <span>Vazão</span>
        <span>Nível</span>
        <span>Última leitura</span>
      </div>
      {assets.length ? (
        assets.map((asset) => (
          <div className="asset-row" key={asset.id} role="row">
            <span>{asset.code}</span>
            <strong>{asset.name}</strong>
            <span>{categoryMeta[asset.category].label}</span>
            <span>
              <i className={`status-dot status-${asset.status}`} />
              {statusLabel[asset.status]}
            </span>
            <span>{asset.responsible}</span>
            <span>{asset.flowRate == null ? '-' : `${numberFormatter.format(asset.flowRate)} m³/h`}</span>
            <span>{asset.reservoirLevel == null ? '-' : `${numberFormatter.format(asset.reservoirLevel)}%`}</span>
            <span>{formatDateTime(asset.lastReading)}</span>
          </div>
        ))
      ) : (
        <EmptyState text="Nenhum ativo encontrado para os filtros atuais." />
      )}
    </div>
  );
}

function buildCsv(
  mode: ReportMode,
  assets: HydroAsset[],
  readings: ReadingReportRow[],
  maintenance: MaintenanceReportRow[],
  metrics: ReturnType<typeof makeReportMetrics>,
) {
  if (mode === 'resumo') {
    const rows = metrics.map((metric) => ['Resumo', metric.label, metric.value, metric.detail]);
    return [['Seção', 'Indicador', 'Valor', 'Detalhe'], ...rows].map((row) => row.map(csvEscape).join(';')).join('\n');
  }

  if (mode === 'operacional') {
    const rows = readings.map((reading) => [
      formatDateTime(reading.readingAt),
      reading.asset.code,
      reading.asset.name,
      categoryMeta[reading.asset.category].label,
      reading.flowRate ?? '',
      reading.reservoirLevel ?? '',
      reading.operatorName,
      reading.notes,
    ]);
    return [['Data', 'Codigo', 'Ativo', 'Tipo', 'Vazao', 'Nivel', 'Operador', 'Observacao'], ...rows]
      .map((row) => row.map(csvEscape).join(';'))
      .join('\n');
  }

  if (mode === 'manutencao') {
    const rows = maintenance.map((order) => [
      order.asset.code,
      order.asset.name,
      order.service,
      maintenanceStatusLabel[order.status],
      order.responsible,
      order.dueDate ?? '',
      order.updatedAt,
      order.notes,
    ]);
    return [['Codigo', 'Ativo', 'Servico', 'Status', 'Responsavel', 'Prazo', 'Atualizado', 'Observacao'], ...rows]
      .map((row) => row.map(csvEscape).join(';'))
      .join('\n');
  }

  const rows = assets.map((asset) => [
    asset.code,
    asset.name,
    categoryMeta[asset.category].label,
    statusLabel[asset.status],
    asset.location,
    asset.responsible,
    asset.flowRate ?? '',
    asset.reservoirLevel ?? '',
    asset.lastReading,
  ]);
  return [['Codigo', 'Ativo', 'Tipo', 'Status', 'Localizacao', 'Responsavel', 'Vazao', 'Nivel', 'Ultima leitura'], ...rows]
    .map((row) => row.map(csvEscape).join(';'))
    .join('\n');
}

function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}

export default Relatorios;
