import { FormEvent, lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  Check,
  ClipboardList,
  Download,
  Edit3,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useHydroRegistry } from '../HydroRegistryContext';
import {
  categoryMeta,
  categoryOrder,
  profileOptions,
  statusLabel,
  statusOptions,
} from '../metadata';
import type {
  AssetCategory,
  HydroAsset,
  HydroAssetDraft,
  InternalProfile,
  MaintenanceOrderDraft,
  OperationalStatus,
} from '../types';

const CoordinatePickerMap = lazy(() => import('../components/CoordinatePickerMap'));

const nowLabel = () =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

const toDateTimeInputValue = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};

const defaultCoordinatesByCategory: Record<AssetCategory, { latitude: number; longitude: number }> = {
  poço: { latitude: -7.5748, longitude: -39.3042 },
  bomba: { latitude: -7.5812, longitude: -39.282 },
  reservatório: { latitude: -7.5632, longitude: -39.2684 },
  localidade: { latitude: -7.576, longitude: -39.2826 },
};

const makeDraft = (category: AssetCategory): HydroAssetDraft => ({
  name: '',
  location: '',
  status: 'operando',
  responsible: 'Operador Hidráulico',
  flowRate: 0,
  reservoirLevel: category === 'bomba' ? undefined : 75,
  powerHp: category === 'bomba' || category === 'poço' ? 10 : undefined,
  energyType: category === 'localidade' ? undefined : 'Rede elétrica',
  depthMeters: category === 'poço' ? 120 : undefined,
  capacityM3: category === 'reservatório' || category === 'localidade' ? 300 : undefined,
  latitude: defaultCoordinatesByCategory[category].latitude,
  longitude: defaultCoordinatesByCategory[category].longitude,
  lastReading: nowLabel(),
  notes: '',
});

const sortLabels = {
  code: 'Código',
  name: 'Nome',
  status: 'Status',
  updatedAt: 'Atualização',
} as const;

type SortKey = keyof typeof sortLabels;

function CadastroHidrico() {
  const {
    allRecords,
    backend,
    createMaintenance,
    createReading,
    createRecord,
    deleteRecord,
    exportAssetsCsv,
    isLoading,
    loadAssetDetails,
    maintenanceByAsset,
    readingsByAsset,
    registry,
    resetRegistry,
    syncStatus,
    updateMaintenance,
    updateRecord,
  } = useHydroRegistry();
  const [activeCategory, setActiveCategory] = useState<AssetCategory>('poço');
  const [draft, setDraft] = useState<HydroAssetDraft>(() => makeDraft('poço'));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OperationalStatus | 'all'>('all');
  const [responsibleFilter, setResponsibleFilter] = useState<InternalProfile | 'all'>('all');
  const [locationFilter, setLocationFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt');
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [readingDraft, setReadingDraft] = useState({
    flowRate: '',
    notes: '',
    operatorName: 'Operador Hidráulico',
    readingAt: toDateTimeInputValue(),
    reservoirLevel: '',
  });
  const [maintenanceDraft, setMaintenanceDraft] = useState<MaintenanceOrderDraft>({
    dueDate: '',
    notes: '',
    responsible: 'Técnico de Campo',
    service: '',
    status: 'aberta',
  });

  const activeRecords = registry[activeCategory];
  const activeMeta = categoryMeta[activeCategory];
  const ActiveIcon = activeMeta.icon;

  const totals = useMemo(
    () =>
      categoryOrder.map((category) => ({
        category,
        total: registry[category].length,
        active: registry[category].filter((record) => record.status === 'operando').length,
      })),
    [registry],
  );

  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const normalizedLocation = locationFilter.trim().toLowerCase();

    return [...activeRecords]
      .filter((record) => {
        if (statusFilter !== 'all' && record.status !== statusFilter) {
          return false;
        }

        if (responsibleFilter !== 'all' && record.responsible !== responsibleFilter) {
          return false;
        }

        if (normalizedLocation && !record.location.toLowerCase().includes(normalizedLocation)) {
          return false;
        }

        if (!normalizedQuery) {
          return true;
        }

        return [record.code, record.name, record.location, record.responsible, record.notes]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      })
      .sort((a, b) => {
        if (sortKey === 'updatedAt') {
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }

        return String(a[sortKey]).localeCompare(String(b[sortKey]), 'pt-BR');
      });
  }, [activeRecords, locationFilter, query, responsibleFilter, sortKey, statusFilter]);

  const selectedAsset = useMemo(
    () => allRecords.find((record) => record.id === selectedId) ?? filteredRecords[0] ?? null,
    [allRecords, filteredRecords, selectedId],
  );

  const selectedReadings = selectedAsset ? readingsByAsset[selectedAsset.id] ?? [] : [];
  const selectedMaintenance = selectedAsset ? maintenanceByAsset[selectedAsset.id] ?? [] : [];

  useEffect(() => {
    if (selectedAsset) {
      void loadAssetDetails(selectedAsset.id);
      setSelectedId(selectedAsset.id);
    }
  }, [loadAssetDetails, selectedAsset?.id]);

  const switchCategory = (category: AssetCategory) => {
    setActiveCategory(category);
    setDraft(makeDraft(category));
    setEditingId(null);
    setSelectedId(null);
    setFeedback(null);
  };

  const updateDraft = <K extends keyof HydroAssetDraft>(field: K, value: HydroAssetDraft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const updateNumericDraft = (
    field: 'flowRate' | 'reservoirLevel' | 'powerHp' | 'depthMeters' | 'capacityM3' | 'latitude' | 'longitude',
    value: string,
  ) => {
    updateDraft(field, value === '' ? undefined : Number(value));
  };

  const updateDraftCoordinates = (coordinates: { latitude: number; longitude: number }) => {
    setDraft((current) => ({
      ...current,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    }));
  };

  const startEdit = (record: HydroAsset) => {
    const { id: _id, code: _code, category: _category, createdAt: _createdAt, updatedAt: _updatedAt, ...editable } = record;
    setActiveCategory(record.category);
    setEditingId(record.id);
    setSelectedId(record.id);
    setDraft(editable);
    setFeedback({ tone: 'info', text: `Editando ${record.code}.` });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(makeDraft(activeCategory));
    setFeedback(null);
  };

  const normalizeDraft = () => {
    const normalizedDraft: HydroAssetDraft = {
      ...draft,
      energyType: draft.energyType?.trim() || undefined,
      flowRate: Number(draft.flowRate || 0),
      lastReading: draft.lastReading.trim() || nowLabel(),
      latitude: typeof draft.latitude === 'number' && Number.isFinite(draft.latitude) ? draft.latitude : undefined,
      location: draft.location.trim(),
      longitude: typeof draft.longitude === 'number' && Number.isFinite(draft.longitude) ? draft.longitude : undefined,
      name: draft.name.trim(),
      notes: draft.notes.trim(),
    };

    if (!normalizedDraft.name || !normalizedDraft.location) {
      throw new Error('Preencha nome e localização para salvar o ativo.');
    }

    return normalizedDraft;
  };

  const submitRecord = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    setIsSubmitting(true);

    try {
      const normalizedDraft = normalizeDraft();
      const saved = editingId
        ? await updateRecord(activeCategory, editingId, normalizedDraft)
        : await createRecord(activeCategory, normalizedDraft);

      setSelectedId(saved.id);
      setFeedback({ tone: 'success', text: editingId ? 'Ativo atualizado com auditoria.' : 'Ativo cadastrado com auditoria.' });
      setEditingId(null);
      setDraft(makeDraft(activeCategory));
    } catch (error) {
      setFeedback({ tone: 'error', text: error instanceof Error ? error.message : 'Falha ao salvar ativo.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeRecord = async (record: HydroAsset) => {
    const confirmed = window.confirm(`Excluir ${record.name} do cadastro hídrico? A ação será auditada.`);
    if (!confirmed) {
      return;
    }

    try {
      await deleteRecord(record.category, record.id);
      if (editingId === record.id) {
        cancelEdit();
      }
      setSelectedId(null);
      setFeedback({ tone: 'success', text: 'Ativo excluído e registrado na auditoria.' });
    } catch (error) {
      setFeedback({ tone: 'error', text: error instanceof Error ? error.message : 'Falha ao excluir ativo.' });
    }
  };

  const submitReading = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedAsset) {
      setFeedback({ tone: 'error', text: 'Selecione um ativo para registrar leitura.' });
      return;
    }

    try {
      await createReading(selectedAsset.id, {
        flowRate: readingDraft.flowRate === '' ? undefined : Number(readingDraft.flowRate),
        notes: readingDraft.notes.trim(),
        operatorName: readingDraft.operatorName.trim(),
        readingAt: new Date(readingDraft.readingAt).toISOString(),
        reservoirLevel: readingDraft.reservoirLevel === '' ? undefined : Number(readingDraft.reservoirLevel),
      });
      setReadingDraft({
        flowRate: '',
        notes: '',
        operatorName: selectedAsset.responsible,
        readingAt: toDateTimeInputValue(),
        reservoirLevel: '',
      });
      setFeedback({ tone: 'success', text: 'Leitura registrada com auditoria.' });
    } catch (error) {
      setFeedback({ tone: 'error', text: error instanceof Error ? error.message : 'Falha ao registrar leitura.' });
    }
  };

  const submitMaintenance = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedAsset) {
      setFeedback({ tone: 'error', text: 'Selecione um ativo para abrir manutenção.' });
      return;
    }

    if (!maintenanceDraft.service.trim()) {
      setFeedback({ tone: 'error', text: 'Informe o serviço de manutenção.' });
      return;
    }

    try {
      await createMaintenance(selectedAsset.id, {
        ...maintenanceDraft,
        dueDate: maintenanceDraft.dueDate || undefined,
        notes: maintenanceDraft.notes.trim(),
        service: maintenanceDraft.service.trim(),
      });
      setMaintenanceDraft({
        dueDate: '',
        notes: '',
        responsible: 'Técnico de Campo',
        service: '',
        status: 'aberta',
      });
      setFeedback({ tone: 'success', text: 'Ordem de manutenção aberta com auditoria.' });
    } catch (error) {
      setFeedback({ tone: 'error', text: error instanceof Error ? error.message : 'Falha ao abrir manutenção.' });
    }
  };

  const completeMaintenance = async (orderId: string) => {
    if (!selectedAsset) {
      return;
    }

    try {
      await updateMaintenance(selectedAsset.id, orderId, { status: 'concluida' });
      setFeedback({ tone: 'success', text: 'Manutenção concluída com auditoria.' });
    } catch (error) {
      setFeedback({ tone: 'error', text: error instanceof Error ? error.message : 'Falha ao atualizar manutenção.' });
    }
  };

  const exportCsv = async () => {
    try {
      const csv = await exportAssetsCsv({
        category: activeCategory,
        location: locationFilter,
        q: query,
        responsible: responsibleFilter,
        status: statusFilter,
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cadastro-hidrico-${activeCategory}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setFeedback({ tone: 'success', text: 'CSV exportado com os filtros atuais.' });
    } catch (error) {
      setFeedback({ tone: 'error', text: error instanceof Error ? error.message : 'Falha ao exportar CSV.' });
    }
  };

  const reloadOrReset = async () => {
    try {
      await resetRegistry();
      setFeedback({
        tone: 'success',
        text: backend === 'api' ? 'Dados recarregados da API.' : 'Dados iniciais restaurados localmente.',
      });
    } catch (error) {
      setFeedback({ tone: 'error', text: error instanceof Error ? error.message : 'Falha ao atualizar dados.' });
    }
  };

  return (
    <main className="dashboard route-page">
      <section className="page-hero">
        <div>
          <span className="eyebrow">Cadastro Hídrico</span>
          <h1>Base real de ativos, leituras e manutenção</h1>
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
                <button className="ghost-action sync-action" type="button" onClick={() => { void reloadOrReset(); }}>
                  Recarregar
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
          <button className="secondary-action" type="button" onClick={() => { void reloadOrReset(); }}>
            <RefreshCcw size={18} />
            {backend === 'api' ? 'Recarregar dados' : 'Restaurar dados iniciais'}
          </button>
        </div>
      </section>

      <section className="summary-strip" aria-label="Resumo do cadastro">
        {totals.map((item) => {
          const meta = categoryMeta[item.category];
          const Icon = meta.icon;

          return (
            <button
              className={item.category === activeCategory ? 'summary-card active' : 'summary-card'}
              key={item.category}
              type="button"
              onClick={() => switchCategory(item.category)}
            >
              <Icon size={20} />
              <span>{meta.plural}</span>
              <strong>{item.total}</strong>
              <small>{item.active} operando</small>
            </button>
          );
        })}
      </section>

      <section className="panel registry-tools" aria-label="Busca e filtros do cadastro hídrico">
        <label className="search-field registry-search-field">
          <span>Busca</span>
          <div className="input-with-icon">
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Código, nome, localidade ou responsável" />
          </div>
        </label>
        <label className="filter-field">
          <span>Status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as OperationalStatus | 'all')}>
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
          <select value={responsibleFilter} onChange={(event) => setResponsibleFilter(event.target.value as InternalProfile | 'all')}>
            <option value="all">Todos</option>
            {profileOptions.map((profile) => (
              <option key={profile} value={profile}>
                {profile}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field">
          <span>Localidade</span>
          <input value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)} placeholder="Zona, bairro ou setor" />
        </label>
        <label className="filter-field">
          <span>Ordenar por</span>
          <select value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
            {Object.entries(sortLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </section>

      {feedback ? <div className={`feedback-banner feedback-${feedback.tone}`}>{feedback.text}</div> : null}

      <section className="registry-layout">
        <form className="panel registry-form" onSubmit={submitRecord}>
          <div className="form-heading">
            <span className="module-icon">
              <ActiveIcon size={22} />
            </span>
            <div>
              <h2>{editingId ? `Editar ${activeMeta.label}` : `Novo ${activeMeta.label}`}</h2>
              <p>{activeMeta.description}</p>
            </div>
          </div>

          <div className="category-tabs" aria-label="Tipo de ativo">
            {categoryOrder.map((category) => (
              <button
                className={category === activeCategory ? 'filter-chip active' : 'filter-chip'}
                key={category}
                type="button"
                onClick={() => switchCategory(category)}
              >
                {categoryMeta[category].label}
              </button>
            ))}
          </div>

          <div className="form-grid">
            <label>
              Nome
              <input
                required
                value={draft.name}
                onChange={(event) => updateDraft('name', event.target.value)}
                placeholder={`${activeMeta.label} principal`}
              />
            </label>

            <label>
              Localização / setor
              <input
                required
                value={draft.location}
                onChange={(event) => updateDraft('location', event.target.value)}
                placeholder="Zona operacional"
              />
            </label>

            <label>
              Status
              <select
                value={draft.status}
                onChange={(event) => updateDraft('status', event.target.value as OperationalStatus)}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel[status]}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Responsável
              <select
                value={draft.responsible}
                onChange={(event) => updateDraft('responsible', event.target.value as InternalProfile)}
              >
                {profileOptions.map((profile) => (
                  <option key={profile} value={profile}>
                    {profile}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Vazão atual (m³/h)
              <input min="0" type="number" value={draft.flowRate} onChange={(event) => updateNumericDraft('flowRate', event.target.value)} />
            </label>

            {activeCategory !== 'bomba' ? (
              <label>
                Nível / cobertura (%)
                <input
                  min="0"
                  max="100"
                  type="number"
                  value={draft.reservoirLevel ?? ''}
                  onChange={(event) => updateNumericDraft('reservoirLevel', event.target.value)}
                />
              </label>
            ) : null}

            {activeCategory === 'bomba' || activeCategory === 'poço' ? (
              <label>
                Potência (HP)
                <input min="0" type="number" value={draft.powerHp ?? ''} onChange={(event) => updateNumericDraft('powerHp', event.target.value)} />
              </label>
            ) : null}

            {activeCategory !== 'localidade' ? (
              <label>
                Tipo de energia
                <input
                  value={draft.energyType ?? ''}
                  onChange={(event) => updateDraft('energyType', event.target.value || undefined)}
                  placeholder="Solar, trifásica, rede elétrica"
                />
              </label>
            ) : null}

            {activeCategory === 'poço' ? (
              <label>
                Profundidade (m)
                <input
                  min="0"
                  type="number"
                  value={draft.depthMeters ?? ''}
                  onChange={(event) => updateNumericDraft('depthMeters', event.target.value)}
                />
              </label>
            ) : null}

            {activeCategory === 'reservatório' || activeCategory === 'localidade' ? (
              <label>
                Capacidade (m³)
                <input
                  min="0"
                  type="number"
                  value={draft.capacityM3 ?? ''}
                  onChange={(event) => updateNumericDraft('capacityM3', event.target.value)}
                />
              </label>
            ) : null}

            <label>
              Latitude
              <input
                step="0.000001"
                type="number"
                value={draft.latitude ?? ''}
                onChange={(event) => updateNumericDraft('latitude', event.target.value)}
              />
            </label>

            <label>
              Longitude
              <input
                step="0.000001"
                type="number"
                value={draft.longitude ?? ''}
                onChange={(event) => updateNumericDraft('longitude', event.target.value)}
              />
            </label>

            <div className="full-field coordinate-picker-field">
              <span>Localização geográfica</span>
              <Suspense fallback={<div className="coordinate-map-loading">Carregando seletor geográfico</div>}>
                <CoordinatePickerMap latitude={draft.latitude} longitude={draft.longitude} onChange={updateDraftCoordinates} />
              </Suspense>
            </div>

            <label className="full-field">
              Última medição
              <input value={draft.lastReading} onChange={(event) => updateDraft('lastReading', event.target.value)} />
            </label>

            <label className="full-field">
              Observações
              <textarea
                rows={4}
                value={draft.notes}
                onChange={(event) => updateDraft('notes', event.target.value)}
                placeholder="Histórico técnico, pendências, checklist ou condição operacional"
              />
            </label>
          </div>

          <div className="form-actions">
            {editingId ? (
              <button className="secondary-action" type="button" onClick={cancelEdit}>
                <X size={18} />
                Cancelar
              </button>
            ) : null}
            <button className="primary-action" type="submit" disabled={isSubmitting}>
              {editingId ? <Save size={18} /> : <Plus size={18} />}
              {isSubmitting ? 'Salvando...' : editingId ? 'Salvar alterações' : `Cadastrar ${activeMeta.label}`}
            </button>
          </div>
        </form>

        <section className="panel registry-table-panel">
          <div className="table-title">
            <div>
              <span className="eyebrow">Lista ativa</span>
              <h2>{activeMeta.plural}</h2>
            </div>
            <span>{filteredRecords.length} de {activeRecords.length} registro(s)</span>
          </div>

          <div className="registry-table" role="table" aria-label={`Cadastro de ${activeMeta.plural}`}>
            <div className="registry-row table-head" role="row">
              <span>Código</span>
              <span>Nome</span>
              <span>Status</span>
              <span>Vazão</span>
              <span>Responsável</span>
              <span>Ações</span>
            </div>
            {isLoading ? <div className="empty-state">Carregando cadastro hídrico...</div> : null}
            {!isLoading && !filteredRecords.length ? <div className="empty-state">Nenhum ativo encontrado para os filtros atuais.</div> : null}
            {filteredRecords.map((record) => (
              <div
                className={record.id === selectedAsset?.id ? 'registry-row registry-row-button selected' : 'registry-row registry-row-button'}
                key={record.id}
                role="row"
                tabIndex={0}
                onClick={() => setSelectedId(record.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    setSelectedId(record.id);
                  }
                }}
              >
                <span>{record.code}</span>
                <strong>{record.name}</strong>
                <span>
                  <i className={`status-dot status-${record.status}`} />
                  {statusLabel[record.status]}
                </span>
                <span>{record.flowRate ?? 0} m³/h</span>
                <span>{record.responsible}</span>
                <span className="row-actions" onClick={(event) => event.stopPropagation()}>
                  <button type="button" aria-label={`Editar ${record.name}`} onClick={() => startEdit(record)}>
                    <Edit3 size={17} />
                  </button>
                  <button type="button" aria-label={`Excluir ${record.name}`} onClick={() => { void removeRecord(record); }}>
                    <Trash2 size={17} />
                  </button>
                </span>
              </div>
            ))}
          </div>
        </section>
      </section>

      <section className="registry-detail-grid">
        <section className="panel detail-panel">
          <div className="table-title">
            <div>
              <span className="eyebrow">Leituras</span>
              <h2>{selectedAsset ? selectedAsset.name : 'Selecione um ativo'}</h2>
            </div>
            <span>{selectedReadings.length} registro(s)</span>
          </div>
          <form className="inline-form" onSubmit={submitReading}>
            <label>
              Data
              <input type="datetime-local" value={readingDraft.readingAt} onChange={(event) => setReadingDraft((current) => ({ ...current, readingAt: event.target.value }))} />
            </label>
            <label>
              Vazão
              <input type="number" value={readingDraft.flowRate} onChange={(event) => setReadingDraft((current) => ({ ...current, flowRate: event.target.value }))} placeholder="m³/h" />
            </label>
            <label>
              Nível
              <input type="number" value={readingDraft.reservoirLevel} onChange={(event) => setReadingDraft((current) => ({ ...current, reservoirLevel: event.target.value }))} placeholder="%" />
            </label>
            <label>
              Operador
              <input value={readingDraft.operatorName} onChange={(event) => setReadingDraft((current) => ({ ...current, operatorName: event.target.value }))} />
            </label>
            <label className="full-field">
              Observação
              <input value={readingDraft.notes} onChange={(event) => setReadingDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Resumo da leitura" />
            </label>
            <button className="primary-action" type="submit" disabled={!selectedAsset}>
              <Plus size={17} />
              Registrar leitura
            </button>
          </form>
          <div className="mini-table">
            {selectedReadings.length ? (
              selectedReadings.map((reading) => (
                <article key={reading.id}>
                  <strong>{new Date(reading.readingAt).toLocaleString('pt-BR')}</strong>
                  <span>{reading.flowRate ?? '-'} m³/h</span>
                  <span>{reading.reservoirLevel ?? '-'}%</span>
                  <small>{reading.notes || reading.operatorName}</small>
                </article>
              ))
            ) : (
              <div className="empty-state">Sem leituras registradas para o ativo selecionado.</div>
            )}
          </div>
        </section>

        <section className="panel detail-panel">
          <div className="table-title">
            <div>
              <span className="eyebrow">Manutenção</span>
              <h2>Ordens vinculadas</h2>
            </div>
            <span>{selectedMaintenance.length} OS</span>
          </div>
          <form className="inline-form" onSubmit={submitMaintenance}>
            <label className="full-field">
              Serviço
              <input value={maintenanceDraft.service} onChange={(event) => setMaintenanceDraft((current) => ({ ...current, service: event.target.value }))} placeholder="Troca, inspeção ou verificação" />
            </label>
            <label>
              Responsável
              <select value={maintenanceDraft.responsible} onChange={(event) => setMaintenanceDraft((current) => ({ ...current, responsible: event.target.value as InternalProfile }))}>
                {profileOptions.map((profile) => (
                  <option key={profile} value={profile}>
                    {profile}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Prazo
              <input type="date" value={maintenanceDraft.dueDate ?? ''} onChange={(event) => setMaintenanceDraft((current) => ({ ...current, dueDate: event.target.value }))} />
            </label>
            <label className="full-field">
              Observação
              <input value={maintenanceDraft.notes} onChange={(event) => setMaintenanceDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Checklist ou pendência técnica" />
            </label>
            <button className="primary-action" type="submit" disabled={!selectedAsset}>
              <ClipboardList size={17} />
              Abrir OS
            </button>
          </form>
          <div className="mini-table maintenance-mini-table">
            {selectedMaintenance.length ? (
              selectedMaintenance.map((order) => (
                <article key={order.id}>
                  <strong>{order.service}</strong>
                  <span>{order.status.replace('_', ' ')}</span>
                  <span>{order.dueDate ?? 'Sem prazo'}</span>
                  <button type="button" aria-label={`Concluir ${order.service}`} onClick={() => { void completeMaintenance(order.id); }} disabled={order.status === 'concluida'}>
                    <Check size={15} />
                  </button>
                </article>
              ))
            ) : (
              <div className="empty-state">Sem manutenção vinculada ao ativo selecionado.</div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

export default CadastroHidrico;
