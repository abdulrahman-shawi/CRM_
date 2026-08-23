// أنواع مشتركة لمكونات المتجر — الحقول الممررة من الإعدادات والبيانات العامة (JSON-serializable)
import type { ShopCategorySummary, ShopProductSummary } from '@/server/shop';

export type { ShopCategorySummary, ShopProductSummary };

export interface StoreSettings {
  siteName?: string | null;
  siteDescription?: string | null;
  logo?: string | null;
  topBannerText?: string | null;
  primaryColor?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  companyEmail?: string | null;
  companyPhone?: string | null;
}

export interface HeroSlideLike {
  id: string;
  title?: string | null;
  subtitle?: string | null;
  image: string;
  buttonText?: string | null;
  buttonLink?: string | null;
}

export interface OfferLike {
  id: string;
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  badgeText?: string | null;
  image?: string | null;
  ctaText?: string | null;
  ctaLink?: string | null;
}

export interface StorePageLink {
  slug: string;
  title: string;
}

// رابط صفحة المنتج الموحد في المتجر
export function getProductHref(product: Pick<ShopProductSummary, 'id' | 'seoSlug'>): string {
  return `/product/${product.seoSlug ?? product.id}`;
}

// رابط فئة في صفحة المتجر
export function getCategoryHref(category: Pick<ShopCategorySummary, 'slug' | 'name'>): string {
  return `/shop?category=${encodeURIComponent(category.slug ?? category.name)}`;
}
