'use server';

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma';

export interface ShopCategorySummary {
  id: number;
  name: string;
  slug: string | null;
  image: string | null;
  productsCount: number;
}

export interface ShopProductSummary {
  id: number;
  name: string;
  description: string | null;
  price: number;
  seoSlug: string | null;
  image: string | null;
  category: {
    id: number;
    name: string;
    slug: string | null;
  } | null;
  discountPercent: number | null;
  quantityDiscountTiers: unknown;
  avgRating: number;
  reviewsCount: number;
}

export interface ShopProductsFilters {
  q?: string;
  category?: string;
  sort?: 'newest' | 'price_asc' | 'price_desc';
  page?: number;
  perPage?: number;
}

export interface ShopProductsResult {
  products: ShopProductSummary[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

// include مشترك لكل استعلامات منتجات المتجر
const shopProductInclude = {
  images: {
    orderBy: { id: 'asc' },
    take: 1,
  },
  category: true,
  landingPage: {
    select: {
      discountPercent: true,
      quantityDiscountTiers: true,
    },
  },
  reviews: {
    where: { isApproved: true },
    select: { rating: true },
  },
} satisfies Prisma.ProductInclude;

type ShopProductWithRelations = Prisma.ProductGetPayload<{ include: typeof shopProductInclude }>;

// تحويل المنتج الخام إلى شكل مختصر مع حساب متوسط التقييم وعدد المراجعات
function mapShopProduct(product: ShopProductWithRelations): ShopProductSummary {
  const reviewsCount = product.reviews.length;
  const avgRating =
    reviewsCount > 0
      ? Number(
          (
            product.reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) /
            reviewsCount
          ).toFixed(1)
        )
      : 0;

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    seoSlug: product.seoSlug,
    image: product.images[0]?.url ?? null,
    category: product.category
      ? {
          id: product.category.id,
          name: product.category.name,
          slug: product.category.slug,
        }
      : null,
    discountPercent: product.landingPage?.discountPercent ?? null,
    quantityDiscountTiers: product.landingPage?.quantityDiscountTiers ?? null,
    avgRating,
    reviewsCount,
  };
}

export async function getShopCategories() {
  try {
    const categories = await prisma.category.findMany({
      where: { isVisible: true },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            products: { where: { isActive: true } },
          },
        },
      },
    });

    const data: ShopCategorySummary[] = categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      image: category.image,
      productsCount: category._count.products,
    }));

    return { success: true, data: JSON.parse(JSON.stringify(data)) as ShopCategorySummary[] };
  } catch (error) {
    console.error('getShopCategories error:', error);
    return { success: false, error: 'فشل في جلب فئات المتجر' };
  }
}

export async function getHomeData() {
  try {
    const now = new Date();

    const [heroSlides, categories, latestProductsRaw, offers] = await Promise.all([
      // نفس منطق getActiveHeroSlides: الفعّالة مرتبة حسب sortOrder
      prisma.heroSlide.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.category.findMany({
        where: { isVisible: true },
        orderBy: { name: 'asc' },
        take: 8,
      }),
      prisma.product.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 12,
        include: shopProductInclude,
      }),
      prisma.offer.findMany({
        where: {
          isActive: true,
          AND: [
            { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
            { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
          ],
        },
        orderBy: { sortOrder: 'asc' },
        take: 3,
      }),
    ]);

    const latestProducts = latestProductsRaw.map(mapShopProduct);

    return {
      success: true,
      data: JSON.parse(
        JSON.stringify({
          heroSlides,
          categories,
          latestProducts,
          offers,
        })
      ) as {
        heroSlides: unknown[];
        categories: unknown[];
        latestProducts: ShopProductSummary[];
        offers: unknown[];
      },
    };
  } catch (error) {
    console.error('getHomeData error:', error);
    return { success: false, error: 'فشل في جلب بيانات الصفحة الرئيسية' };
  }
}

export async function getShopProducts(filters: ShopProductsFilters = {}) {
  try {
    const q = String(filters.q || '').trim();
    const categoryFilter = String(filters.category || '').trim();
    const sort =
      filters.sort === 'price_asc' || filters.sort === 'price_desc' ? filters.sort : 'newest';
    const perPage = Math.min(48, Math.max(1, Math.trunc(Number(filters.perPage) || 12)));
    const page = Math.max(1, Math.trunc(Number(filters.page) || 1));

    const where: Prisma.ProductWhereInput = {
      isActive: true,
    };

    if (q) {
      where.name = { contains: q, mode: 'insensitive' };
    }

    // المطابقة على slug الفئة أولاً مع الرجوع إلى الاسم إن لم يوجد slug
    if (categoryFilter) {
      where.category = {
        OR: [{ slug: categoryFilter }, { name: categoryFilter }],
      };
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      sort === 'price_asc'
        ? { price: 'asc' }
        : sort === 'price_desc'
          ? { price: 'desc' }
          : { createdAt: 'desc' };

    const [total, productsRaw] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
        include: shopProductInclude,
      }),
    ]);

    const result: ShopProductsResult = {
      products: productsRaw.map(mapShopProduct),
      total,
      page,
      perPage,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    };

    return { success: true, data: JSON.parse(JSON.stringify(result)) as ShopProductsResult };
  } catch (error) {
    console.error('getShopProducts error:', error);
    return { success: false, error: 'فشل في جلب منتجات المتجر' };
  }
}

export async function getRelatedProducts(productId: number, categoryId: number | null) {
  try {
    const normalizedProductId = Number(productId);

    if (!Number.isInteger(normalizedProductId) || normalizedProductId <= 0) {
      return { success: false, error: 'معرف المنتج غير صالح' };
    }

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      id: { not: normalizedProductId },
    };

    // إن وُجدت فئة نعرض منتجاتها، وإلا نعرض أحدث المنتجات الأخرى
    if (Number.isInteger(categoryId) && Number(categoryId) > 0) {
      where.categoryId = Number(categoryId);
    }

    const productsRaw = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 4,
      include: shopProductInclude,
    });

    const products = productsRaw.map(mapShopProduct);

    return { success: true, data: JSON.parse(JSON.stringify(products)) as ShopProductSummary[] };
  } catch (error) {
    console.error('getRelatedProducts error:', error);
    return { success: false, error: 'فشل في جلب المنتجات المشابهة' };
  }
}
