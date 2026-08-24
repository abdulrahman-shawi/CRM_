import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'تم استلام طلبك',
};

interface CheckoutSuccessPageProps {
  searchParams?: { order?: string | string[] };
}

export default function CheckoutSuccessPage({ searchParams }: CheckoutSuccessPageProps) {
  const orderNumber = Array.isArray(searchParams?.order)
    ? String(searchParams.order[0] || '').trim()
    : String(searchParams?.order || '').trim();

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center">
      <CheckCircle2 className="h-20 w-20 text-emerald-500" />
      <h1 className="mt-6 text-2xl font-bold text-gray-900 md:text-3xl">
        شكراً لك! تم استلام طلبك
      </h1>

      {orderNumber && (
        <p className="mt-3 text-lg text-gray-700">
          رقم الطلب: <span className="font-bold text-[var(--store-primary)]" dir="ltr">{orderNumber}</span>
        </p>
      )}

      <p className="mt-3 text-sm text-gray-500">
        سنتواصل معك قريباً لتأكيد الطلب — الدفع عند الاستلام
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/shop"
          className="rounded-md bg-[var(--store-primary)] px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
        >
          متابعة التسوق
        </Link>
        <Link
          href="/"
          className="rounded-md border border-gray-200 px-6 py-2.5 text-sm font-bold text-gray-700 transition hover:border-[var(--store-primary)] hover:text-[var(--store-primary)]"
        >
          الرئيسية
        </Link>
      </div>
    </div>
  );
}
