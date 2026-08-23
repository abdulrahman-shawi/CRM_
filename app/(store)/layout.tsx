import type { CSSProperties, ReactNode } from 'react';
import { getGeneralSettings } from '@/server/general-settings';
import { getShopCategories, type ShopCategorySummary } from '@/server/shop';
import { getPublishedPages } from '@/server/page';
import StoreHeader from '@/components/store/StoreHeader';
import StoreFooter from '@/components/store/StoreFooter';
import type { StorePageLink, StoreSettings } from '@/components/store/types';

const DEFAULT_PRIMARY_COLOR = '#fcb941';

// Layout المتجر: هيدر + فوتر مع حقن اللون الأساسي كمتغير CSS
export default async function StoreLayout({ children }: { children: ReactNode }) {
  let settings: StoreSettings = {};
  let categories: ShopCategorySummary[] = [];
  let pages: StorePageLink[] = [];

  // أي فشل في الجلب لا يكسر الصفحة — نستخدم القيم الافتراضية
  try {
    const settingsRes = await getGeneralSettings();
    if (settingsRes.success && 'data' in settingsRes && settingsRes.data) {
      const data = settingsRes.data;
      // نمرر فقط الحقول اللازمة (JSON-serializable)
      settings = {
        siteName: data.siteName,
        siteDescription: data.siteDescription,
        logo: data.logo,
        topBannerText: data.topBannerText,
        primaryColor: data.primaryColor,
        facebookUrl: data.facebookUrl,
        instagramUrl: data.instagramUrl,
        companyEmail: data.companyEmail,
        companyPhone: data.companyPhone,
      };
    }
  } catch (error) {
    console.error('StoreLayout settings error:', error);
  }

  try {
    const categoriesRes = await getShopCategories();
    if (categoriesRes.success && 'data' in categoriesRes && categoriesRes.data) {
      categories = categoriesRes.data;
    }
  } catch (error) {
    console.error('StoreLayout categories error:', error);
  }

  try {
    const pagesRes = await getPublishedPages();
    if (pagesRes.success && 'data' in pagesRes && Array.isArray(pagesRes.data)) {
      pages = pagesRes.data.map((page: { slug: string; title: string }) => ({
        slug: page.slug,
        title: page.title,
      }));
    }
  } catch (error) {
    console.error('StoreLayout pages error:', error);
  }

  const primaryColor = settings.primaryColor || DEFAULT_PRIMARY_COLOR;

  return (
    <div
      dir="rtl"
      style={{ '--store-primary': primaryColor } as CSSProperties}
      className="flex min-h-screen flex-col bg-white text-gray-800"
    >
      <StoreHeader settings={settings} categories={categories} />
      <main className="flex-1">{children}</main>
      <StoreFooter settings={settings} pages={pages} />
    </div>
  );
}
