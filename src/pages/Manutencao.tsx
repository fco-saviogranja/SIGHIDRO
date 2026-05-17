import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  FileDown,
  PlayCircle,
  RefreshCcw,
  Search,
  Wrench,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useHydroRegistry } from '../HydroRegistryContext';
import { PanelHeader } from '../components/PanelHeader';
import { categoryMeta, categoryOrder, profileOptions, statusLabel } from '../metadata';
import type {
  AssetCategory,
  HydroAsset,
  HydroAssetDraft,
  InternalProfile,
  MaintenanceOrder,
  MaintenanceOrderDraft,
  MaintenanceStatus,
} from '../types';

type CategoryFilter = AssetCategory | 'all';
type QueueStatusFilter = MaintenanceStatus | 'pendentes' | 'sugestoes' | 'all';
type QueuePriority = 'critical' | 'warning' | 'planned';
type Feedback = { tone: 'success' | 'error' | 'info'; text: string };

type MaintenanceQueueItem = {
  asset: HydroAsset;
  dueLabel: string;
  dueRank: number;
  dueTone: QueuePriority;
  id: string;
  order?: MaintenanceOrder;
  priority: QueuePriority;
  priorityLabel: string;
  service: string;
  source: 'order' | 'suggested';
  status: MaintenanceStatus;
};

const maintenanceStatusLabel: Record<MaintenanceStatus, string> = {
  aberta: 'Aberta',
  cancelada: 'Cancelada',
  concluida: 'Concluída',
  em_andamento: 'Em andamento',
};

const statusFilterLabels: Record<QueueStatusFilter, string> = {
  aberta: 'Abertas',
  all: 'Todas',
  cancelada: 'Canceladas',
  concluida: 'Concluídas',
  em_andamento: 'Em andamento',
  pendentes: 'Pendentes',
  sugestoes: 'Sugestões',
};

const priorityRank: Record<QueuePriority, number> = {
  critical: 0,
  warning: 1,
  planned: 2,
};

const numberFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 1,
});

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const todayInputValue = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
};

const addDaysInputValue = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

const parseDateOnly = (value?: string) => {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isFinite(date.getTime()) ? date : null;
};

const isActiveMaintenance = (status: MaintenanceStatus) => status === 'aberta' || status === 'em_andamento';

const getDueState = (dueDate?: string) => {
  const date = parseDateOnly(dueDate);
  if (!date) {
    return {
      label: 'Sem prazo',
      rank: 3,
      tone: 'planned' as QueuePriority,
    };
  }

  const today = parseDateOnly(todayInputValue()) ?? new Date();
  const diffDays = Math.ceil((date.getTime() - today.getTime()) / 86_400_000);

  if (diffDays < 0) {
    return {
      label: `Vencida há ${Math.abs(diffDays)} dia(s)`,
      rank: 0,
      tone: 'critical' as QueuePriority,
    };
  }

  if (diffDays === 0) {
    return {
      label: 'Vence hoje',
      rank: 1,
      tone: 'warning' as QueuePriority,
    };
  }

  if (diffDays <= 2) {
    return {
      label: `Vence em ${diffDays} dia(s)`,
      rank: 2,
      tone: 'warning' as QueuePriority,
    };
  }

  return {
    label: dateFormatter.format(date),
    rank: 3,
    tone: 'planned' as QueuePriority,
  };
};

const getAssetPriority = (asset: HydroAsset): { label: string; priority: QueuePriority } => {
  if (asset.status === 'parado' || asset.flowRate === 0) {
    return { label: 'Crítica', priority: 'critical' };
  }

  if (asset.status === 'manutenção' || asset.status === 'atenção') {
    return { label: 'Atenção', priority: 'warning' };
  }

  return { label: 'Preventiva', priority: 'planned' };
};

const getSuggestedService = (asset: HydroAsset) => {
  if (asset.status === 'parado' || asset.flowRate === 0) {
    return 'Restabelecimento operacional';
  }

  if (asset.status === 'manutenção') {
    return 'Intervenção técnica em andamento';
  }

  if (asset.status === 'atenção') {
    return 'Verificação preventiva';
  }

  return 'Inspeção programada';
};

const getDefaultDueDate = (asset: HydroAsset) => {
  if (asset.status === 'parado' || asset.flowRate === 0) {
    return todayInputValue();
  }

  if (asset.status === 'manutenção' || asset.status === 'atenção') {
    return addDaysInputValue(1);
  }

  return addDaysInputValue(7);
};

const toAssetDraft = (asset: HydroAsset, status = asset.status): HydroAssetDraft => ({
  capacityM3: asset.capacityM3,
  depthMeters: asset.depthMeters,
  energyType: asset.energyType,
  flowRate: asset.flowRate,
  lastReading: asset.lastReading,
  latitude: asset.latitude,
  location: asset.location,
  longitude: asset.longitude,
  name: asset.name,
  notes: asset.notes,
  powerHp: asset.powerHp,
  reservoirLevel: asset.reservoirLevel,
  responsible: asset.responsible,
  status,
});

const csvEscape = (value: unknown) => {
  const text = value == null ? '' : String(value);
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

function Manutencao() {
  const {
    allRecords,
    backend,
    createMaintenance,
    isLoading,
    loadAssetDetails,
    maintenanceByAsset,
    retrySync,
    syncStatus,
    updateMaintenance,
    updateRecord,
  } = useHydroRegistry();
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileFilter, setProfileFilter] = useState<InternalProfile | 'all'>('all');
  const [query, setQuery] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<QueueStatusFilter>('pendentes');
  const [maintenanceDraft, setMaintenanceDraft] = useState<MaintenanceOrderDraft>({
    dueDate: todayInputValue(),
    notes: '',
    responsible: 'Técnico de Campo',
    service: '',
    status: 'aberta',
  });

  useEffect(() => {
    if (!allRecords.length) {
      return;
    }

    void Promise.all(allRecords.map((record) => loadAssetDetails(record.id)));
  }, [allRecords, loadAssetDetails]);

  const maintenanceOrders = useMemo(
    () =>
      allRecords.flatMap((asset) =>
        (maintenanceByAsset[asset.id] ?? []).map((order) => ({
          asset,
          order,
        })),
      ),
    [allRecords, maintenanceByAsset],
  );

  const queueItems = useMemo(() => {
    const assetsWithActiveOrders = new Set(
      maintenanceOrders
        .filter(({ order }) => isActiveMaintenance(order.status))
        .map(({ asset }) => asset.id),
    );

    const orderItems: MaintenanceQueueItem[] = maintenanceOrders.map(({ asset, order }) => {
      const assetPriority = getAssetPriority(asset);
      const due = getDueState(order.dueDate);
      const priority = due.tone === 'critical' ? due.tone : assetPriority.priority;

      return {
        asset,
        dueLabel: due.label,
        dueRank: due.rank,
        dueTone: due.tone,
        id: order.id,
        order,
        priority,
        priorityLabel: priority === 'critical' ? 'Crítica' : assetPriority.label,
        service: order.service,
        source: 'order',
        status: order.status,
      };
    });

    const suggestedItems: MaintenanceQueueItem[] = allRecords
      .filter((asset) => asset.status !== 'operando' && !assetsWithActiveOrders.has(asset.id))
      .map((asset) => {
        const assetPriority = getAssetPriority(asset);
        const due = getDueState(getDefaultDueDate(asset));

        return {
          asset,
          dueLabel: due.label,
          dueRank: due.rank,
          dueTone: due.tone,
          id: `suggested-${asset.id}`,
          priority: assetPriority.priority,
          priorityLabel: assetPriority.label,
          service: getSuggestedService(asset),
          source: 'suggested',
          status: asset.status === 'manutenção' ? 'em_andamento' : 'aberta',
        };
      });

    return [...orderItems, ...suggestedItems].sort((first, second) => {
      const priorityDiff = priorityRank[first.priority] - priorityRank[second.priority];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      const dueDiff = first.dueRank - second.dueRank;
      if (dueDiff !== 0) {
        return dueDiff;
      }

      return `${first.asset.code} ${first.service}`.localeCompare(`${second.asset.code} ${second.service}`, 'pt-BR');
    });
  }, [allRecords, maintenanceOrders]);

  const filteredQueueItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return queueItems.filter((item) => {
      if (categoryFilter !== 'all' && item.asset.category !== categoryFilter) {
        return false;
      }

      if (profileFilter !== 'all' && item.order?.responsible !== profileFilter && item.asset.responsible !== profileFilter) {
        return false;
      }

      if (statusFilter === 'pendentes' && !isActiveMaintenance(item.status)) {
        return false;
      }

      if (statusFilter === 'sugestoes' && item.source !== 'suggested') {
        return false;
      }

      if (
        statusFilter !== 'all' &&
        statusFilter !== 'pendentes' &&
        statusFilter !== 'sugestoes' &&
        item.status !== statusFilter
      ) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        item.asset.code,
        item.asset.name,
        item.asset.location,
        item.asset.responsible,
        item.asset.notes,
        item.order?.notes,
        item.service,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    });
  }, [categoryFilter, profileFilter, query, queueItems, statusFilter]);

  const selectedAsset = useMemo(
    () => allRecords.find((asset) => asset.id === selectedAssetId) ?? filteredQueueItems[0]?.asset ?? allRecords[0] ?? null,
    [allRecords, filteredQueueItems, selectedAssetId],
  );

  const selectedAssetOrders = useMemo(
    () =>
      selectedAsset
        ? [...(maintenanceByAsset[selectedAsset.id] ?? [])].sort(
            (firstOrder, secondOrder) =>
              new Date(secondOrder.createdAt).getTime() - new Date(firstOrder.createdAt).getTime(),
          )
        : [],
    [maintenanceByAsset, selectedAsset],
  );

  const selectedOrder = useMemo(
    () => selectedAssetOrders.find((order) => order.id === selectedOrderId) ?? null,
    [selectedAssetOrders, selectedOrderId],
  );

  const selectedQueueItem = useMemo(() => {
    if (!selectedAsset) {
      return null;
    }

    if (selectedOrder) {
      return queueItems.find((item) => item.order?.id === selectedOrder.id) ?? null;
    }

    return queueItems.find((item) => item.asset.id === selectedAsset.id && item.source === 'suggested') ?? null;
  }, [queueItems, selectedAsset, selectedOrder]);

  const metrics = useMemo(() => makeMaintenanceMetrics(allRecords, queueItems, maintenanceOrders.map(({ order }) => order)), [
    allRecords,
    maintenanceOrders,
    queueItems,
  ]);

  useEffect(() => {
    if (selectedAsset && selectedAsset.id !== selectedAssetId) {
      setSelectedAssetId(selectedAsset.id);
    }
  }, [selectedAsset, selectedAssetId]);

  useEffect(() => {
    if (!selectedAsset) {
      return;
    }

    if (selectedOrder) {
      setMaintenanceDraft({
        dueDate: selectedOrder.dueDate ?? '',
        notes: selectedOrder.notes,
        responsible: selectedOrder.responsible,
        service: selectedOrder.service,
        status: selectedOrder.status,
      });
      return;
    }

    setMaintenanceDraft({
      dueDate: getDefaultDueDate(selectedAsset),
      notes: selectedAsset.notes,
      responsible: selectedAsset.responsible,
      service: getSuggestedService(selectedAsset),
      status: selectedAsset.status === 'manutenção' ? 'em_andamento' : 'aberta',
    });
  }, [selectedAsset?.id, selectedOrder?.id]);

  const clearFilters = () => {
    setCategoryFilter('all');
    setProfileFilter('all');
    setQuery('');
    setStatusFilter('pendentes');
  };

  const selectQueueItem = (item: MaintenanceQueueItem) => {
    setSelectedAssetId(item.asset.id);
    setSelectedOrderId(item.order?.id ?? null);
  };

  const selectAsset = (assetId: string) => {
    setSelectedAssetId(assetId);
    setSelectedOrderId(null);
  };

  const reloadData = async () => {
    const success = await retrySync();
    if (success) {
      await Promise.all(allRecords.map((record) => loadAssetDetails(record.id)));
    }

    setFeedback({
      tone: success ? 'success' : 'error',
      text: success ? 'Dados de manutenção atualizados.' : 'Não foi possível atualizar a manutenção agora.',
    });
  };

  const exportQueueCsv = () => {
    const headers = ['Codigo', 'Ativo', 'Tipo', 'Servico', 'Status OS', 'Prioridade', 'Prazo', 'Responsavel', 'Origem'];
    const rows = filteredQueueItems.map((item) => [
      item.asset.code,
      item.asset.name,
      categoryMeta[item.asset.category].label,
      item.service,
      maintenanceStatusLabel[item.status],
      item.priorityLabel,
      item.order?.dueDate ?? item.dueLabel,
      item.order?.responsible ?? item.asset.responsible,
      item.source === 'order' ? 'OS registrada' : 'Sugestão operacional',
    ]);
    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'fila-manutencao.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setFeedback({ tone: 'success', text: 'CSV da fila de manutenção exportado com os filtros atuais.' });
  };

  const syncAssetStatusForOrder = async (asset: HydroAsset, status: MaintenanceStatus) => {
    if (status === 'em_andamento' && asset.status !== 'manutenção') {
      await updateRecord(asset.category, asset.id, toAssetDraft(asset, 'manutenção'));
    }

    if (status === 'concluida' && asset.status !== 'operando') {
      await updateRecord(asset.category, asset.id, toAssetDraft(asset, 'operando'));
    }
  };

  const submitMaintenance = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedAsset) {
      setFeedback({ tone: 'error', text: 'Selecione um ativo para abrir manutenção.' });
      return;
    }

    const service = maintenanceDraft.service.trim();
    const notes = maintenanceDraft.notes.trim();

    if (!service) {
      setFeedback({ tone: 'error', text: 'Informe o serviço de manutenção.' });
      return;
    }

    if (maintenanceDraft.dueDate && !parseDateOnly(maintenanceDraft.dueDate)) {
      setFeedback({ tone: 'error', text: 'Informe um prazo válido para a OS.' });
      return;
    }

    setFeedback(null);
    setIsSubmitting(true);

    try {
      const payload: MaintenanceOrderDraft = {
        dueDate: maintenanceDraft.dueDate || undefined,
        notes,
        responsible: maintenanceDraft.responsible,
        service,
        status: maintenanceDraft.status,
      };

      if (selectedOrder) {
        const order = await updateMaintenance(selectedAsset.id, selectedOrder.id, payload);
        await syncAssetStatusForOrder(selectedAsset, order.status);
        setSelectedOrderId(order.id);
        setMaintenanceDraft({
          dueDate: order.dueDate ?? '',
          notes: order.notes,
          responsible: order.responsible,
          service: order.service,
          status: order.status,
        });
        setFeedback({ tone: 'success', text: `OS de ${selectedAsset.code} atualizada.` });
      } else {
        const order = await createMaintenance(selectedAsset.id, payload);
        await syncAssetStatusForOrder(selectedAsset, order.status);
        setSelectedOrderId(order.id);
        setMaintenanceDraft({
          dueDate: order.dueDate ?? '',
          notes: order.notes,
          responsible: order.responsible,
          service: order.service,
          status: order.status,
        });
        setFeedback({ tone: 'success', text: `OS de ${selectedAsset.code} aberta na manutenção.` });
      }
    } catch (error) {
      setFeedback({ tone: 'error', text: error instanceof Error ? error.message : 'Falha ao salvar manutenção.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const changeOrderStatus = async (order: MaintenanceOrder, status: MaintenanceStatus) => {
    if (!selectedAsset) {
      return;
    }

    setFeedback(null);
    setIsSubmitting(true);

    try {
      const updatedOrder = await updateMaintenance(selectedAsset.id, order.id, { status });
      await syncAssetStatusForOrder(selectedAsset, updatedOrder.status);
      setSelectedOrderId(updatedOrder.id);
      setMaintenanceDraft((current) => ({
        ...current,
        status: updatedOrder.status,
      }));
      setFeedback({ tone: 'success', text: `OS ${maintenanceStatusLabel[updatedOrder.status].toLowerCase()} para ${selectedAsset.code}.` });
    } catch (error) {
      setFeedback({ tone: 'error', text: error instanceof Error ? error.message : 'Falha ao atualizar status da OS.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="dashboard route-page maintenance-page">
      <section className="page-hero">
        <div>
          <span className="eyebrow">Manutenção</span>
          <h1>Ordens de serviço, prazos e triagem técnica</h1>
          <p>
            Priorize ativos em atenção, abra OS preventivas ou corretivas, acompanhe prazos e conclua intervenções com atualização
            operacional.
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
          <button className="secondary-action" type="button" onClick={exportQueueCsv}>
            <FileDown size={18} />
            Exportar CSV
          </button>
          <button className="secondary-action" type="button" onClick={() => { void reloadData(); }}>
            <RefreshCcw size={18} />
            Atualizar
          </button>
        </div>
      </section>

      <section className="page-metrics-grid maintenance-metrics-grid" aria-label="Indicadores de manutenção">
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

      <section className="panel registry-tools maintenance-tools" aria-label="Filtros de manutenção">
        <label className="search-field registry-search-field">
          <span>Busca</span>
          <div className="input-with-icon">
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Código, ativo, localidade, serviço ou nota" />
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
          <span>Status OS</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as QueueStatusFilter)}>
            {Object.entries(statusFilterLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
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
        <button className="secondary-action maintenance-clear-action" type="button" onClick={clearFilters}>
          Limpar filtros
        </button>
      </section>

      {feedback ? <div className={`feedback-banner feedback-${feedback.tone}`}>{feedback.text}</div> : null}

      <section className="maintenance-layout">
        <section className="panel maintenance-queue-panel">
          <PanelHeader title="Fila técnica priorizada" icon={<ClipboardList size={19} />} />
          <div className="table-toolbar maintenance-toolbar">
            <div>
              <strong>{filteredQueueItems.length} item(ns) na fila</strong>
              <span>{isLoading ? 'Carregando ativos e ordens...' : 'Ordens registradas e sugestões por status operacional'}</span>
            </div>
          </div>
          <div className="maintenance-queue-list" aria-label="Fila de manutenção">
            {isLoading ? <EmptyState text="Carregando fila de manutenção..." /> : null}
            {!isLoading && !filteredQueueItems.length ? <EmptyState text="Nenhuma manutenção encontrada para os filtros atuais." /> : null}
            {filteredQueueItems.map((item) => (
              <button
                className={
                  selectedQueueItem?.id === item.id || (!selectedQueueItem && selectedAsset?.id === item.asset.id)
                    ? `maintenance-queue-card selected priority-${item.priority}`
                    : `maintenance-queue-card priority-${item.priority}`
                }
                key={item.id}
                type="button"
                onClick={() => selectQueueItem(item)}
              >
                <span className="maintenance-card-icon">
                  {item.priority === 'critical' ? <AlertTriangle size={18} /> : item.source === 'order' ? <ClipboardCheck size={18} /> : <Wrench size={18} />}
                </span>
                <span className="maintenance-card-main">
                  <strong>{item.service}</strong>
                  <small>{item.asset.code} · {item.asset.name}</small>
                </span>
                <span className="maintenance-card-meta">
                  <span className={`maintenance-priority-badge priority-${item.priority}`}>{item.priorityLabel}</span>
                  <span className={`maintenance-status-badge maintenance-status-${item.status}`}>{maintenanceStatusLabel[item.status]}</span>
                  <span className={`maintenance-due-badge due-${item.dueTone}`}>{item.dueLabel}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="panel detail-panel maintenance-work-panel">
          <div className="table-title">
            <div>
              <span className="eyebrow">Ordem de serviço</span>
              <h2>{selectedOrder ? 'Atualizar OS' : 'Abrir OS'}</h2>
            </div>
            <span>{selectedAsset ? selectedAsset.code : 'Sem ativo'}</span>
          </div>

          {selectedAsset ? (
            <div className="maintenance-asset-summary">
              <span className={`status-dot status-${selectedAsset.status}`} />
              <div>
                <strong>{selectedAsset.name}</strong>
                <small>{selectedAsset.location}</small>
              </div>
              <div>
                <strong>{statusLabel[selectedAsset.status]}</strong>
                <small>{selectedAsset.flowRate == null ? 'Sem vazão' : `${numberFormatter.format(selectedAsset.flowRate)} m³/h`}</small>
              </div>
            </div>
          ) : (
            <EmptyState text="Nenhum ativo disponível para manutenção." />
          )}

          <form className="inline-form maintenance-form" onSubmit={submitMaintenance}>
            <label className="full-field">
              Ativo
              <select value={selectedAsset?.id ?? ''} onChange={(event) => selectAsset(event.target.value)}>
                {allRecords.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.code} · {asset.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="full-field">
              Serviço
              <input
                value={maintenanceDraft.service}
                onChange={(event) => setMaintenanceDraft((current) => ({ ...current, service: event.target.value }))}
                placeholder="Troca, inspeção, restabelecimento ou verificação"
              />
            </label>
            <label>
              Responsável
              <select
                value={maintenanceDraft.responsible}
                onChange={(event) => setMaintenanceDraft((current) => ({ ...current, responsible: event.target.value as InternalProfile }))}
              >
                {profileOptions.map((profile) => (
                  <option key={profile} value={profile}>
                    {profile}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Prazo
              <input
                type="date"
                value={maintenanceDraft.dueDate ?? ''}
                onChange={(event) => setMaintenanceDraft((current) => ({ ...current, dueDate: event.target.value }))}
              />
            </label>
            <label>
              Status
              <select
                value={maintenanceDraft.status}
                onChange={(event) => setMaintenanceDraft((current) => ({ ...current, status: event.target.value as MaintenanceStatus }))}
              >
                {Object.entries(maintenanceStatusLabel).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="full-field">
              Observação
              <input
                value={maintenanceDraft.notes}
                onChange={(event) => setMaintenanceDraft((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Checklist executado, peça necessária ou pendência de campo"
              />
            </label>
            <button className="primary-action" type="submit" disabled={!selectedAsset || isSubmitting}>
              <ClipboardCheck size={17} />
              {isSubmitting ? 'Salvando...' : selectedOrder ? 'Salvar OS' : 'Abrir OS'}
            </button>
          </form>

          {selectedOrder ? (
            <div className="maintenance-actions-row" aria-label="Ações rápidas da ordem">
              <button
                className="secondary-action"
                type="button"
                onClick={() => { void changeOrderStatus(selectedOrder, 'em_andamento'); }}
                disabled={isSubmitting || selectedOrder.status === 'em_andamento' || selectedOrder.status === 'concluida'}
              >
                <PlayCircle size={17} />
                Iniciar
              </button>
              <button
                className="secondary-action"
                type="button"
                onClick={() => { void changeOrderStatus(selectedOrder, 'concluida'); }}
                disabled={isSubmitting || selectedOrder.status === 'concluida'}
              >
                <CheckCircle2 size={17} />
                Concluir
              </button>
              <button
                className="secondary-action danger-action"
                type="button"
                onClick={() => { void changeOrderStatus(selectedOrder, 'cancelada'); }}
                disabled={isSubmitting || selectedOrder.status === 'cancelada' || selectedOrder.status === 'concluida'}
              >
                <XCircle size={17} />
                Cancelar
              </button>
            </div>
          ) : null}
        </section>
      </section>

      <section className="registry-detail-grid maintenance-detail-grid">
        <section className="panel detail-panel">
          <div className="table-title">
            <div>
              <span className="eyebrow">Histórico do ativo</span>
              <h2>{selectedAsset ? selectedAsset.name : 'Sem ativo selecionado'}</h2>
            </div>
            <span>{selectedAssetOrders.length} OS</span>
          </div>
          <div className="mini-table maintenance-history-table">
            {selectedAssetOrders.length ? (
              selectedAssetOrders.map((order) => {
                const due = getDueState(order.dueDate);

                return (
                  <article key={order.id}>
                    <strong>{order.service}</strong>
                    <span className={`maintenance-status-badge maintenance-status-${order.status}`}>{maintenanceStatusLabel[order.status]}</span>
                    <span className={`maintenance-due-badge due-${due.tone}`}>{due.label}</span>
                    <small>{order.notes || order.responsible}</small>
                  </article>
                );
              })
            ) : (
              <EmptyState text="Sem ordens registradas para o ativo selecionado." />
            )}
          </div>
        </section>

        <section className="panel detail-panel">
          <div className="table-title">
            <div>
              <span className="eyebrow">Checklist</span>
              <h2>Prontidão da intervenção</h2>
            </div>
          </div>
          {selectedAsset ? <MaintenanceChecklist asset={selectedAsset} item={selectedQueueItem} /> : <EmptyState text="Selecione um ativo para ver o checklist." />}
        </section>
      </section>
    </main>
  );
}

function makeMaintenanceMetrics(records: HydroAsset[], queueItems: MaintenanceQueueItem[], orders: MaintenanceOrder[]) {
  const activeQueue = queueItems.filter((item) => isActiveMaintenance(item.status)).length;
  const overdueCount = queueItems.filter((item) => isActiveMaintenance(item.status) && item.dueTone === 'critical').length;
  const alertAssets = records.filter((record) => record.status !== 'operando').length;
  const completedOrders = orders.filter((order) => order.status === 'concluida').length;

  return [
    {
      detail: 'OS e sugestões pendentes',
      icon: ClipboardList,
      label: 'Fila ativa',
      value: String(activeQueue),
    },
    {
      detail: 'prazo estourado',
      icon: Clock3,
      label: 'Vencidas',
      value: String(overdueCount),
    },
    {
      detail: 'fora da operação normal',
      icon: AlertTriangle,
      label: 'Ativos em alerta',
      value: String(alertAssets),
    },
    {
      detail: 'histórico concluído',
      icon: CheckCircle2,
      label: 'Concluídas',
      value: String(completedOrders),
    },
  ];
}

function MaintenanceChecklist({ asset, item }: { asset: HydroAsset; item: MaintenanceQueueItem | null }) {
  const activeItem = item ?? {
    dueLabel: getDueState(getDefaultDueDate(asset)).label,
    priorityLabel: getAssetPriority(asset).label,
    service: getSuggestedService(asset),
    status: asset.status === 'manutenção' ? 'em_andamento' : 'aberta',
  };
  const checklist = [
    {
      label: 'Serviço',
      value: activeItem.service,
    },
    {
      label: 'Prioridade',
      value: activeItem.priorityLabel,
    },
    {
      label: 'Prazo',
      value: activeItem.dueLabel,
    },
    {
      label: 'Status OS',
      value: maintenanceStatusLabel[activeItem.status],
    },
    {
      label: 'Status do ativo',
      value: statusLabel[asset.status],
    },
    {
      label: 'Responsável',
      value: asset.responsible,
    },
  ];

  return (
    <div className="monitoring-checklist maintenance-checklist">
      {checklist.map((entry) => (
        <article key={entry.label}>
          <span>{entry.label}</span>
          <strong>{entry.value}</strong>
        </article>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}

export default Manutencao;
