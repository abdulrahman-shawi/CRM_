'use client';

import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWishlistStore, isInWishlist, type WishlistItem } from '@/store/wishlist';
import { cn } from '@/lib/utils';

interface WishlistButtonProps {
  item: WishlistItem;
  className?: string;
}

// زر أيقونة قلب لإضافة/إزالة المنتج من المفضلة
export default function WishlistButton({ item, className }: WishlistButtonProps) {
  const toggleItem = useWishlistStore((state) => state.toggleItem);
  const inWishlist = isInWishlist(item.productId);

  // المتجر persisted في localStorage — ننتظر التركيب لتجنب hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const active = mounted && inWishlist;

  const handleToggle = () => {
    toggleItem(item);
    toast.success(active ? 'تمت الإزالة من المفضلة' : 'تمت الإضافة إلى المفضلة');
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={active ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:border-[var(--store-primary)] hover:text-[var(--store-primary)]',
        active && 'border-[var(--store-primary)] text-[var(--store-primary)]',
        className
      )}
    >
      <Heart className={cn('h-4 w-4', active && 'fill-[var(--store-primary)]')} />
    </button>
  );
}
