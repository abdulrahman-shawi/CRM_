'use client';

import * as React from 'react';
import { DataTable } from '@/components/shared/DataTable';
import { DynamicForm } from '@/components/shared/dynamic-form';
import { AppModal } from '@/components/ui/app-modal';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/form-input';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/utils';
import {
    getLoyaltyRules,
    createLoyaltyRule,
    updateLoyaltyRule,
    deleteLoyaltyRule,
    getLoyaltyTransactions,
} from '@/server/loyalty';
import { Edit, Trash2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import * as z from 'zod';

const ruleSchema = z.object({
    name: z.string().optional(),
    pointsPerCurrency: z.number().min(0, 'القيمة مطلوبة'),
    redeemValue: z.number().min(0, 'القيمة مطلوبة'),
    minPointsToRedeem: z.number().min(0, 'القيمة مطلوبة'),
    isActive: z.boolean().default(true),
});

export default function LoyaltyPage() {
    const { user } = useAuth();
    const [tab, setTab] = React.useState<'rules' | 'transactions'>('rules');
    const [rules, setRules] = React.useState<any[]>([]);
    const [transactions, setTransactions] = React.useState<any[]>([]);
    const [isRuleOpen, setIsRuleOpen] = React.useState(false);
    const [editRule, setEditRule] = React.useState<any>(null);

    const canEdit = user && hasPermission(user, 'editLoyalty');
    const canView = user && hasPermission(user, 'viewLoyalty');
    const activeRule = rules.find((rule: any) => rule?.isActive) || null;

    const loadRules = async () => {
        const res = await getLoyaltyRules();
        if (res.success) setRules(res.data || []);
        else toast.error(res.error || 'تعذر تحميل القواعد');
    };

    const loadTransactions = async () => {
        const res = await getLoyaltyTransactions();
        if (res.success) setTransactions(res.data || []);
        else toast.error(res.error || 'تعذر تحميل الحركات');
    };

    React.useEffect(() => {
        if (!canView) return;
        loadRules();
        loadTransactions();
    }, [canView]);

    const handleSaveRule = async (values: z.infer<typeof ruleSchema>) => {
        const loading = toast.loading(editRule ? 'جاري التحديث...' : 'جاري الإنشاء...');
        const res = editRule
            ? await updateLoyaltyRule(editRule.id, values)
            : await createLoyaltyRule(values);
        toast.dismiss(loading);
        if (res.success) {
            toast.success(editRule ? 'تم التحديث' : 'تم الإنشاء');
            setIsRuleOpen(false);
            setEditRule(null);
            loadRules();
        } else {
            toast.error((res as any).error || 'تعذر الحفظ');
        }
    };

    const handleDeleteRule = async (data: any) => {
        if (!window.confirm('هل أنت متأكد من حذف القاعدة؟')) return;
        const res = await deleteLoyaltyRule(data.id);
        if (res.success) { toast.success('تم الحذف'); loadRules(); }
        else toast.error((res as any).error || 'تعذر الحذف');
    };

    const ruleColumns = [
        { header: 'الاسم', accessor: (row: any) => row.name || '-' },
        { header: 'نقطة لكل عملة', accessor: (row: any) => row.pointsPerCurrency },
        { header: 'قيمة الاستبدال', accessor: (row: any) => row.redeemValue },
        { header: 'الحد الأدنى', accessor: (row: any) => row.minPointsToRedeem },
        { header: 'مفعّل', accessor: (row: any) => row.isActive ? 'نعم' : 'لا' },
    ];

    const transactionColumns = [
        { header: 'العميل', accessor: (row: any) => row.customer?.name || '-' },
        { header: 'النوع', accessor: (row: any) => row.type === 'EARN' ? 'اكتساب' : row.type === 'REDEEM' ? 'استبدال' : row.type === 'BONUS' ? 'مكافأة' : 'إنهاء' },
        { header: 'النقاط', accessor: (row: any) => row.points },
        { header: 'القيمة', accessor: (row: any) => row.value || '-' },
        { header: 'التاريخ', accessor: (row: any) => new Date(row.createdAt).toLocaleDateString('ar-EG') },
    ];

    const ruleActions = canEdit
        ? [
            { label: 'تعديل', icon: <Edit size={14} />, onClick: (row: any) => { setEditRule(row); setIsRuleOpen(true); } },
            { label: 'حذف', icon: <Trash2 size={14} />, variant: 'danger' as const, onClick: handleDeleteRule },
        ]
        : [];

    if (!canView) return <div className="p-4 text-red-500">غير مصرح لك بعرض نقاط الولاء</div>;

    return (
        <div className="p-4">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-xl font-bold">نظام نقاط الولاء</h1>
                {tab === 'rules' && canEdit && (
                    <Button onClick={() => { setEditRule(null); setIsRuleOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Plus size={16} className="ml-2" /> قاعدة جديدة
                    </Button>
                )}
            </div>

            <div className="flex gap-2 mb-4">
                <button onClick={() => setTab('rules')} className={`px-4 py-2 rounded-lg text-sm font-bold ${tab === 'rules' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-900'}`}>القواعد</button>
                <button onClick={() => setTab('transactions')} className={`px-4 py-2 rounded-lg text-sm font-bold ${tab === 'transactions' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-900'}`}>الحركات</button>
            </div>

            <div className="mb-4 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/20 p-4 text-sm leading-7 text-slate-700 dark:text-slate-300">
                <h2 className="font-black text-blue-700 dark:text-blue-300 mb-2">كيف تُحتسب النقاط؟</h2>
                <ul className="list-disc pr-5 space-y-1">
                    <li><b>الكسب التلقائي:</b> عند إنشاء طلب يحصل العميل على نقاط = (القيمة النهائية للطلب بعد الخصومات) × (نقطة لكل عملة).
                        {activeRule ? <> مثال بالقاعدة المفعّلة حالياً: طلب بقيمة 100 يعطي <b>{100 * Number(activeRule.pointsPerCurrency || 0)}</b> نقطة.</> : null}
                    </li>
                    <li><b>الاستبدال:</b> يتم من نموذج إنشاء الطلب — تُدخل عدد النقاط فيُحسب الخصم = عدد النقاط × قيمة الاستبدال ويُخصم من الإجمالي النهائي تلقائياً، بشرط بلوغ الحد الأدنى للاستبدال.
                        {activeRule ? <> مثال: استبدال 100 نقطة = خصم <b>{100 * Number(activeRule.redeemValue || 0)}</b>، والحد الأدنى <b>{Number(activeRule.minPointsToRedeem || 0)}</b> نقطة.</> : null}
                    </li>
                    <li>لا تُحتسب نقاط للطلبات الملغاة أو المرتجعة (فشل التسليم مرتجع).</li>
                    <li>يُعمل بقاعدة واحدة مفعّلة فقط — عند تفعيل أكثر من قاعدة تُستخدم الأولى ويُتجاهل الباقي.</li>
                    <li>يمكن للموظف إضافة نقاط يدوية للعميل من نموذج إنشاء الطلب.</li>
                </ul>
            </div>

            {tab === 'rules' && (
                <DataTable data={rules} columns={ruleColumns} actions={ruleActions} totalCount={rules.length} pageSize={10} currentPage={1} onPageChange={() => {}} />
            )}

            {tab === 'transactions' && (
                <DataTable data={transactions} columns={transactionColumns} totalCount={transactions.length} pageSize={10} currentPage={1} onPageChange={() => {}} />
            )}

            <AppModal title={editRule ? 'تعديل قاعدة' : 'قاعدة ولاء جديدة'} isOpen={isRuleOpen} onClose={() => setIsRuleOpen(false)}>
                <div className="p-4">
                    <DynamicForm
                        schema={ruleSchema}
                        onSubmit={handleSaveRule}
                        defaultValues={editRule || { name: '', pointsPerCurrency: 1, redeemValue: 0, minPointsToRedeem: 0, isActive: true }}
                        submitLabel={editRule ? 'تحديث' : 'إنشاء'}
                    >
                        {({ register, formState: { errors }, control }) => (
                            <div className="grid gap-4">
                                <FormInput className="text-gray-800 dark:text-white" label="اسم القاعدة (اختياري)" {...register('name')} />
                                <FormInput className="text-gray-800 dark:text-white" type="number" step="0.01" label="نقاط لكل عملة" {...register('pointsPerCurrency', { valueAsNumber: true })} error={errors.pointsPerCurrency?.message as string} />
                                <FormInput className="text-gray-800 dark:text-white" type="number" step="0.01" label="قيمة استبدال النقطة" {...register('redeemValue', { valueAsNumber: true })} error={errors.redeemValue?.message as string} />
                                <FormInput className="text-gray-800 dark:text-white" type="number" label="الحد الأدنى للاستبدال" {...register('minPointsToRedeem', { valueAsNumber: true })} error={errors.minPointsToRedeem?.message as string} />
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" {...register('isActive')} defaultChecked={editRule ? editRule.isActive : true} /> مفعّلة
                                </label>
                            </div>
                        )}
                    </DynamicForm>
                </div>
            </AppModal>
        </div>
    );
}
