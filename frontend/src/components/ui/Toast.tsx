import * as ToastPrimitive from '@radix-ui/react-toast';
import { createContext, useCallback, useContext, useState, ReactNode } from 'react';

type Tone = 'default' | 'success' | 'error';
type ToastItem = { id: number; title: string; tone: Tone };

const ToastContext = createContext<(title: string, tone?: Tone) => void>(() => {});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((title: string, tone: Tone = 'default') => {
    setItems((prev) => [...prev, { id: Date.now() + Math.random(), title, tone }]);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      <ToastPrimitive.Provider swipeDirection="right" duration={2600}>
        {children}
        {items.map((item) => (
          <ToastPrimitive.Root
            key={item.id}
            className="toast-root"
            data-tone={item.tone}
            onOpenChange={(open) => {
              if (!open) setItems((prev) => prev.filter((entry) => entry.id !== item.id));
            }}
          >
            <ToastPrimitive.Title className="toast-title">{item.title}</ToastPrimitive.Title>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="toast-viewport" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
