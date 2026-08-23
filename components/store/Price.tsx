'use client';

import { useSiteCurrency, formatSiteCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';

interface PriceProps {
  amount: number; // المبلغ بالدولار — يُحوَّل ويُنسَّق بعملة الموقع
  className?: string;
}

// المكوّن الموحّد لعرض أي سعر في المتجر
export default function Price({ amount, className }: PriceProps) {
  const { settings } = useSiteCurrency();

  return <span className={cn(className)}>{formatSiteCurrency(amount, settings)}</span>;
}
