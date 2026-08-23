import { BadgeCheck, Banknote, Headset, Truck } from 'lucide-react';
import { getHomeData, getShopCategories } from '@/server/shop';
import HeroSlider from '@/components/store/HeroSlider';
import SectionHeader from '@/components/store/SectionHeader';
import CategoryCard from '@/components/store/CategoryCard';
import ProductCard from '@/components/store/ProductCard';
import OfferBanner from '@/components/store/OfferBanner';
import type { HeroSlideLike, OfferLike } from '@/components/store/types';

const FEATURES = [
  { icon: Truck, title: 'شحن سريع', description: 'توصيل سريع لجميع الطلبات' },
  { icon: Banknote, title: 'دفع عند الاستلام', description: 'ادفع عند وصول طلبك إليك' },
  { icon: Headset, title: 'دعم متواصل', description: 'فريق دعم جاهز لمساعدتك' },
  { icon: BadgeCheck, title: 'جودة مضمونة', description: 'منتجات أصلية بجودة عالية' },
] as const;

export default async function StoreHomePage() {
  // getShopCategories توفر productsCount الذي لا يرجعه getHomeData للفئات
  const [homeRes, categoriesRes] = await Promise.all([getHomeData(), getShopCategories()]);

  const homeData = homeRes.success && 'data' in homeRes ? homeRes.data : null;
  const slides = ((homeData?.heroSlides ?? []) as HeroSlideLike[]).filter((slide) => slide?.image);
  const latestProducts = homeData?.latestProducts ?? [];
  const offers = ((homeData?.offers ?? []) as OfferLike[]).filter(Boolean);
  const categories = (
    categoriesRes.success && 'data' in categoriesRes ? categoriesRes.data ?? [] : []
  ).slice(0, 8);

  const [firstOffer, ...restOffers] = offers;

  return (
    <div>
      {/* السلايدر الرئيسي */}
      <HeroSlider slides={slides} />

      <div className="mx-auto max-w-7xl px-4">
        {/* الفئات */}
        {categories.length > 0 && (
          <section className="py-12">
            <SectionHeader title="تسوّق حسب الفئة" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {categories.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </div>
          </section>
        )}

        {/* أول عرض */}
        {firstOffer && (
          <section className="pb-12">
            <OfferBanner offer={firstOffer} />
          </section>
        )}

        {/* أحدث المنتجات */}
        {latestProducts.length > 0 && (
          <section className="pb-12">
            <SectionHeader title="أحدث المنتجات" subtitle="تصفّح أحدث ما وصل إلى متجرنا" />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {latestProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        {/* المزايا */}
        <section className="border-t border-gray-100 py-12">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="flex items-center gap-4 rounded-lg border border-gray-100 bg-gray-50/50 p-5"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--store-primary)]/10 text-[var(--store-primary)]">
                  <feature.icon className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{feature.title}</h3>
                  <p className="mt-1 text-xs text-gray-500">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* باقي العروض */}
        {restOffers.length > 0 && (
          <section className="space-y-6 pb-12">
            {restOffers.map((offer) => (
              <OfferBanner key={offer.id} offer={offer} />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
