'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, Heart, Menu, Search, ShoppingCart, X } from 'lucide-react';
import { useCartCount } from '@/store/cart';
import { useCartUiStore } from '@/store/cart-ui';
import { useWishlistCount } from '@/store/wishlist';
import type { ShopCategorySummary, StoreSettings } from '@/components/store/types';
import { getCategoryHref } from '@/components/store/types';
import { cn } from '@/lib/utils';

interface StoreHeaderProps {
  settings: StoreSettings;
  categories: ShopCategorySummary[];
}

const NAV_LINKS = [
  { href: '/', label: 'الرئيسية' },
  { href: '/shop', label: 'المتجر' },
];

// شارة عدّاد صغيرة — لا تُعرض قبل التركيب لتجنب hydration mismatch مع localStorage
function CountBadge({ count, mounted }: { count: number; mounted: boolean }) {
  if (!mounted || count <= 0) return null;
  return (
    <span className="absolute -left-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--store-primary)] px-1 text-[10px] font-bold text-white">
      {count > 99 ? '99+' : count}
    </span>
  );
}

export default function StoreHeader({ settings, categories }: StoreHeaderProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const cartCount = useCartCount();
  const wishlistCount = useWishlistCount();
  const openCart = useCartUiStore((state) => state.openCart);

  useEffect(() => setMounted(true), []);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const term = searchTerm.trim();
    router.push(term ? `/shop?q=${encodeURIComponent(term)}` : '/shop');
    setMobileOpen(false);
  };

  const siteName = settings.siteName || 'المتجر';

  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm">
      {/* الشريط العلوي */}
      {settings.topBannerText && (
        <div className="bg-gray-900 py-1.5 text-center text-xs text-gray-200">
          {settings.topBannerText}
        </div>
      )}

      {/* الهيدر الرئيسي */}
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4">
        {/* زر القائمة على الموبايل */}
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label="القائمة"
          className="text-gray-700 md:hidden"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>

        {/* الشعار */}
        <Link href="/" className="flex shrink-0 items-center gap-2">
          {settings.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.logo} alt={siteName} className="h-10 w-auto object-contain" />
          ) : (
            <span className="text-xl font-bold text-gray-900">
              {siteName}
            </span>
          )}
        </Link>

        {/* البحث — سطح المكتب */}
        <form onSubmit={handleSearch} className="mx-auto hidden w-full max-w-xl flex-1 md:flex">
          <div className="flex w-full overflow-hidden rounded-md border border-gray-200 focus-within:border-[var(--store-primary)]">
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="ابحث عن منتج..."
              className="w-full px-4 py-2 text-sm outline-none"
            />
            <button
              type="submit"
              aria-label="بحث"
              className="flex items-center bg-[var(--store-primary)] px-4 text-white transition hover:opacity-90"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
        </form>

        {/* أيقونات المفضلة والسلة */}
        <div className="flex items-center gap-4">
          <Link
            href="/wishlist"
            aria-label="المفضلة"
            className="relative text-gray-600 transition hover:text-[var(--store-primary)]"
          >
            <Heart className="h-6 w-6" />
            <CountBadge count={wishlistCount} mounted={mounted} />
          </Link>
          {/* زر السلة يفتح الدرج الجانبي بدلاً من صفحة مستقلة */}
          <button
            type="button"
            onClick={openCart}
            aria-label="السلة"
            className="relative text-gray-600 transition hover:text-[var(--store-primary)]"
          >
            <ShoppingCart className="h-6 w-6" />
            <CountBadge count={cartCount} mounted={mounted} />
          </button>
        </div>
      </div>

      {/* شريط التنقل — سطح المكتب */}
      <nav className="hidden border-t border-gray-100 md:block">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="border-b-2 border-transparent py-3 text-sm font-medium text-gray-700 transition hover:border-[var(--store-primary)] hover:text-[var(--store-primary)]"
            >
              {link.label}
            </Link>
          ))}

          {categories.length > 0 && (
            <div className="group relative">
              <button
                type="button"
                className="flex items-center gap-1 border-b-2 border-transparent py-3 text-sm font-medium text-gray-700 transition group-hover:border-[var(--store-primary)] group-hover:text-[var(--store-primary)]"
              >
                الفئات
                <ChevronDown className="h-4 w-4" />
              </button>
              <div className="invisible absolute right-0 top-full z-50 min-w-48 rounded-md border border-gray-100 bg-white py-2 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100">
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={getCategoryHref(category)}
                    className="block px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-50 hover:text-[var(--store-primary)]"
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* قائمة الموبايل */}
      <div
        className={cn(
          'overflow-hidden border-t border-gray-100 transition-all duration-300 md:hidden',
          mobileOpen ? 'max-h-[32rem]' : 'max-h-0 border-t-0'
        )}
      >
        <div className="space-y-1 px-4 py-3">
          {/* البحث — موبايل */}
          <form onSubmit={handleSearch} className="mb-3">
            <div className="flex overflow-hidden rounded-md border border-gray-200">
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="ابحث عن منتج..."
                className="w-full px-4 py-2 text-sm outline-none"
              />
              <button
                type="submit"
                aria-label="بحث"
                className="flex items-center bg-[var(--store-primary)] px-4 text-white"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </form>

          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block rounded-md px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 hover:text-[var(--store-primary)]"
            >
              {link.label}
            </Link>
          ))}

          {categories.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setMobileCategoriesOpen((open) => !open)}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                الفئات
                <ChevronDown
                  className={cn('h-4 w-4 transition-transform', mobileCategoriesOpen && 'rotate-180')}
                />
              </button>
              {mobileCategoriesOpen && (
                <div className="mr-3 space-y-1 border-r border-gray-100 pr-3">
                  {categories.map((category) => (
                    <Link
                      key={category.id}
                      href={getCategoryHref(category)}
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-md px-3 py-2 text-sm text-gray-500 transition hover:text-[var(--store-primary)]"
                    >
                      {category.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
