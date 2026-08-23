import Link from 'next/link';
import { Tag } from 'lucide-react';
import type { ShopCategorySummary } from '@/server/shop';
import { getCategoryHref } from '@/components/store/types';

interface CategoryCardProps {
  category: ShopCategorySummary;
}

// بطاقة فئة: صورة دائرية + الاسم + عدد المنتجات
export default function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Link
      href={getCategoryHref(category)}
      className="group flex flex-col items-center gap-3 rounded-lg border border-gray-100 bg-white p-4 text-center transition hover:border-[var(--store-primary)] hover:shadow-md"
    >
      <div className="h-24 w-24 overflow-hidden rounded-full bg-gray-50 ring-1 ring-gray-100 transition group-hover:ring-[var(--store-primary)]">
        {category.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={category.image}
            alt={category.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-300">
            <Tag className="h-8 w-8" />
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-800 transition group-hover:text-[var(--store-primary)]">
          {category.name}
        </p>
        <p className="mt-0.5 text-xs text-gray-400">{category.productsCount} منتج</p>
      </div>
    </Link>
  );
}
