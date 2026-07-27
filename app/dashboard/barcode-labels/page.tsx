'use client';

import * as React from 'react';
import toast from 'react-hot-toast';
import { Download, Plus, Printer, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Barcode } from '@/components/ui/barcode';
import { buildCode39SvgString } from '@/lib/barcode';
import { formatSiteCurrency, useSiteCurrency } from '@/lib/currency';
import { getProduct } from '@/server/product';

type ProductLite = {
    id: number;
    name: string;
    barcode: string | null;
    price: number;
};

type LabelItem = {
    id: number;
    name: string;
    barcode: string;
    price: number;
    copies: number;
};

const LABEL_SIZES = {
    small: { label: 'صغير (50×30 مم)', width: '50mm', height: '30mm', barcodeHeight: 26 },
    large: { label: 'كبير (70×40 مم)', width: '70mm', height: '40mm', barcodeHeight: 34 },
} as const;

type LabelSizeKey = keyof typeof LABEL_SIZES;

export default function BarcodeLabelsPage() {
    const { settings: currencySettings } = useSiteCurrency();
    const [products, setProducts] = React.useState<ProductLite[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [search, setSearch] = React.useState('');
    const [selected, setSelected] = React.useState<LabelItem[]>([]);
    const [sizeKey, setSizeKey] = React.useState<LabelSizeKey>('small');

    React.useEffect(() => {
        (async () => {
            try {
                const data = await getProduct();
                const list: ProductLite[] = (Array.isArray(data) ? data : []).map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    barcode: p.barcode || null,
                    price: Number(p.stocks?.[0]?.price ?? p.wholesalePrice ?? 0),
                }));
                setProducts(list);
            } catch (error) {
                console.error('Load products for labels error:', error);
                toast.error('تعذر تحميل المنتجات');
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    const filtered = React.useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return [];
        return products
            .filter((p) =>
                p.name.toLowerCase().includes(query) ||
                (p.barcode || '').toLowerCase().includes(query)
            )
            .slice(0, 10);
    }, [products, search]);

    const addProduct = (product: ProductLite) => {
        if (!product.barcode) {
            toast.error('هذا المنتج بدون باركود — أضف باركود من صفحة المنتجات أولاً');
            return;
        }
        setSelected((prev) => {
            const existing = prev.find((item) => item.id === product.id);
            if (existing) {
                return prev.map((item) =>
                    item.id === product.id ? { ...item, copies: item.copies + 1 } : item
                );
            }
            return [...prev, { id: product.id, name: product.name, barcode: product.barcode!, price: product.price, copies: 1 }];
        });
    };

    const updateCopies = (id: number, copies: number) => {
        const safe = Math.max(1, Math.min(200, Math.round(copies || 1)));
        setSelected((prev) => prev.map((item) => (item.id === id ? { ...item, copies: safe } : item)));
    };

    const removeItem = (id: number) => {
        setSelected((prev) => prev.filter((item) => item.id !== id));
    };

    const totalLabels = selected.reduce((sum, item) => sum + item.copies, 0);
    const size = LABEL_SIZES[sizeKey];

    // ─── حفظ الملصق كصورة PNG (بدقة 300 DPI مناسبة للطباعة) ───
    const PX_PER_MM = 300 / 25.4;

    const renderLabelToPngBlob = async (item: LabelItem): Promise<Blob | null> => {
        const widthPx = Math.round(parseFloat(size.width) * PX_PER_MM);
        const heightPx = Math.round(parseFloat(size.height) * PX_PER_MM);

        const canvas = document.createElement('canvas');
        canvas.width = widthPx;
        canvas.height = heightPx;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // خلفية بيضاء وإطار
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, widthPx, heightPx);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, widthPx - 2, heightPx - 2);

        const centerX = widthPx / 2;
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';

        // اسم المنتج
        ctx.direction = 'rtl';
        ctx.font = `bold ${Math.round(heightPx * 0.11)}px sans-serif`;
        ctx.fillText(item.name, centerX, Math.round(heightPx * 0.16), widthPx - 24);

        // السعر
        ctx.font = `${Math.round(heightPx * 0.09)}px sans-serif`;
        ctx.fillText(formatSiteCurrency(item.price, currencySettings), centerX, Math.round(heightPx * 0.29), widthPx - 24);

        // الباركود
        const svg = buildCode39SvgString(item.barcode, 100, 3);
        if (svg) {
            const img = new Image();
            await new Promise<void>((resolve) => {
                img.onload = () => resolve();
                img.onerror = () => resolve();
                img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
            });
            if (img.width > 0) {
                const maxBarWidth = widthPx - 40;
                const barTop = Math.round(heightPx * 0.35);
                const barAreaHeight = Math.round(heightPx * 0.42);
                const scale = Math.min(maxBarWidth / img.width, barAreaHeight / img.height);
                const drawWidth = img.width * scale;
                const drawHeight = img.height * scale;
                ctx.drawImage(img, centerX - drawWidth / 2, barTop, drawWidth, drawHeight);
            }
        }

        // قيمة الباركود
        ctx.direction = 'ltr';
        ctx.font = `${Math.round(heightPx * 0.09)}px monospace`;
        ctx.fillText(item.barcode, centerX, Math.round(heightPx * 0.92));

        return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    };

    const saveBlobAsFile = (blob: Blob, fileName: string) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const downloadLabelImage = async (item: LabelItem) => {
        const blob = await renderLabelToPngBlob(item);
        if (!blob) {
            toast.error('تعذر توليد صورة الملصق');
            return;
        }
        saveBlobAsFile(blob, `label-${item.barcode}.png`);
    };

    const downloadAllLabelImages = async () => {
        if (selected.length === 0) return;
        toast.success('جاري تحميل صورة PNG لكل منتج...');
        for (const item of selected) {
            await downloadLabelImage(item);
            await new Promise((resolve) => setTimeout(resolve, 400));
        }
    };

    const labels = React.useMemo(() => {
        const out: LabelItem[] = [];
        for (const item of selected) {
            for (let i = 0; i < item.copies; i++) out.push(item);
        }
        return out;
    }, [selected]);

    return (
        <div className="p-4" dir="rtl">
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    .labels-sheet, .labels-sheet * { visibility: visible; }
                    .labels-sheet {
                        position: absolute;
                        inset: 0 auto auto 0;
                        width: 100%;
                        background: white;
                    }
                    .barcode-label { page-break-inside: avoid; }
                    @page { margin: 5mm; }
                }
            `}</style>

            <div className="no-print space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-xl font-bold">طباعة ملصقات الباركود</h1>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => void downloadAllLabelImages()} disabled={selected.length === 0}>
                            <Download size={16} className="ml-2" />
                            حفظ كصور PNG
                        </Button>
                        <Button onClick={() => window.print()} disabled={totalLabels === 0}>
                            <Printer size={16} className="ml-2" />
                            طباعة ({totalLabels} ملصق)
                        </Button>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                    <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                        ابحث عن منتج بالاسم أو الباركود
                    </label>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="اكتب للبحث..."
                        className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />

                    {search.trim() && (
                        <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
                            {isLoading && <p className="py-3 text-sm text-slate-500">جاري التحميل...</p>}
                            {!isLoading && filtered.length === 0 && (
                                <p className="py-3 text-sm text-slate-500">لا توجد نتائج مطابقة</p>
                            )}
                            {filtered.map((product) => (
                                <div key={product.id} className="flex items-center justify-between gap-3 py-2">
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{product.name}</div>
                                        <div className="font-mono text-xs text-slate-500" dir="ltr">{product.barcode || 'بدون باركود'}</div>
                                    </div>
                                    <Button variant="outline" onClick={() => addProduct(product)} disabled={!product.barcode}>
                                        <Plus size={14} className="ml-1" /> أضف
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {selected.length > 0 && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                            <h2 className="text-sm font-black text-slate-800 dark:text-slate-100">الملصقات المحددة</h2>
                            <select
                                value={sizeKey}
                                onChange={(e) => setSizeKey(e.target.value as LabelSizeKey)}
                                className="rounded-xl border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                            >
                                {Object.entries(LABEL_SIZES).map(([key, value]) => (
                                    <option key={key} value={key}>{value.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {selected.map((item) => (
                                <div key={item.id} className="flex items-center justify-between gap-3 py-2">
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{item.name}</div>
                                        <div className="font-mono text-xs text-slate-500" dir="ltr">{item.barcode}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs text-slate-500">النسخ</label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={200}
                                            value={item.copies}
                                            onChange={(e) => updateCopies(item.id, Number(e.target.value))}
                                            className="w-20 rounded-lg border border-slate-300 bg-white p-2 text-center text-sm dark:border-slate-700 dark:bg-slate-900"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => void downloadLabelImage(item)}
                                            className="rounded-lg p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                                            aria-label="حفظ كصورة"
                                            title="حفظ الملصق كصورة PNG"
                                        >
                                            <Download size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => removeItem(item.id)}
                                            className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                                            aria-label="حذف"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {labels.length > 0 && (
                <div className="labels-sheet mt-6 flex flex-wrap gap-[2mm] bg-white text-black">
                    {labels.map((item, index) => (
                        <div
                            key={`${item.id}-${index}`}
                            className="barcode-label flex flex-col items-center justify-center overflow-hidden border border-black bg-white p-[1.5mm] text-center"
                            style={{ width: size.width, height: size.height }}
                        >
                            <div className="w-full truncate text-[9px] font-bold leading-tight">{item.name}</div>
                            <div className="text-[8px] leading-tight">{formatSiteCurrency(item.price, currencySettings)}</div>
                            <Barcode value={item.barcode} height={size.barcodeHeight} showValue className="max-w-full" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
