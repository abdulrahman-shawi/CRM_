'use client';

import * as React from 'react';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/utils';
import { getOrdersWithTracking, updateOrderTracking } from '@/server/tracking';
import { getTrackingStatusLabel } from '@/lib/utils';
import { DataTable } from '@/components/shared/DataTable';
import { AppModal } from '@/components/ui/app-modal';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/form-input';
import { Edit, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

const statuses = ['PENDING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED'];

export default function TrackingPage() {
    const { user } = useAuth();
    const [orders, setOrders] = React.useState<any[]>([]);
    const [search, setSearch] = React.useState('');
    const [editOrder, setEditOrder] = React.useState<any>(null);
    const canView = user && (hasPermission(user, 'viewTracking') || hasPermission(user, 'viewOrders'));
    const canEdit = user && hasPermission(user, 'editTracking');

    const load = React.useCallback(async () => {
        const res = await getOrdersWithTracking({ search });
        if (res.success) setOrders(res.data || []);
        else toast.error((res as any).error || 'تعذر تحميل البيانات');
    }, [search]);

    React.useEffect(() => {
        if (!canView) return;
        load();
    }, [canView, load]);

    const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editOrder) return;
        const form = new FormData(e.currentTarget);
        const loading = toast.loading('جاري التحديث...');
        const res = await updateOrderTracking(editOrder.id, {
            trackingNumber: String(form.get('trackingNumber') || ''),
            trackingStatus: String(form.get('trackingStatus') || 'PENDING') as any,
            trackingUrl: String(form.get('trackingUrl') || ''),
            shippingCompanyName: String(form.get('shippingCompanyName') || ''),
            shippingPrice: Number(form.get('shippingPrice') || 0),
        });
        toast.dismiss(loading);
        if (res.success) {
            toast.success('تم تحديث التتبع');
            setEditOrder(null);
            load();
        } else toast.error(res.error || 'تعذر التحديث');
    };

    const columns = [
        { header: 'رقم الطلب', accessor: (row: any) => row.orderNumber },
        { header: 'العميل', accessor: (row: any) => row.customer?.name || '-' },
        { header: 'شركة الشحن', accessor: (row: any) => row.shipping?.name || '-' },
        { header: 'رقم التتبع', accessor: (row: any) => row.trackingNumber || '-' },
        { header: 'الحالة', accessor: (row: any) => getTrackingStatusLabel(row.trackingStatus) },
        { header: 'التاريخ', accessor: (row: any) => new Date(row.createdAt).toLocaleDateString('ar-EG') },
    ];

    const actions = canEdit
        ? [
            {
                label: 'تعديل',
                icon: <Edit size={14} />,
                onClick: (row: any) => setEditOrder(row),
            },
        ]
        : [];

    if (!canView) return <div className="p-4 text-red-500">غير مصرح لك بعرض التتبع</div>;

    return (
        <div className="p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <h1 className="text-xl font-bold">تتبع الشحنات</h1>
                <FormInput
                    label="بحث"
                    className="text-gray-800 dark:text-white md:w-72"
                    placeholder="بحث برقم الطلب أو التتبع أو العميل..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            <DataTable data={orders} columns={columns} actions={actions} totalCount={orders.length} pageSize={10} currentPage={1} onPageChange={() => {}} />

            <AppModal title="تحديث التتبع" isOpen={!!editOrder} onClose={() => setEditOrder(null)}>
                {editOrder && (
                    <form onSubmit={handleUpdate} className="p-4 grid gap-4">
                        <FormInput className="text-gray-800 dark:text-white" name="trackingNumber" label="رقم التتبع" defaultValue={editOrder.trackingNumber || ''} />
                        <select name="trackingStatus" className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900 text-sm" defaultValue={editOrder.trackingStatus || 'PENDING'}>
                            {statuses.map((s) => <option key={s} value={s}>{getTrackingStatusLabel(s)}</option>)}
                        </select>
                        <FormInput className="text-gray-800 dark:text-white" name="trackingUrl" label="رابط التتبع" defaultValue={editOrder.trackingUrl || ''} />
                        <FormInput className="text-gray-800 dark:text-white" name="shippingCompanyName" label="شركة الشحن" defaultValue={editOrder.shipping?.name || ''} />
                        <FormInput className="text-gray-800 dark:text-white" type="number" name="shippingPrice" label="سعر الشحن" defaultValue={editOrder.shipping?.price || ''} />
                        <div className="flex gap-2">
                            <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">حفظ</Button>
                            {editOrder.trackingUrl && (
                                <a href={editOrder.trackingUrl} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                                    <ExternalLink size={16} /> فتح
                                </a>
                            )}
                        </div>
                    </form>
                )}
            </AppModal>
        </div>
    );
}
