'use client';
import { DataTable } from '@/components/shared/DataTable';
import { DynamicForm } from '@/components/shared/dynamic-form';
import { AppModal } from '@/components/ui/app-modal';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/form-input';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/utils';
import { createCoupon, deleteCoupon, getCoupons, updateCoupon } from '@/server/coupon';
import { Edit, Trash2 } from 'lucide-react';
import * as React from 'react';
import { Controller } from 'react-hook-form';
import toast from 'react-hot-toast';
import z from 'zod';

const couponSchema = z.object({
    code: z.string().min(3, 'كود الكوبون مطلوب'),
    title: z.string().optional(),
    discountType: z.enum(['PERCENTAGE', 'FIXED']),
    discountValue: z.number().min(0, 'قيمة الخصم مطلوبة'),
    maxDiscountValue: z.number().optional(),
    minOrderAmount: z.number().optional(),
    usageLimit: z.number().optional(),
    perCustomerLimit: z.number().optional(),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
    isActive: z.boolean().default(true),
});

export default function CouponsPage() {
    const { user } = useAuth();
    const [coupons, setCoupons] = React.useState<any[]>([]);
    const [isOpen, setIsOpen] = React.useState(false);
    const [editId, setEditId] = React.useState<string | null>(null);
    const [formData, setFormData] = React.useState<any>(null);

    const getData = async () => {
        const res = await getCoupons();
        if (res.success) setCoupons(res.data || []);
        else toast.error(res.error || 'تعذر تحميل الكوبونات');
    };

    React.useEffect(() => { getData(); }, []);

    const handleClose = () => { setIsOpen(false); setEditId(null); setFormData(null); };

    const handleEdit = (data: any) => {
        setEditId(data.id);
        setFormData({
            code: data.code,
            title: data.title || '',
            discountType: data.discountType,
            discountValue: data.discountValue,
            maxDiscountValue: data.maxDiscountValue || undefined,
            minOrderAmount: data.minOrderAmount || undefined,
            usageLimit: data.usageLimit || undefined,
            perCustomerLimit: data.perCustomerLimit || undefined,
            startsAt: data.startsAt ? new Date(data.startsAt).toISOString().split('T')[0] : '',
            endsAt: data.endsAt ? new Date(data.endsAt).toISOString().split('T')[0] : '',
            isActive: data.isActive,
        });
        setIsOpen(true);
    };

    const handleDelete = async (data: any) => {
        if (!window.confirm('هل أنت متأكد من حذف الكوبون؟')) return;
        const loading = toast.loading('جاري الحذف...');
        try {
            const res = await deleteCoupon(data.id);
            if (res.success) { toast.success('تم الحذف'); getData(); }
            else toast.error(res.error || 'تعذر الحذف');
        } catch { toast.error('حدث خطأ'); } finally { toast.dismiss(loading); }
    };

    const onSubmit = async (values: z.infer<typeof couponSchema>) => {
        const loading = toast.loading(editId ? 'جاري التحديث...' : 'جاري الإنشاء...');
        try {
            const payload = {
                ...values,
                maxDiscountValue: values.maxDiscountValue || undefined,
                minOrderAmount: values.minOrderAmount || undefined,
                usageLimit: values.usageLimit || undefined,
                perCustomerLimit: values.perCustomerLimit || undefined,
            };
            const res = editId ? await updateCoupon(editId, payload) : await createCoupon(payload);
            if (res.success) { toast.success(editId ? 'تم التحديث' : 'تم الإنشاء'); handleClose(); getData(); }
            else toast.error(res.error || 'تعذر الحفظ');
        } catch { toast.error('حدث خطأ'); } finally { toast.dismiss(loading); }
    };

    const columns = [
        { header: 'الكود', accessor: 'code' },
        { header: 'العنوان', accessor: (row: any) => row.title || '-' },
        { header: 'نوع الخصم', accessor: (row: any) => row.discountType === 'PERCENTAGE' ? 'نسبة' : 'مبلغ ثابت' },
        { header: 'القيمة', accessor: (row: any) => row.discountValue },
        { header: 'الاستخدامات', accessor: (row: any) => `${row.usedCount} / ${row.usageLimit || '∞'}` },
        { header: 'الحالة', accessor: (row: any) => row.isActive ? 'مفعّل' : 'معطّل' },
    ];

    const actions = [
        ...(user && hasPermission(user, 'editCoupons') ? [{ label: 'تعديل', icon: <Edit size={14} />, onClick: handleEdit }] : []),
        ...(user && hasPermission(user, 'deleteCoupons') ? [{ label: 'حذف', icon: <Trash2 size={14} />, variant: 'danger' as const, onClick: handleDelete }] : []),
    ];

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-6">
                <div className="text-xl font-bold">إدارة الكوبونات</div>
                {user && hasPermission(user, 'addCoupons') && (
                    <Button onClick={() => { setEditId(null); setFormData(null); setIsOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-6">كوبون جديد</Button>
                )}
            </div>
            <DataTable
                data={coupons}
                columns={columns}
                actions={actions}
                totalCount={coupons.length}
                pageSize={10}
                currentPage={1}
                onPageChange={() => {}}
            />
            <AppModal title={editId ? 'تعديل كوبون' : 'كوبون جديد'} isOpen={isOpen} onClose={handleClose}>
                <div className="p-4 max-h-[80vh] overflow-y-auto">
                    <DynamicForm schema={couponSchema} onSubmit={onSubmit} defaultValues={formData ?? { code: '', discountType: 'PERCENTAGE', discountValue: 0, isActive: true }} submitLabel={editId ? 'تحديث' : 'إنشاء'}>
                        {({ register, formState: { errors }, control }) => (
                            <div className="grid gap-4">
                                <FormInput className="text-gray-800 dark:text-white" label="كود الكوبون" {...register('code')} error={errors.code?.message as string} />
                                <FormInput className="text-gray-800 dark:text-white" label="العنوان (اختياري)" {...register('title')} />
                                <div className="grid grid-cols-2 gap-4">
                                    <select className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900 text-sm" {...register('discountType')}>
                                        <option value="PERCENTAGE">نسبة %</option>
                                        <option value="FIXED">مبلغ ثابت</option>
                                    </select>
                                    <FormInput className="text-gray-800 dark:text-white" type="number" step="0.01" label="قيمة الخصم" {...register('discountValue', { valueAsNumber: true })} error={errors.discountValue?.message as string} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormInput className="text-gray-800 dark:text-white" type="number" step="0.01" label="أقصى خصم (للنسبة)" {...register('maxDiscountValue', { valueAsNumber: true })} />
                                    <FormInput className="text-gray-800 dark:text-white" type="number" step="0.01" label="حد أدنى للطلب" {...register('minOrderAmount', { valueAsNumber: true })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormInput className="text-gray-800 dark:text-white" type="number" label="حد الاستخدام العام" {...register('usageLimit', { valueAsNumber: true })} />
                                    <FormInput className="text-gray-800 dark:text-white" type="number" label="حد الاستخدام لكل عميل" {...register('perCustomerLimit', { valueAsNumber: true })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormInput className="text-gray-800 dark:text-white" type="date" label="تاريخ البدء" {...register('startsAt')} />
                                    <FormInput className="text-gray-800 dark:text-white" type="date" label="تاريخ الانتهاء" {...register('endsAt')} />
                                </div>
                                <Controller name="isActive" control={control} render={({ field }) => (
                                    <label className="flex items-center gap-2 text-sm">
                                        <input type="checkbox" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} /> مفعّل
                                    </label>
                                )} />
                            </div>
                        )}
                    </DynamicForm>
                </div>
            </AppModal>
        </div>
    );
}
