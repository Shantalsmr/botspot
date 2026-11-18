"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { MAX_LINES, MAX_QTY, getProduct, lineKey, type CartLine } from "@botspot/backend/shop";

/**
 * Carrito de la tienda: vive en el navegador (localStorage) y solo guarda ids, variante y cantidad.
 * El precio real se calcula en el servidor al pagar (ver backend/src/services/order.service.ts).
 */

const STORAGE_KEY = "botspot_cart_v1";

interface CartContextValue {
  lines: CartLine[];
  count: number;
  ready: boolean;
  add: (productId: string, variant: string | null, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function readStorage(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return (parsed as CartLine[])
      .filter((l) => l && getProduct(l.productId) && Number.isInteger(l.qty) && l.qty > 0)
      .map((l) => ({ productId: l.productId, variant: l.variant ?? null, qty: Math.min(l.qty, MAX_QTY) }))
      .slice(0, MAX_LINES);
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLines(readStorage());
    setReady(true);
    // Mantiene el carrito igual entre pestanas abiertas.
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setLines(readStorage());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Sin almacenamiento (modo privado): el carrito dura mientras la pagina este abierta.
    }
  }, [lines, ready]);

  const add = useCallback((productId: string, variant: string | null, qty = 1) => {
    setLines((prev) => {
      const key = lineKey({ productId, variant });
      const existing = prev.find((l) => lineKey(l) === key);
      if (existing) {
        return prev.map((l) => (l === existing ? { ...l, qty: Math.min(l.qty + qty, MAX_QTY) } : l));
      }
      if (prev.length >= MAX_LINES) return prev;
      return [...prev, { productId, variant, qty: Math.min(qty, MAX_QTY) }];
    });
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => lineKey(l) !== key)
        : prev.map((l) => (lineKey(l) === key ? { ...l, qty: Math.min(qty, MAX_QTY) } : l)),
    );
  }, []);

  const remove = useCallback((key: string) => setLines((prev) => prev.filter((l) => lineKey(l) !== key)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(
    () => ({ lines, count: lines.reduce((n, l) => n + l.qty, 0), ready, add, setQty, remove, clear }),
    [lines, ready, add, setQty, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de <CartProvider>");
  return ctx;
}
