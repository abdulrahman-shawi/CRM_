import React from 'react';
import { DataTable, TableAction } from '@/components/shared/DataTable';
import { useSiteCurrency, formatSiteCurrency } from '@/lib/currency';
import {
  statusColors,
  getOrderAmountToCollect,
  getOrderDisplayDate,
  openWhatsAppByPhone,
} from '@/orders/orderHelpers';

interface OrderTableProps {
  orders: any[];
  actions: TableAction<any>[];
  onStatusChange: (newStatus: string, orderId: string | number) => void;
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export const OrderTable: React.FC<OrderTableProps> = ({
  orders,
  actions,
  onStatusChange,
  page,
  pageSize,
  totalCount,
  onPageChange,
  isLoading = false,
}) => {
  const { settings } = useSiteCurrency();
  return (
    <DataTable
      data={orders}
      actindir={true}
      isLoading={isLoading}
      totalCount={totalCount}
      pageSize={pageSize}
      currentPage={page}
      onPageChange={onPageChange}
      actions={actions}
      columns={[
        {
          header: "رقم الطلب",
          accessor: 'orderNumber',
        },
        {
          header: "العميل",
          accessor: (e: any) => (
            <div className="flex flex-col">
              <button
                onClick={() => {
                  const rawPhone = e.customer?.phone?.[0] || "";
                  const phoneNumber = rawPhone.replace(/\D/g, "");
                  if (phoneNumber) {
                    window.open(`https://wa.me/${phoneNumber}`, '_blank');
                  }
                }}
                className="text-right font-bold text-blue-600 hover:text-blue-700"
              >
                {e.customer?.name}
              </button>
            </div>
          ),
        },
        {
          header: "بيعت من قبل",
          accessor: (e: any) => {
            const employeeName = e.user?.username || e.user?.name || "-";
            const employeePhone = e.user?.phone || "";
            const hasPhone = String(employeePhone).trim().length > 0;

            return (
              <button
                type="button"
                onClick={() => openWhatsAppByPhone(employeePhone)}
                className={`font-bold ${
                  hasPhone
                    ? "text-emerald-600 hover:text-emerald-700"
                    : "text-slate-400 cursor-not-allowed"
                }`}
                disabled={!hasPhone}
                title={hasPhone ? "فتح واتساب" : "لا يوجد رقم هاتف"}
              >
                {employeeName}
              </button>
            );
          },
        },
        {
          header: "المبلغ اللازم استلامه",
          accessor: (e: any) => (
            <span className="font-black text-blue-600">
              {formatSiteCurrency(getOrderAmountToCollect(e), settings)}
            </span>
          ),
        },
        {
          header: "حالة الطلب",
          accessor: (c: any) => {
            const currentColor = statusColors[c.status] || "bg-slate-50 text-slate-500 border-slate-200";

            return (
              <div className="min-w-[150px]">
                <select
                  className={`${currentColor} w-full p-2.5 rounded-xl border font-bold transition-all cursor-pointer outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400`}
                  value={c.status}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    onStatusChange(newValue, c.id);
                  }}
                  name="order-status"
                >
                  <option value="" disabled>
                    اختر الحالة
                  </option>
                  {/* الطلبات القديمة التي تحمل حالة لم تعد مستخدمة تُعرض كخيار للقراءة فقط */}
                  {!["طلب جديد", "تم تسليم الطلب", "المتجر"].includes(c.status) && (
                    <option value={c.status} className="bg-white text-black">
                      {c.status}
                    </option>
                  )}
                  <option value="طلب جديد" className="bg-white text-black">
                    طلب جديد
                  </option>
                  <option value="تم تسليم الطلب" className="bg-white text-black">
                    تم تسليم الطلب
                  </option>
                  <option value="المتجر" className="bg-white text-black">
                    المتجر
                  </option>
                </select>
              </div>
            );
          },
        },
        {
          header: "تاريخ الإنشاء",
          accessor: (e: any) => new Date(getOrderDisplayDate(e)).toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
        },
      ]}
    />
  );
};
