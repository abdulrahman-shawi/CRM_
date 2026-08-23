import Link from 'next/link';
import type { OfferLike } from '@/components/store/types';

interface OfferBannerProps {
  offer: OfferLike;
}

// بانر عرض: صورة خلفية إن وُجدت وإلا تدرّج بلون المتجر الأساسي
export default function OfferBanner({ offer }: OfferBannerProps) {
  return (
    <section className="relative overflow-hidden rounded-xl">
      {offer.image ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={offer.image}
            alt={offer.title ?? 'عرض'}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/45" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-l from-[var(--store-primary)] to-gray-900" />
      )}

      <div className="relative flex min-h-[220px] flex-col items-start justify-center gap-3 p-8 md:p-12">
        {offer.badgeText && (
          <span className="rounded-full bg-[var(--store-primary)] px-3 py-1 text-xs font-bold text-white">
            {offer.badgeText}
          </span>
        )}
        {offer.title && (
          <h3 className="max-w-xl text-2xl font-bold text-white md:text-3xl">{offer.title}</h3>
        )}
        {offer.subtitle && (
          <p className="max-w-xl text-sm text-gray-200 md:text-base">{offer.subtitle}</p>
        )}
        {offer.ctaText && offer.ctaLink && (
          <Link
            href={offer.ctaLink}
            className="mt-1 inline-flex items-center rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-[var(--store-primary)] hover:text-white"
          >
            {offer.ctaText}
          </Link>
        )}
      </div>
    </section>
  );
}
