'use client';
import { DynamicForm } from '@/components/shared/dynamic-form';
import { AppModal } from '@/components/ui/app-modal';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/form-input';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/utils';
import { createSupplier, deleteSupplier, getSuppliers, updateSupplier } from '@/server/supplier';
import { AnimatePresence, motion } from 'framer-motion';
import { Edit, Phone, Mail, MapPin, Trash2, FileText } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import toast from 'react-hot-toast';
import z from 'zod';

const supplierSchema = z.object({
    name: z.string().min(2, 'اسم المورد مطلوب'),
    phone: z.string().optional(),
    email: z.string().email('البريد غير صالح').optional().or(z.literal('')),
    address: z.string().optional(),
    notes: z.string().optional(),
});

const emptyForm = { name: '', phone: '', email: '', address: '', notes: '' };

export default function SuppliersPage() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = React.useState(false);
    const [editId, setEditId] = React.useState<string | null>(null);
    const [formData, setFormData] = React.useState<any>(null);
    const [suppliers, setSuppliers] = React.useState<any[]>([]);

    const getData = async () => {
        const res = await getSuppliers();
        if (res.success) setSuppliers(res.data || []);
        else toast.error(res.error || 'تعذر تحميل الموردين');
    };

    React.useEffect(() => { getData(); }, []);

    const handleClose = () => { setIsOpen(false); setEditId(null); setFormData(null); };

    const handleEdit = (data: any) => {
        setEditId(data.id);
        setFormData({
            name: data.name,
            phone: data.phone || '',
            email: data.email || '',
            address: data.address || '',
            notes: data.notes || '',
        });
        setIsOpen(true);
    };

    const handleDelete = async (data: any) => {
        if (!window.confirm(`هل أنت متأكد من حذف المورد "${data.name}"؟`)) return;
        const loading = toast.loading('جاري حذف المورد...');
        try {
            const res = await deleteSupplier(data.id);
            if (res.success) { toast.success('تم حذف المورد'); getData(); }
            else toast.error(res.error || 'تعذر حذف المورد');
        } catch { toast.error('حدث خطأ غير متوقع'); } finally { toast.dismiss(loading); }
    };

    const onSubmit = async (values: z.infer<typeof supplierSchema>) => {
        const loading = toast.loading(editId ? 'جاري التحديث...' : 'جاري الإضافة...');
        try {
            const res = editId
                ? await updateSupplier(editId, { ...values, email: values.email || undefined })
                : await createSupplier({ ...values, email: values.email || undefined });
            if (res.success) { toast.success(editId ? 'تم التحديث' : 'تمت الإضافة'); handleClose(); getData(); }
            else toast.error(res.error || 'تعذر الحفظ');
        } catch { toast.error('حدث خطأ غير متوقع'); } finally { toast.dismiss(loading); }
    };

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-6">
                <div className="text-xl font-bold">إدارة الموردين</div>
                {user && hasPermission(user, 'addSuppliers') && (
                    <Button onClick={() => { setEditId(null); setFormData(emptyForm); setIsOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-6">
                        إضافة مورد جديد
                    </Button>
                )}
            </div>

            <AnimatePresence>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {suppliers.map((s) => (
                        <motion.div
                            key={s.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm group hover:border-blue-500 transition-all"
                        >
                            <div className="flex justify-between items-start">
                                <div className="space-y-2">
                                    <h3 className="font-bold text-xl text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{s.name}</h3>
                                    {s.phone && <p className="text-sm text-slate-500 flex items-center gap-2"><Phone size={14} /> {s.phone}</p>}
                                    {s.email && <p className="text-sm text-slate-500 flex items-center gap-2"><Mail size={14} /> {s.email}</p>}
                                    {s.address && <p className="text-sm text-slate-500 flex items-center gap-2"><MapPin size={14} /> {s.address}</p>}
                                    <div className="flex gap-4 text-xs text-slate-400 pt-2">
                                        <span>{s._count?.products || 0} منتج</span>
                                        <span>{s._count?.invoices || 0} فاتورة</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Link href={`/dashboard/suppliers/${s.id}`} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all">
                                        <FileText size={16} />
                                    </Link>
                                    {user && hasPermission(user, 'editSuppliers') && (
                                        <button onClick={() => handleEdit(s)} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-blue-600 hover:bg-blue-600 hover:text-white transition-all"><Edit size={16} /></button>
                                    )}
                                    {user && hasPermission(user, 'deleteSuppliers') && (
                                        <button onClick={() => handleDelete(s)} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-red-500 hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16} /></button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </AnimatePresence>

            <AppModal title={editId ? 'تعديل مورد' : 'إضافة مورد'} isOpen={isOpen} onClose={handleClose}>
                <div className="p-2 max-h-[80vh]">
                    <DynamicForm schema={supplierSchema} onSubmit={onSubmit} defaultValues={formData ?? emptyForm} submitLabel={editId ? 'تحديث' : 'إضافة'}>
                        {({ register, formState: { errors } }) => (
                            <div className="grid gap-4">
                                <FormInput className="text-gray-800 dark:text-white" label="اسم المورد" {...register('name')} error={errors.name?.message as string} />
                                <FormInput className="text-gray-800 dark:text-white" label="الهاتف" {...register('phone')} error={errors.phone?.message as string} />
                                <FormInput className="text-gray-800 dark:text-white" label="البريد الإلكتروني" {...register('email')} error={errors.email?.message as string} />
                                <FormInput className="text-gray-800 dark:text-white" label="العنوان" {...register('address')} />
                                <FormInput className="text-gray-800 dark:text-white" label="ملاحظات" {...register('notes')} />
                            </div>
                        )}
                    </DynamicForm>
                </div>
            </AppModal>
        </div>
    );
}
