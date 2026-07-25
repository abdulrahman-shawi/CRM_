'use client';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/utils';
import { getCustomerStatement } from '@/server/customer-payment';
import { useParams } from 'next/navigation';
import * as React from 'react';
import toast from 'react-hot-toast';

export default function CustomerStatementPage() {
    const { user } = useAuth();
    const params = useParams();
    const customerId = String(params?.id || '');
    const [data, setData] = React.useState<any>(null);

    React.useEffect(() => {
        if (!user || (!hasPermission(user, 'viewCustomerPayments') && user.accountType !== 'ADMIN')) return;
        getCustomerStatement(customerId).then((res) => {
            if (res.success) setData(res.data);
            else toast.error(res.error || 'تعذر تحميل كشف الحساب');
        });
    }, [customerId, user]);

    if (!data) return <div className="p-4 text-slate-500">جاري التحميل...</div>;

    const { customer, summary, statement } = data;

    return (
        <div className="p-4" dir="rtl">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">كشف حساب: {customer.name}</h1>
                <p className="text-slate-500">{customer.phone?.join(' - ')}</p>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="text-xs text-slate-500">إجمالي الفواتير</div>
                    <div className="text-xl font-bold text-blue-600">{summary.totalOrders.toLocaleString()}</div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="text-xs text-slate-500">إجمالي المدفوع</div>
                    <div className="text-xl font-bold text-emerald-600">{summary.totalPaid.toLocaleString()}</div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="text-xs text-slate-500">المتبقي</div>
                    <div className="text-xl font-bold text-red-500">{summary.totalRemaining.toLocaleString()}</div>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-sm text-right">
                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                        <tr>
                            <th className="p-4 font-bold">التاريخ</th>
                            <th className="p-4 font-bold">البيان</th>
                            <th className="p-4 font-bold">مدين</th>
                            <th className="p-4 font-bold">دائن</th>
                            <th className="p-4 font-bold">الرصيد</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {statement.map((entry: any) => (
                            <tr key={entry.type + (entry.orderId || entry.paymentId)}>
                                <td className="p-4">{new Date(entry.date).toLocaleDateString('ar-EG')}</td>
                                <td className="p-4">{entry.description}</td>
                                <td className="p-4 text-red-500">{entry.debit > 0 ? entry.debit.toLocaleString() : ''}</td>
                                <td className="p-4 text-emerald-600">{entry.credit > 0 ? entry.credit.toLocaleString() : ''}</td>
                                <td className="p-4 font-bold">{entry.balance.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
