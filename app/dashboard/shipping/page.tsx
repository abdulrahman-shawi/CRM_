"use client";
import { DynamicForm } from "@/components/shared/dynamic-form";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { formatSiteCurrency, useSiteCurrency } from "@/lib/currency";
import { hasPermission } from "@/lib/utils";
import { getOrderAmountToCollect, getOrderCurrencySymbol, getOrderDisplayDate, getOrderNetAmountAfterShipping, getOrderTotalShippingExpenses } from "@/orders/orderHelpers";
import { createshipping, deletshipping, getshippingWithOrders, updateshipping } from "@/server/shipping";
import { AnimatePresence, motion } from "framer-motion";
import { Edit, Trash2 } from "lucide-react";
import React from "react";
import toast from "react-hot-toast";
import z, { set } from "zod";
import { FormInput } from "@/components/ui/form-input";

const shippingSchema = z.object({
    name: z.string().min(3, "اسم شركة الشحن مطلوب"),
    price: z.number().min(0, "السعر لا يمكن أن يكون سالب"),
    manualReceivable: z.number().min(0, "المبلغ لا يمكن أن يكون سالب"),
    manualPayable: z.number().min(0, "المبلغ لا يمكن أن يكون سالب"),
});

// حالات الطلبات التي تُعتبر مسلَّمة (تدخل في حساب المستحقات)
const DELIVERED_ORDER_STATUSES = new Set(["تم تسليم الطلب", "تم التسليم", "مدفوعة", "تم البيع"]);

// حساب المستحقات: ما نريده من شركة الشحن وما تريده منا (طلبات مسلَّمة + مبالغ يدوية)
const getShippingSettlement = (shippingEntry: any) => {
    const orders = Array.isArray(shippingEntry?.orders) ? shippingEntry.orders : [];
    const deliveredOrders = orders.filter((order: any) => DELIVERED_ORDER_STATUSES.has(String(order?.status || "")));

    const autoReceivable = deliveredOrders.reduce((sum: number, order: any) => sum + getOrderAmountToCollect(order), 0);
    const autoPayable = deliveredOrders.reduce((sum: number, order: any) => sum + getOrderTotalShippingExpenses(order), 0);
    const manualReceivable = Number(shippingEntry?.manualReceivable || 0);
    const manualPayable = Number(shippingEntry?.manualPayable || 0);

    return {
        deliveredCount: deliveredOrders.length,
        autoReceivable,
        autoPayable,
        manualReceivable,
        manualPayable,
        receivable: autoReceivable + manualReceivable,
        payable: autoPayable + manualPayable,
        net: (autoReceivable + manualReceivable) - (autoPayable + manualPayable),
    };
};
export default function ShippingPage() {
    const [isOpen, setIsOpen] = React.useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
    const [editId, setEditId] = React.useState<string | null>(null);
    const [formData, setFormData] = React.useState<any>(null);
    const [shipping, setshipping] = React.useState<any[]>([]);
    const [selectedShipping, setSelectedShipping] = React.useState<any>(null);
    const { user } = useAuth()
    const { settings: currencySettings } = useSiteCurrency();

    const selectedShippingOrders = React.useMemo(() => {
        return Array.isArray(selectedShipping?.orders) ? selectedShipping.orders : [];
    }, [selectedShipping]);

    const selectedShippingStatusSummary = React.useMemo(() => {
        const summaryMap = new Map<string, { status: string; count: number; totalAmount: number }>();

        selectedShippingOrders.forEach((order: any) => {
            const status = String(order?.status || "غير محدد");
            const current = summaryMap.get(status) || { status, count: 0, totalAmount: 0 };
            current.count += 1;
            current.totalAmount += Number(order?.finalAmount || 0);
            summaryMap.set(status, current);
        });

        return Array.from(summaryMap.values()).sort((a, b) => b.count - a.count);
    }, [selectedShippingOrders]);

    const selectedShippingTotals = React.useMemo(() => {
        return selectedShippingOrders.reduce(
            (acc: { ordersCount: number; totalAmount: number; totalShippingAmount: number; totalNetAmount: number }, order: any) => {
                acc.ordersCount += 1;
                acc.totalAmount += Number(order?.finalAmount || 0);
                acc.totalShippingAmount += getOrderTotalShippingExpenses(order);
                acc.totalNetAmount += getOrderNetAmountAfterShipping(order);
                return acc;
            },
            { ordersCount: 0, totalAmount: 0, totalShippingAmount: 0, totalNetAmount: 0 }
        );
    }, [selectedShippingOrders]);

    const selectedShippingSettlement = React.useMemo(() => {
        return selectedShipping ? getShippingSettlement(selectedShipping) : null;
    }, [selectedShipping]);


    const getData = async () => {
        try {
            const res = await getshippingWithOrders();
            if (res.success) {
                setshipping(res.data);
            } else {
                toast.error("حدث خطأ أثناء جلب بيانات شركات الشحن");
            }
        } catch (error) {
            toast.error("حدث خطأ غير متوقع أثناء جلب بيانات شركات الشحن");
        }
    };
    React.useEffect(() => {
        getData();
    }, []);
    const handleClose = () => {
        setIsOpen(false);
        setEditId(null);
        setFormData(null);
    };

    const openDetailsModal = (data: any) => {
        setSelectedShipping(data);
        setIsDetailsOpen(true);
    };

    const handleEdit = (data: any) => {
        setEditId(data.id);
        setFormData({
            name: data.name,
            price: data.price,
            manualReceivable: Number(data.manualReceivable || 0),
            manualPayable: Number(data.manualPayable || 0)
        });
        setIsOpen(true);
    }

    const handledelete = async (data: any) => {
        const loadingToast = toast.loading('جاري حذف شركة الشحن...');
        try {
            const res = await deletshipping(data.id);
            if (res.success) {
                toast.success("تم حذف شركة الشحن بنجاح");
                getData();
            } else {
                toast.error("حدث خطأ أثناء حذف شركة الشحن");
            }
        } catch (error) {
            toast.error("حدث خطأ غير متوقع أثناء حذف شركة الشحن");
        } finally {    
                            toast.dismiss(loadingToast);
        }
    };

    const onSubmit = async (data: z.infer<typeof shippingSchema>) => {
        const loadingToast = toast.loading(editId ? 'جاري تحديث البيانات...' : 'جاري إنشاء شركة الشحن...');
        try {
            if (editId) {
                const res = await updateshipping(editId, data);
                if (res.success) {
                    toast.success("تم تحديث شركة الشحن بنجاح");
                } else {
                    toast.error("حدث خطأ أثناء تحديث شركة الشحن");
                }

            } else {
                const res = await createshipping(data);
                if (res.success) {
                    toast.success("تم إنشاء شركة الشحن بنجاح");
                } else {
                    toast.error("حدث خطأ أثناء إنشاء شركة الشحن");
                }
            }
        } catch (error) {
            toast.error("حدث خطأ غير متوقع");
        } finally {
            toast.dismiss(loadingToast);
            // قم بإعادة جلب بيانات شركات الشحن لتحديث القائمة
            getData();
            setIsOpen(false);
        }
    };

        return (
            <div className="p-4">
                <div className="flex justify-between items-center mb-6">
                    <div className="text-xl font-bold">إدارة شركات الشحن</div>
                    {
                        user && hasPermission(user, "addCategories") && (
                            <Button
                                onClick={() => { setEditId(null); setFormData({ manualReceivable: 0, manualPayable: 0 }); setIsOpen(true); }}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                            >
                                إضافة شركة شحن جديدة
                            </Button>
                        )
                    }
                </div>

                <AnimatePresence>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {shipping.map((e: any) => {
                            const settlement = getShippingSettlement(e);
                            return (
                            <motion.div
                                key={e.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm group hover:border-blue-500 transition-all"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-xl text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                                            <button
                                                type="button"
                                                onClick={() => openDetailsModal(e)}
                                                className="text-right hover:text-blue-600 transition-colors"
                                            >
                                                {e.name}
                                            </button>
                                        </h3>
                                        <p className="text-sm text-slate-500 mt-1">
                                            {e.price} سعر الشحن
                                        </p>
                                        <p className="text-xs text-slate-400 mt-2">
                                            عدد الطلبات المرتبطة: {Array.isArray(e.orders) ? e.orders.length : 0}
                                        </p>
                                        <div className="mt-3 space-y-1 border-t border-slate-100 pt-2 dark:border-slate-800">
                                            <p className="text-xs text-slate-500">
                                                مستحق لنا من الشركة: <span className="font-bold text-emerald-600">{formatSiteCurrency(settlement.receivable, currencySettings)}</span>
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                مستحق للشركة علينا: <span className="font-bold text-amber-600">{formatSiteCurrency(settlement.payable, currencySettings)}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        {user && hasPermission(user, "editCategories") && (
                                            <button
                                                onClick={() => handleEdit(e)}
                                                className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-blue-600 hover:bg-blue-600 hover:text-white transition-all"
                                            >
                                                <Edit size={16} />
                                            </button>
                                        )}
                                        {user && hasPermission(user, "deleteCategories") && (
                                            <button
                                                onClick={() => handledelete(e)}
                                                className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                            );
                        })}
                    </div>
                </AnimatePresence>
                <AppModal
                    title={editId ? "تعديل بيانات الفئة" : "إضافة فئة جديدة"}
                    isOpen={isOpen}
                    onClose={handleClose}
                >
                    <div className="p-2 max-h-[80vh]">
                        <DynamicForm
                            schema={shippingSchema}
                            onSubmit={onSubmit}
                            defaultValues={formData}
                            key={editId || 'create'}
                            submitLabel={editId ? 'تحديث البيانات' : 'إرسال البيانات'}
                        >
                            {({ register, formState: { errors } }) => (
                                <div className="grid gap-4">
                                    <FormInput
                                        className='text-gray-800 dark:text-white'
                                        label="اسم الفئة"
                                        {...register("name")}
                                        error={errors.name?.message as string}
                                    />
                                    <FormInput
                                        className='text-gray-800 dark:text-white'
                                        label="سعر الشحن"   
                                        type="number"
                                        step="0.01"
                                        {...register("price", { valueAsNumber: true })}
                                        error={errors.price?.message as string}
                                    />
                                    <FormInput
                                        className='text-gray-800 dark:text-white'
                                        label="مبلغ مستحق لنا من الشركة (يدوي)"
                                        type="number"
                                        step="0.01"
                                        {...register("manualReceivable", { valueAsNumber: true })}
                                        error={errors.manualReceivable?.message as string}
                                    />
                                    <FormInput
                                        className='text-gray-800 dark:text-white'
                                        label="مبلغ مستحق للشركة علينا (يدوي)"
                                        type="number"
                                        step="0.01"
                                        {...register("manualPayable", { valueAsNumber: true })}
                                        error={errors.manualPayable?.message as string}
                                    />
                                </div>
                            )}
                        </DynamicForm>
                    </div>
                </AppModal>

                <AppModal
                    title={`تفاصيل شركة الشحن - ${selectedShipping?.name || ""}`}
                    isOpen={isDetailsOpen}
                    size="xl"
                    onClose={() => {
                        setIsDetailsOpen(false);
                        setSelectedShipping(null);
                    }}
                >
                    <div className="p-4 space-y-4" dir="rtl">
                        {!selectedShipping ? (
                            <div className="text-sm text-slate-500">لا توجد بيانات لعرضها.</div>
                        ) : (
                            <>
                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                                        <div className="text-xs text-slate-500">اسم شركة الشحن</div>
                                        <div className="mt-1 text-lg font-black text-slate-800 dark:text-white">{selectedShipping.name}</div>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                                        <div className="text-xs text-slate-500">سعر الشحن الأساسي</div>
                                        <div className="mt-1 text-lg font-black text-blue-600">{Number(selectedShipping.price || 0).toLocaleString()}</div>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                                        <div className="text-xs text-slate-500">مجموع الطلبات</div>
                                        <div className="mt-1 text-lg font-black text-emerald-600">{selectedShippingTotals.ordersCount.toLocaleString()}</div>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                                        <div className="text-xs text-slate-500">مبلغ الطلبات الكلي</div>
                                        <div className="mt-1 text-lg font-black text-blue-600">{selectedShippingTotals.totalAmount.toLocaleString()}</div>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                                        <div className="text-xs text-slate-500">مبلغ الشحن الكلي</div>
                                        <div className="mt-1 text-lg font-black text-amber-600">{selectedShippingTotals.totalShippingAmount.toLocaleString()}</div>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                                        <div className="text-xs text-slate-500">الفرق بين الطلب والشحن</div>
                                        <div className="mt-1 text-lg font-black text-violet-600">{selectedShippingTotals.totalNetAmount.toLocaleString()}</div>
                                    </div>
                                </div>

                                {selectedShippingSettlement && (
                                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                                        <div className="mb-3 font-black text-slate-800 dark:text-white">
                                            المستحقات مع شركة الشحن
                                            <span className="mr-2 text-xs font-normal text-slate-500">(محسوبة من الطلبات المسلَّمة: {selectedShippingSettlement.deliveredCount.toLocaleString()} طلب + المبالغ اليدوية)</span>
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-3">
                                            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                                                <div className="text-xs text-slate-500">ما نريده من الشركة (مستحق لنا)</div>
                                                <div className="mt-1 text-lg font-black text-emerald-600">{formatSiteCurrency(selectedShippingSettlement.receivable, currencySettings)}</div>
                                                <div className="mt-1 text-[11px] text-slate-400">
                                                    من الطلبات: {formatSiteCurrency(selectedShippingSettlement.autoReceivable, currencySettings)} + يدوي: {formatSiteCurrency(selectedShippingSettlement.manualReceivable, currencySettings)}
                                                </div>
                                            </div>
                                            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
                                                <div className="text-xs text-slate-500">ما تريده الشركة منا (مستحق علينا)</div>
                                                <div className="mt-1 text-lg font-black text-amber-600">{formatSiteCurrency(selectedShippingSettlement.payable, currencySettings)}</div>
                                                <div className="mt-1 text-[11px] text-slate-400">
                                                    من الطلبات: {formatSiteCurrency(selectedShippingSettlement.autoPayable, currencySettings)} + يدوي: {formatSiteCurrency(selectedShippingSettlement.manualPayable, currencySettings)}
                                                </div>
                                            </div>
                                            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-950/20">
                                                <div className="text-xs text-slate-500">صافي الرصيد</div>
                                                <div className={`mt-1 text-lg font-black ${selectedShippingSettlement.net >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                                    {formatSiteCurrency(selectedShippingSettlement.net, currencySettings)}
                                                </div>
                                                <div className="mt-1 text-[11px] text-slate-400">
                                                    {selectedShippingSettlement.net >= 0 ? "الرصيد لصالحنا" : "الرصيد لصالح الشركة"}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                                    <div className="mb-3 font-black text-slate-800 dark:text-white">ملخص الحالات</div>
                                    {selectedShippingStatusSummary.length === 0 ? (
                                        <div className="text-sm text-slate-500">لا توجد طلبات مرتبطة بهذه الشركة.</div>
                                    ) : (
                                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                            {selectedShippingStatusSummary.map((item) => (
                                                <div key={item.status} className="rounded-lg border border-slate-100 p-3 dark:border-slate-800">
                                                    <div className="font-bold text-slate-800 dark:text-slate-100">{item.status}</div>
                                                    <div className="mt-1 text-xs text-slate-500">عدد الطلبات: {item.count.toLocaleString()}</div>
                                                    <div className="text-sm font-black text-blue-600">إجمالي القيمة: {item.totalAmount.toLocaleString()}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                                    <div className="mb-3 font-black text-slate-800 dark:text-white">الطلبات المرتبطة</div>
                                    {selectedShippingOrders.length === 0 ? (
                                        <div className="text-sm text-slate-500">لا توجد طلبات مرتبطة بهذه الشركة.</div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full text-sm">
                                                <thead>
                                                    <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-300">
                                                        <th className="px-3 py-2 text-right">رقم الطلب</th>
                                                        <th className="px-3 py-2 text-right">العميل</th>
                                                        <th className="px-3 py-2 text-right">البائع</th>
                                                        <th className="px-3 py-2 text-right">الحالة</th>
                                                        <th className="px-3 py-2 text-right">مبلغ الطلب الكلي</th>
                                                        <th className="px-3 py-2 text-right">مبلغ الشحن</th>
                                                        <th className="px-3 py-2 text-right">الفرق بعد طرح الشحن</th>
                                                        <th className="px-3 py-2 text-right">المدينة</th>
                                                        <th className="px-3 py-2 text-right">التاريخ</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedShippingOrders.map((order: any) => (
                                                        <tr key={order.id} className="border-b border-slate-100 dark:border-slate-800/70">
                                                            <td className="px-3 py-2 font-bold text-slate-800 dark:text-slate-100">{order.orderNumber}</td>
                                                            <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{order.customer?.name || "-"}</td>
                                                            <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{order.user?.username || "-"}</td>
                                                            <td className="px-3 py-2 font-medium text-slate-700 dark:text-slate-200">{order.status || "-"}</td>
                                                            <td className="px-3 py-2 font-bold text-blue-600">{Number(order.finalAmount || 0).toLocaleString()} {getOrderCurrencySymbol(order)}</td>
                                                            <td className="px-3 py-2 font-bold text-amber-600">{getOrderTotalShippingExpenses(order).toLocaleString()} {getOrderCurrencySymbol(order)}</td>
                                                            <td className="px-3 py-2 font-bold text-violet-600">{getOrderNetAmountAfterShipping(order).toLocaleString()} {getOrderCurrencySymbol(order)}</td>
                                                            <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{order.city || "-"}</td>
                                                            <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{new Date(getOrderDisplayDate(order)).toLocaleDateString("ar-EG")}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </AppModal>
            </div>
        );
    }
