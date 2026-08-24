'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Minus, Plus, ShoppingCart, Trash2, X } from 'lucide-react';
import { useCartStore, useCartCount, getCartTotals, type CartItem } from '@/store/cart';
import { useCartUiStore } from '@/store/cart-ui';
import { calculateQuantityDiscountPricing } from '@/lib/ad-pricing';
import Price from '@/components/store/Price';
import { cn } from '@/lib/utils';

// إجمالي سطر واحد في السلة بعد تطبيق خصم الكمية
function CartLineTotal({ item }: { item: CartItem }) {
  const pricing = calculateQuantityDiscountPricing(item.price, item.quantity, item.quantityDiscountTiers);
  return <Price amount={pricing.finalAmount} className="text-sm font-bold text-gray-900" />;
}

// درج السلة الجانبي — ينزلق من اليسار فوق أي صفحة (ليست صفحة مستقلة)
export default function CartDrawer() {
  const pathname = usePathname();
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const cartCount = useCartCount();
  const isOpen = useCartUiStore((state) => state.isOpen);
  const closeCart = useCartUiStore((state) => state.closeCart);

  // المتجر persisted في localStorage — ننتظر التركيب لتجنب hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // إغلاق الدرج عند تغيّر المسار
  useEffect(() => {
    closeCart();
  }, [pathname, closeCart]);

  // إغلاق الدرج بزر Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeCart();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeCart]);

  const totals = getCartTotals(mounted ? items : []);
  const hasItems = mounted && items.length > 0;

  return (
    <div
      className={cn('fixed inset-0 z-[60]', !isOpen && 'pointer-events-none')}
      aria-hidden={!isOpen}
    >
      {/* الخلفية المعتمة */}
      <div
        onClick={closeCart}
        className={cn(
          'absolute inset-0 bg-black/50 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0'
        )}
      />

      {/* لوح الدرج المنزلق من اليسار */}
      <aside
        className={cn(
          'absolute left-0 top-0 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        dir="rtl"
        role="dialog"
        aria-label="سلة التسوق"
      >
        {/* رأس الدرج */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
          <h2 className="text-lg font-bold text-gray-900">
            سلة التسوق
            {hasItems && <span className="mr-2 text-sm font-normal text-gray-400">({cartCount} منتج)</span>}
          </h2>
          <button
            type="button"
            onClick={closeCart}
            aria-label="إغلاق السلة"
            className="text-gray-500 transition hover:text-gray-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {hasItems ? (
          <>
            {/* قائمة العناصر */}
            <div className="flex-1 divide-y divide-gray-100 overflow-y-auto px-4">
              {items.map((item) => (
                <div key={item.productId} className="flex gap-3 py-4">
                  <Link
                    href={`/product/${item.slug}`}
                    onClick={closeCart}
                    className="h-20 w-20 shrink-0 overflow-hidden rounded-md border border-gray-100 bg-gray-50"
                  >
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-300">
                        <ShoppingCart className="h-6 w-6" />
                      </div>
                    )}
                  </Link>

                  <div className="flex flex-1 flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/product/${item.slug}`}
                        onClick={closeCart}
                        className="line-clamp-2 text-sm font-semibold text-gray-800 transition hover:text-[var(--store-primary)]"
                      >
                        {item.name}
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        aria-label="حذف المنتج من السلة"
                        className="shrink-0 text-gray-400 transition hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <Price amount={item.price} className="text-xs text-gray-500" />

                    <div className="mt-auto flex items-center justify-between">
                      {/* محكم الكمية */}
                      <div className="flex items-center rounded-md border border-gray-200">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          aria-label="زيادة الكمية"
                          className="flex h-7 w-7 items-center justify-center text-gray-600 transition hover:text-[var(--store-primary)]"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold text-gray-800">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          aria-label="إنقاص الكمية"
                          className="flex h-7 w-7 items-center justify-center text-gray-600 transition hover:text-[var(--store-primary)]"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <CartLineTotal item={item} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* أسفل الدرج: المجاميع والإجراءات */}
            <div className="space-y-3 border-t border-gray-100 px-4 py-4">
              <div className="space-y-1.5 text-sm">
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
                <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-base font-bold text-gray-900">
                  <span>الإجمالي</span>
                  <Price amount={totals.finalTotal} className="text-[var(--store-primary)]" />
                </div>
              </div>

              <Link
                href="/checkout"
                onClick={closeCart}
                className="block rounded-md bg-[var(--store-primary)] px-4 py-3 text-center text-sm font-bold text-white transition hover:opacity-90"
              >
                إتمام الطلب
              </Link>
              <button
                type="button"
                onClick={closeCart}
                className="block w-full text-center text-sm text-gray-500 transition hover:text-[var(--store-primary)]"
              >
                متابعة التسوق
              </button>
            </div>
          </>
        ) : (
          /* حالة الفراغ */
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <ShoppingCart className="h-14 w-14 text-gray-200" />
            <p className="text-lg font-semibold text-gray-700">سلتك فارغة</p>
            <p className="text-sm text-gray-400">لم تقم بإضافة أي منتجات بعد</p>
            <Link
              href="/shop"
              onClick={closeCart}
              className="rounded-md bg-[var(--store-primary)] px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
            >
              تسوّق الآن
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}
