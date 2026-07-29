'use client';

import * as React from 'react';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/utils';
import { getTasks, createTask, updateTask, deleteTask, getTaskAssignees, getTaskCustomers, markTaskCompleted } from '@/server/task';
import { DataTable } from '@/components/shared/DataTable';
import { DynamicForm } from '@/components/shared/dynamic-form';
import { AppModal } from '@/components/ui/app-modal';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/form-input';
import { Edit, Trash2, Plus, MapPin, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import * as z from 'zod';

const taskSchema = z.object({
    title: z.string().min(2, 'العنوان مطلوب'),
    type: z.enum(['VISIT', 'CALL', 'FOLLOW_UP', 'DELIVERY', 'MEETING', 'OTHER']),
    description: z.string().optional(),
    assignedUserId: z.string().min(1, 'اختر المسؤول'),
    customerId: z.string().optional(),
    wholesaleCustomerId: z.string().optional(),
    dueDate: z.string().min(1, 'التاريخ المستحق مطلوب'),
    status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
});

const typeLabels: Record<string, string> = {
    VISIT: 'زيارة',
    CALL: 'اتصال',
    FOLLOW_UP: 'متابعة',
    DELIVERY: 'توصيل',
    MEETING: 'اجتماع',
    OTHER: 'أخرى',
};

const statusLabels: Record<string, string> = {
    PENDING: 'معلّقة',
    IN_PROGRESS: 'قيد التنفيذ',
    COMPLETED: 'مكتملة',
    CANCELLED: 'ملغاة',
};

export default function TasksPage() {
    const { user } = useAuth();
    const [tasks, setTasks] = React.useState<any[]>([]);
    const [users, setUsers] = React.useState<any[]>([]);
    const [customers, setCustomers] = React.useState<any[]>([]);
    const [wholesaleCustomers, setWholesaleCustomers] = React.useState<any[]>([]);
    const [isOpen, setIsOpen] = React.useState(false);
    const [editTask, setEditTask] = React.useState<any>(null);
    const [filter, setFilter] = React.useState('');

    const canView = user && hasPermission(user, 'viewTasks');
    const canEdit = user && hasPermission(user, 'editTasks');
    const canAdd = user && hasPermission(user, 'addTasks');
    const canDelete = user && hasPermission(user, 'deleteTasks');

    const load = async () => {
        const [tasksRes, usersRes, customersRes] = await Promise.all([
            getTasks(),
            getTaskAssignees(),
            getTaskCustomers(),
        ]);
        if (tasksRes.success) setTasks(tasksRes.data || []);
        else toast.error(tasksRes.error || 'تعذر تحميل المهام');
        if (usersRes.success) setUsers(usersRes.data || []);
        if (customersRes.success) {
            setCustomers(customersRes.data?.customers || []);
            setWholesaleCustomers(customersRes.data?.wholesaleCustomers || []);
        }
    };

    React.useEffect(() => {
        if (!canView) return;
        load();
    }, [canView]);

    const handleSave = async (values: z.infer<typeof taskSchema>) => {
        const loading = toast.loading(editTask ? 'جاري التحديث...' : 'جاري الإنشاء...');
        const payload: any = {
            ...values,
            customerId: values.customerId || undefined,
            wholesaleCustomerId: values.wholesaleCustomerId || undefined,
        };
        if (!editTask) delete payload.status;
        const res = editTask
            ? await updateTask(editTask.id, payload)
            : await createTask(payload as any);
        toast.dismiss(loading);
        if (res.success) {
            toast.success(editTask ? 'تم التحديث' : 'تم الإنشاء');
            setIsOpen(false);
            setEditTask(null);
            load();
        } else toast.error(res.error || 'تعذر الحفظ');
    };

    const handleComplete = async (row: any) => {
        if (!window.confirm('تأكيد إكمال المهمة؟ سيتم تسجيل موقعك الحالي.')) return;
        const loading = toast.loading('جاري تحديد الموقع...');
        const finish = async (lat?: number, lng?: number) => {
            const res = await markTaskCompleted(row.id, undefined, lat, lng);
            toast.dismiss(loading);
            if (res.success) { toast.success('تم إكمال المهمة'); load(); }
            else toast.error(res.error || 'تعذر إكمال المهمة');
        };
        if (!navigator.geolocation) {
            await finish();
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => { finish(pos.coords.latitude, pos.coords.longitude); },
            () => { finish(); },
            { timeout: 8000 }
        );
    };

    const handleDelete = async (data: any) => {
        if (!window.confirm('هل أنت متأكد من حذف المهمة؟')) return;
        const res = await deleteTask(data.id);
        if (res.success) { toast.success('تم الحذف'); load(); }
        else toast.error(res.error || 'تعذر الحذف');
    };

    const columns = [
        { header: 'المهمة', accessor: (row: any) => row.title },
        { header: 'النوع', accessor: (row: any) => typeLabels[row.type] || row.type },
        { header: 'المسؤول', accessor: (row: any) => row.assignedUser?.username || '-' },
        { header: 'الحالة', accessor: (row: any) => statusLabels[row.status] || row.status },
        { header: 'التاريخ المستحق', accessor: (row: any) => new Date(row.dueDate).toLocaleString('ar-EG') },
        { header: 'GPS', accessor: (row: any) => (row.latitude ? `${row.latitude.toFixed(4)}, ${row.longitude?.toFixed(4)}` : '-') },
    ];

    const actions = [
        ...(canEdit ? [{ label: 'تعديل', icon: <Edit size={14} />, onClick: (row: any) => { setEditTask(row); setIsOpen(true); } }] : []),
        { label: 'إكمال', icon: <CheckCircle size={14} />, variant: 'success' as const, onClick: handleComplete, hidden: (row: any) => row.status === 'COMPLETED' || row.status === 'CANCELLED' },
        ...(canDelete ? [{ label: 'حذف', icon: <Trash2 size={14} />, variant: 'danger' as const, onClick: handleDelete }] : []),
    ];

    const filteredTasks = tasks.filter((t) =>
        t.title.toLowerCase().includes(filter.toLowerCase()) ||
        t.assignedUser?.username?.toLowerCase().includes(filter.toLowerCase()) ||
        typeLabels[t.type]?.includes(filter)
    );

    if (!canView) return <div className="p-4 text-red-500">غير مصرح لك بعرض المهام</div>;

    return (
        <div className="p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <h1 className="text-xl font-bold flex items-center gap-2"><MapPin size={20} /> المهام والمواعيد</h1>
                <div className="flex items-end gap-2">
                    <FormInput
                        label="بحث"
                        className="text-gray-800 dark:text-white"
                        placeholder="بحث..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                    {canAdd && (
                        <Button onClick={() => { setEditTask(null); setIsOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap">
                            <Plus size={16} className="ml-1" /> جديد
                        </Button>
                    )}
                </div>
            </div>
            <DataTable data={filteredTasks} columns={columns} actions={actions} totalCount={filteredTasks.length} pageSize={10} currentPage={1} onPageChange={() => {}} />

            <AppModal title={editTask ? 'تعديل مهمة' : 'مهمة جديدة'} isOpen={isOpen} onClose={() => setIsOpen(false)} size="xl">
                <div className="p-4 max-h-[80vh] overflow-y-auto">
                    <DynamicForm
                        schema={taskSchema}
                        onSubmit={handleSave}
                        defaultValues={editTask ? {
                            title: editTask.title,
                            type: editTask.type,
                            description: editTask.description || '',
                            assignedUserId: editTask.assignedUserId,
                            customerId: editTask.customerId || '',
                            wholesaleCustomerId: editTask.wholesaleCustomerId || '',
                            dueDate: editTask.dueDate ? new Date(editTask.dueDate).toISOString().slice(0, 16) : '',
                            status: editTask.status,
                        } : { title: '', type: 'VISIT', description: '', assignedUserId: '', customerId: '', wholesaleCustomerId: '', dueDate: '' }}
                        submitLabel={editTask ? 'تحديث' : 'إنشاء'}
                    >
                        {({ register, formState: { errors } }) => (
                            <div className="grid gap-4">
                                <FormInput className="text-gray-800 dark:text-white" label="العنوان" {...register('title')} error={errors.title?.message as string} />
                                <div className="grid grid-cols-2 gap-4">
                                    <select className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900 text-sm" {...register('type')}>
                                        {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                    </select>
                                    <select className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900 text-sm" {...register('assignedUserId')}>
                                        <option value="">اختر المسؤول</option>
                                        {users.map((u: any) => <option key={u.id} value={u.id}>{u.username}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <select className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900 text-sm" {...register('customerId')}>
                                        <option value="">عميل (اختياري)</option>
                                        {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    <select className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900 text-sm" {...register('wholesaleCustomerId')}>
                                        <option value="">عميل جملة (اختياري)</option>
                                        {wholesaleCustomers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <FormInput className="text-gray-800 dark:text-white" type="datetime-local" label="التاريخ المستحق" {...register('dueDate')} error={errors.dueDate?.message as string} />
                                {editTask && (
                                    <div>
                                        <label className="block text-sm font-bold mb-2">الحالة</label>
                                        <select className="w-full rounded-lg border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900 text-sm" {...register('status')}>
                                            {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                        </select>
                                    </div>
                                )}
                                <FormInput className="text-gray-800 dark:text-white" label="الوصف" {...register('description')} />
                            </div>
                        )}
                    </DynamicForm>
                </div>
            </AppModal>
        </div>
    );
}
