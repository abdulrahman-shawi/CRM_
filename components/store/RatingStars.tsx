import { cn } from '@/lib/utils';

interface RatingStarsProps {
  rating: number; // من 0 إلى 5
  count?: number; // عدد المراجعات — يظهر بين قوسين إن وُجد
  className?: string;
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn('h-4 w-4', filled ? 'fill-[var(--store-primary)]' : 'fill-gray-300')}
      aria-hidden="true"
    >
      <path d="M12 2.5l2.95 5.98 6.6.96-4.78 4.65 1.13 6.58L12 17.57l-5.9 3.1 1.13-6.58L2.45 9.44l6.6-.96L12 2.5z" />
    </svg>
  );
}

export default function RatingStars({ rating, count, className }: RatingStarsProps) {
  const safeRating = Math.max(0, Math.min(5, Number(rating) || 0));
  const filledCount = Math.round(safeRating);

  return (
    <div className={cn('flex items-center gap-1', className)} dir="ltr">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, index) => (
          <StarIcon key={index} filled={index < filledCount} />
        ))}
      </div>
      {typeof count === 'number' && (
        <span className="text-xs text-gray-400">({count})</span>
      )}
    </div>
  );
}
