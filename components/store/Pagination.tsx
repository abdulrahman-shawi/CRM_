'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number;
  totalPages: number;
}

// ترقيم الصفحات — يحدّث معامل page في الرابط مع الحفاظ على باقي المعاملات
export default function Pagination({ page, totalPages }: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const currentPage = Math.min(Math.max(1, page), totalPages);

  const goToPage = (target: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (target <= 1) {
      params.delete('page');
    } else {
      params.set('page', String(target));
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  // نافذة صفحات حول الصفحة الحالية (5 كحد أقصى)
  const windowSize = 5;
  let start = Math.max(1, currentPage - Math.floor(windowSize / 2));
  const end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  const pages = Array.from({ length: end - start + 1 }, (_, index) => start + index);

  const buttonClass = (active: boolean) =>
    cn(
      'flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-sm transition',
      active
        ? 'border-[var(--store-primary)] bg-[var(--store-primary)] font-bold text-white'
        : 'border-gray-200 text-gray-600 hover:border-[var(--store-primary)] hover:text-[var(--store-primary)]'
    );

  return (
    <nav aria-label="ترقيم الصفحات" className="mt-10 flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => goToPage(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label="الصفحة السابقة"
        className={cn(buttonClass(false), 'disabled:cursor-not-allowed disabled:opacity-40')}
      >
        {/* في RTL: السهم الأيمن = السابق */}
        <ChevronRight className="h-4 w-4" />
      </button>

      {pages.map((pageNumber) => (
        <button
          key={pageNumber}
          type="button"
          onClick={() => goToPage(pageNumber)}
          aria-label={`الصفحة ${pageNumber}`}
          aria-current={pageNumber === currentPage ? 'page' : undefined}
          className={buttonClass(pageNumber === currentPage)}
        >
          {pageNumber}
        </button>
      ))}

      <button
        type="button"
        onClick={() => goToPage(currentPage + 1)}
        disabled={currentPage >= totalPages}
        aria-label="الصفحة التالية"
        className={cn(buttonClass(false), 'disabled:cursor-not-allowed disabled:opacity-40')}
      >
        {/* في RTL: السهم الأيسر = التالي */}
        <ChevronLeft className="h-4 w-4" />
      </button>
    </nav>
  );
}
