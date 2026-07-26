'use client';

import * as React from 'react';
import { useAuth } from '@/context/AuthContext';
import { hasPermission, isAdmin } from '@/lib/utils';
import { getRepOrders, getRepReturns, createRepReturn } from '@/server/rep-return';
import { DataTable } from '@/components/shared/DataTable';
import { AppModal } from '@/components/ui/app-modal';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/form-input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Trash2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

const REASON_LABELS: Record<string, string> = {
    DAMAGED: 'تالف',
    WRONG_PRODUCT: 'منتج خاطئ',
    CUSTOMER_RETURN: 'مرتجع عميل',
    EXPIRED: 'منتهي الصلاحية',
    OTHER: 'أخرى',
};

export default function RepReturnsPage() {
    const { user } = useAuth();
    const [returns, setReturns] = React.useState<any[]>([]);
    const [orders, setOrders] = React.useState<any[]>([]);
    const [search, setSearch] = React.useState('');
    const [isOpen, setIsOpen] = React.useState(false);
    const [selectedOrder, setSelectedOrder] = React.useState<any>(null);
    const [selectedItems, setSelectedItems] = React.useState<Record<number, number>>({});
    const [reason, setReason] = React.useState('CUSTOMER_RETURN');
    const [reasonNotes, setReasonNotes] = React.useState('');

    const canView = user && (isAdmin(user) || hasPermission(user, 'viewOrders') || hasPermission(user, 'viewWholesaleCustomers') || hasPermission(user, 'viewReturns'));
    const canCreate = user && (isAdmin(user) || hasPermission(user, 'addReturns') || hasPermission(user, 'viewWholesaleCustomers'));

    const load = React.useCallback(async () => {
        const [retRes, allOrdRes] = await Promise.all([getRepReturns(search), getRepOrders()]);
        if (retRes.success) setReturns(retRes.data || []);
        else toast.error((retRes as any).error || 'تعذر تحميل المرتجعات');
        if (allOrdRes.success) setOrders(allOrdRes.data || []);
        else toast.error((allOrdRes as any).error || 'تعذر تحميل الطلبات');
    }, [search]);

    React.useEffect(() => {
        if (!canView) return;
        load();
    }, [canView, load]);

    const handleSave = async () => {
        if (!selectedOrder) return;
        const items = Object.entries(selectedItems)
            .filter(([, qty]) => qty > 0)
            .map(([orderItemId, quantity]) => ({ orderItemId: Number(orderItemId), quantity }));
        if (items.length === 0) { toast.error('اختر صنفاً واحداً على الأقل'); return; }

        const loading = toast.loading('جاري إنشاء المرتجع...');
        try {
            const res = await createRepReturn({
                orderId: selectedOrder.id,
                reason: reason as any,
                reasonNotes,
                items,
            });
            if (res.success) { toast.success('تم إنشاء المرتجع'); setIsOpen(false); resetForm(); load(); }
            else toast.error((res as any).error || 'تعذر إنشاء المرتجع');
        } catch { toast.error('حدث خطأ'); } finally { toast.dismiss(loading); }
    };

    const resetForm = () => {
        setSelectedOrder(null);
        setSelectedItems({});
        setReason('CUSTOMER_RETURN');
        setReasonNotes('');
    };

    const columns = [
        { header: 'رقم الطلب', accessor: (row: any) => row.wholesaleOrder?.orderNumber },
        { header: 'العميل', accessor: (row: any) => row.wholesaleOrder?.wholesaleCustomer?.name },
        { header: 'السبب', accessor: (row: any) => REASON_LABELS[row.reason] || row.reason },
        { header: 'المبلغ المسترد', accessor: (row: any) => Number(row.refundAmount || 0).toLocaleString() },
        { header: 'التاريخ', accessor: (row: any) => new Date(row.createdAt).toLocaleDateString('ar-EG') },
    ];

    const filteredReturns = returns.filter((row) =>
        row.wholesaleOrder?.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
        row.wholesaleOrder?.wholesaleCustomer?.name?.toLowerCase().includes(search.toLowerCase())
    );

    const orderOptions = orders.map((o) => ({
        value: o.id,
        label: `${o.orderNumber} - ${o.wholesaleCustomer?.name || 'عميل'} (${o.status})`,
    }));

    if (!canView) return <div className="p-4 text-red-500">غير مصرح لك بعرض هذه الصفحة</div>;

    return (
        <div className="p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="text-xl font-bold">مرتجعات المندوبين</div>
                <div className="flex gap-2">
                    <FormInput
                        label="بحث"
                        className="text-gray-800 dark:text-white md:w-72"
                        placeholder="اسم العميل أو رقم الطلب..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {canCreate && (
                        <Button onClick={() => { resetForm(); setIsOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white">
                            <Plus size={16} className="ml-1" /> مرتجع جديد
                        </Button>
                    )}
                </div>
            </div>
            <DataTable
                data={filteredReturns}
                columns={columns}
                totalCount={filteredReturns.length}
                pageSize={10}
                currentPage={1}
                onPageChange={() => {}}
            />

            <AppModal title="إنشاء مرتجع" isOpen={isOpen} onClose={() => setIsOpen(false)} size="xl">
                <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
                    <SearchableSelect
                        options={orderOptions}
                        value={selectedOrder?.id}
                        onChange={(value) => { setSelectedOrder(orders.find((o) => o.id === Number(value)) || null); setSelectedItems({}); }}
                        placeholder="ابحث برقم الطلب أو اسم العميل..."
                    />

                    {selectedOrder && (
                        <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-3 space-y-2">
                            <p className="font-bold text-sm">أصناف الطلب:</p>
                            {selectedOrder.items?.map((item: any) => (
                                <div key={item.id} className="flex items-center justify-between text-sm">
                                    <span>{item.product?.name} (متاح: {item.quantity})</span>
                                    <input
                                        className="w-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-sm text-slate-900 dark:text-white text-center"
                                        type="number"
                                        min={0}
                                        max={item.quantity}
                                        value={selectedItems[item.id] || ''}
                                        onChange={(e) => setSelectedItems({ ...selectedItems, [item.id]: Number(e.target.value) })}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-4">
                        <select className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900 text-sm" value={reason} onChange={(e) => setReason(e.target.value)}>
                            <option value="CUSTOMER_RETURN">مرتجع عميل</option>
                            <option value="DAMAGED">تالف</option>
                            <option value="WRONG_PRODUCT">منتج خاطئ</option>
                            <option value="EXPIRED">منتهي الصلاحية</option>
                            <option value="OTHER">أخرى</option>
                        </select>
                    </div>
                    <FormInput className="text-gray-800 dark:text-white" label="ملاحظات السبب" value={reasonNotes} onChange={(e) => setReasonNotes(e.target.value)} />
                    <Button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700 text-white">حفظ المرتجع</Button>
                </div>
            </AppModal>
        </div>
    );
}
