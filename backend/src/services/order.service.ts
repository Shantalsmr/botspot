import "server-only";
import type Stripe from "stripe";
import { COLLECTIONS, getDb, isDatabaseConfigured } from "@botspot/database";
import { OWNER_EMAIL, sendEmail } from "../lib/email";
import { getStripe, isStripeConfigured } from "../lib/stripe";
import { MAX_LINES, MAX_QTY, formatMoney, getProduct, lineKey, type CartLine, type Credit } from "../shop";
import { formatBalance, issueCodesInTx, type IssuedCode } from "./giftcard.service";

/**
 * Pedidos de la tienda en linea. Flujo: el carrito (navegador) manda ids y cantidades →
 * aqui se valida y se calcula el precio → se guarda el pedido "pending" → Stripe Checkout →
 * el webhook o /order-confirmed lo marcan "paid" y se avisa a los duenos.
 */

export type OrderStatus = "pending" | "paid" | "expired";

export interface OrderLine {
  productId: string;
  name: string;
  variant: string | null;
  qty: number;
  unitCents: number;
  fulfillment: "email" | "pickup";
  /** Si existe, cada unidad genera un codigo (gift card o tickets) al pagarse. */
  credit?: Credit;
}

export interface OrderDoc {
  lines: OrderLine[];
  amountCents: number;
  status: OrderStatus;
  note: string | null;
  createdAt: number;
  paidAt?: number;
  stripeSessionId?: string;
  stripePaymentIntentId?: string | null;
  customer?: { name: string | null; email: string | null; phone: string | null };
  customerId?: string;
  clientId: string;
  /** Codigos generados al pagarse (gift cards / tickets). */
  giftCodes?: IssuedCode[];
}

export interface OrderSummary {
  id: string;
  lines: OrderLine[];
  amount: string;
  amountCents: number;
  status: OrderStatus;
  note: string | null;
  createdAt: number;
  paidAt: number | null;
  customer: { name: string | null; email: string | null; phone: string | null } | null;
  giftCodes: IssuedCode[];
}

export class OrderError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

export interface CreateOrderInput {
  lines?: unknown;
  note?: unknown;
}

const MAX_PENDING_PER_HOUR = 10;

/** Valida el carrito que llega del navegador y arma las lineas con precios del servidor. */
function buildLines(raw: unknown): OrderLine[] {
  if (!Array.isArray(raw) || raw.length === 0) throw new OrderError("empty_cart", "Your cart is empty.");
  if (raw.length > MAX_LINES) throw new OrderError("too_many_lines", "Your cart has too many items.");
  const merged = new Map<string, OrderLine>();
  for (const item of raw as Partial<CartLine>[]) {
    const product = typeof item?.productId === "string" ? getProduct(item.productId) : undefined;
    if (!product) throw new OrderError("invalid_product", "One of the products is no longer available.");
    const qty = Number(item.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
      throw new OrderError("invalid_qty", `Quantity must be between 1 and ${MAX_QTY}.`);
    }
    let variant: string | null = null;
    if (product.variants) {
      if (typeof item.variant !== "string" || !product.variants.includes(item.variant)) {
        throw new OrderError("invalid_variant", `Please choose a size for ${product.name}.`);
      }
      variant = item.variant;
    }
    const key = lineKey({ productId: product.id, variant });
    const existing = merged.get(key);
    const total = (existing?.qty ?? 0) + qty;
    if (total > MAX_QTY) throw new OrderError("invalid_qty", `Maximum ${MAX_QTY} of ${product.name} per order.`);
    merged.set(key, {
      productId: product.id,
      name: product.name,
      variant,
      qty: total,
      unitCents: product.priceCents,
      fulfillment: product.fulfillment,
      ...(product.credit ? { credit: product.credit } : {}),
    });
  }
  return [...merged.values()];
}

/** Crea el pedido y la sesion de Stripe Checkout. Devuelve la URL de pago. */
export async function createOrderCheckout(
  input: CreateOrderInput,
  origin: string,
  clientId: string,
  account: { id: string; email: string } | null = null,
): Promise<{ url: string }> {
  if (!isDatabaseConfigured() || !isStripeConfigured()) {
    throw new OrderError("shop_unavailable", "The online shop is temporarily unavailable. Please call us.", 503);
  }
  const lines = buildLines(input.lines);
  const note = typeof input.note === "string" ? input.note.trim().slice(0, 500) || null : null;
  const amountCents = lines.reduce((s, l) => s + l.unitCents * l.qty, 0);

  const col = getDb().collection(COLLECTIONS.orders);
  const now = Date.now();
  const mine = await col.where("clientId", "==", clientId).get();
  const recentPending = mine.docs.filter((d) => {
    const o = d.data() as OrderDoc;
    return o.status === "pending" && o.createdAt > now - 3_600_000;
  }).length;
  if (recentPending >= MAX_PENDING_PER_HOUR) {
    throw new OrderError("too_many_pending", "Too many unfinished orders. Please try again later.", 429);
  }

  const ref = col.doc();
  const doc: OrderDoc = {
    lines,
    amountCents,
    status: "pending",
    note,
    createdAt: now,
    clientId,
    ...(account ? { customerId: account.id } : {}),
  };
  await ref.set(doc);

  const hasPickup = lines.some((l) => l.fulfillment === "pickup");
  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: lines.map((l) => ({
        quantity: l.qty,
        price_data: {
          currency: "usd",
          unit_amount: l.unitCents,
          product_data: {
            name: l.variant ? `${l.name} (${l.variant})` : l.name,
            description: l.fulfillment === "email" ? "Delivered by email" : "Pick up at The Bot Spot, Provo",
          },
        },
      })),
      customer_creation: "always",
      ...(account ? { customer_email: account.email } : {}),
      phone_number_collection: { enabled: true },
      client_reference_id: ref.id,
      metadata: { orderId: ref.id },
      payment_intent_data: {
        description: `Shop order ${ref.id}`,
        metadata: { orderId: ref.id },
      },
      ...(hasPickup
        ? { custom_text: { submit: { message: "Merch and party items are picked up at the front desk." } } }
        : {}),
      expires_at: Math.floor(now / 1000) + 30 * 60,
      success_url: `${origin}/order-confirmed?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart?canceled=1`,
    });
    if (!session.url) throw new Error("Stripe no devolvio URL de pago");
    await ref.update({ stripeSessionId: session.id });
    return { url: session.url };
  } catch (error) {
    await ref.delete();
    throw error;
  }
}

/** Marca el pedido como pagado (idempotente) y avisa a los duenos una sola vez. */
export async function applyOrderSession(session: Stripe.Checkout.Session): Promise<string | null> {
  const orderId = session.metadata?.orderId;
  if (!orderId) return null;
  const db = getDb();
  const ref = db.collection(COLLECTIONS.orders).doc(orderId);
  if (session.payment_status === "paid") {
    const details = session.customer_details;
    const newlyPaid = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const current = snap.data() as OrderDoc | undefined;
      if (!current || current.status === "paid") return null;
      const customer = { name: details?.name ?? null, email: details?.email ?? null, phone: details?.phone ?? null };
      // Un codigo por cada unidad de gift card / tickets.
      const units = current.lines.flatMap((l) =>
        l.credit ? Array.from({ length: l.qty }, () => ({ productId: l.productId, name: l.name, credit: l.credit! })) : [],
      );
      const giftCodes = issueCodesInTx(tx, db, orderId, customer.email, units);
      tx.update(ref, {
        status: "paid",
        paidAt: Date.now(),
        stripeSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null),
        customer,
        giftCodes,
      });
      return { ...current, customer, giftCodes };
    });
    if (newlyPaid) {
      await notifyOwnersNewOrder(orderId, newlyPaid);
      await sendCodesToCustomer(orderId, newlyPaid);
    }
  } else if (session.status === "expired") {
    const snap = await ref.get();
    if (snap.exists && (snap.data() as OrderDoc).status === "pending") await ref.update({ status: "expired" });
  }
  return orderId;
}

function describeLines(lines: OrderLine[]): string {
  return lines
    .map(
      (l) =>
        `${l.qty} × ${l.name}${l.variant ? ` (${l.variant})` : ""} — ${formatMoney(l.unitCents * l.qty)} · ${
          l.fulfillment === "email" ? "send by email" : "pickup"
        }`,
    )
    .join("\n");
}

async function notifyOwnersNewOrder(id: string, o: OrderDoc): Promise<void> {
  await sendEmail({
    to: OWNER_EMAIL,
    subject: `New shop order: ${formatMoney(o.amountCents)}`,
    replyTo: o.customer?.email ?? undefined,
    text: `New paid shop order!

${describeLines(o.lines)}

Total: ${formatMoney(o.amountCents)}
${o.note ? `Note: ${o.note}\n` : ""}
Customer: ${o.customer?.name ?? "-"}
Email: ${o.customer?.email ?? "-"}
Phone: ${o.customer?.phone ?? "-"}

Order #: ${id}`,
  });
}

/** Correo al cliente con sus codigos (si Resend esta configurado). */
async function sendCodesToCustomer(id: string, o: OrderDoc): Promise<void> {
  const codes = o.giftCodes ?? [];
  if (codes.length === 0 || !o.customer?.email) return;
  await sendEmail({
    to: o.customer.email,
    subject: codes.length === 1 ? "Your Bot Spot code" : "Your Bot Spot codes",
    text: `Thanks for your order! Here ${codes.length === 1 ? "is your code" : "are your codes"}:

${codes.map((c) => `${c.code}  ·  ${c.name}  ·  ${formatBalance(c.kind, c.amount)}`).join("\n")}

Gift cards can be used at the arena or online when you book a battle (enter the code at checkout).
Game tickets are used at the front desk (5 minutes per ticket).

The Bot Spot · 255 N University Ave, Provo, UT
Order #: ${id}`,
  });
}

function toSummary(id: string, o: OrderDoc): OrderSummary {
  return {
    id,
    lines: o.lines,
    amount: formatMoney(o.amountCents),
    amountCents: o.amountCents,
    status: o.status,
    note: o.note,
    createdAt: o.createdAt,
    paidAt: o.paidAt ?? null,
    customer: o.customer ?? null,
    giftCodes: o.giftCodes ?? [],
  };
}

/** Usado por /order-confirmed: confirma el pago con Stripe y devuelve el pedido. */
export async function confirmOrderFromSession(sessionId: string): Promise<OrderSummary | null> {
  if (!isDatabaseConfigured() || !isStripeConfigured() || !sessionId.startsWith("cs_")) return null;
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  const orderId = await applyOrderSession(session);
  if (!orderId) return null;
  const snap = await getDb().collection(COLLECTIONS.orders).doc(orderId).get();
  return snap.exists ? toSummary(snap.id, snap.data() as OrderDoc) : null;
}

/** Pedidos pagados (para el panel /admin y los ingresos). */
export async function listPaidOrders(): Promise<OrderSummary[]> {
  const snap = await getDb().collection(COLLECTIONS.orders).where("status", "==", "paid").get();
  return snap.docs
    .map((d) => toSummary(d.id, d.data() as OrderDoc))
    .sort((a, b) => (b.paidAt ?? b.createdAt) - (a.paidAt ?? a.createdAt));
}
