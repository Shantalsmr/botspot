/**
 * Catalogo de la tienda en linea (modulo puro: sin "server-only", lo usan el carrito del navegador
 * y el servidor). Importable desde el cliente como `@botspot/backend/shop`.
 *
 * El precio que se cobra SIEMPRE se calcula en el servidor con este archivo; el carrito del
 * navegador solo manda ids, variante y cantidad.
 *
 * Precios tomados del menu del local (foto de Google, nov. 2026). Las gift cards son nuevas: confirmar
 * montos con el negocio. Para agregar un producto basta con sumarlo a PRODUCTS.
 */

export type ProductCategory = "gift-cards" | "tickets" | "party" | "merch";

/**
 * Lo que genera un producto al pagarse: un codigo con saldo en dolares (gift card) o con tickets
 * de juego (5 min por ticket). Se canjea en el local (/admin) o, las gift cards, al reservar en linea.
 */
export type Credit = { kind: "money"; cents: number } | { kind: "tickets"; count: number };

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  /** Precio en centavos (USD). */
  priceCents: number;
  /** Precio de referencia tachado (opcional), en centavos. */
  compareAtCents?: number;
  description: string;
  /** Emoji que se muestra si no hay foto. */
  icon: string;
  /** Foto opcional (ruta en /public). */
  image?: string;
  /** Opciones (p. ej. tallas). Si existe, el cliente debe elegir una. */
  variants?: readonly string[];
  /** Como se entrega: codigo por correo (gift cards / tickets) o se recoge en el local. */
  fulfillment: "email" | "pickup";
  /** Codigo que se genera por cada unidad pagada (solo productos "email"). */
  credit?: Credit;
  badge?: string;
}

export const CATEGORIES: { id: ProductCategory; label: string }[] = [
  { id: "gift-cards", label: "Gift cards" },
  { id: "tickets", label: "Game tickets" },
  { id: "party", label: "Party extras" },
  { id: "merch", label: "Merch" },
];

const TICKET_NOTE = "Each ticket is 5 minutes of bot games. You get a code by email to use at the front desk.";

export const PRODUCTS: readonly Product[] = [
  {
    id: "gift-25",
    name: "Gift Card · $25",
    category: "gift-cards",
    priceCents: 2500,
    description: "Use it at the arena or online when you book. Delivered as a code, never expires.",
    icon: "🎁",
    fulfillment: "email",
    credit: { kind: "money", cents: 2500 },
  },
  {
    id: "gift-50",
    name: "Gift Card · $50",
    category: "gift-cards",
    priceCents: 5000,
    description: "Perfect for a battle night for two. Use it at the arena or online. Never expires.",
    icon: "🎁",
    fulfillment: "email",
    credit: { kind: "money", cents: 5000 },
    badge: "Most popular",
  },
  {
    id: "gift-100",
    name: "Gift Card · $100",
    category: "gift-cards",
    priceCents: 10000,
    description: "The ultimate gift for a robot fan or a family night out. Never expires.",
    icon: "🎁",
    fulfillment: "email",
    credit: { kind: "money", cents: 10000 },
  },
  {
    id: "tickets-2",
    name: "2 Game Tickets",
    category: "tickets",
    priceCents: 700,
    description: TICKET_NOTE,
    icon: "🎟️",
    image: "/images/gallery/kids-driving.jpg",
    fulfillment: "email",
    credit: { kind: "tickets", count: 2 },
  },
  {
    id: "tickets-4",
    name: "4 Game Tickets",
    category: "tickets",
    priceCents: 1200,
    compareAtCents: 1400,
    description: TICKET_NOTE,
    icon: "🎟️",
    image: "/images/gallery/battle-kids.jpg",
    fulfillment: "email",
    credit: { kind: "tickets", count: 4 },
  },
  {
    id: "tickets-10",
    name: "10 Game Tickets",
    category: "tickets",
    priceCents: 2600,
    compareAtCents: 3500,
    description: TICKET_NOTE,
    icon: "🎟️",
    image: "/images/gallery/arena-red-lights.jpg",
    fulfillment: "email",
    credit: { kind: "tickets", count: 10 },
    badge: "Save $9",
  },
  {
    id: "tickets-16",
    name: "16 Game Tickets",
    category: "tickets",
    priceCents: 3600,
    compareAtCents: 5600,
    description: TICKET_NOTE,
    icon: "🎟️",
    image: "/images/gallery/arena-night.jpg",
    fulfillment: "email",
    credit: { kind: "tickets", count: 16 },
    badge: "Best value",
  },
  {
    id: "pinata-small",
    name: "Small Piñata + Candy",
    category: "party",
    priceCents: 1500,
    description: "A robot-battle piñata filled with candy. Smash it in the arena! Ready on your party day.",
    icon: "🪅",
    fulfillment: "pickup",
  },
  {
    id: "pinata-big",
    name: "Big Piñata + Candy",
    category: "party",
    priceCents: 2500,
    description: "The big one, packed with candy for the whole party. Ready on your party day.",
    icon: "🪅",
    fulfillment: "pickup",
    badge: "Party favorite",
  },
  {
    id: "donut-surprise",
    name: "Donut Surprise",
    category: "party",
    priceCents: 1200,
    description: "A surprise robot game with a sweet donut prize. Ask the team to set it up at your visit.",
    icon: "🍩",
    fulfillment: "pickup",
  },
  {
    id: "tee",
    name: "Bot Spot T-Shirt",
    category: "merch",
    priceCents: 2900,
    description: "The official Bot Spot tee our team wears. Pick it up at the arena.",
    icon: "👕",
    image: "/images/gallery/staff-team.jpg",
    variants: ["Youth M", "Youth L", "S", "M", "L", "XL", "2XL"],
    fulfillment: "pickup",
  },
];

/** Maximo de unidades de un producto por pedido. */
export const MAX_QTY = 20;
/** Maximo de lineas distintas en el carrito. */
export const MAX_LINES = 30;

export interface CartLine {
  productId: string;
  variant: string | null;
  qty: number;
}

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function lineKey(line: { productId: string; variant: string | null }): string {
  return `${line.productId}::${line.variant ?? ""}`;
}

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

/** Total del carrito en centavos (ignora lineas invalidas). */
export function cartTotalCents(lines: readonly CartLine[]): number {
  return lines.reduce((sum, l) => sum + (getProduct(l.productId)?.priceCents ?? 0) * l.qty, 0);
}
