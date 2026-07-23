import { useEffect, useMemo } from 'react';
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { categoryMeta, statusLabel } from '../metadata';
import type { HydroRecord, OperationalStatus } from '../types';

type OperationalLeafletMapProps = {
  className?: string;
  records: HydroRecord[];
};

type MappedRecord = HydroRecord & {
  latitude: number;
  longitude: number;
};

const JARDIM_CENTER: LatLngExpression = [-7.576, -39.2826];

const fallbackCoordinatesById: Record<string, { latitude: number; longitude: number }> = {
  'well-brejinho': { latitude: -7.5748, longitude: -39.3042 },
  'well-serra-boa': { latitude: -7.6119, longitude: -39.2533 },
  'pump-sp-17-10': { latitude: -7.5812, longitude: -39.282 },
  'reservoir-sao-francisco': { latitude: -7.5632, longitude: -39.2684 },
  'locality-centro': { latitude: -7.576, longitude: -39.2826 },
};

const statusColor: Record<OperationalStatus, string> = {
  operando: '#2f6858',
  atenção: '#b88724',
  parado: '#8f3d3d',
  manutenção: '#315168',
};

const hasCoordinates = (record: HydroRecord): record is MappedRecord =>
  typeof record.latitude === 'number' &&
  Number.isFinite(record.latitude) &&
  typeof record.longitude === 'number' &&
  Number.isFinite(record.longitude);

const resolveMappedRecord = (record: HydroRecord): MappedRecord | null => {
  if (hasCoordinates(record)) {
    return record;
  }

  const fallbackCoordinates = fallbackCoordinatesById[record.id];
  if (!fallbackCoordinates) {
    return null;
  }

  return {
    ...record,
    ...fallbackCoordinates,
  };
};

function FitBounds({ records }: { records: MappedRecord[] }) {
  const map = useMap();

  useEffect(() => {
    if (!records.length) {
      map.setView(JARDIM_CENTER, 13);
      return;
    }

    const bounds = records.map((record) => [record.latitude, record.longitude]) as LatLngBoundsExpression;
    map.fitBounds(bounds, { maxZoom: 15, padding: [36, 36] });
  }, [map, records]);

  return null;
}

function OperationalLeafletMap({ className = '', records }: OperationalLeafletMapProps) {
  const hasCoarsePointer = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  const mappedRecords = useMemo(
    () => records.map(resolveMappedRecord).filter((record): record is MappedRecord => Boolean(record)),
    [records],
  );
  const unmappedCount = records.length - mappedRecords.length;
  const pipelinePositions = mappedRecords.map((record) => [record.latitude, record.longitude]) as LatLngExpression[];

  if (!mappedRecords.length) {
    return (
      <div className={`operational-leaflet-map ${className}`}>
        <div className="operational-map-empty">
          Cadastre latitude e longitude nos ativos para exibir a camada geográfica.
        </div>
      </div>
    );
  }

  return (
    <div className={`operational-leaflet-map ${className}`}>
      <MapContainer
        center={JARDIM_CENTER}
        zoom={13}
        dragging={!hasCoarsePointer}
        scrollWheelZoom={false}
        className="operational-leaflet-canvas"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds records={mappedRecords} />
        {pipelinePositions.length > 1 ? (
          <Polyline pathOptions={{ color: '#315168', opacity: 0.72, weight: 4 }} positions={pipelinePositions} />
        ) : null}
        {mappedRecords.map((record) => (
          <CircleMarker
            center={[record.latitude, record.longitude]}
            fillColor={statusColor[record.status]}
            fillOpacity={0.95}
            key={record.id}
            pathOptions={{ color: '#ffffff', weight: 3 }}
            radius={11}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
              {record.code}
            </Tooltip>
            <Popup>
              <div className="operational-map-popup">
                <strong>{record.name}</strong>
                <span>{record.code} · {categoryMeta[record.category].label}</span>
                <dl>
                  <div>
                    <dt>Status</dt>
                    <dd>{statusLabel[record.status]}</dd>
                  </div>
                  <div>
                    <dt>Vazão</dt>
                    <dd>{record.flowRate} m³/h</dd>
                  </div>
                  <div>
                    <dt>Local</dt>
                    <dd>{record.location}</dd>
                  </div>
                </dl>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      {unmappedCount > 0 ? (
        <div className="operational-map-unmapped">
          {unmappedCount} ativo(s) sem coordenadas
        </div>
      ) : null}
    </div>
  );
}

export default OperationalLeafletMap;
