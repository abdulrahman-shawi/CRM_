'use client';

import * as React from 'react';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/utils';
import { getNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification, createLowStockNotifications } from '@/server/notification';
import { Button } from '@/components/ui/button';
import { Bell, Check, Trash2, Package, AlertTriangle, Users, Calendar, Info } from 'lucide-react';
import toast from 'react-hot-toast';

const typeIcons: Record<string, any> = {
    LOW_STOCK: AlertTriangle,
    ORDER_STATUS_CHANGE: Package,
    WHOLESALE_FOLLOW_UP: Users,
    TASK_REMINDER: Calendar,
    SYSTEM: Info,
};

const typeLabels: Record<string, string> = {
    LOW_STOCK: 'مخزون منخفض',
    ORDER_STATUS_CHANGE: 'حالة الطلب',
    WHOLESALE_FOLLOW_UP: 'متابعة جملة',
    TASK_REMINDER: 'تذكير مهمة',
    SYSTEM: 'نظام',
};

export default function NotificationsPage() {
    const { user } = useAuth();
    const [notifications, setNotifications] = React.useState<any[]>([]);
    const [filter, setFilter] = React.useState<'all' | 'unread'>('all');
    const canView = user && hasPermission(user, 'viewNotifications');

    const load = React.useCallback(async () => {
        const res = await getNotifications(undefined, filter === 'unread');
        if (res.success) setNotifications(res.data || []);
        else toast.error((res as any).error || 'تعذر تحميل الإشعارات');
    }, [filter]);

    React.useEffect(() => {
        if (!canView) return;
        load();
    }, [canView, load]);

    const handleMarkRead = async (id: string) => {
        const res = await markNotificationRead(id);
        if (res.success) load();
        else toast.error(res.error || 'تعذر التحديث');
    };

    const handleMarkAll = async () => {
        const res = await markAllNotificationsRead();
        if (res.success) { toast.success('تم تحديد الكل كمقروء'); load(); }
        else toast.error(res.error || 'تعذر التحديث');
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('هل أنت متأكد؟')) return;
        const res = await deleteNotification(id);
        if (res.success) load();
        else toast.error(res.error || 'تعذر الحذف');
    };

    const handleCheckLowStock = async () => {
        const loading = toast.loading('جاري فحص المخزون...');
        const res = await createLowStockNotifications(5);
        toast.dismiss(loading);
        if (res.success) { toast.success(`تم إنشاء ${res.count} إشعار`); load(); }
        else toast.error(res.error || 'تعذر فحص المخزون');
    };

    if (!canView) return <div className="p-4 text-red-500">غير مصرح لك بعرض الإشعارات</div>;

    return (
        <div className="p-4">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-xl font-bold flex items-center gap-2"><Bell size={20} /> الإشعارات</h1>
                <div className="flex gap-2">
                    <button onClick={() => setFilter('all')} className={`px-3 py-2 rounded-lg text-sm font-bold ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-900'}`}>الكل</button>
                    <button onClick={() => setFilter('unread')} className={`px-3 py-2 rounded-lg text-sm font-bold ${filter === 'unread' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-900'}`}>غير المقروءة</button>
                    <Button onClick={handleCheckLowStock} variant="outline" className="text-sm">فحص المخزون</Button>
                    <Button onClick={handleMarkAll} variant="outline" className="text-sm">تحديد الكل كمقروء</Button>
                </div>
            </div>
            <div className="space-y-3">
                {notifications.length === 0 && (
                    <div className="p-8 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">لا توجد إشعارات</div>
                )}
                {notifications.map((n) => {
                    const Icon = typeIcons[n.type] || Info;
                    return (
                        <div key={n.id} className={`flex items-start gap-4 p-4 rounded-xl border ${!n.readAt ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                                <Icon size={18} className="text-blue-600" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">{typeLabels[n.type] || n.type}</span>
                                    <span className="text-xs text-slate-500">{new Date(n.createdAt).toLocaleString('ar-EG')}</span>
                                </div>
                                <h3 className="font-bold text-sm">{n.title}</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400">{n.message}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {!n.readAt && (
                                    <button onClick={() => handleMarkRead(n.id)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" title="تحديد كمقروء">
                                        <Check size={16} className="text-green-600" />
                                    </button>
                                )}
                                <button onClick={() => handleDelete(n.id)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" title="حذف">
                                    <Trash2 size={16} className="text-red-500" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
