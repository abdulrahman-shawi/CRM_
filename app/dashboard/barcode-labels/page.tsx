'use client';

import * as React from 'react';
import toast from 'react-hot-toast';
import { Plus, Printer, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Barcode } from '@/components/ui/barcode';
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
                    <Button onClick={() => window.print()} disabled={totalLabels === 0}>
                        <Printer size={16} className="ml-2" />
                        طباعة ({totalLabels} ملصق)
                    </Button>
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
