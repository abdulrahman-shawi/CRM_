'use client';
import { DataTable } from '@/components/shared/DataTable';
import { AppModal } from '@/components/ui/app-modal';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/form-input';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/utils';
import { createCustomerPayment, deleteCustomerPayment, getCustomerPayments, getOverdueCustomers } from '@/server/customer-payment';
import { getOrders } from '@/server/order';
import { getCustomer } from '@/server/customer';
import { Trash2, FileText } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import toast from 'react-hot-toast';

const PAYMENT_TYPE_LABELS: Record<string, string> = {
    CASH: 'نقدي',
    BANK_TRANSFER: 'حوالة بنكية',
    INSTALLMENT: 'تقسيط',
    CHECK: 'شيك',
    OTHER: 'أخرى',
};

export default function CustomerPaymentsPage() {
    const { user } = useAuth();
    const [payments, setPayments] = React.useState<any[]>([]);
    const [overdueCustomers, setOverdueCustomers] = React.useState<any[]>([]);
    const [customers, setCustomers] = React.useState<any[]>([]);
    const [orders, setOrders] = React.useState<any[]>([]);
    const [isOpen, setIsOpen] = React.useState(false);
    const [selectedCustomer, setSelectedCustomer] = React.useState<any>(null);
    const [selectedOrder, setSelectedOrder] = React.useState<any>(null);
    const [amount, setAmount] = React.useState('');
    const [paymentType, setPaymentType] = React.useState('CASH');
    const [paymentDate, setPaymentDate] = React.useState('');
    const [notes, setNotes] = React.useState('');

    const getData = async () => {
        const [payRes, overRes, custRes, ordRes] = await Promise.all([
            getCustomerPayments(),
            getOverdueCustomers(),
            getCustomer(),
            getOrders(),
        ]);
        if (payRes.success) setPayments(payRes.data || []);
        if (overRes.success) setOverdueCustomers(overRes.data || []);
        if (custRes.success) setCustomers(custRes.data || []);
        if (ordRes.success) setOrders(ordRes.data || []);
    };

    React.useEffect(() => { getData(); }, []);

    const handleSave = async () => {
        if (!selectedCustomer || !amount) return;
        const loading = toast.loading('جاري تسجيل الدفعة...');
        try {
            const res = await createCustomerPayment({
                customerId: selectedCustomer.id,
                orderId: selectedOrder?.id,
                amount: Number(amount),
                paymentType: paymentType as any,
                paymentDate: paymentDate || undefined,
                notes,
            });
            if (res.success) { toast.success('تم تسجيل الدفعة'); setIsOpen(false); getData(); }
            else toast.error(res.error || 'تعذر التسجيل');
        } catch { toast.error('حدث خطأ'); } finally { toast.dismiss(loading); }
    };

    const handleDelete = async (data: any) => {
        if (!window.confirm('هل أنت متأكد من حذف الدفعة؟')) return;
        const loading = toast.loading('جاري الحذف...');
        try {
            const res = await deleteCustomerPayment(data.id);
            if (res.success) { toast.success('تم الحذف'); getData(); }
            else toast.error(res.error || 'تعذر الحذف');
        } catch { toast.error('حدث خطأ'); } finally { toast.dismiss(loading); }
    };

    const columns = [
        { header: 'العميل', accessor: (row: any) => row.customer?.name },
        { header: 'الطلب', accessor: (row: any) => row.order?.orderNumber || '-' },
        { header: 'المبلغ', accessor: (row: any) => row.amount.toLocaleString() },
        { header: 'النوع', accessor: (row: any) => PAYMENT_TYPE_LABELS[row.paymentType] || row.paymentType },
        { header: 'التاريخ', accessor: (row: any) => new Date(row.paymentDate).toLocaleDateString('ar-EG') },
    ];

    const actions = [
        ...(user && hasPermission(user, 'viewCustomerPayments') ? [{ label: 'كشف حساب', icon: <FileText size={14} />, onClick: (data: any) => window.open(`/dashboard/customer-payments/${data.customerId}/statement`, '_blank') }] : []),
        ...(user && hasPermission(user, 'deleteCustomerPayments') ? [{ label: 'حذف', icon: <Trash2 size={14} />, variant: 'danger' as const, onClick: handleDelete }] : []),
    ];

    const customerOrders = React.useMemo(() => selectedCustomer ? orders.filter((o: any) => o.customerId === selectedCustomer.id && o.remainingAmount > 0) : [], [selectedCustomer, orders]);

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-6">
                <div className="text-xl font-bold">الفواتير المستحقة والدفعات</div>
                {user && hasPermission(user, 'addCustomerPayments') && (
                    <Button onClick={() => { setSelectedCustomer(null); setSelectedOrder(null); setAmount(''); setPaymentType('CASH'); setPaymentDate(''); setNotes(''); setIsOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-6">تسجيل دفعة</Button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                {overdueCustomers.slice(0, 6).map((c) => (
                    <div key={c.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-bold text-slate-900 dark:text-white">{c.name}</p>
                                <p className="text-xs text-slate-500">{c.orders.length} فاتورة مستحقة</p>
                            </div>
                            <p className="font-bold text-red-500">{c.totalDebt.toLocaleString()}</p>
                        </div>
                    </div>
                ))}
            </div>

            <DataTable
                data={payments}
                columns={columns}
                actions={actions}
                totalCount={payments.length}
                pageSize={10}
                currentPage={1}
                onPageChange={() => {}}
            />
            <AppModal title="تسجيل دفعة" isOpen={isOpen} onClose={() => setIsOpen(false)}>
                <div className="p-4 space-y-4">
                    <select className="w-full rounded-lg border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900 text-sm" onChange={(e) => { setSelectedCustomer(customers.find((c) => c.id === e.target.value) || null); setSelectedOrder(null); }}>
                        <option value="">اختر العميل</option>
                        {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select className="w-full rounded-lg border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900 text-sm" value={selectedOrder?.id || ''} onChange={(e) => setSelectedOrder(customerOrders.find((o) => o.id === Number(e.target.value)) || null)}>
                        <option value="">ربط بفاتورة (اختياري)</option>
                        {customerOrders.map((o) => <option key={o.id} value={o.id}>{o.orderNumber} - متبقي {o.remainingAmount.toLocaleString()}</option>)}
                    </select>
                    <FormInput className="text-gray-800 dark:text-white" type="number" step="0.01" label="المبلغ" value={amount} onChange={(e) => setAmount(e.target.value)} />
                    <select className="w-full rounded-lg border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900 text-sm" value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
                        <option value="CASH">نقدي</option>
                        <option value="BANK_TRANSFER">حوالة بنكية</option>
                        <option value="INSTALLMENT">تقسيط</option>
                        <option value="CHECK">شيك</option>
                        <option value="OTHER">أخرى</option>
                    </select>
                    <FormInput className="text-gray-800 dark:text-white" type="date" label="تاريخ الدفعة" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                    <FormInput className="text-gray-800 dark:text-white" label="ملاحظات" value={notes} onChange={(e) => setNotes(e.target.value)} />
                    <Button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700 text-white">حفظ الدفعة</Button>
                </div>
            </AppModal>
        </div>
    );
}
