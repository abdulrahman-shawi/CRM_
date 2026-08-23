import Link from 'next/link';
import { Facebook, Instagram, Mail, Phone } from 'lucide-react';
import type { StorePageLink, StoreSettings } from '@/components/store/types';

interface StoreFooterProps {
  settings: StoreSettings;
  pages: StorePageLink[];
}

const QUICK_LINKS = [
  { href: '/', label: 'الرئيسية' },
  { href: '/shop', label: 'المتجر' },
  { href: '/cart', label: 'السلة' },
  { href: '/wishlist', label: 'المفضلة' },
];

export default function StoreFooter({ settings, pages }: StoreFooterProps) {
  const siteName = settings.siteName || 'المتجر';
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 bg-gray-900 text-gray-300">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        {/* عن المتجر */}
        <div>
          <h3 className="mb-4 text-lg font-bold text-white">{siteName}</h3>
          {settings.siteDescription && (
            <p className="text-sm leading-7 text-gray-400">{settings.siteDescription}</p>
          )}
          <div className="mt-4 flex items-center gap-3">
            {settings.facebookUrl && (
              <a
                href={settings.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="فيسبوك"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-800 text-gray-300 transition hover:bg-[var(--store-primary)] hover:text-white"
              >
                <Facebook className="h-4 w-4" />
              </a>
            )}
            {settings.instagramUrl && (
              <a
                href={settings.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="إنستغرام"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-800 text-gray-300 transition hover:bg-[var(--store-primary)] hover:text-white"
              >
                <Instagram className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>

        {/* روابط سريعة */}
        <div>
          <h3 className="mb-4 text-lg font-bold text-white">روابط سريعة</h3>
          <ul className="space-y-2 text-sm">
            {QUICK_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="transition hover:text-[var(--store-primary)]">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* الصفحات */}
        <div>
          <h3 className="mb-4 text-lg font-bold text-white">صفحات</h3>
          {pages.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {pages.map((page) => (
                <li key={page.slug}>
                  <Link href={`/${page.slug}`} className="transition hover:text-[var(--store-primary)]">
                    {page.title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">لا توجد صفحات منشورة</p>
          )}
        </div>

        {/* تواصل */}
        <div>
          <h3 className="mb-4 text-lg font-bold text-white">تواصل معنا</h3>
          <ul className="space-y-3 text-sm">
            {settings.companyEmail && (
              <li>
                <a
                  href={`mailto:${settings.companyEmail}`}
                  className="flex items-center gap-2 transition hover:text-[var(--store-primary)]"
                >
                  <Mail className="h-4 w-4 shrink-0" />
                  <span dir="ltr">{settings.companyEmail}</span>
                </a>
              </li>
            )}
            {settings.companyPhone && (
              <li>
                <a
                  href={`tel:${settings.companyPhone}`}
                  className="flex items-center gap-2 transition hover:text-[var(--store-primary)]"
                >
                  <Phone className="h-4 w-4 shrink-0" />
                  <span dir="ltr">{settings.companyPhone}</span>
                </a>
              </li>
            )}
            {!settings.companyEmail && !settings.companyPhone && (
              <li className="text-gray-500">يسعدنا تواصلكم عبر صفحاتنا الاجتماعية</li>
            )}
          </ul>
        </div>
      </div>

      {/* الشريط السفلي */}
      <div className="border-t border-gray-800 py-4 text-center text-xs text-gray-500">
        © {year} {siteName} — جميع الحقوق محفوظة
      </div>
    </footer>
  );
}
