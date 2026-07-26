'use client';

import * as React from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';

// علامة موقع مرسومة بـ div لتجنب مشاكل أيقونات leaflet الافتراضية مع webpack
const markerIcon = L.divIcon({
    className: '',
    html: '<div style="width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid #ffffff;box-shadow:0 1px 4px rgba(0,0,0,0.45);"></div>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
});

type Coords = [number, number];

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(event) {
            onPick(event.latlng.lat, event.latlng.lng);
        },
    });
    return null;
}

function Recenter({ coords }: { coords: Coords | null }) {
    const map = useMap();
    const lat = coords?.[0];
    const lng = coords?.[1];
    React.useEffect(() => {
        if (lat == null || lng == null) return;
        map.flyTo([lat, lng], Math.max(map.getZoom(), 14));
    }, [lat, lng, map]);
    return null;
}

// مركز افتراضي: دمشق
const DEFAULT_CENTER: Coords = [33.5138, 36.2765];

export default function MapPickerInner({
    coords,
    onPick,
}: {
    coords: Coords | null;
    onPick: (lat: number, lng: number) => void;
}) {
    return (
        <MapContainer
            center={coords || DEFAULT_CENTER}
            zoom={coords ? 14 : 11}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ClickHandler onPick={onPick} />
            <Recenter coords={coords} />
            {coords && <Marker position={coords} icon={markerIcon} />}
        </MapContainer>
    );
}
