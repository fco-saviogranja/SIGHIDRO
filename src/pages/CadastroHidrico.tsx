import { FormEvent, useMemo, useState } from 'react';
import { Edit3, Plus, RotateCcw, Save, Trash2, X } from 'lucide-react';
import CoordinatePickerMap from '../components/CoordinatePickerMap';
import { useHydroRegistry } from '../HydroRegistryContext';
import {
  categoryMeta,
  categoryOrder,
  profileOptions,
  statusLabel,
  statusOptions,
} from '../metadata';
import type { AssetCategory, HydroRecord, HydroRecordDraft, InternalProfile, OperationalStatus } from '../types';

const nowLabel = () =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

const defaultCoordinatesByCategory: Record<AssetCategory, { latitude: number; longitude: number }> = {
  poço: { latitude: -7.5748, longitude: -39.3042 },
  bomba: { latitude: -7.5812, longitude: -39.282 },
  reservatório: { latitude: -7.5632, longitude: -39.2684 },
  localidade: { latitude: -7.576, longitude: -39.2826 },
};

const makeDraft = (category: AssetCategory): HydroRecordDraft => ({
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

function CadastroHidrico() {
  const { registry, createRecord, updateRecord, deleteRecord, resetRegistry, syncStatus, retrySync, backend } = useHydroRegistry();
  const [activeCategory, setActiveCategory] = useState<AssetCategory>('poço');
  const [draft, setDraft] = useState<HydroRecordDraft>(() => makeDraft('poço'));
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const switchCategory = (category: AssetCategory) => {
    setActiveCategory(category);
    setDraft(makeDraft(category));
    setEditingId(null);
  };

  const updateDraft = <K extends keyof HydroRecordDraft>(field: K, value: HydroRecordDraft[K]) => {
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

  const startEdit = (record: HydroRecord) => {
    const { id: _id, code: _code, category: _category, ...editable } = record;
    setEditingId(record.id);
    setDraft(editable);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(makeDraft(activeCategory));
  };

  const submitRecord = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedDraft: HydroRecordDraft = {
      ...draft,
      name: draft.name.trim(),
      location: draft.location.trim(),
      notes: draft.notes.trim(),
      lastReading: draft.lastReading.trim() || nowLabel(),
      flowRate: Number(draft.flowRate || 0),
      latitude: typeof draft.latitude === 'number' && Number.isFinite(draft.latitude) ? draft.latitude : undefined,
      longitude: typeof draft.longitude === 'number' && Number.isFinite(draft.longitude) ? draft.longitude : undefined,
    };

    if (!normalizedDraft.name || !normalizedDraft.location) {
      return;
    }

    if (editingId) {
      updateRecord(activeCategory, editingId, normalizedDraft);
    } else {
      createRecord(activeCategory, normalizedDraft);
    }

    cancelEdit();
  };

  const removeRecord = (record: HydroRecord) => {
    const confirmed = window.confirm(`Excluir ${record.name} do cadastro hídrico?`);
    if (!confirmed) {
      return;
    }

    deleteRecord(record.category, record.id);
    if (editingId === record.id) {
      cancelEdit();
    }
  };

  return (
    <main className="dashboard route-page">
      <section className="page-hero">
        <div>
          <span className="eyebrow">Cadastro Hídrico</span>
          <h1>Base institucional de ativos e localidades</h1>
          <p>Cadastro com persistência local e sincronização via API quando autenticado.</p>
          <p className="sync-info">
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
          </p>
        </div>
        <button className="secondary-action" type="button" onClick={resetRegistry}>
          <RotateCcw size={18} />
          Restaurar dados iniciais
        </button>
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
              <input
                min="0"
                type="number"
                value={draft.flowRate}
                onChange={(event) => updateNumericDraft('flowRate', event.target.value)}
              />
            </label>

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

            <label>
              Potência (HP)
              <input
                min="0"
                type="number"
                value={draft.powerHp ?? ''}
                onChange={(event) => updateNumericDraft('powerHp', event.target.value)}
              />
            </label>

            <label>
              Tipo de energia
              <input
                value={draft.energyType ?? ''}
                onChange={(event) => updateDraft('energyType', event.target.value || undefined)}
                placeholder="Solar, trifásica, rede elétrica"
              />
            </label>

            <label>
              Profundidade (m)
              <input
                min="0"
                type="number"
                value={draft.depthMeters ?? ''}
                onChange={(event) => updateNumericDraft('depthMeters', event.target.value)}
              />
            </label>

            <label>
              Capacidade (m³)
              <input
                min="0"
                type="number"
                value={draft.capacityM3 ?? ''}
                onChange={(event) => updateNumericDraft('capacityM3', event.target.value)}
              />
            </label>

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
              <CoordinatePickerMap
                latitude={draft.latitude}
                longitude={draft.longitude}
                onChange={updateDraftCoordinates}
              />
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
            <button className="primary-action" type="submit">
              {editingId ? <Save size={18} /> : <Plus size={18} />}
              {editingId ? 'Salvar alterações' : `Cadastrar ${activeMeta.label}`}
            </button>
          </div>
        </form>

        <section className="panel registry-table-panel">
          <div className="table-title">
            <div>
              <span className="eyebrow">Lista ativa</span>
              <h2>{activeMeta.plural}</h2>
            </div>
            <span>{activeRecords.length} registro(s)</span>
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
            {activeRecords.map((record) => (
              <div className="registry-row" key={record.id} role="row">
                <span>{record.code}</span>
                <strong>{record.name}</strong>
                <span>
                  <i className={`status-dot status-${record.status}`} />
                  {statusLabel[record.status]}
                </span>
                <span>{record.flowRate} m³/h</span>
                <span>{record.responsible}</span>
                <span className="row-actions">
                  <button type="button" aria-label={`Editar ${record.name}`} onClick={() => startEdit(record)}>
                    <Edit3 size={17} />
                  </button>
                  <button type="button" aria-label={`Excluir ${record.name}`} onClick={() => removeRecord(record)}>
                    <Trash2 size={17} />
                  </button>
                </span>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

export default CadastroHidrico;
