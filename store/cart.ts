import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { calculateQuantityDiscountPricing } from '@/lib/ad-pricing';

export interface CartItem {
  productId: number;
  slug: string;
  name: string;
  image: string | null;
  price: number; // سعر الوحدة بالدولار
  quantity: number;
  quantityDiscountTiers?: unknown; // tiers خام من landingPage ليُطبق عليها calculateQuantityDiscountPricing
}

export interface CartTotals {
  subtotal: number;
  totalDiscount: number;
  finalTotal: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],

      // إذا كان المنتج موجوداً في السلة تُدمج الكمية وتُحدَّث بياناته
      addItem: (item, quantity = 1) =>
        set((state) => {
          const safeQuantity = Math.max(1, Math.trunc(Number(quantity) || 1));
          const existing = state.items.find((cartItem) => cartItem.productId === item.productId);

          if (existing) {
            return {
              items: state.items.map((cartItem) =>
                cartItem.productId === item.productId
                  ? { ...cartItem, ...item, quantity: cartItem.quantity + safeQuantity }
                  : cartItem
              ),
            };
          }

          return { items: [...state.items, { ...item, quantity: safeQuantity }] };
        }),

      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((cartItem) => cartItem.productId !== productId),
        })),

      // الكمية صفر أو أقل تعني حذف المنتج من السلة
      updateQuantity: (productId, quantity) =>
        set((state) => {
          const safeQuantity = Math.trunc(Number(quantity) || 0);

          if (safeQuantity <= 0) {
            return {
              items: state.items.filter((cartItem) => cartItem.productId !== productId),
            };
          }

          return {
            items: state.items.map((cartItem) =>
              cartItem.productId === productId ? { ...cartItem, quantity: safeQuantity } : cartItem
            ),
          };
        }),

      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'skynova_cart',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// مجموع الكميات في السلة (لعرض الرقم على أيقونة السلة)
export const useCartCount = (): number =>
  useCartStore((state) => state.items.reduce((sum, cartItem) => sum + cartItem.quantity, 0));

// حساب مجاميع السلة مع تطبيق خصومات الكمية على كل سطر
export function getCartTotals(items: CartItem[]): CartTotals {
  return items.reduce<CartTotals>(
    (totals, cartItem) => {
      const pricing = calculateQuantityDiscountPricing(
        cartItem.price,
        cartItem.quantity,
        cartItem.quantityDiscountTiers
      );

      return {
        subtotal: Number((totals.subtotal + pricing.subtotal).toFixed(2)),
        totalDiscount: Number((totals.totalDiscount + pricing.totalDiscountAmount).toFixed(2)),
        finalTotal: Number((totals.finalTotal + pricing.finalAmount).toFixed(2)),
      };
    },
    { subtotal: 0, totalDiscount: 0, finalTotal: 0 }
  );
}
