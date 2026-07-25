'use client';
import { DataTable } from '@/components/shared/DataTable';
import { AppModal } from '@/components/ui/app-modal';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/form-input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/utils';
import { createOrderReturn, deleteOrderReturn, getOrderReturns } from '@/server/return';
import { getOrders } from '@/server/order';
import { getWarehouse } from '@/server/warehouse';
import { Trash2 } from 'lucide-react';
import * as React from 'react';
import toast from 'react-hot-toast';

const REASON_LABELS: Record<string, string> = {
    DAMAGED: 'تالف',
    WRONG_PRODUCT: 'منتج خاطئ',
    CUSTOMER_RETURN: 'مرتجع عميل',
    EXPIRED: 'منتهي الصلاحية',
    OTHER: 'أخرى',
};

export default function ReturnsPage() {
    const { user } = useAuth();
    const [returns, setReturns] = React.useState<any[]>([]);
    const [orders, setOrders] = React.useState<any[]>([]);
    const [warehouses, setWarehouses] = React.useState<any[]>([]);
    const [isOpen, setIsOpen] = React.useState(false);
    const [selectedOrder, setSelectedOrder] = React.useState<any>(null);
    const [selectedItems, setSelectedItems] = React.useState<Record<number, number>>({});
    const [reason, setReason] = React.useState('CUSTOMER_RETURN');
    const [reasonNotes, setReasonNotes] = React.useState('');
    const [warehouseId, setWarehouseId] = React.useState('');
    const [search, setSearch] = React.useState('');

    const getData = React.useCallback(async () => {
        const [retRes, ordRes, whRes] = await Promise.all([getOrderReturns(), getOrders(), getWarehouse()]);
        if (retRes.success) setReturns(retRes.data || []);
        else toast.error((retRes as any).error || 'تعذر تحميل المرتجعات');
        if (ordRes.success) setOrders(ordRes.data || []);
        else toast.error((ordRes as any).error || 'تعذر تحميل الطلبات');
        setWarehouses(whRes || []);
    }, []);

    React.useEffect(() => { getData(); }, [getData]);

    const handleSave = async () => {
        if (!selectedOrder) return;
        const items = Object.entries(selectedItems)
            .filter(([, qty]) => qty > 0)
            .map(([orderItemId, quantity]) => ({ orderItemId: Number(orderItemId), quantity }));
        if (items.length === 0) { toast.error('اختر صنفاً واحداً على الأقل'); return; }

        const loading = toast.loading('جاري إنشاء المرتجع...');
        try {
            const res = await createOrderReturn({
                orderId: selectedOrder.id,
                reason: reason as any,
                reasonNotes,
                warehouseId: warehouseId ? Number(warehouseId) : undefined,
                items,
            });
            if (res.success) { toast.success('تم إنشاء المرتجع'); setIsOpen(false); getData(); }
            else toast.error((res as any).error || 'تعذر إنشاء المرتجع');
        } catch { toast.error('حدث خطأ'); } finally { toast.dismiss(loading); }
    };

    const handleDelete = async (data: any) => {
        if (!window.confirm('هل أنت متأكد من حذف المرتجع؟')) return;
        const loading = toast.loading('جاري الحذف...');
        try {
            const res = await deleteOrderReturn(data.id);
            if (res.success) { toast.success('تم الحذف'); getData(); }
            else toast.error((res as any).error || 'تعذر الحذف');
        } catch { toast.error('حدث خطأ'); } finally { toast.dismiss(loading); }
    };

    const columns = [
        { header: 'رقم الطلب', accessor: (row: any) => row.order?.orderNumber },
        { header: 'السبب', accessor: (row: any) => REASON_LABELS[row.reason] || row.reason },
        { header: 'المبلغ المسترد', accessor: (row: any) => row.refundAmount.toLocaleString() },
        { header: 'التاريخ', accessor: (row: any) => new Date(row.createdAt).toLocaleDateString('ar-EG') },
    ];

    const actions = user && hasPermission(user, 'deleteReturns') ? [{ label: 'حذف', icon: <Trash2 size={14} />, variant: 'danger' as const, onClick: handleDelete }] : [];

    const filteredReturns = returns.filter((row) =>
        row.order?.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
        row.order?.customer?.name?.toLowerCase().includes(search.toLowerCase())
    );

    const orderOptions = orders.map((o) => ({
        value: o.id,
        label: `${o.orderNumber} - ${o.customer?.name || 'عميل'} (${o.status})`,
    }));

    return (
        <div className="p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="text-xl font-bold">إدارة المرتجعات</div>
                <div className="flex gap-2">
                    <FormInput
                        label="بحث"
                        className="text-gray-800 dark:text-white md:w-72"
                        placeholder="اسم العميل أو رقم الطلب..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {user && hasPermission(user, 'addReturns') && (
                        <Button onClick={() => { setSelectedOrder(null); setSelectedItems({}); setReason('CUSTOMER_RETURN'); setReasonNotes(''); setWarehouseId(''); setIsOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-6">إنشاء مرتجع</Button>
                    )}
                </div>
            </div>
            <DataTable
                data={filteredReturns}
                columns={columns}
                actions={actions}
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

                    <div className="grid grid-cols-2 gap-4">
                        <select className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900 text-sm" value={reason} onChange={(e) => setReason(e.target.value)}>
                            <option value="CUSTOMER_RETURN">مرتجع عميل</option>
                            <option value="DAMAGED">تالف</option>
                            <option value="WRONG_PRODUCT">منتج خاطئ</option>
                            <option value="EXPIRED">منتهي الصلاحية</option>
                            <option value="OTHER">أخرى</option>
                        </select>
                        <select className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900 text-sm" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
                            <option value="">المستودع (افتراضي)</option>
                            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>
                    <FormInput className="text-gray-800 dark:text-white" label="ملاحظات السبب" value={reasonNotes} onChange={(e) => setReasonNotes(e.target.value)} />
                    <Button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700 text-white">حفظ المرتجع</Button>
                </div>
            </AppModal>
        </div>
    );
}
