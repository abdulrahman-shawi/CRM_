import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicProductBySlug } from '@/server/product';
import { getRelatedProducts } from '@/server/shop';
import ProductGallery from '@/components/store/ProductGallery';
import ProductPurchasePanel from '@/components/store/ProductPurchasePanel';
import ProductTabs from '@/components/store/ProductTabs';
import AffiliateRefTracker from '@/components/store/AffiliateRefTracker';
import SectionHeader from '@/components/store/SectionHeader';
import ProductCard from '@/components/store/ProductCard';

interface ProductPageProps {
  params: { slug: string };
  searchParams?: { ref?: string | string[] };
}

// الميتا من حقول SEO للمنتج (metaTitle/metaDescription/metaKeywords)
export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const result = await getPublicProductBySlug(params.slug);

  if (!result.success || !result.data) {
    return { title: 'المنتج غير موجود' };
  }

  const product = result.data;

  return {
    title: product.metaTitle || product.name,
    description: product.metaDescription || undefined,
    keywords: product.metaKeywords || undefined,
  };
}

export default async function ProductPage({ params, searchParams }: ProductPageProps) {
  const result = await getPublicProductBySlug(params.slug);

  if (!result.success || !result.data) {
    notFound();
  }

  const product = result.data;

  // كود الأفلييت من ?ref= — يُستخدم لتتبع النقرات فقط
  const affiliateCode = Array.isArray(searchParams?.ref)
    ? String(searchParams.ref[0] || '').trim()
    : String(searchParams?.ref || '').trim();

  const reviews = (Array.isArray(product.reviews) ? product.reviews : []).map((review: any) => ({
    id: Number(review.id),
    name: String(review.name || 'عميل'),
    rating: Number(review.rating || 0),
    comment: review.comment ?? null,
    createdAt: String(review.createdAt || ''),
  }));

  const reviewsCount = reviews.length;
  const avgRating =
    reviewsCount > 0
      ? Number(
          (
            reviews.reduce((sum: number, review: { rating: number }) => sum + review.rating, 0) /
            reviewsCount
          ).toFixed(1)
        )
      : 0;

  const images = (Array.isArray(product.images) ? product.images : [])
    .map((image: any) => ({ id: Number(image.id), url: String(image.url || '') }))
    .filter((image: { id: number; url: string }) => image.url);

  const relatedRes = await getRelatedProducts(product.id, product.category?.id ?? null);
  const relatedProducts =
    relatedRes.success && 'data' in relatedRes ? relatedRes.data ?? [] : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      {affiliateCode && <AffiliateRefTracker productId={product.id} affiliateCode={affiliateCode} />}

      {/* العمودان الرئيسيان: المعرض + معلومات الشراء */}
      <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
        <ProductGallery images={images} productName={product.name} />

        <ProductPurchasePanel
          product={{
            id: product.id,
            name: product.name,
            seoSlug: product.seoSlug,
            price: Number(product.price || 0),
            image: images[0]?.url ?? null,
            discountPercent: product.landingPage?.discountPercent ?? null,
            quantityDiscountTiers: product.landingPage?.quantityDiscountTiers ?? null,
            avgRating,
            reviewsCount,
            category: product.category
              ? {
                  id: product.category.id,
                  name: product.category.name,
                  slug: product.category.slug,
                }
              : null,
          }}
        />
      </div>

      {/* تبويبات الوصف والتقييمات */}
      <div className="mt-12">
        <ProductTabs description={product.description ?? null} reviews={reviews} />
      </div>

      {/* منتجات مشابهة */}
      {relatedProducts.length > 0 && (
        <section className="mt-12">
          <SectionHeader title="منتجات مشابهة" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {relatedProducts.map((relatedProduct) => (
              <ProductCard key={relatedProduct.id} product={relatedProduct} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
