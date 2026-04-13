import { useState, useCallback } from 'react';

/** Toast variants supported by the lightweight in-app notifier. */
export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  msg: string;
  type: ToastType;
}

/**
 * Manages transient toast state for local UI feedback.
 *
 * The hook keeps notification logic in React so view models can report success and
 * failure without coupling themselves to any specific visual component.
 *
 * @returns The current toast list and an `addToast` helper that auto-removes entries.
 */
export const useToasts = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((msg: string, type: ToastType = 'info', duration = 3000) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  return { toasts, addToast };
};
