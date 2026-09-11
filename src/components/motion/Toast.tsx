'use client';

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { springSnappy } from '@/lib/motion';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastKind, React.ElementType> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const KIND_CLASS: Record<ToastKind, string> = {
  success: 'border-emerald-500/40 bg-emerald-50/95 text-emerald-800',
  error: 'border-rose-500/40 bg-rose-50/95 text-rose-800',
  info: 'border-sky-500/40 bg-sky-50/95 text-sky-800',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, kind, message }]);
    window.setTimeout(() => dismiss(id), kind === 'error' ? 6000 : 4000);
  }, [dismiss]);

  const value = useMemo<ToastContextValue>(() => ({
    success: (message: string) => push('success', message),
    error: (message: string) => push('error', message),
    info: (message: string) => push('info', message),
  }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[999] flex w-full max-w-sm flex-col gap-2 sm:bottom-6 sm:right-6">
        <AnimatePresence>
          {toasts.map((toast) => {
            const Icon = ICONS[toast.kind];
            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1, transition: springSnappy }}
                exit={{ opacity: 0, x: 40, scale: 0.95, transition: { duration: 0.18 } }}
                className={`pointer-events-auto flex items-start gap-2.5 rounded-2xl border px-4 py-3 shadow-[0_18px_40px_rgba(15,23,42,.18)] backdrop-blur-xl ${KIND_CLASS[toast.kind]}`}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="flex-1 text-sm font-semibold leading-snug">{toast.message}</p>
                <button
                  onClick={() => dismiss(toast.id)}
                  className="mt-0.5 shrink-0 rounded-md p-0.5 opacity-60 transition hover:opacity-100"
                  aria-label="Dismiss"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
