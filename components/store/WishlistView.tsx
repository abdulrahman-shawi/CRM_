'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, ImageOff, Trash2 } from 'lucide-react';
import { useWishlistStore } from '@/store/wishlist';
import Price from '@/components/store/Price';
import AddToCartButton from '@/components/store/AddToCartButton';

// عرض قائمة المفضلة: شبكة بطاقات مع إضافة للسلة وحذف
export default function WishlistView() {
  const items = useWishlistStore((state) => state.items);
  const removeItem = useWishlistStore((state) => state.removeItem);

  // المتجر persisted في localStorage — ننتظر التركيب لتجنب hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="mx-auto max-w-7xl px-4 py-10" />;
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <Heart className="h-16 w-16 text-gray-200" />
        <h2 className="text-xl font-bold text-gray-900">قائمة المفضلة فارغة</h2>
        <p className="text-sm text-gray-500">أضف المنتجات التي تعجبك بالضغط على أيقونة القلب</p>
        <Link
          href="/shop"
          className="rounded-md bg-[var(--store-primary)] px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
        >
          تسوّق الآن
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.productId}
          className="flex h-full flex-col overflow-hidden rounded-lg border border-gray-100 bg-white transition hover:shadow-lg"
        >
          <Link
            href={`/product/${item.slug}`}
            className="relative block aspect-square overflow-hidden bg-gray-50"
          >
            {item.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.image}
                alt={item.name}
                className="h-full w-full object-cover transition duration-300 hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-300">
                <ImageOff className="h-10 w-10" />
              </div>
            )}
          </Link>

          <div className="flex flex-1 flex-col gap-2 p-3">
            <Link
              href={`/product/${item.slug}`}
              className="line-clamp-2 text-sm font-semibold text-gray-800 transition hover:text-[var(--store-primary)]"
            >
              {item.name}
            </Link>

            <Price amount={item.price} className="text-base font-bold text-[var(--store-primary)]" />

            <div className="mt-auto flex items-center gap-2 pt-2">
              <AddToCartButton
                product={{
                  productId: item.productId,
                  slug: item.slug,
                  name: item.name,
                  image: item.image,
                  price: item.price,
                }}
                className="flex-1 py-2 text-xs"
              />
              <button
                type="button"
                onClick={() => removeItem(item.productId)}
                aria-label="إزالة من المفضلة"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-gray-200 text-gray-400 transition hover:border-red-200 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
