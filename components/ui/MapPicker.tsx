'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { Crosshair } from 'lucide-react';
import toast from 'react-hot-toast';

const MapPickerInner = dynamic(() => import('./MapPickerInner'), {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse bg-slate-100 dark:bg-slate-800" />,
});

type Coords = [number, number];

/**
 * استخراج الإحداثيات من رابط خرائط جوجل أو من نص "lat,lng"
 */
export function parseMapCoords(link: string): Coords | null {
    const text = String(link || '').trim();
    if (!text) return null;

    const patterns = [
        /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
        /@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
        /[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
        /^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            const lat = Number(match[1]);
            const lng = Number(match[2]);
            if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
                return [lat, lng];
            }
        }
    }
    return null;
}

export function buildMapLink(lat: number, lng: number): string {
    return `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

type MapPickerProps = {
    value: string;
    onChange: (link: string) => void;
    height?: number;
};

/**
 * خريطة تفاعلية: النقر عليها يولّد رابط خرائط جوجل تلقائياً،
 * مع زر لتحديد الموقع الحالي للشخص، ويتزامن مع حقل الرابط يدوياً.
 */
export function MapPicker({ value, onChange, height = 260 }: MapPickerProps) {
    const coords = parseMapCoords(value);
    const [locating, setLocating] = React.useState(false);

    const handlePick = React.useCallback(
        (lat: number, lng: number) => {
            onChange(buildMapLink(lat, lng));
        },
        [onChange]
    );

    const handleLocate = () => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            toast.error('المتصفح لا يدعم تحديد الموقع');
            return;
        }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                handlePick(position.coords.latitude, position.coords.longitude);
                setLocating(false);
            },
            () => {
                toast.error('تعذر تحديد الموقع، تأكد من السماح بالوصول للموقع');
                setLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
                <button
                    type="button"
                    onClick={handleLocate}
                    disabled={locating}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-60"
                >
                    <Crosshair size={14} />
                    {locating ? 'جاري تحديد الموقع...' : 'موقعي الحالي'}
                </button>
                <span className="text-[11px] text-slate-400 font-bold">
                    انقر على الخريطة لتحديد الموقع ويُولَّد رابط جوجل تلقائياً
                </span>
            </div>
            <div
                className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700"
                style={{ height }}
                dir="ltr"
            >
                <MapPickerInner coords={coords} onPick={handlePick} />
            </div>
        </div>
    );
}
