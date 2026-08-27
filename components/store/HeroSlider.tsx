'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { HeroSlideLike } from '@/components/store/types';
import { cn } from '@/lib/utils';

interface HeroSliderProps {
  slides: HeroSlideLike[];
}

const AUTO_PLAY_MS = 5000;

// سلايدر رئيسي full-width مع أسهم وdots وتشغيل تلقائي كل 5 ثوان
export default function HeroSlider({ slides }: HeroSliderProps) {
  const validSlides = slides.filter((slide) => slide && slide.image);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (validSlides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % validSlides.length);
    }, AUTO_PLAY_MS);
    return () => clearInterval(timer);
  }, [validSlides.length, current]);

  if (validSlides.length === 0) return null;

  const goTo = (index: number) =>
    setCurrent(((index % validSlides.length) + validSlides.length) % validSlides.length);

  return (
    <section className="relative h-[380px] w-full overflow-hidden md:h-[520px]" dir="rtl">
      {validSlides.map((slide, index) => (
        <div
          key={slide.id}
          className={cn(
            'absolute inset-0 transition-opacity duration-700',
            index === current ? 'opacity-100' : 'pointer-events-none opacity-0'
          )}
          aria-hidden={index !== current}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slide.image}
            alt={slide.title ?? ''}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40" />

          <div className="absolute inset-0 flex items-center">
            <div className="mx-auto w-full max-w-7xl px-12 md:px-8">
              <div className="flex max-w-xl flex-col items-start gap-4 text-right">
                {slide.title && (
                  <h2 className="text-3xl font-bold leading-snug text-white drop-shadow-md md:text-5xl">
                    {slide.title}
                  </h2>
                )}
                {slide.subtitle && (
                  <p className="text-base text-gray-100 drop-shadow md:text-lg">
                    {slide.subtitle}
                  </p>
                )}
                {slide.buttonText && (
                  <Link
                    href={slide.buttonLink || '#'}
                    className="mt-2 inline-flex items-center rounded-md bg-[var(--store-primary)] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90"
                  >
                    {slide.buttonText}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {validSlides.length > 1 && (
        <>
          {/* في RTL: السهم الأيسر = التالي */}
          <button
            type="button"
            onClick={() => goTo(current + 1)}
            aria-label="الشريحة التالية"
            className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-gray-800 shadow transition hover:bg-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => goTo(current - 1)}
            aria-label="الشريحة السابقة"
            className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-gray-800 shadow transition hover:bg-white"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2">
            {validSlides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => goTo(index)}
                aria-label={`الشريحة ${index + 1}`}
                className={cn(
                  'h-2.5 rounded-full transition-all',
                  index === current
                    ? 'w-6 bg-[var(--store-primary)]'
                    : 'w-2.5 bg-white/60 hover:bg-white'
                )}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
