'use client';

import Link from 'next/link';
import { ImageOff } from 'lucide-react';
import type { ShopProductSummary } from '@/server/shop';
import { getProductHref } from '@/components/store/types';
import Price from '@/components/store/Price';
import RatingStars from '@/components/store/RatingStars';
import AddToCartButton from '@/components/store/AddToCartButton';
import WishlistButton from '@/components/store/WishlistButton';

interface ProductCardProps {
  product: ShopProductSummary;
}

// بطاقة منتج بأسلوب Molla: صورة + أزرار تظهر عند hover
export default function ProductCard({ product }: ProductCardProps) {
  const href = getProductHref(product);
  const discountPercent =
    product.discountPercent && product.discountPercent > 0 ? product.discountPercent : null;
  const discountedPrice = discountPercent
    ? Number((product.price * (1 - discountPercent / 100)).toFixed(2))
    : product.price;

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-lg border border-gray-100 bg-white transition hover:shadow-lg">
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <Link href={href} className="block h-full w-full">
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image}
              alt={product.name}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-300">
              <ImageOff className="h-10 w-10" />
            </div>
          )}
        </Link>

        {discountPercent && (
          <span className="absolute right-2 top-2 rounded-full bg-[var(--store-primary)] px-2 py-0.5 text-xs font-bold text-white">
            -{discountPercent}%
          </span>
        )}

        {/* أيقونة المفضلة تظهر عند hover */}
        <div className="absolute left-2 top-2 opacity-0 transition duration-300 group-hover:opacity-100">
          <WishlistButton
            item={{
              productId: product.id,
              slug: product.seoSlug ?? String(product.id),
              name: product.name,
              image: product.image,
              price: product.price,
            }}
          />
        </div>

        {/* زر الإضافة للسلة ينزلق من الأسفل عند hover */}
        <div className="absolute inset-x-2 bottom-2 translate-y-3 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <AddToCartButton
            product={{
              productId: product.id,
              slug: product.seoSlug ?? String(product.id),
              name: product.name,
              image: product.image,
              price: product.price,
              quantityDiscountTiers: product.quantityDiscountTiers,
            }}
            className="w-full py-2 text-xs"
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        {product.category && (
          <Link
            href={`/shop?category=${encodeURIComponent(product.category.slug ?? product.category.name)}`}
            className="text-xs text-gray-400 transition hover:text-[var(--store-primary)]"
          >
            {product.category.name}
          </Link>
        )}

        <Link
          href={href}
          className="line-clamp-2 text-sm font-semibold text-gray-800 transition hover:text-[var(--store-primary)]"
        >
          {product.name}
        </Link>

        <RatingStars rating={product.avgRating} count={product.reviewsCount} />

        <div className="mt-auto flex items-center gap-2 pt-1">
          <Price
            amount={discountedPrice}
            className="text-base font-bold text-[var(--store-primary)]"
          />
          {discountPercent && (
            <Price amount={product.price} className="text-xs text-gray-400 line-through" />
          )}
        </div>
      </div>
    </div>
  );
}
