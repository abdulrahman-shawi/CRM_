'use client';

import { useState } from 'react';
import RatingStars from '@/components/store/RatingStars';
import { cn } from '@/lib/utils';

export interface ProductReviewItem {
  id: number;
  name: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

interface ProductTabsProps {
  description: string | null;
  reviews: ProductReviewItem[];
}

// تبويبات صفحة المنتج: الوصف (HTML) والتقييمات
export default function ProductTabs({ description, reviews }: ProductTabsProps) {
  const [activeTab, setActiveTab] = useState<'description' | 'reviews'>('description');

  return (
    <div className="rounded-lg border border-gray-100">
      {/* رؤوس التبويبات */}
      <div className="flex border-b border-gray-100">
        <button
          type="button"
          onClick={() => setActiveTab('description')}
          className={cn(
            'border-b-2 px-6 py-3 text-sm font-bold transition',
            activeTab === 'description'
              ? 'border-[var(--store-primary)] text-[var(--store-primary)]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          )}
        >
          الوصف
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('reviews')}
          className={cn(
            'border-b-2 px-6 py-3 text-sm font-bold transition',
            activeTab === 'reviews'
              ? 'border-[var(--store-primary)] text-[var(--store-primary)]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          )}
        >
          التقييمات ({reviews.length})
        </button>
      </div>

      <div className="p-6">
        {activeTab === 'description' ? (
          description ? (
            <div
              className="tiptap-description"
              dangerouslySetInnerHTML={{ __html: description }}
            />
          ) : (
            <p className="text-sm text-gray-400">لا يوجد وصف لهذا المنتج</p>
          )
        ) : reviews.length > 0 ? (
          <ul className="space-y-5">
            {reviews.map((review) => (
              <li key={review.id} className="border-b border-gray-50 pb-5 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-bold text-gray-900">{review.name}</span>
                  <RatingStars rating={review.rating} />
                </div>
                {review.comment && (
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{review.comment}</p>
                )}
                <p className="mt-1 text-xs text-gray-400">
                  {new Date(review.createdAt).toLocaleDateString('ar')}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">لا توجد تقييمات لهذا المنتج بعد</p>
        )}
      </div>
    </div>
  );
}
