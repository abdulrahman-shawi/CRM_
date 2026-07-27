"use client";

import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';

interface AppModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

const sizeVariants = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-[95vw] h-[95vh]",
};

export const AppModal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: AppModalProps) => {
  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <AnimatePresence>
        {isOpen && (
          <Dialog.Portal forceMount>
            {/* الخلفية المظلمة مع أنميشن */}
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              />
            </Dialog.Overlay>

            {/* محتوى النافذة مع أنميشن */}
            <Dialog.Content asChild forceMount style={{ direction: 'rtl' }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-48%" }}
                animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
                exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-48%" }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={cn(
                  "fixed left-[50%] top-[50%] z-[70] grid w-full gap-4 border bg-white p-6 shadow-xl sm:rounded-xl dark:bg-slate-950 dark:border-slate-800 rtl:text-right outline-none",
                  sizeVariants[size]
                )}
              >
                {/* رأس النافذة */}
                <div className="flex flex-col space-y-1.5 text-center sm:text-right relative min-w-0">
                  <Dialog.Title className="text-xl font-bold leading-none tracking-tight dark:text-slate-100">
                    {title}
                  </Dialog.Title>
                  {description && (
                    <Dialog.Description className="text-sm text-slate-500 dark:text-slate-400">
                      {description}
                    </Dialog.Description>
                  )}

                  <Dialog.Close className="absolute left-0 top-0 rounded-full opacity-70 transition-all hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 outline-none">
                    <X className="h-5 w-5 dark:text-slate-100" />
                    <span className="sr-only">إغلاق</span>
                  </Dialog.Close>
                </div>

                {/* المحتوى */}
                <div className="py-4 overflow-y-auto overflow-x-hidden max-h-[70vh] min-w-0 custom-scrollbar">
                  {children}
                </div>

                {/* التذييل */}
                {footer && (
                  <div className="flex flex-col-reverse sm:flex-row sm:justify-start gap-2 mt-2 border-t pt-4 min-w-0 dark:border-slate-800">
                    {footer}
                  </div>
                )}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
};