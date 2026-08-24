'use client';

import { ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCartStore } from '@/store/cart';
import { useCartUiStore } from '@/store/cart-ui';
import { cn } from '@/lib/utils';

interface AddToCartButtonProps {
  product: {
    productId: number;
    slug: string;
    name: string;
    image: string | null;
    price: number;
    quantityDiscountTiers?: unknown;
  };
  quantity?: number;
  label?: string;
  className?: string;
}

// زر إضافة للسلة قابل لإعادة الاستخدام (بطاقة المنتج، صفحة المنتج، ...)
export default function AddToCartButton({
  product,
  quantity = 1,
  label = 'أضف إلى السلة',
  className,
}: AddToCartButtonProps) {
  const addItem = useCartStore((state) => state.addItem);
  const openCart = useCartUiStore((state) => state.openCart);

  const handleAdd = () => {
    addItem(
      {
        productId: product.productId,
        slug: product.slug,
        name: product.name,
        image: product.image,
        price: product.price,
        quantityDiscountTiers: product.quantityDiscountTiers,
      },
      quantity
    );
    toast.success('تمت إضافة المنتج إلى السلة');
    // فتح درج السلة تلقائياً بعد الإضافة (سلوك Molla القياسي)
    openCart();
  };

  return (
    <button
      type="button"
      onClick={handleAdd}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md bg-[var(--store-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90',
        className
      )}
    >
      <ShoppingCart className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}
