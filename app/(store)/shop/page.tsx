import { Suspense } from 'react';
import { PackageSearch } from 'lucide-react';
import { getShopCategories, getShopProducts } from '@/server/shop';
import type { ShopProductsFilters } from '@/server/shop';
import ProductCard from '@/components/store/ProductCard';
import ShopFilters from '@/components/store/ShopFilters';
import Pagination from '@/components/store/Pagination';

interface ShopPageProps {
  searchParams: {
    q?: string;
    category?: string;
    sort?: string;
    page?: string;
  };
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const q = String(searchParams.q ?? '').trim();
  const category = String(searchParams.category ?? '').trim();
  const sort: ShopProductsFilters['sort'] =
    searchParams.sort === 'price_asc' || searchParams.sort === 'price_desc'
      ? searchParams.sort
      : 'newest';
  const page = Math.max(1, Math.trunc(Number(searchParams.page) || 1));

  const [productsRes, categoriesRes] = await Promise.all([
    getShopProducts({ q, category, sort, page }),
    getShopCategories(),
  ]);

  const result =
    productsRes.success && 'data' in productsRes && productsRes.data
      ? productsRes.data
      : { products: [], total: 0, page: 1, perPage: 12, totalPages: 1 };
  const categories = categoriesRes.success && 'data' in categoriesRes ? categoriesRes.data ?? [] : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">المتجر</h1>
        {q && (
          <p className="mt-2 text-sm text-gray-500">
            نتائج البحث عن: <span className="font-semibold text-gray-800">&quot;{q}&quot;</span>
            <span className="mr-2 text-gray-400">({result.total} منتج)</span>
          </p>
        )}
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
        {/* الفلاتر الجانبية */}
        <aside>
          <Suspense fallback={null}>
            <ShopFilters categories={categories} />
          </Suspense>
        </aside>

        {/* شبكة المنتجات */}
        <div>
          {result.products.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {result.products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <Suspense fallback={null}>
                <Pagination page={result.page} totalPages={result.totalPages} />
              </Suspense>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-gray-200 py-20 text-center">
              <PackageSearch className="h-12 w-12 text-gray-300" />
              <p className="text-lg font-semibold text-gray-700">لا توجد منتجات مطابقة</p>
              <p className="text-sm text-gray-400">جرّب تعديل البحث أو الفلاتر المحددة</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
