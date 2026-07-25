'use client';
import { DataTable } from '@/components/shared/DataTable';
import { DynamicForm } from '@/components/shared/dynamic-form';
import { AppModal } from '@/components/ui/app-modal';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/form-input';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/utils';
import { getSuppliers } from '@/server/supplier';
import { createPurchaseInvoice, deletePurchaseInvoice, getPurchaseInvoices } from '@/server/supplier';
import { getWarehouse } from '@/server/warehouse';
import { getProductCatalog } from '@/server/product';
import { AnimatePresence } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import * as React from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import toast from 'react-hot-toast';
import z from 'zod';

const itemSchema = z.object({
    productId: z.number().min(1, 'اختر منتجاً'),
    quantity: z.number().min(1, 'الكمية مطلوبة'),
    costPrice: z.number().min(0, 'السعر لا يمكن أن يكون سالباً'),
    warehouseId: z.number().optional(),
});

const invoiceSchema = z.object({
    invoiceNumber: z.string().min(1, 'رقم الفاتورة مطلوب'),
    supplierId: z.string().min(1, 'المورد مطلوب'),
    invoiceDate: z.string().optional(),
    notes: z.string().optional(),
    items: z.array(itemSchema).min(1, 'صنف واحد على الأقل'),
});

function ItemsForm() {
    const { control, register, formState: { errors }, watch, setValue } = useFormContext<any>();
    const { fields, append, remove } = useFieldArray({ control, name: 'items' });
    const [products, setProducts] = React.useState<any[]>([]);
    const [warehouses, setWarehouses] = React.useState<any[]>([]);

    React.useEffect(() => {
        getProductCatalog().then((res: any) => { if (res.success) setProducts(res.data || []); });
        getWarehouse().then(setWarehouses).catch(console.error);
    }, []);

    return (
        <div className="space-y-3">
            {fields.map((field, idx) => (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-end border border-slate-100 dark:border-slate-800 p-3 rounded-xl">
                    <div className="col-span-4">
                        <select className="w-full rounded-lg border border-slate-200 dark:border-slate-800 p-2 text-sm bg-white dark:bg-slate-900" {...register(`items.${idx}.productId`, { valueAsNumber: true })}>
                            <option value="">اختر منتجاً</option>
                            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="col-span-2"><FormInput className="text-gray-800 dark:text-white" type="number" label="الكمية" {...register(`items.${idx}.quantity`, { valueAsNumber: true })} /></div>
                    <div className="col-span-2"><FormInput className="text-gray-800 dark:text-white" type="number" step="0.01" label="سعر الشراء" {...register(`items.${idx}.costPrice`, { valueAsNumber: true })} /></div>
                    <div className="col-span-3">
                        <select className="w-full rounded-lg border border-slate-200 dark:border-slate-800 p-2 text-sm bg-white dark:bg-slate-900" {...register(`items.${idx}.warehouseId`, { valueAsNumber: true })}>
                            <option value="">المستودع</option>
                            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>
                    <div className="col-span-1"><button type="button" onClick={() => remove(idx)} className="text-red-500 p-2"><Trash2 size={16} /></button></div>
                    {errors.items && (errors.items as any)[idx]?.productId && <p className="col-span-12 text-xs text-red-500">{(errors.items as any)[idx].productId.message as string}</p>}
                </div>
            ))}
            <Button type="button" variant="outline" onClick={() => append({ productId: 0, quantity: 1, costPrice: 0, warehouseId: undefined })}>+ إضافة صنف</Button>
        </div>
    );
}

export default function PurchaseInvoicesPage() {
    const { user } = useAuth();
    const [invoices, setInvoices] = React.useState<any[]>([]);
    const [suppliers, setSuppliers] = React.useState<any[]>([]);
    const [isOpen, setIsOpen] = React.useState(false);

    const getData = async () => {
        const [invRes, supRes] = await Promise.all([getPurchaseInvoices(), getSuppliers()]);
        if (invRes.success) setInvoices(invRes.data || []);
        if (supRes.success) setSuppliers(supRes.data || []);
    };

    React.useEffect(() => { getData(); }, []);

    const handleDelete = async (data: any) => {
        if (!window.confirm('هل أنت متأكد من حذف فاتورة الشراء؟ سيُخفّض المخزون تلقائياً.')) return;
        const loading = toast.loading('جاري الحذف...');
        try {
            const res = await deletePurchaseInvoice(data.id);
            if (res.success) { toast.success('تم الحذف'); getData(); }
            else toast.error(res.error || 'تعذر الحذف');
        } catch { toast.error('حدث خطأ'); } finally { toast.dismiss(loading); }
    };

    const onSubmit = async (values: z.infer<typeof invoiceSchema>) => {
        const loading = toast.loading('جاري إنشاء فاتورة الشراء...');
        try {
            const res = await createPurchaseInvoice(values as any);
            if (res.success) { toast.success('تم إنشاء الفاتورة'); setIsOpen(false); getData(); }
            else toast.error(res.error || 'تعذر الإنشاء');
        } catch { toast.error('حدث خطأ'); } finally { toast.dismiss(loading); }
    };

    const columns = [
        { header: 'رقم الفاتورة', accessor: 'invoiceNumber' },
        { header: 'المورد', accessor: (row: any) => row.supplier?.name },
        { header: 'المجموع', accessor: (row: any) => row.totalAmount.toLocaleString() },
        { header: 'المتبقي', accessor: (row: any) => row.remainingAmount.toLocaleString() },
        { header: 'التاريخ', accessor: (row: any) => new Date(row.invoiceDate).toLocaleDateString('ar-EG') },
    ];

    const actions = user && hasPermission(user, 'deletePurchaseInvoices') ? [{ label: 'حذف', icon: <Trash2 size={14} />, variant: 'danger' as const, onClick: handleDelete }] : [];

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-6">
                <div className="text-xl font-bold">فواتير شراء المنتجات</div>
                {user && hasPermission(user, 'addPurchaseInvoices') && (
                    <Button onClick={() => setIsOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6">فاتورة شراء جديدة</Button>
                )}
            </div>
            <DataTable
                data={invoices}
                columns={columns}
                actions={actions}
                totalCount={invoices.length}
                pageSize={10}
                currentPage={1}
                onPageChange={() => {}}
            />
            <AppModal title="فاتورة شراء جديدة" isOpen={isOpen} onClose={() => setIsOpen(false)} size="xl">
                <div className="p-4 max-h-[80vh] overflow-y-auto">
                    <DynamicForm schema={invoiceSchema} onSubmit={onSubmit} submitLabel="حفظ الفاتورة">
                        {({ register, formState: { errors } }) => (
                            <div className="grid gap-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormInput className="text-gray-800 dark:text-white" label="رقم الفاتورة" {...register('invoiceNumber')} error={errors.invoiceNumber?.message as string} />
                                    <select className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900 text-sm" {...register('supplierId')}>
                                        <option value="">اختر المورد</option>
                                        {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                    {errors.supplierId && <p className="text-xs text-red-500">{errors.supplierId.message as string}</p>}
                                </div>
                                <FormInput className="text-gray-800 dark:text-white" label="تاريخ الفاتورة" type="date" {...register('invoiceDate')} />
                                <FormInput className="text-gray-800 dark:text-white" label="ملاحظات" {...register('notes')} />
                                <ItemsForm />
                                {errors.items && <p className="text-xs text-red-500">{errors.items.message as string}</p>}
                            </div>
                        )}
                    </DynamicForm>
                </div>
            </AppModal>
        </div>
    );
}
