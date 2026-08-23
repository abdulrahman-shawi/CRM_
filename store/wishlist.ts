import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface WishlistItem {
  productId: number;
  slug: string;
  name: string;
  image: string | null;
  price: number;
}

interface WishlistState {
  items: WishlistItem[];
  toggleItem: (item: WishlistItem) => void;
  removeItem: (productId: number) => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set) => ({
      items: [],

      // يضيف المنتج إن لم يكن موجوداً ويحذفه إن كان موجوداً
      toggleItem: (item) =>
        set((state) => {
          const exists = state.items.some((wishlistItem) => wishlistItem.productId === item.productId);

          if (exists) {
            return {
              items: state.items.filter((wishlistItem) => wishlistItem.productId !== item.productId),
            };
          }

          return { items: [...state.items, item] };
        }),

      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((wishlistItem) => wishlistItem.productId !== productId),
        })),
    }),
    {
      name: 'skynova_wishlist',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// selector: هل المنتج موجود في المفضلة (hook — يجب استدعاؤه بشكل ثابت داخل المكوّن)
export const isInWishlist = (productId: number): boolean =>
  useWishlistStore((state) => state.items.some((wishlistItem) => wishlistItem.productId === productId));

export const useWishlistCount = (): number => useWishlistStore((state) => state.items.length);
