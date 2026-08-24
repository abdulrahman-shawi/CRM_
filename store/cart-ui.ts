import { create } from 'zustand';

interface CartUiState {
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
}

// حالة واجهة درج السلة الجانبي (بدون persist — حالة مؤقتة للواجهة فقط)
export const useCartUiStore = create<CartUiState>()((set) => ({
  isOpen: false,
  openCart: () => set({ isOpen: true }),
  closeCart: () => set({ isOpen: false }),
  toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
}));
