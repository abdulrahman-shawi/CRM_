import { AppModal } from "@/components/ui/app-modal";
import { useAuth } from "@/context/AuthContext";
import { formatSiteCurrency, getCurrencySymbol, useSiteCurrency } from "@/lib/currency";
import { updateOrder } from "@/server/order";
import { useOrderStore } from "@/store/customer";
import { AnimatePresence, motion } from "framer-motion";
import { Save, Trash2 } from "lucide-react";
import React from "react";
import toast from "react-hot-toast";
import PhoneInput from 'react-phone-number-input'

const formatDateForInput = (dateLike?: string | Date | null) => {
  if (!dateLike) return "";
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

export default function OrderCustomerEdit({ initialData, customers, customerId, products, isOpenOrder, setEditId, setCustomerId, setisOpenOrder, editId, getData }: { initialData?: any, customers: any, customerId: any, products: any, isOpenOrder: any, setEditId: any, setCustomerId: any, setisOpenOrder: any, editId: any, getData: any }) {
  const [items, setItems] = React.useState([
    { productId: "", name: "", price: 0, quantity: 1, discount: 0, note: "", total: 0 }
  ]);
  const { settings } = useSiteCurrency();

  // بيانات المستلم والعنوان
  const [receiverName, setReceiverName] = React.useState("");
  const [receiverPhone, setReceiverPhone] = React.useState<(string | undefined)[]>([""]);
  const [fullAddress, setFullAddress] = React.useState("");
  const [status, setStatus] = React.useState("طلب جديد");

  const [customerSearchQuery, setCustomerSearchQuery] = React.useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = React.useState(false);
  const [overallDiscount, setOverallDiscount] = React.useState(0);
  const [manualCreatedAt, setManualCreatedAt] = React.useState("");
  const [searchQueries, setSearchQueries] = React.useState<Record<number, string>>({});
  const [showDropdown, setShowDropdown] = React.useState<Record<number, boolean>>({});
  const { user } = useAuth()
  const isAdminUser = user?.accountType === "ADMIN";
  const isEditMode = Boolean(editId);

  const currencySymbol = settings?.code === "USD" ? "$" : getCurrencySymbol(settings?.code) || settings?.code || "$";
  const convertUsdToOrderCurrency = (value: number) => Number(value || 0);

  const getProductPricing = (product: any) => {
    return {
      price: convertUsdToOrderCurrency(Number(product?.price || 0)),
      discount: 0,
    };
  };

  React.useEffect(() => {
  if (initialData && isOpenOrder) {
    // تعبئة البيانات عند التعديل
    setItems(initialData.items || []);
    setCustomerId(initialData.customerId || "");
    setReceiverName(initialData.receiverName || "");
    setReceiverPhone(initialData.receiverPhone || [""]);
    setFullAddress(initialData.fullAddress || "");
    setOverallDiscount(Number(initialData?.discount ?? initialData?.overallDiscount ?? 0));
    setStatus(initialData.status || "طلب جديد");
    setManualCreatedAt(formatDateForInput(initialData?.manualCreatedAt || initialData?.createdAt));
  } else if (!initialData && isOpenOrder) {
    // تصفير الحقول عند إضافة طلب جديد
    resetForm();
  }
}, [initialData, isOpenOrder]);
  const addNewItem = () => {
    setItems([...items, { productId: "", name: "", price: 0, quantity: 1, discount: 0, note: "", total: 0 }]);
  };

  const getEffectivePrice = (price: number, discount: number) => {
    return Math.max(0, Number(price || 0) - Number(discount || 0));
  };

  const updateItem = (index: number, field: string, value: any, products: any[]) => {
    const newItems = [...items];
    const item = newItems[index];

    const isDuplicate = items.some((item, i) => item.productId === value && i !== index);

    if (isDuplicate) {
      toast.error("هذا المنتج مضاف بالفعل! يرجى اختيار منتج آخر أو تعديل الكمية.");
      return; // توقف عن التنفيذ ولا تقم بتحديث الحالة
    }

    if (field === "productId") {
      const product = products.find(p => p.id === Number(value));
      const pricing = getProductPricing(product);
      item.productId = value;
      item.name = product?.name || "";
      item.price = pricing.price;
      item.discount = pricing.discount;
      setSearchQueries({ ...searchQueries, [index]: item.name });
      setShowDropdown({ ...showDropdown, [index]: false });
    } else {
      (item as any)[field] = value;
    }

    item.total = getEffectivePrice(item.price, item.discount) * item.quantity;
    setItems(newItems);
  };

  const setGrandTotal = useOrderStore((state) => state.setGrandTotal);

  const subTotal = items.reduce((sum, item) => sum + ((item.price - item.discount) * item.quantity), 0);
  const grandTotal = subTotal - overallDiscount;
  // تحديث المخزن العالمي عند تغير المجموع أو المبلغ المدفوع
  React.useEffect(() => {
    setGrandTotal(grandTotal);
  }, [grandTotal]);

  const resetForm = () => {
    // إغلاق المودال أولاً
    setisOpenOrder(false);

    // إعادة بيانات الطلب والمنتجات
    setStatus("طلب جديد");
    setEditId(null);
    setItems([{ productId: "", name: "", price: 0, quantity: 1, discount: 0, note: "", total: 0 }]);
    setSearchQueries({});
    setShowDropdown({});
    setOverallDiscount(0);

    // إعادة بيانات العميل
    setCustomerId("");
    setCustomerSearchQuery("");
    setShowCustomerDropdown(false);

    // إعادة بيانات المستلم والعنوان
    setReceiverName("");
    setReceiverPhone([""]);
    setFullAddress("");
    setManualCreatedAt("");
  };
  const handleSubmit = async () => {
    // التحقق الأولي
    if (!customerId) {
      toast.error("يرجى اختيار العميل");
      return;
    }

    if (!receiverName || receiverName.trim() === "") {
      toast.error("يرجى تحديد اسم المستلم");
      return;
    }

    if (!fullAddress || fullAddress.trim() === "") {
      toast.error("يرجى كتابة عنوان التسليم");
      return;
    }

    if (items.length === 0 || !items[0].productId) {
      toast.error("يرجى إضافة منتج واحد على الأقل");
      return;
    }

    if (receiverPhone.length === 0 || receiverPhone.some(phone => !phone || phone.length < 10)) {
      toast.error("يرجى إدخال رقم هاتف صحيح");
      return;
    }

    // تصحيح رسالة الـ Toast
    const loadingMessage = "جاري حفظ الطلب الجديد...";
    const loadingToast = toast.loading(loadingMessage);

    const orderData = {
      customerId,
      status,
      receiverName,
      receiverPhone,
      usdToTryRateAtOrder: settings && settings.code !== "USD" && settings.exchangeRate > 0 ? Number(settings.exchangeRate) : 0,
      fullAddress,
      grandTotal: Number(grandTotal),
      overallDiscount: Number(overallDiscount),
      subTotal: Number(subTotal),
      ...(isAdminUser && isEditMode ? { manualCreatedAt: manualCreatedAt || null } : {})
    };

    try {
      let res;
      // // حالة إنشاء طلب جديد
      res = await updateOrder(orderData, editId , items);
      if (res.success) {
        toast.success(editId ? "تم تحديث الطلب بنجاح" : "تم حفظ الطلب بنجاح");

        // تحديث قائمة الطلبات في الواجهة
        getData()

        // إغلاق المودال
        setisOpenOrder(false);

        // تنظيف الحقول
        resetForm();
      } else {
        // عرض الخطأ القادم من السيرفر
        toast.error((res as any).error || "فشل في معالجة الطلب يرجى التأكد من عدد المنتجات أو اسم المنتج");

      }
    } catch (error) {
      console.log("Submit Error:", error);
      toast.error("حدث خطأ غير متوقع في النظام");
    } finally {
      // إنهاء حالة التحميل وإخفاء الـ Toast
      toast.dismiss(loadingToast);
    }
  };


  return (
    <div>
      <AppModal footer={
        <div className="pt-6 w-full flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-wrap gap-3 md:gap-6 items-center justify-center">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-red-500 uppercase px-1">خصم إضافي (كلي)</label>
              <div className="relative">
                <input type="number" value={overallDiscount} onChange={(e) => setOverallDiscount(Number(e.target.value))} className="w-32 bg-red-50 dark:bg-red-900/10 p-3 rounded-2xl border border-red-100 dark:border-red-900/20 outline-none font-bold text-red-600 text-center" placeholder="0" />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400"> {currencySymbol}</span>
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-3 md:px-8 md:py-4 rounded-3xl">
              <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">الإجمالي النهائي</p>
              <h3 className="text-2xl md:text-3xl font-black font-sans text-blue-600 italic"> {formatSiteCurrency(grandTotal, settings)}</h3>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={handleSubmit}
              className={`px-8 md:px-12 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2`}
            >
              <Save size={20} /> حفظ الفاتورة
            </button>
            <button
              onClick={resetForm}
              className="px-8 py-4 bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </div>
      } size='full' isOpen={isOpenOrder} onClose={resetForm} title='اضافة طلب'>
        <div>
          <div className="space-y-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex flex-col gap-2 my-1">
                <label className="text-xs font-bold text-slate-500 mr-2" htmlFor="">العميل /المورد</label>
                <input
                  disabled={true}
                  type="text"
                  // يعرض اسم العميل المختار حالياً أو نص البحث
                  value={customerSearchQuery || customers?.find((c: any) => c.id === customerId)?.name || ""}
                  placeholder="ابحث عن عميل..."
                  onFocus={() => setShowCustomerDropdown(true)}
                  onChange={(e) => {
                    setCustomerSearchQuery(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500 font-bold transition-all"
                />
              </div>
              {isAdminUser && isEditMode && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-500 mr-2">تاريخ الإنشاء (اختياري)</label>
                  <input
                    type="date"
                    value={manualCreatedAt}
                    onChange={(e) => setManualCreatedAt(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                </div>
              )}
            </div>
            {items.map((item: any, index: number) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 items-center">
                <div className="md:col-span-3 relative"> {/* تم إضافة relative هنا لضبط القائمة المنسدلة */}
                  <label className="text-[10px] font-bold text-slate-400 mb-1">المنتج</label>
                  <input
                    type="text"
                    value={searchQueries[index] || item.product?.name || item.name}
                    placeholder="اكتب اسم المنتج..."
                    onFocus={() => setShowDropdown({ ...showDropdown, [index]: true })}
                    onChange={(e) => {
                      setSearchQueries({ ...searchQueries, [index]: e.target.value });
                      setShowDropdown({ ...showDropdown, [index]: true });
                    }}
                    className="w-full text-slate-900 dark:text-slate-50 bg-white dark:bg-slate-900 p-3 rounded-xl border-none outline-none font-bold text-sm shadow-sm"
                  />
                  <AnimatePresence>
                    {showDropdown[index] && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute z-[210] w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                        {products?.filter((p: any) => {
                          // شرط البحث بالاسم
                          const query = (searchQueries[index] || "").toLowerCase();
                          return String(p?.name || "").toLowerCase().includes(query);
                        }
                        ).map((product: any) => {
                          const pricing = getProductPricing(product);
                          return (
                          <div
                            key={product.id}
                            onClick={() => updateItem(index, "productId", product.id.toString(), products)}
                            className="px-4 py-3 hover:bg-blue-50 text-slate-900 dark:text-slate-50 dark:hover:bg-blue-900/20 cursor-pointer text-sm font-bold border-b border-slate-50 dark:border-slate-700 last:border-0"
                          >
                            <div className="flex justify-between items-center">
                              <span className='text-slate-900 dark:text-slate-50'>{product.name}</span>
                            </div>
                            <div className="text-blue-500 text-xs mt-1"> {formatSiteCurrency(getEffectivePrice(pricing.price, pricing.discount), settings)}</div>
                          </div>
                        )})}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="md:col-span-1">
                  <label className="text-[10px] font-bold text-slate-400 mb-1">الكمية</label>
                  <input type="number" value={item.quantity} onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 0, products)} className="w-full text-slate-900 dark:text-slate-50 bg-white dark:bg-slate-900 p-3 rounded-xl text-center font-bold outline-none text-sm shadow-sm" />
                </div>
                <div className="md:col-span-1 text-center">
                  <label className="text-[10px] font-bold text-slate-400 mb-1">السعر</label>
                  <div className="p-3 text-sm font-bold"> {formatSiteCurrency(getEffectivePrice(item.price, item.discount), settings)}</div>
                </div>
                <div className="md:col-span-1">
                  <label className="text-[10px] font-bold text-red-400 mb-1">الخصم</label>
                  <input type="number" value={item.discount} onChange={(e) => updateItem(index, "discount", e.target.value, products)} className="w-full bg-red-50 dark:bg-red-900/10 p-3 rounded-xl text-center font-bold text-red-600 outline-none text-sm border border-red-100 dark:border-red-900/20" />
                </div>
                <div className="md:col-span-4">
                  <label className="text-[10px] font-bold text-slate-400 mb-1">ملاحظات المنتج</label>
                  <input type="text" value={item.note} onChange={(e) => updateItem(index, "note", e.target.value, products)} className="w-full bg-white dark:bg-slate-900 p-3 rounded-xl outline-none text-xs shadow-sm" placeholder="إضافة ملاحظة..." />
                </div>
                <div className="md:col-span-1 text-center font-black text-blue-600 italic"> {formatSiteCurrency((item.price - item.discount) * item.quantity, settings)}</div>
                <div className="md:col-span-1 flex justify-center">
                  <button
                    onClick={() => {
                      // تصفية المصفوفة لحذف العنصر المختار
                      const newItems = items.filter((_, i) => i !== index);
                      setItems(newItems);

                      // تحديث حالات البحث والقوائم المنسدلة المرتبطة بالفهارس (Indices)
                      const newQueries = { ...searchQueries };
                      const newDropdowns = { ...showDropdown };

                      // حذف المفتاح الخاص بالعنصر المحذوف
                      delete newQueries[index];
                      delete newDropdowns[index];

                      // إعادة بناء الكائنات لضمان ترتيب المفاتيح بعد الحذف (اختياري لكنه يحل مشاكل الإزاحة)
                      const resetQueries: Record<number, string> = {};
                      const resetDropdowns: Record<number, boolean> = {};

                      newItems.forEach((_, i) => {
                        // إذا كان الفهرس القديم موجوداً، انقله للفهرس الجديد
                        const oldIndex = i >= index ? i + 1 : i;
                        if (searchQueries[oldIndex]) resetQueries[i] = searchQueries[oldIndex];
                        if (showDropdown[oldIndex]) resetDropdowns[i] = showDropdown[oldIndex];
                      });

                      setSearchQueries(resetQueries);
                      setShowDropdown(resetDropdowns);
                    }}
                    className="text-red-400 hover:text-red-600"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <button onClick={addNewItem} className="flex-1 py-3 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 font-bold text-xs hover:border-blue-500 hover:text-blue-500 transition-all">+ إضافة بند جديد</button>
            </div>
          </div>
          <div className="space-y-8" dir="rtl">
            {/* القسم الأول: بيانات العميل والطلب */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 dark:bg-slate-800/20 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
              {/* معلومات المستلم */}
              <div className="space-y-2 md:col-span-2 relative">
                <label className="text-xs font-bold text-slate-500 mr-2">معلومات المستلم</label>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 mr-2">اسم الشخص المستلم</label>
                <input type="text" value={receiverName} onChange={(e) => setReceiverName(e.target.value)} placeholder="اسم المستلم" className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500">أرقام هواتف المستلم</label>
                {receiverPhone.map((phone: any, index: any) => (
                  <div key={index} className="flex w-full items-start gap-2">
                    <PhoneInput
                      international
                      placeholder="Enter phone number"
                      value={phone}
                      withCountryCallingCode
                      className="w-full min-w-0 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      onChange={(value) => { // القيمة هنا هي الرقم مباشرة وليست e
                        const newPhones = [...receiverPhone];
                        newPhones[index] = value; // نضع القيمة مباشرة
                        setReceiverPhone(newPhones);
                      }}
                      defaultCountry="SY"
                    />

                    {/* زر حذف الحقل إذا كان هناك أكثر من حقل واحد */}
                    {receiverPhone.length > 1 && (
                      <button
                        onClick={() => setReceiverPhone(receiverPhone.filter((_: any, i: any) => i !== index))}
                        className="p-2 text-rose-500 bg-rose-50 rounded-lg"
                      >
                        X
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setReceiverPhone([...receiverPhone, ""])}
                  className="text-xs text-blue-600 font-bold hover:underline"
                >
                  + إضافة رقم هاتف آخر
                </button>
              </div>
            </div>

            {/* القسم الثاني: العنوان التفصيلي */}
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 mr-2">عنوان التسليم التفصيلي</label>
                <input type="text" value={fullAddress} onChange={(e) => setFullAddress(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 p-3.5 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
              </div>
            </div>
          </div>

        </div>
      </AppModal>

    </div>
  )
}
