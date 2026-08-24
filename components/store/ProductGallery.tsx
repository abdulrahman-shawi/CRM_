'use client';

import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductGalleryProps {
  images: Array<{ id: number; url: string }>;
  productName: string;
}

// معرض صور المنتج: صورة رئيسية + شريط مصغرات قابل للنقر
export default function ProductGallery({ images, productName }: ProductGalleryProps) {
  const gallery = images.filter((image) => image.url);
  const [activeIndex, setActiveIndex] = useState(0);

  if (gallery.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-lg border border-gray-100 bg-gray-50 text-gray-300">
        <ImageOff className="h-16 w-16" />
      </div>
    );
  }

  const activeImage = gallery[Math.min(activeIndex, gallery.length - 1)];

  return (
    <div className="space-y-3">
      {/* الصورة الرئيسية */}
      <div className="overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={activeImage.url}
          alt={productName}
          className="aspect-square w-full object-cover"
        />
      </div>

      {/* شريط المصغرات — يظهر فقط عند وجود أكثر من صورة */}
      {gallery.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {gallery.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`صورة ${index + 1} للمنتج`}
              className={cn(
                'h-20 w-20 shrink-0 overflow-hidden rounded-md border bg-gray-50 transition',
                index === activeIndex
                  ? 'border-[var(--store-primary)] ring-1 ring-[var(--store-primary)]'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt={productName} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
