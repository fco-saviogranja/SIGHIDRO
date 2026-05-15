import { useEffect } from 'react';
import type { LatLngExpression } from 'leaflet';
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';

type CoordinatePickerMapProps = {
  latitude?: number;
  longitude?: number;
  onChange: (coordinates: { latitude: number; longitude: number }) => void;
};

const JARDIM_CENTER: LatLngExpression = [-7.576, -39.2826];

const getValidCoordinates = (latitude?: number, longitude?: number): [number, number] | null => {
  if (
    typeof latitude !== 'number' ||
    !Number.isFinite(latitude) ||
    typeof longitude !== 'number' ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  return [latitude, longitude];
};

function CoordinatePickerEvents({ onChange }: Pick<CoordinatePickerMapProps, 'onChange'>) {
  useMapEvents({
    click(event) {
      onChange({
        latitude: Number(event.latlng.lat.toFixed(6)),
        longitude: Number(event.latlng.lng.toFixed(6)),
      });
    },
  });

  return null;
}

function CoordinatePickerCenter({ latitude, longitude }: Pick<CoordinatePickerMapProps, 'latitude' | 'longitude'>) {
  const map = useMap();

  useEffect(() => {
    const coordinates = getValidCoordinates(latitude, longitude);

    if (!coordinates) {
      map.setView(JARDIM_CENTER, 13);
      return;
    }

    map.setView(coordinates, Math.max(map.getZoom(), 14));
  }, [latitude, longitude, map]);

  return null;
}

function CoordinatePickerMap({ latitude, longitude, onChange }: CoordinatePickerMapProps) {
  const coordinates = getValidCoordinates(latitude, longitude);
  const center = coordinates ?? JARDIM_CENTER;

  return (
    <div className="coordinate-picker-map">
      <MapContainer center={center} zoom={14} scrollWheelZoom className="coordinate-picker-canvas">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CoordinatePickerEvents onChange={onChange} />
        <CoordinatePickerCenter latitude={latitude} longitude={longitude} />
        {coordinates ? (
          <CircleMarker
            center={coordinates}
            fillColor="#2f6858"
            fillOpacity={0.96}
            pathOptions={{ color: '#ffffff', weight: 3 }}
            radius={10}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
              Posição
            </Tooltip>
          </CircleMarker>
        ) : null}
      </MapContainer>
      {coordinates ? (
        <div className="coordinate-readout">
          {coordinates[0].toFixed(6)}, {coordinates[1].toFixed(6)}
        </div>
      ) : null}
    </div>
  );
}

export default CoordinatePickerMap;
