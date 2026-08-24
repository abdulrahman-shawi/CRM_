'use client';

import { useEffect } from 'react';

interface AffiliateRefTrackerProps {
  productId: number;
  affiliateCode: string;
}

// تتبع نقرات روابط الأفلييت عند فتح صفحة المنتج عبر ?ref=
// نفس منطق AffiliateProductOrderForm: طلب واحد لكل جلسة/منتج/كود
export default function AffiliateRefTracker({ productId, affiliateCode }: AffiliateRefTrackerProps) {
  useEffect(() => {
    const normalizedCode = String(affiliateCode || '').trim();
    if (!normalizedCode || typeof window === 'undefined') {
      return;
    }

    const trackingKey = `affiliate-track:${productId}:${normalizedCode}`;
    if (window.sessionStorage.getItem(trackingKey) === '1') {
      return;
    }

    window.sessionStorage.setItem(trackingKey, '1');

    void fetch('/api/affiliate/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: normalizedCode,
        productId,
      }),
      credentials: 'same-origin',
    }).catch(() => {
      window.sessionStorage.removeItem(trackingKey);
    });
  }, [affiliateCode, productId]);

  return null;
}
