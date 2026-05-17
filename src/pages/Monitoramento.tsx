import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Download,
  Gauge,
  RefreshCcw,
  Search,
  Waves,
} from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useHydroRegistry } from '../HydroRegistryContext';
import { PanelHeader } from '../components/PanelHeader';
import { categoryMeta, categoryOrder, statusLabel, statusOptions } from '../metadata';
import type { AssetCategory, HydroRecord, OperationalStatus } from '../types';

const OperationalLeafletMap = lazy(() => import('../components/OperationalLeafletMap'));

type CategoryFilter = AssetCategory | 'all';
type StatusFilter = OperationalStatus | 'all';
type MonitorSortKey = 'severity' | 'updatedAt' | 'flowRate' | 'reservoirLevel' | 'name';

const sortLabels: Record<MonitorSortKey, string> = {
  severity: 'Criticidade',
  updatedAt: 'Atualização',
  flowRate: 'Vazão',
  reservoirLevel: 'Nível',
  name: 'Nome',
};

const severityRank = {
  critical: 0,
  warning: 1,
  stable: 2,
} as const;

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

const toDateTimeInputValue = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};

const parseReadingDate = (value?: string) => {
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
  const date = parseReadingDate(value);
  return date ? dateTimeFormatter.format(date) : value || '-';
};

const formatFlow = (value?: number) =>
  typeof value === 'number' && Number.isFinite(value) ? `${numberFormatter.format(value)} m³/h` : '-';

const formatLevel = (record: HydroRecord) =>
  typeof record.reservoirLevel === 'number' && Number.isFinite(record.reservoirLevel)
    ? `${numberFormatter.format(record.reservoirLevel)}%`
    : '-';

const normalizeOptionalNumber = (value: string) => {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error('Informe valores numéricos válidos para vazão e nível.');
  }

  return parsed;
};

function getOperationalSeverity(record: HydroRecord) {
  const flowRate = typeof record.flowRate === 'number' ? record.flowRate : undefined;
  const reservoirLevel = typeof record.reservoirLevel === 'number' ? record.reservoirLevel : undefined;

  if (record.status === 'parado' || flowRate === 0 || (typeof reservoirLevel === 'number' && reservoirLevel <= 30)) {
    return {
      detail: 'Intervenção imediata',
      label: 'Crítico',
      tone: 'critical' as const,
    };
  }

  if (
    record.status === 'atenção' ||
    record.status === 'manutenção' ||
    (typeof reservoirLevel === 'number' && reservoirLevel <= 50)
  ) {
    return {
      detail: 'Acompanhar em campo',
      label: 'Alerta',
      tone: 'warning' as const,
    };
  }

  return {
    detail: 'Faixa operacional',
    label: 'Normal',
    tone: 'stable' as const,
  };
}

const isReadingStale = (record: HydroRecord) => {
  const date = parseReadingDate(record.lastReading);
  if (!date) {
    return true;
  }

  return Date.now() - date.getTime() > 24 * 60 * 60 * 1000;
};

function Monitoramento() {
  const {
    allRecords,
    backend,
    createReading,
    exportAssetsCsv,
    isLoading,
    loadAssetDetails,
    readingsByAsset,
    retrySync,
    syncStatus,
  } = useHydroRegistry();
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isSubmittingReading, setIsSubmittingReading] = useState(false);
  const [query, setQuery] = useState('');
  const [readingDraft, setReadingDraft] = useState({
    flowRate: '',
    notes: '',
    operatorName: 'Operador Hidráulico',
    readingAt: toDateTimeInputValue(),
    reservoirLevel: '',
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<MonitorSortKey>('severity');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return [...allRecords]
      .filter((record) => {
        if (categoryFilter !== 'all' && record.category !== categoryFilter) {
          return false;
        }

        if (statusFilter !== 'all' && record.status !== statusFilter) {
          return false;
        }

        if (!normalizedQuery) {
          return true;
        }

        return [record.code, record.name, record.location, record.responsible, record.notes]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      })
      .sort((firstRecord, secondRecord) => {
        if (sortKey === 'severity') {
          return severityRank[getOperationalSeverity(firstRecord).tone] - severityRank[getOperationalSeverity(secondRecord).tone];
        }

        if (sortKey === 'updatedAt') {
          return (
            (parseReadingDate(secondRecord.lastReading)?.getTime() ?? 0) -
            (parseReadingDate(firstRecord.lastReading)?.getTime() ?? 0)
          );
        }

        if (sortKey === 'flowRate') {
          return (secondRecord.flowRate ?? 0) - (firstRecord.flowRate ?? 0);
        }

        if (sortKey === 'reservoirLevel') {
          return (firstRecord.reservoirLevel ?? 101) - (secondRecord.reservoirLevel ?? 101);
        }

        return firstRecord.name.localeCompare(secondRecord.name, 'pt-BR');
      });
  }, [allRecords, categoryFilter, query, sortKey, statusFilter]);

  const selectedAsset = useMemo(
    () => filteredRecords.find((record) => record.id === selectedId) ?? filteredRecords[0] ?? null,
    [filteredRecords, selectedId],
  );
  const selectedReadings = useMemo(
    () =>
      selectedAsset
        ? [...(readingsByAsset[selectedAsset.id] ?? [])].sort(
            (firstReading, secondReading) =>
              (parseReadingDate(secondReading.readingAt)?.getTime() ?? 0) -
              (parseReadingDate(firstReading.readingAt)?.getTime() ?? 0),
          )
        : [],
    [readingsByAsset, selectedAsset],
  );
  const alertRecords = useMemo(
    () => filteredRecords.filter((record) => getOperationalSeverity(record).tone !== 'stable'),
    [filteredRecords],
  );
  const metrics = useMemo(() => makeMonitoringMetrics(allRecords), [allRecords]);

  useEffect(() => {
    if (selectedAsset && selectedAsset.id !== selectedId) {
      setSelectedId(selectedAsset.id);
    }
  }, [selectedAsset, selectedId]);

  useEffect(() => {
    if (!selectedAsset) {
      return;
    }

    void loadAssetDetails(selectedAsset.id);
    setReadingDraft({
      flowRate: selectedAsset.flowRate == null ? '' : String(selectedAsset.flowRate),
      notes: '',
      operatorName: selectedAsset.responsible,
      readingAt: toDateTimeInputValue(),
      reservoirLevel: selectedAsset.reservoirLevel == null ? '' : String(selectedAsset.reservoirLevel),
    });
  }, [loadAssetDetails, selectedAsset?.id]);

  const clearFilters = () => {
    setCategoryFilter('all');
    setQuery('');
    setSortKey('severity');
    setStatusFilter('all');
  };

  const exportCsv = async () => {
    try {
      const csv = await exportAssetsCsv({
        category: categoryFilter,
        q: query,
        status: statusFilter,
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'monitoramento-operacional.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setFeedback({ tone: 'success', text: 'CSV do monitoramento exportado com os filtros atuais.' });
    } catch (error) {
      setFeedback({ tone: 'error', text: error instanceof Error ? error.message : 'Falha ao exportar CSV.' });
    }
  };

  const reloadData = async () => {
    const success = await retrySync();
    setFeedback({
      tone: success ? 'success' : 'error',
      text: success ? 'Dados de monitoramento atualizados.' : 'Não foi possível atualizar os dados agora.',
    });
  };

  const submitReading = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedAsset) {
      setFeedback({ tone: 'error', text: 'Selecione um ativo para registrar leitura.' });
      return;
    }

    setFeedback(null);
    setIsSubmittingReading(true);

    try {
      const flowRate = normalizeOptionalNumber(readingDraft.flowRate);
      const reservoirLevel = normalizeOptionalNumber(readingDraft.reservoirLevel);
      const readingAt = new Date(readingDraft.readingAt);
      const operatorName = readingDraft.operatorName.trim();

      if (flowRate == null && reservoirLevel == null) {
        throw new Error('Informe vazão, nível ou ambos para registrar a leitura.');
      }

      if (typeof flowRate === 'number' && flowRate < 0) {
        throw new Error('A vazão não pode ser negativa.');
      }

      if (typeof reservoirLevel === 'number' && (reservoirLevel < 0 || reservoirLevel > 100)) {
        throw new Error('O nível deve estar entre 0% e 100%.');
      }

      if (!Number.isFinite(readingAt.getTime())) {
        throw new Error('Informe uma data de leitura válida.');
      }

      if (!operatorName) {
        throw new Error('Informe o operador responsável pela leitura.');
      }

      setSelectedId(selectedAsset.id);
      await createReading(selectedAsset.id, {
        flowRate,
        notes: readingDraft.notes.trim(),
        operatorName,
        readingAt: readingAt.toISOString(),
        reservoirLevel,
      });
      setSelectedId(selectedAsset.id);
      setReadingDraft({
        flowRate: '',
        notes: '',
        operatorName: selectedAsset.responsible,
        readingAt: toDateTimeInputValue(),
        reservoirLevel: '',
      });
      setFeedback({ tone: 'success', text: `Leitura de ${selectedAsset.code} registrada no monitoramento.` });
    } catch (error) {
      setFeedback({ tone: 'error', text: error instanceof Error ? error.message : 'Falha ao registrar leitura.' });
    } finally {
      setIsSubmittingReading(false);
    }
  };

  return (
    <main className="dashboard route-page monitor-page">
      <section className="page-hero">
        <div>
          <span className="eyebrow">Monitoramento Operacional</span>
          <h1>Telemetria, alertas e leituras dos ativos hídricos</h1>
          <p>Controle operacional conectado ao cadastro hídrico, com registro de leituras, filtros de criticidade e visão geográfica.</p>
        </div>
        <div className="page-hero-actions">
          <div className="sync-info">
            {backend === 'api' ? (
              <>
                <strong>
                  {syncStatus === 'syncing'
                    ? 'Sincronizando…'
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
          <button className="secondary-action" type="button" onClick={() => { void exportCsv(); }}>
            <Download size={18} />
            Exportar CSV
          </button>
          <button className="secondary-action" type="button" onClick={() => { void reloadData(); }}>
            <RefreshCcw size={18} />
            Atualizar
          </button>
        </div>
      </section>

      <section className="page-metrics-grid monitor-metrics-grid" aria-label="Indicadores do monitoramento">
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

      <section className="panel registry-tools monitoring-tools" aria-label="Filtros do monitoramento">
        <label className="search-field registry-search-field">
          <span>Busca</span>
          <div className="input-with-icon">
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Código, ativo, localidade ou responsável" />
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
          <span>Ordenar</span>
          <select value={sortKey} onChange={(event) => setSortKey(event.target.value as MonitorSortKey)}>
            {Object.entries(sortLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button className="secondary-action monitoring-clear-action" type="button" onClick={clearFilters}>
          Limpar filtros
        </button>
      </section>

      {feedback ? <div className={`feedback-banner feedback-${feedback.tone}`}>{feedback.text}</div> : null}

      <section className="monitoring-layout">
        <section className="panel monitoring-map-panel">
          <PanelHeader title="Mapa e criticidade" icon={<Activity size={19} />} />
          <div className="map-canvas real-map-shell monitoring-map-canvas" aria-label="Mapa de monitoramento operacional">
            <Suspense fallback={<div className="operational-map-loading">Carregando monitoramento geográfico</div>}>
              <OperationalLeafletMap records={filteredRecords} />
            </Suspense>
          </div>
          <div className="monitoring-alert-list" aria-label="Ativos em alerta">
            {alertRecords.length ? (
              alertRecords.slice(0, 4).map((record) => {
                const severity = getOperationalSeverity(record);

                return (
                  <button
                    className={`monitoring-alert-card monitoring-alert-${severity.tone}`}
                    key={record.id}
                    type="button"
                    onClick={() => setSelectedId(record.id)}
                  >
                    <span>
                      <AlertTriangle size={17} />
                    </span>
                    <div>
                      <strong>{record.name}</strong>
                      <small>{record.code} · {severity.detail}</small>
                    </div>
                  </button>
                );
              })
            ) : (
              <EmptyState text="Nenhum alerta para os filtros atuais." />
            )}
          </div>
        </section>

        <section className="panel detail-panel monitoring-reading-panel">
          <div className="table-title">
            <div>
              <span className="eyebrow">Leitura operacional</span>
              <h2>{selectedAsset ? selectedAsset.name : 'Selecione um ativo'}</h2>
            </div>
            <span>{selectedAsset ? selectedAsset.code : 'Sem ativo'}</span>
          </div>

          {selectedAsset ? (
            <div className="monitoring-selected-card">
              <span className={`status-dot status-${selectedAsset.status}`} />
              <div>
                <strong>{statusLabel[selectedAsset.status]}</strong>
                <small>{selectedAsset.location}</small>
              </div>
              <div>
                <strong>{formatFlow(selectedAsset.flowRate)}</strong>
                <small>{formatLevel(selectedAsset)}</small>
              </div>
            </div>
          ) : (
            <EmptyState text="Nenhum ativo encontrado para monitorar." />
          )}

          <form className="inline-form" onSubmit={submitReading}>
            <label>
              Data
              <input
                type="datetime-local"
                value={readingDraft.readingAt}
                onChange={(event) => setReadingDraft((current) => ({ ...current, readingAt: event.target.value }))}
              />
            </label>
            <label>
              Vazão
              <input
                min="0"
                type="number"
                value={readingDraft.flowRate}
                onChange={(event) => setReadingDraft((current) => ({ ...current, flowRate: event.target.value }))}
                placeholder="m³/h"
              />
            </label>
            <label>
              Nível
              <input
                max="100"
                min="0"
                type="number"
                value={readingDraft.reservoirLevel}
                onChange={(event) => setReadingDraft((current) => ({ ...current, reservoirLevel: event.target.value }))}
                placeholder="%"
              />
            </label>
            <label>
              Operador
              <input
                value={readingDraft.operatorName}
                onChange={(event) => setReadingDraft((current) => ({ ...current, operatorName: event.target.value }))}
              />
            </label>
            <label className="full-field">
              Observação
              <input
                value={readingDraft.notes}
                onChange={(event) => setReadingDraft((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Condição operacional, anomalia ou confirmação de rotina"
              />
            </label>
            <button className="primary-action" type="submit" disabled={!selectedAsset || isSubmittingReading}>
              <Waves size={17} />
              {isSubmittingReading ? 'Registrando...' : 'Registrar leitura'}
            </button>
          </form>
        </section>
      </section>

      <section className="panel table-panel monitoring-table-panel">
        <PanelHeader title="Ativos monitorados" icon={<Gauge size={19} />} />
        <div className="table-toolbar">
          <div>
            <strong>{filteredRecords.length} de {allRecords.length} ativo(s)</strong>
            <span>{isLoading ? 'Carregando base operacional...' : 'Base filtrada pelo monitoramento'}</span>
          </div>
        </div>
        <div className="asset-table" role="table" aria-label="Ativos monitorados">
          <div className="asset-row table-head" role="row">
            <span>Código</span>
            <span>Ativo</span>
            <span>Tipo</span>
            <span>Status</span>
            <span>Vazão</span>
            <span>Nível</span>
            <span>Última leitura</span>
            <span>Criticidade</span>
            <span>Ação</span>
          </div>
          {isLoading ? <EmptyState text="Carregando monitoramento operacional..." /> : null}
          {!isLoading && !filteredRecords.length ? <EmptyState text="Nenhum ativo encontrado para os filtros atuais." /> : null}
          {filteredRecords.map((record) => {
            const severity = getOperationalSeverity(record);

            return (
              <div
                className={
                  record.id === selectedAsset?.id
                    ? `asset-row monitoring-row selected monitoring-row-${severity.tone}`
                    : `asset-row monitoring-row monitoring-row-${severity.tone}`
                }
                key={record.id}
                role="row"
              >
                <span>{record.code}</span>
                <strong>{record.name}</strong>
                <span>{categoryMeta[record.category].label}</span>
                <span className="status-cell">
                  <i className={`status-dot status-${record.status}`} />
                  {statusLabel[record.status]}
                </span>
                <span>{formatFlow(record.flowRate)}</span>
                <span>{formatLevel(record)}</span>
                <span>{formatDateTime(record.lastReading)}</span>
                <span className={`monitoring-severity monitoring-severity-${severity.tone}`}>{severity.label}</span>
                <span>
                  <button className="ghost-action monitoring-row-action" type="button" onClick={() => setSelectedId(record.id)}>
                    Selecionar
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="registry-detail-grid">
        <section className="panel detail-panel">
          <div className="table-title">
            <div>
              <span className="eyebrow">Histórico</span>
              <h2>{selectedAsset ? `Leituras de ${selectedAsset.code}` : 'Sem ativo selecionado'}</h2>
            </div>
            <span>{selectedReadings.length} registro(s)</span>
          </div>
          <div className="mini-table">
            {selectedReadings.length ? (
              selectedReadings.map((reading) => (
                <article key={reading.id}>
                  <strong>{formatDateTime(reading.readingAt)}</strong>
                  <span>{formatFlow(reading.flowRate)}</span>
                  <span>{reading.reservoirLevel == null ? '-' : `${numberFormatter.format(reading.reservoirLevel)}%`}</span>
                  <small>{reading.notes || reading.operatorName}</small>
                </article>
              ))
            ) : (
              <EmptyState text="Sem leituras registradas para o ativo selecionado." />
            )}
          </div>
        </section>

        <section className="panel detail-panel">
          <div className="table-title">
            <div>
              <span className="eyebrow">Checklist</span>
              <h2>Situação operacional</h2>
            </div>
          </div>
          {selectedAsset ? <OperationalChecklist record={selectedAsset} /> : <EmptyState text="Selecione um ativo para ver o checklist." />}
        </section>
      </section>
    </main>
  );
}

function makeMonitoringMetrics(records: HydroRecord[]) {
  const totalFlow = records.reduce((total, record) => total + (record.flowRate ?? 0), 0);
  const levels = records
    .map((record) => record.reservoirLevel)
    .filter((level): level is number => typeof level === 'number' && Number.isFinite(level));
  const averageLevel = levels.length ? levels.reduce((total, level) => total + level, 0) / levels.length : 0;
  const alertCount = records.filter((record) => getOperationalSeverity(record).tone !== 'stable').length;
  const staleCount = records.filter(isReadingStale).length;

  return [
    {
      detail: 'ativos em operação normal',
      icon: CheckCircle2,
      label: 'Operando',
      value: String(records.filter((record) => record.status === 'operando').length),
    },
    {
      detail: 'somatório dos ativos',
      icon: Waves,
      label: 'Vazão total',
      value: `${numberFormatter.format(totalFlow)} m³/h`,
    },
    {
      detail: `${levels.length} ponto(s) com nível`,
      icon: Gauge,
      label: 'Nível médio',
      value: `${numberFormatter.format(averageLevel)}%`,
    },
    {
      detail: `${staleCount} sem leitura em 24h`,
      icon: Clock3,
      label: 'Alertas',
      value: String(alertCount),
    },
  ];
}

function OperationalChecklist({ record }: { record: HydroRecord }) {
  const severity = getOperationalSeverity(record);
  const checklist = [
    {
      label: 'Criticidade',
      value: severity.label,
    },
    {
      label: 'Status cadastral',
      value: statusLabel[record.status],
    },
    {
      label: 'Última leitura',
      value: formatDateTime(record.lastReading),
    },
    {
      label: 'Vazão',
      value: formatFlow(record.flowRate),
    },
    {
      label: 'Nível',
      value: formatLevel(record),
    },
    {
      label: 'Atualização',
      value: isReadingStale(record) ? 'Pendente há mais de 24h' : 'Dentro da janela operacional',
    },
  ];

  return (
    <div className="monitoring-checklist">
      {checklist.map((item) => (
        <article key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </article>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}

export default Monitoramento;
