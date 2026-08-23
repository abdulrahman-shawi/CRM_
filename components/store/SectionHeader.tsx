import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
}

// عنوان قسم بأسلوب Molla: عنوان + خط زخرفي
export default function SectionHeader({ title, subtitle, className }: SectionHeaderProps) {
  return (
    <div className={cn('mb-8 text-center', className)}>
      <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">{title}</h2>
      <div className="mt-3 flex items-center justify-center gap-2">
        <span className="h-px w-10 bg-[var(--store-primary)]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--store-primary)]" />
        <span className="h-px w-10 bg-[var(--store-primary)]" />
      </div>
      {subtitle && <p className="mt-3 text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
}
