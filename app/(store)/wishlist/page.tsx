import type { Metadata } from 'next';
import WishlistView from '@/components/store/WishlistView';

export const metadata: Metadata = {
  title: 'المفضلة',
};

export default function WishlistPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-bold text-gray-900 md:text-3xl">قائمة المفضلة</h1>
      <WishlistView />
    </div>
  );
}
