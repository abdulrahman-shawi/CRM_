import React from 'react';
import toast from 'react-hot-toast';
import { createOrder, updateOrder } from '@/server/order';

interface OrderFormItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  discount: number;
  note: string;
  total: number;
}

interface OrderFormData {
  customerId: string;
  receiverName: string;
  receiverPhone: (string | undefined)[];
  fullAddress: string;
  overallDiscount: number;
  status: string;
}

export const useOrderForm = (userId?: string) => {
  // بيانات الطلب
  const [items, setItems] = React.useState<OrderFormItem[]>([
    { productId: "", name: "", price: 0, quantity: 1, discount: 0, note: "", total: 0 }
  ]);

  // بيانات العميل والمبالغ
  const [customerId, setCustomerId] = React.useState("");

  // بيانات المستلم والعنوان
  const [receiverName, setReceiverName] = React.useState("");
  const [receiverPhone, setReceiverPhone] = React.useState<(string | undefined)[]>([""]); 
  const [fullAddress, setFullAddress] = React.useState("");

  // حالة الطلب والتعديل
  const [status, setStatus] = React.useState("طلب جديد");
  const [editId, setEditId] = React.useState<string | number | null>(null);
  const [overallDiscount, setOverallDiscount] = React.useState(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // بحث العميل
  const [customerSearchQuery, setCustomerSearchQuery] = React.useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = React.useState(false);

  // حقول البحث والفلاتر
  const [searchQueries, setSearchQueries] = React.useState<Record<number, string>>({});
  const [showDropdown, setShowDropdown] = React.useState<Record<number, boolean>>({});

  // حساب الإجماليات
  const subTotal = items.reduce((sum, i) => sum + i.total, 0);
  const grandTotal = subTotal - overallDiscount;

  // التحقق من صحة النموذج
  const validateForm = (): boolean => {
    if (!customerId) {
      toast.error("يرجى اختيار العميل");
      return false;
    }

    if (items.length === 0 || !items[0].productId) {
      toast.error("يرجى إضافة منتج واحد على الأقل");
      return false;
    }

    if (!receiverName || receiverName.trim() === "") {
      toast.error("يرجى تحديد اسم المستلم");
      return false;
    }

    if (receiverPhone.length === 0 || receiverPhone.some(phone => !phone || String(phone).trim().length < 10)) {
      toast.error("يرجى إدخال رقم هاتف صحيح");
      return false;
    }

    return true;
  };

  // إرسال النموذج
  const handleSubmit = async (): Promise<boolean> => {
    if (!validateForm()) return false;

    setIsSubmitting(true);
    const loadingMessage = editId ? "جاري تعديل الطلب..." : "جاري حفظ الطلب الجديد...";
    const loadingToast = toast.loading(loadingMessage);

    const orderData = {
      customerId,
      status,
      receiverName,
      receiverPhone,
      fullAddress,
      grandTotal: Number(grandTotal),
      overallDiscount: Number(overallDiscount),
      subTotal: Number(subTotal)
    };

    try {
      let res;
      if (editId) {
        res = await updateOrder(orderData, editId, items);
      } else {
        res = await createOrder(orderData, items, userId);
      }

      if (res.success) {
        toast.success(editId ? "تم تحديث الطلب بنجاح" : "تم حفظ الطلب بنجاح");
        setIsSubmitting(false);
        toast.dismiss(loadingToast);
        return true;
      } else {
        toast.error((res as any)?.message || "فشل في معالجة الطلب");
        setIsSubmitting(false);
        toast.dismiss(loadingToast);
        return false;
      }
    } catch (error) {
      console.error("Submit Error:", error);
      toast.error("حدث خطأ غير متوقع في النظام");
      setIsSubmitting(false);
      toast.dismiss(loadingToast);
      return false;
    }
  };

  // إعادة تعيين النموذج
  const resetForm = () => {
    setStatus("طلب جديد");
    setEditId(null);
    setItems([{ productId: "", name: "", price: 0, quantity: 1, discount: 0, note: "", total: 0 }]);
    setSearchQueries({});
    setShowDropdown({});
    setOverallDiscount(0);

    setCustomerId("");
    setCustomerSearchQuery("");
    setShowCustomerDropdown(false);

    setReceiverName("");
    setReceiverPhone([""]);
    setFullAddress("");
  };

  // تحميل بيانات الطلب للتعديل
  const loadOrderForEdit = (data: any) => {
    const normalizedItems = (Array.isArray(data?.items) ? data.items : []).map((item: any) => {
      const price = Number(item?.price ?? item?.product?.stocks?.[0]?.price ?? 0);
      const quantity = Number(item?.quantity ?? 1);
      const discount = Number(item?.discount ?? 0);
      const productId = String(item?.productId ?? item?.product?.id ?? "");
      return {
        productId,
        name: item?.product?.name || item?.name || "",
        price,
        quantity,
        discount,
        note: item?.note || "",
        total: Math.max(0, Number(price || 0) - Number(discount || 0)) * quantity,
      };
    });

    const nextItems = normalizedItems.length > 0
      ? normalizedItems
      : [{ productId: "", name: "", price: 0, quantity: 1, discount: 0, note: "", total: 0 }];

    const nextSearchQueries = nextItems.reduce((acc: Record<number, string>, item: any, index: number) => {
      acc[index] = item.name || "";
      return acc;
    }, {});

    setEditId(data?.id ?? null);
    setItems(nextItems);
    setSearchQueries(nextSearchQueries);
    setShowDropdown({});

    setCustomerId(String(data?.customerId || ""));
    setCustomerSearchQuery(data?.customer?.name || "");
    setStatus(data?.status || "طلب جديد");

    setReceiverName(data?.receiverName || "");
    setReceiverPhone(Array.isArray(data?.receiverPhone) ? data.receiverPhone : [data?.receiverPhone || ""]);
    setFullAddress(data?.fullAddress || "");
    setOverallDiscount(Number(data?.discount ?? 0));
  };

  return {
    // الحالات
    items,
    setItems,
    customerId,
    setCustomerId,
    receiverName,
    setReceiverName,
    receiverPhone,
    setReceiverPhone,
    fullAddress,
    setFullAddress,
    status,
    setStatus,
    editId,
    setEditId,
    overallDiscount,
    setOverallDiscount,
    isSubmitting,
    customerSearchQuery,
    setCustomerSearchQuery,
    showCustomerDropdown,
    setShowCustomerDropdown,
    searchQueries,
    setSearchQueries,
    showDropdown,
    setShowDropdown,

    // الحسابات
    subTotal,
    grandTotal,

    // الدوال
    handleSubmit,
    resetForm,
    loadOrderForEdit,
    validateForm,
  };
};
