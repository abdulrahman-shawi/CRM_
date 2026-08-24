'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Banknote, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCartStore, getCartTotals } from '@/store/cart';
import { calculateQuantityDiscountPricing } from '@/lib/ad-pricing';
import Price from '@/components/store/Price';

interface CheckoutFormState {
  customerName: string;
  phone: string;
  receiverName: string;
  country: string;
  city: string;
  municipality: string;
  fullAddress: string;
  deliveryNotes: string;
}

const EMPTY_FORM: CheckoutFormState = {
  customerName: '',
  phone: '',
  receiverName: '',
  country: '',
  city: '',
  municipality: '',
  fullAddress: '',
  deliveryNotes: '',
};

const INPUT_CLASS =
  'w-full rounded-md border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-[var(--store-primary)]';

// صفحة إتمام الطلب: نموذج بيانات العميل + ملخص السلة
export default function CheckoutView() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);

  const [form, setForm] = useState<CheckoutFormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  // المتجر persisted في localStorage — ننتظر التركيب لتجنب hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const updateField = (key: keyof CheckoutFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const totals = getCartTotals(mounted ? items : []);

  const handleSubmit = async () => {
    if (!form.customerName.trim() || !form.phone.trim()) {
      toast.error('يرجى إدخال الاسم الكامل ورقم الهاتف');
      return;
    }

    if (items.length === 0) {
      toast.error('سلتك فارغة');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/shop/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerName: form.customerName.trim(),
          phone: form.phone.trim(),
          receiverName: form.receiverName.trim() || undefined,
          country: form.country.trim() || undefined,
          city: form.city.trim() || undefined,
          municipality: form.municipality.trim() || undefined,
          fullAddress: form.fullAddress.trim() || undefined,
          deliveryNotes: form.deliveryNotes.trim() || undefined,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        toast.error(result?.error || 'تعذر إتمام الطلب، حاول مرة أخرى');
        return;
      }

      clearCart();
      router.push(`/checkout/success?order=${encodeURIComponent(String(result.data.orderNumber))}`);
    } catch {
      toast.error('حدث خطأ غير متوقع أثناء إرسال الطلب');
    } finally {
      setLoading(false);
    }
  };

  // حالة السلة الفارغة (بعد التركيب فقط)
  if (mounted && items.length === 0) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <ShoppingCart className="h-16 w-16 text-gray-200" />
        <h1 className="text-2xl font-bold text-gray-900">سلتك فارغة</h1>
        <p className="text-sm text-gray-500">أضف بعض المنتجات إلى السلة قبل إتمام الطلب</p>
        <Link
          href="/shop"
          className="rounded-md bg-[var(--store-primary)] px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
        >
          تسوّق الآن
        </Link>
      </div>
    );
  }

  if (!mounted) {
    return <div className="mx-auto max-w-7xl px-4 py-24" />;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-bold text-gray-900 md:text-3xl">إتمام الطلب</h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
        {/* نموذج بيانات العميل */}
        <div className="rounded-lg border border-gray-100 p-6">
          <h2 className="mb-5 text-lg font-bold text-gray-900">بيانات التوصيل</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-semibold text-gray-700">
              <span>
                الاسم الكامل <span className="text-red-500">*</span>
              </span>
              <input
                type="text"
                value={form.customerName}
                onChange={(event) => updateField('customerName', event.target.value)}
                className={INPUT_CLASS}
              />
            </label>

            <label className="space-y-1.5 text-sm font-semibold text-gray-700">
              <span>
                رقم الهاتف <span className="text-red-500">*</span>
              </span>
              <input
                type="tel"
                value={form.phone}
                onChange={(event) => updateField('phone', event.target.value)}
                className={INPUT_CLASS}
              />
            </label>

            <label className="space-y-1.5 text-sm font-semibold text-gray-700">
              <span>اسم المستلم</span>
              <input
                type="text"
                value={form.receiverName}
                onChange={(event) => updateField('receiverName', event.target.value)}
                className={INPUT_CLASS}
              />
            </label>

            <label className="space-y-1.5 text-sm font-semibold text-gray-700">
              <span>الدولة</span>
              <input
                type="text"
                value={form.country}
                onChange={(event) => updateField('country', event.target.value)}
                className={INPUT_CLASS}
              />
            </label>

            <label className="space-y-1.5 text-sm font-semibold text-gray-700">
              <span>المدينة</span>
              <input
                type="text"
                value={form.city}
                onChange={(event) => updateField('city', event.target.value)}
                className={INPUT_CLASS}
              />
            </label>

            <label className="space-y-1.5 text-sm font-semibold text-gray-700">
              <span>البلدية</span>
              <input
                type="text"
                value={form.municipality}
                onChange={(event) => updateField('municipality', event.target.value)}
                className={INPUT_CLASS}
              />
            </label>
          </div>

          <label className="mt-4 block space-y-1.5 text-sm font-semibold text-gray-700">
            <span>العنوان الكامل</span>
            <textarea
              value={form.fullAddress}
              onChange={(event) => updateField('fullAddress', event.target.value)}
              className={`${INPUT_CLASS} min-h-24`}
            />
          </label>

          <label className="mt-4 block space-y-1.5 text-sm font-semibold text-gray-700">
            <span>ملاحظات التوصيل</span>
            <textarea
              value={form.deliveryNotes}
              onChange={(event) => updateField('deliveryNotes', event.target.value)}
              className={`${INPUT_CLASS} min-h-20`}
            />
          </label>

          <p className="mt-5 flex items-center gap-2 rounded-md bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
            <Banknote className="h-5 w-5 text-[var(--store-primary)]" />
            الدفع عند الاستلام
          </p>
        </div>

        {/* ملخص الطلب */}
        <aside className="h-fit rounded-lg border border-gray-100 p-6">
          <h2 className="mb-4 text-lg font-bold text-gray-900">ملخص الطلب</h2>

          <ul className="space-y-3 border-b border-gray-100 pb-4">
            {items.map((item) => {
              const linePricing = calculateQuantityDiscountPricing(
                item.price,
                item.quantity,
                item.quantityDiscountTiers
              );

              return (
                <li key={item.productId} className="flex items-center justify-between gap-3 text-sm">
                  <span className="line-clamp-1 text-gray-600">
                    {item.name}
                    <span className="text-gray-400"> × {item.quantity}</span>
                  </span>
                  <Price
                    amount={linePricing.finalAmount}
                    className="shrink-0 font-semibold text-gray-900"
                  />
                </li>
              );
            })}
          </ul>

          <div className="space-y-2 border-b border-gray-100 py-4 text-sm">
            <div className="flex items-center justify-between text-gray-500">
              <span>الإجمالي الفرعي</span>
              <Price amount={totals.subtotal} />
            </div>
            {totals.totalDiscount > 0 && (
              <div className="flex items-center justify-between text-emerald-600">
                <span>خصم الكمية</span>
                <span className="flex items-center gap-1">
                  -
                  <Price amount={totals.totalDiscount} />
                </span>
              </div>
            )}
            <div className="flex items-center justify-between pt-1 text-base font-bold text-gray-900">
              <span>الإجمالي</span>
              <Price amount={totals.finalTotal} className="text-[var(--store-primary)]" />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="mt-4 w-full rounded-md bg-[var(--store-primary)] px-4 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'جاري إرسال الطلب...' : 'تأكيد الطلب'}
          </button>
        </aside>
      </div>
    </div>
  );
}
