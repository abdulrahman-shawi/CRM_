'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Banknote, Minus, Plus, Zap } from 'lucide-react';
import { normalizeQuantityDiscountTiers } from '@/lib/ad-pricing';
import { useCartStore } from '@/store/cart';
import Price from '@/components/store/Price';
import RatingStars from '@/components/store/RatingStars';
import AddToCartButton from '@/components/store/AddToCartButton';
import WishlistButton from '@/components/store/WishlistButton';

export interface ProductPurchasePanelProduct {
  id: number;
  name: string;
  seoSlug: string | null;
  price: number;
  image: string | null;
  discountPercent: number | null;
  quantityDiscountTiers: unknown;
  avgRating: number;
  reviewsCount: number;
  category: { id: number; name: string; slug: string | null } | null;
}

interface ProductPurchasePanelProps {
  product: ProductPurchasePanelProduct;
}

// لوحة الشراء في صفحة المنتج: الاسم، التقييم، السعر، شرائح الخصم، الكمية وأزرار الشراء
export default function ProductPurchasePanel({ product }: ProductPurchasePanelProps) {
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);
  const [quantity, setQuantity] = useState(1);

  const slug = product.seoSlug ?? String(product.id);
  const discountPercent =
    product.discountPercent && product.discountPercent > 0 ? product.discountPercent : null;
  const discountedPrice = discountPercent
    ? Number((product.price * (1 - discountPercent / 100)).toFixed(2))
    : product.price;

  const tiers = useMemo(
    () => normalizeQuantityDiscountTiers(product.quantityDiscountTiers),
    [product.quantityDiscountTiers]
  );

  const decrease = () => setQuantity((current) => Math.max(1, current - 1));
  const increase = () => setQuantity((current) => current + 1);

  // شراء فوري: إضافة للسلة ثم الانتقال مباشرة إلى checkout
  const handleBuyNow = () => {
    addItem(
      {
        productId: product.id,
        slug,
        name: product.name,
        image: product.image,
        price: product.price,
        quantityDiscountTiers: product.quantityDiscountTiers,
      },
      quantity
    );
    router.push('/checkout');
  };

  return (
    <div className="space-y-4">
      {product.category && (
        <Link
          href={`/shop?category=${encodeURIComponent(product.category.slug ?? product.category.name)}`}
          className="text-sm text-gray-400 transition hover:text-[var(--store-primary)]"
        >
          {product.category.name}
        </Link>
      )}

      <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">{product.name}</h1>

      <RatingStars rating={product.avgRating} count={product.reviewsCount} />

      {/* السعر مع السعر المشطوب عند وجود خصم */}
      <div className="flex items-center gap-3">
        <Price
          amount={discountedPrice}
          className="text-3xl font-bold text-[var(--store-primary)]"
        />
        {discountPercent && (
          <>
            <Price amount={product.price} className="text-lg text-gray-400 line-through" />
            <span className="rounded-full bg-[var(--store-primary)] px-2.5 py-1 text-xs font-bold text-white">
              خصم {discountPercent}%
            </span>
          </>
        )}
      </div>

      {/* شرائح خصم الكمية */}
      {tiers.length > 0 && (
        <div className="rounded-lg border border-dashed border-[var(--store-primary)]/50 bg-[var(--store-primary)]/5 p-4">
          <p className="mb-2 text-sm font-bold text-gray-900">خصومات الكمية</p>
          <ul className="space-y-1 text-sm text-gray-600">
            {tiers.map((tier) => (
              <li key={`${tier.minQuantity}-${tier.discountPercent}`}>
                اشترِ {tier.minQuantity} فأكثر ← خصم {tier.discountPercent}%
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* محكم الكمية + أزرار الشراء */}
      <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
        <div className="flex items-center rounded-md border border-gray-200">
          <button
            type="button"
            onClick={increase}
            aria-label="زيادة الكمية"
            className="flex h-10 w-10 items-center justify-center text-gray-600 transition hover:text-[var(--store-primary)]"
          >
            <Plus className="h-4 w-4" />
          </button>
          <span className="w-10 text-center text-base font-bold text-gray-900">{quantity}</span>
          <button
            type="button"
            onClick={decrease}
            aria-label="إنقاص الكمية"
            className="flex h-10 w-10 items-center justify-center text-gray-600 transition hover:text-[var(--store-primary)]"
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>

        <AddToCartButton
          product={{
            productId: product.id,
            slug,
            name: product.name,
            image: product.image,
            price: product.price,
            quantityDiscountTiers: product.quantityDiscountTiers,
          }}
          quantity={quantity}
          className="flex-1 py-2.5"
        />

        <WishlistButton
          item={{
            productId: product.id,
            slug,
            name: product.name,
            image: product.image,
            price: product.price,
          }}
          className="h-10 w-10 rounded-md"
        />
      </div>

      <button
        type="button"
        onClick={handleBuyNow}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md border-2 border-[var(--store-primary)] px-4 py-2.5 text-sm font-bold text-[var(--store-primary)] transition hover:bg-[var(--store-primary)] hover:text-white"
      >
        <Zap className="h-4 w-4" />
        <span>اشترِ الآن</span>
      </button>

      <p className="flex items-center gap-2 text-sm text-gray-500">
        <Banknote className="h-4 w-4 text-[var(--store-primary)]" />
        الدفع عند الاستلام
      </p>
    </div>
  );
}
