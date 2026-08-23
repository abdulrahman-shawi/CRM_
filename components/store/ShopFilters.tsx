'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import type { ShopCategorySummary } from '@/server/shop';
import { cn } from '@/lib/utils';

interface ShopFiltersProps {
  categories: ShopCategorySummary[];
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'الأحدث' },
  { value: 'price_asc', label: 'السعر: من الأقل إلى الأعلى' },
  { value: 'price_desc', label: 'السعر: من الأعلى إلى الأقل' },
] as const;

// فلاتر المتجر: الترتيب + قائمة الفئات — تحدّث رابط الصفحة عبر searchParams
export default function ShopFilters({ categories }: ShopFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const activeCategory = searchParams.get('category') ?? '';
  const activeSort = searchParams.get('sort') ?? 'newest';

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    // أي تغيير في الفلاتر يعيد إلى الصفحة الأولى
    params.delete('page');
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const categoryValue = (category: ShopCategorySummary) => category.slug ?? category.name;

  const filtersContent = (
    <div className="space-y-6">
      {/* الترتيب */}
      <div>
        <label htmlFor="shop-sort" className="mb-2 block text-sm font-semibold text-gray-800">
          الترتيب حسب
        </label>
        <select
          id="shop-sort"
          value={SORT_OPTIONS.some((option) => option.value === activeSort) ? activeSort : 'newest'}
          onChange={(event) => updateParams({ sort: event.target.value === 'newest' ? null : event.target.value })}
          className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--store-primary)]"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* الفئات */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-800">الفئات</h3>
        <ul className="space-y-1">
          <li>
            <button
              type="button"
              onClick={() => updateParams({ category: null })}
              className={cn(
                'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition',
                activeCategory === ''
                  ? 'bg-[var(--store-primary)]/10 font-semibold text-[var(--store-primary)]'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-[var(--store-primary)]'
              )}
            >
              الكل
            </button>
          </li>
          {categories.map((category) => {
            const value = categoryValue(category);
            const isActive = activeCategory === value;
            return (
              <li key={category.id}>
                <button
                  type="button"
                  onClick={() => updateParams({ category: isActive ? null : value })}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition',
                    isActive
                      ? 'bg-[var(--store-primary)]/10 font-semibold text-[var(--store-primary)]'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-[var(--store-primary)]'
                  )}
                >
                  <span>{category.name}</span>
                  <span className="text-xs text-gray-400">({category.productsCount})</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );

  return (
    <>
      {/* زر طي الفلاتر على الموبايل */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="mb-4 flex w-full items-center justify-between rounded-md border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 lg:hidden"
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          الفلاتر
        </span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>

      <div className={cn('lg:block', open ? 'block' : 'hidden')}>{filtersContent}</div>
    </>
  );
}
