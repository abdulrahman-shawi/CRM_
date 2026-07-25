'use client';

import * as React from 'react';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/utils';
import { getBackups, createBackup, restoreBackup, deleteBackup } from '@/server/backup';
import { DataTable } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Download, RotateCcw, Trash2, Database, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BackupsPage() {
    const { user } = useAuth();
    const [backups, setBackups] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(false);
    const canView = user && hasPermission(user, 'viewBackups');
    const canManage = user && hasPermission(user, 'manageBackups');

    const load = async () => {
        const res = await getBackups();
        if (res.success) setBackups(res.data || []);
        else toast.error(res.error || 'تعذر تحميل النسخ الاحتياطية');
    };

    React.useEffect(() => {
        if (!canView) return;
        load();
    }, [canView]);

    const handleCreate = async () => {
        if (!canManage) return;
        setLoading(true);
        const loadingToast = toast.loading('جاري إنشاء نسخة احتياطية...');
        const res = await createBackup();
        toast.dismiss(loadingToast);
        setLoading(false);
        if (res.success) { toast.success('تم إنشاء النسخة الاحتياطية'); load(); }
        else toast.error(res.error || 'فشل إنشاء النسخة');
    };

    const handleRestore = async (data: any) => {
        if (!canManage) return;
        if (!window.confirm('هل أنت متأكد من استعادة هذه النسخة؟ ستُستبدل البيانات الحالية.')) return;
        setLoading(true);
        const loadingToast = toast.loading('جاري استعادة النسخة...');
        const res = await restoreBackup(data.id);
        toast.dismiss(loadingToast);
        setLoading(false);
        if (res.success) toast.success('تمت الاستعادة');
        else toast.error(res.error || 'فشل الاستعادة');
    };

    const handleDelete = async (data: any) => {
        if (!canManage) return;
        if (!window.confirm('هل أنت متأكد من حذف النسخة؟')) return;
        const res = await deleteBackup(data.id);
        if (res.success) { toast.success('تم الحذف'); load(); }
        else toast.error(res.error || 'تعذر الحذف');
    };

    const columns = [
        { header: 'الاسم', accessor: (row: any) => row.name },
        { header: 'الحجم', accessor: (row: any) => row.fileSize },
        { header: 'الحالة', accessor: (row: any) => row.status === 'SUCCESS' ? 'نجاح' : row.status === 'FAILED' ? 'فشل' : 'قيد التنفيذ' },
        { header: 'التاريخ', accessor: (row: any) => new Date(row.createdAt).toLocaleString('ar-EG') },
    ];

    const actions = [
        {
            label: 'تحميل',
            icon: <Download size={14} />,
            onClick: (row: any) => window.open(row.fileUrl, '_blank'),
        },
        ...(canManage ? [
            {
                label: 'استعادة',
                icon: <RotateCcw size={14} />,
                onClick: handleRestore,
            },
            {
                label: 'حذف',
                icon: <Trash2 size={14} />,
                variant: 'danger' as const,
                onClick: handleDelete,
            },
        ] : []),
    ];

    if (!canView) return <div className="p-4 text-red-500">غير مصرح لك بعرض النسخ الاحتياطية</div>;

    return (
        <div className="p-4">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-xl font-bold flex items-center gap-2"><Database size={20} /> النسخ الاحتياطي والاستعادة</h1>
                {canManage && (
                    <Button onClick={handleCreate} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                        {loading ? <Loader2 size={16} className="animate-spin ml-2" /> : <Download size={16} className="ml-2" />}
                        نسخة احتياطية جديدة
                    </Button>
                )}
            </div>
            <DataTable data={backups} columns={columns} actions={actions} totalCount={backups.length} pageSize={10} currentPage={1} onPageChange={() => {}} />
        </div>
    );
}
