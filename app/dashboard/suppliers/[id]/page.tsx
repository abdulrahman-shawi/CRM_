'use client';
import { AppModal } from '@/components/ui/app-modal';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/form-input';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/utils';
import { getProductCatalog } from '@/server/product';
import { getProductCostInfo, getSupplier, getSupplierProducts, setProductSupplier } from '@/server/supplier';
import { useParams } from 'next/navigation';
import * as React from 'react';
import toast from 'react-hot-toast';

export default function SupplierDetailsPage() {
    const { user } = useAuth();
    const params = useParams();
    const supplierId = String(params?.id || '');
    const [supplier, setSupplier] = React.useState<any>(null);
    const [products, setProducts] = React.useState<any[]>([]);
    const [supplierProducts, setSupplierProducts] = React.useState<any[]>([]);
    const [isOpen, setIsOpen] = React.useState(false);
    const [selectedProduct, setSelectedProduct] = React.useState<any>(null);
    const [costPrice, setCostPrice] = React.useState('');
    const [sku, setSku] = React.useState('');

    const getData = async () => {
        const [supRes, proRes, spRes] = await Promise.all([
            getSupplier(supplierId),
            getProductCatalog(),
            getSupplierProducts(supplierId),
        ]);
        if (supRes.success) setSupplier(supRes.data);
        if (proRes.success) setProducts(proRes.data || []);
        if (spRes.success) setSupplierProducts(spRes.data || []);
    };

    React.useEffect(() => { if (supplierId) getData(); }, [supplierId, getData]);

    const handleSave = async () => {
        if (!selectedProduct) return;
        const loading = toast.loading('جاري حفظ سعر الشراء...');
        try {
            const res = await setProductSupplier({
                productId: Number(selectedProduct.id),
                supplierId,
                costPrice: Number(costPrice || 0),
                sku,
            });
            if (res.success) { toast.success('تم الحفظ'); setIsOpen(false); getData(); }
            else toast.error(res.error || 'تعذر الحفظ');
        } catch { toast.error('حدث خطأ غير متوقع'); } finally { toast.dismiss(loading); }
    };

    const openAdd = () => {
        setSelectedProduct(null);
        setCostPrice('');
        setSku('');
        setIsOpen(true);
    };

    return (
        <div className="p-4">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{supplier?.name}</h1>
                <p className="text-slate-500">{supplier?.phone} | {supplier?.email}</p>
            </div>

            <div className="flex justify-between items-center mb-4">
                <div className="text-xl font-bold">أسعار شراء المنتجات</div>
                {user && hasPermission(user, 'editSuppliers') && (
                    <Button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-6">ربط منتج وسعر</Button>
                )}
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-sm text-right">
                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                        <tr>
                            <th className="p-4 font-bold">المنتج</th>
                            <th className="p-4 font-bold">سعر الشراء</th>
                            <th className="p-4 font-bold">الربحية</th>
                            <th className="p-4 font-bold">SKU</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {supplierProducts.map((sp) => {
                            const price = sp.product?.stocks?.[0]?.price || 0;
                            const profit = price - sp.costPrice;
                            return (
                                <tr key={sp.id}>
                                    <td className="p-4">{sp.product?.name}</td>
                                    <td className="p-4 font-bold text-slate-900 dark:text-white">{sp.costPrice}</td>
                                    <td className="p-4 font-bold text-emerald-600">{profit.toFixed(2)}</td>
                                    <td className="p-4 text-slate-500">{sp.sku || '-'}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <AppModal title="ربط منتج بسعر شراء" isOpen={isOpen} onClose={() => setIsOpen(false)}>
                <div className="p-4 space-y-4">
                    <select
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-sm"
                        onChange={(e) => setSelectedProduct(products.find((p) => p.id === Number(e.target.value)))}
                    >
                        <option value="">اختر منتجاً</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <FormInput className="text-gray-800 dark:text-white" label="سعر الشراء" type="number" step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
                    <FormInput className="text-gray-800 dark:text-white" label="SKU (اختياري)" value={sku} onChange={(e) => setSku(e.target.value)} />
                    <Button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700 text-white">حفظ</Button>
                </div>
            </AppModal>
        </div>
    );
}
