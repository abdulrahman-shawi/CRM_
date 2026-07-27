'use client';

import { DataTable } from '@/components/shared/DataTable';
import { AppModal } from '@/components/ui/app-modal';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/form-input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useAuth } from '@/context/AuthContext';
import { formatSiteCurrency, useSiteCurrency } from '@/lib/currency';
import { hasPermission } from '@/lib/utils';
import { createExpense, deleteExpense, getExpenses, updateExpense } from '@/server/expenses';
import { Pencil, Trash2, Wallet, ReceiptText, CalendarDays, BadgeDollarSign } from 'lucide-react';
import * as React from 'react';
import toast from 'react-hot-toast';

const TYPE_LABELS: Record<string, string> = {
    DAILY: 'يومية',
    STAFF_SALARY: 'راتب موظف',
    RENT: 'إيجار',
};

const TYPE_TONES: Record<string, string> = {
    DAILY: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    STAFF_SALARY: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
    RENT: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
};

const getCurrentMonthKey = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const emptyForm = {
    type: 'DAILY',
    amount: '',
    description: '',
    employeeId: '',
    scheduledDate: '',
    notes: '',
};

export default function ExpensesPage() {
    const { user } = useAuth();
    const { settings: currencySettings } = useSiteCurrency();

    const [expenses, setExpenses] = React.useState<any[]>([]);
    const [summary, setSummary] = React.useState<{ totalUSD: number; count: number }>({ totalUSD: 0, count: 0 });
    const [users, setUsers] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    const [month, setMonth] = React.useState(getCurrentMonthKey());
    const [typeFilter, setTypeFilter] = React.useState('');
    const [search, setSearch] = React.useState('');

    const [isOpen, setIsOpen] = React.useState(false);
    const [editing, setEditing] = React.useState<any>(null);
    const [form, setForm] = React.useState(emptyForm);

    const canAdd = user && hasPermission(user, 'addExpenses');
    const canEdit = user && hasPermission(user, 'editExpenses');
    const canDelete = user && hasPermission(user, 'deleteExpenses');

    const getData = React.useCallback(async () => {
        setLoading(true);
        try {
            const res = await getExpenses({
                month: month || undefined,
                type: (typeFilter || undefined) as any,
            });
            if (res.success) {
                setExpenses(res.data || []);
                setSummary(res.summary || { totalUSD: 0, count: 0 });
            } else {
                toast.error((res as any).error || 'تعذر تحميل المصاريف');
            }
        } finally {
            setLoading(false);
        }
    }, [month, typeFilter]);

    React.useEffect(() => { getData(); }, [getData]);

    React.useEffect(() => {
        fetch('/api/users')
            .then((res) => res.json())
            .then((data) => setUsers(Array.isArray(data) ? data : data?.data || []))
            .catch(() => {});
    }, []);

    const openCreate = () => {
        setEditing(null);
        setForm(emptyForm);
        setIsOpen(true);
    };

    const openEdit = (row: any) => {
        setEditing(row);
        setForm({
            type: row.type || 'DAILY',
            amount: String(row.amount ?? ''),
            description: row.description || '',
            employeeId: row.employee?.id || '',
            scheduledDate: row.scheduledDate ? new Date(row.scheduledDate).toISOString().slice(0, 10) : '',
            notes: row.notes || '',
        });
        setIsOpen(true);
    };

    const handleSave = async () => {
        const amount = Number(form.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
            toast.error('المبلغ يجب أن يكون أكبر من صفر');
            return;
        }
        if (form.type === 'STAFF_SALARY' && !form.employeeId) {
            toast.error('اختر الموظف لمصروف الراتب');
            return;
        }

        const payload = {
            type: form.type as any,
            amount,
            description: form.description,
            employeeId: form.employeeId || null,
            scheduledDate: form.scheduledDate || null,
            notes: form.notes,
        };

        const loadingToast = toast.loading(editing ? 'جاري تعديل المصروف...' : 'جاري إنشاء المصروف...');
        try {
            const res = editing
                ? await updateExpense(editing.id, payload)
                : await createExpense(payload);

            if (res.success) {
                toast.success(editing ? 'تم تعديل المصروف' : 'تم إنشاء المصروف');
                setIsOpen(false);
                getData();
            } else {
                toast.error((res as any).error || 'تعذر حفظ المصروف');
            }
        } catch {
            toast.error('حدث خطأ أثناء الحفظ');
        } finally {
            toast.dismiss(loadingToast);
        }
    };

    const handleDelete = async (row: any) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا المصروف؟')) return;
        const loadingToast = toast.loading('جاري الحذف...');
        try {
            const res = await deleteExpense(row.id);
            if (res.success) {
                toast.success('تم حذف المصروف');
                getData();
            } else {
                toast.error((res as any).error || 'تعذر الحذف');
            }
        } catch {
            toast.error('حدث خطأ أثناء الحذف');
        } finally {
            toast.dismiss(loadingToast);
        }
    };

    const filteredExpenses = expenses.filter((row) => {
        const query = search.trim().toLowerCase();
        if (!query) return true;
        return (
            String(row.description || '').toLowerCase().includes(query) ||
            String(row.notes || '').toLowerCase().includes(query) ||
            String(row.employee?.username || '').toLowerCase().includes(query)
        );
    });

    const totalByType = React.useMemo(() => {
        return filteredExpenses.reduce((acc: Record<string, number>, row: any) => {
            acc[row.type] = (acc[row.type] || 0) + (Number(row.amount) || 0);
            return acc;
        }, {});
    }, [filteredExpenses]);

    const columns = [
        {
            header: 'النوع',
            accessor: (row: any) => (
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${TYPE_TONES[row.type] || TYPE_TONES.DAILY}`}>
                    {TYPE_LABELS[row.type] || row.type}
                </span>
            ),
        },
        { header: 'الوصف', accessor: (row: any) => row.description || '-' },
        { header: 'الموظف', accessor: (row: any) => row.employee?.username || '-' },
        {
            header: 'المبلغ',
            accessor: (row: any) => (
                <span className="font-bold text-rose-600 dark:text-rose-400">
                    {formatSiteCurrency(Number(row.amount) || 0, currencySettings)}
                </span>
            ),
        },
        {
            header: 'التاريخ المجدول',
            accessor: (row: any) => (row.scheduledDate ? new Date(row.scheduledDate).toLocaleDateString('ar-EG') : '-'),
        },
        {
            header: 'تاريخ الإنشاء',
            accessor: (row: any) => new Date(row.createdAt).toLocaleDateString('ar-EG'),
        },
        { header: 'ملاحظات', accessor: (row: any) => row.notes || '-' },
    ];

    const actions = [
        ...(canEdit ? [{ label: 'تعديل', icon: <Pencil size={14} />, variant: 'default' as const, onClick: openEdit }] : []),
        ...(canDelete ? [{ label: 'حذف', icon: <Trash2 size={14} />, variant: 'danger' as const, onClick: handleDelete }] : []),
    ];

    const userOptions = users.map((u: any) => ({ value: u.id, label: u.username || u.email }));

    return (
        <div className="p-4 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="text-xl font-bold">إدارة المصاريف</div>
                <div className="flex flex-wrap gap-2 items-end">
                    <FormInput
                        label="بحث"
                        className="text-gray-800 dark:text-white md:w-64"
                        placeholder="الوصف، الملاحظات، الموظف..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {canAdd && (
                        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white px-6">
                            إضافة مصروف
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/50">
                        <Wallet size={20} />
                    </span>
                    <div>
                        <div className="text-xs text-slate-500">إجمالي المصاريف</div>
                        <div className="text-lg font-black text-slate-800 dark:text-white">
                            {formatSiteCurrency(summary.totalUSD, currencySettings)}
                        </div>
                    </div>
                </div>
                <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50">
                        <ReceiptText size={20} />
                    </span>
                    <div>
                        <div className="text-xs text-slate-500">عدد المصاريف</div>
                        <div className="text-lg font-black text-slate-800 dark:text-white">{summary.count}</div>
                    </div>
                </div>
                <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50">
                        <BadgeDollarSign size={20} />
                    </span>
                    <div>
                        <div className="text-xs text-slate-500">رواتب الموظفين</div>
                        <div className="text-lg font-black text-slate-800 dark:text-white">
                            {formatSiteCurrency(totalByType.STAFF_SALARY || 0, currencySettings)}
                        </div>
                    </div>
                </div>
                <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50">
                        <CalendarDays size={20} />
                    </span>
                    <div>
                        <div className="text-xs text-slate-500">مصاريف يومية وإيجار</div>
                        <div className="text-lg font-black text-slate-800 dark:text-white">
                            {formatSiteCurrency((totalByType.DAILY || 0) + (totalByType.RENT || 0), currencySettings)}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-3 items-end">
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-500">الشهر</label>
                    <input
                        type="month"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="p-2 border border-gray-300 dark:border-gray-950 rounded-lg text-sm bg-white dark:bg-slate-950 dark:text-slate-100"
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-500">النوع</label>
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="p-2 border border-gray-300 dark:border-gray-950 rounded-lg text-sm bg-white dark:bg-slate-950 dark:text-slate-100"
                    >
                        <option value="">كل الأنواع</option>
                        <option value="DAILY">يومية</option>
                        <option value="STAFF_SALARY">راتب موظف</option>
                        <option value="RENT">إيجار</option>
                    </select>
                </div>
                {(month || typeFilter) && (
                    <Button variant="outline" onClick={() => { setMonth(''); setTypeFilter(''); }}>
                        إظهار الكل
                    </Button>
                )}
            </div>

            <DataTable
                data={filteredExpenses}
                columns={columns}
                actions={actions}
                totalCount={filteredExpenses.length}
                pageSize={10}
                currentPage={1}
                onPageChange={() => {}}
                isLoading={loading}
            />

            <AppModal title={editing ? 'تعديل مصروف' : 'إضافة مصروف'} isOpen={isOpen} onClose={() => setIsOpen(false)} size="lg">
                <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-slate-500">نوع المصروف</label>
                            <select
                                value={form.type}
                                onChange={(e) => setForm({ ...form, type: e.target.value, employeeId: e.target.value === 'STAFF_SALARY' ? form.employeeId : '' })}
                                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
                            >
                                <option value="DAILY">يومية</option>
                                <option value="STAFF_SALARY">راتب موظف</option>
                                <option value="RENT">إيجار</option>
                            </select>
                        </div>
                        <FormInput
                            label="المبلغ (بالدولار)"
                            type="number"
                            className="text-gray-800 dark:text-white"
                            placeholder="0.00"
                            value={form.amount}
                            onChange={(e) => setForm({ ...form, amount: e.target.value })}
                        />
                    </div>

                    {form.type === 'STAFF_SALARY' && (
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-slate-500">الموظف</label>
                            <SearchableSelect
                                options={userOptions}
                                value={form.employeeId}
                                onChange={(value) => setForm({ ...form, employeeId: String(value) })}
                                placeholder="ابحث باسم الموظف..."
                            />
                        </div>
                    )}

                    <FormInput
                        label="الوصف"
                        className="text-gray-800 dark:text-white"
                        placeholder="مثال: فاتورة كهرباء المكتب"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />

                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-500">التاريخ المجدول (اختياري)</label>
                        <input
                            type="date"
                            value={form.scheduledDate}
                            onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                            className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
                        />
                    </div>

                    <FormInput
                        label="ملاحظات"
                        className="text-gray-800 dark:text-white"
                        placeholder="ملاحظات إضافية..."
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />

                    <Button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                        {editing ? 'حفظ التعديلات' : 'حفظ المصروف'}
                    </Button>
                </div>
            </AppModal>
        </div>
    );
}
