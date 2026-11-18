import "server-only";
import type Stripe from "stripe";
import { COLLECTIONS, getDb, isDatabaseConfigured } from "@botspot/database";
import {
  BOOKING_WINDOW_DAYS,
  SAME_DAY_LEAD_MIN,
  SLOT_STEP_MIN,
  addDays,
  availableStarts,
  formatPrice,
  formatTime,
  getPackage,
  hoursFor,
  isValidDate,
  nowInProvo,
  occupancyFor,
  priceCents,
  timeToMinutes,
  type DayAvailability,
  type PackageId,
} from "../catalog";
import { OWNER_EMAIL, sendEmail } from "../lib/email";
import { getStripe, isStripeConfigured } from "../lib/stripe";
import { applyOrderSession } from "./order.service";
import { normalizeCode, readGiftCardInTx, refundGiftCard } from "./giftcard.service";

/** Tiempo que un cupo queda apartado mientras el cliente paga (Stripe exige minimo 30 min). */
const HOLD_MIN = 30;
/** Maximo de reservas sin pagar (apartadas) a la vez por visitante. */
const MAX_ACTIVE_HOLDS = 2;

export type BookingStatus = "pending" | "paid" | "expired";

export interface BookingDoc {
  packageId: PackageId;
  date: string;
  startMin: number;
  durationMin: number;
  players: number;
  occupancy: number;
  amountCents: number;
  status: BookingStatus;
  holdExpiresAt: number;
  createdAt: number;
  paidAt?: number;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  customer?: { name: string | null; email: string | null; phone: string | null };
  /** Hash anonimo del visitante (ver lib/client-id.ts). */
  clientId?: string;
  /** Cuenta del cliente, si reservo con sesion iniciada. */
  customerId?: string;
  /** Solicitud de cancelacion/cambio: "open" mientras los duenos la revisan. */
  requestStatus?: "open" | "done";
  /** Gift card usada en linea y cuanto cubrio (centavos). El resto se cobra con Stripe. */
  giftCode?: string;
  giftCents?: number;
  /** "giftcard" si la gift card cubrio todo (no paso por Stripe). */
  paidWith?: "stripe" | "giftcard";
}

export interface BookingSummary {
  id: string;
  packageName: string;
  date: string;
  time: string;
  players: number;
  amount: string;
  status: BookingStatus;
  email: string | null;
  giftCode: string | null;
  giftAmount: string | null;
}

/** Error esperado de reservas; la ruta /api lo convierte en `fail(code, message, status)`. */
export class BookingError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

function assertReady(): void {
  if (!isDatabaseConfigured() || !isStripeConfigured()) {
    throw new BookingError(
      "booking_unavailable",
      "Online booking is temporarily unavailable. Please call us to book.",
      503,
    );
  }
}

/** Una reserva cuenta en la capacidad si esta pagada o apartada (pendiente y sin vencer). */
function holdsCapacity(b: BookingDoc, now: number): boolean {
  return b.status === "paid" || (b.status === "pending" && b.holdExpiresAt > now);
}

function buildDay(date: string, bookings: BookingDoc[], now: number): DayAvailability {
  const hours = hoursFor(date);
  const today = nowInProvo(new Date(now));
  const used: Record<number, number> = {};
  for (const b of bookings) {
    if (!holdsCapacity(b, now)) continue;
    for (let m = b.startMin; m < b.startMin + b.durationMin; m += SLOT_STEP_MIN) {
      used[m] = (used[m] ?? 0) + b.occupancy;
    }
  }
  return {
    date,
    open: hours?.open ?? null,
    close: hours?.close ?? null,
    earliestStart: date === today.date ? today.minute + SAME_DAY_LEAD_MIN : 0,
    used,
  };
}

function assertDateInWindow(date: string): void {
  if (!isValidDate(date)) throw new BookingError("invalid_date", "Please choose a valid date.");
  const today = nowInProvo().date;
  if (date < today || date > addDays(today, BOOKING_WINDOW_DAYS)) {
    throw new BookingError("invalid_date", `You can book up to ${BOOKING_WINDOW_DAYS} days ahead.`);
  }
}

/** Disponibilidad de un dia (cupos ocupados por bloque de 30 min). */
export async function getDayAvailability(date: string): Promise<DayAvailability> {
  assertReady();
  assertDateInWindow(date);
  const snap = await getDb().collection(COLLECTIONS.bookings).where("date", "==", date).get();
  return buildDay(
    date,
    snap.docs.map((d) => d.data() as BookingDoc),
    Date.now(),
  );
}

export interface CreateCheckoutInput {
  packageId: string;
  players: number;
  date: string;
  time: string;
  /** Codigo de gift card (opcional). */
  giftCode?: string;
  /** Datos de contacto: solo se piden si la gift card cubre todo (no hay pago en Stripe que los pida). */
  name?: string;
  email?: string;
  phone?: string;
}

/** Stripe no acepta cobros menores a $0.50. */
const STRIPE_MIN_CENTS = 50;

/** Cuanto puede cubrir una gift card sin dejar un saldo menor al minimo de Stripe. */
function giftCoverage(balance: number, total: number): number {
  if (balance >= total) return total;
  const remainder = total - balance;
  return remainder >= STRIPE_MIN_CENTS ? balance : Math.max(0, total - STRIPE_MIN_CENTS);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Aparta el cupo (transaccion en Firestore, evita sobreventa) y crea la sesion de Stripe Checkout.
 * Devuelve la URL de pago de Stripe.
 */
export async function createBookingCheckout(
  input: CreateCheckoutInput,
  origin: string,
  clientId: string,
  account: { id: string; email: string } | null = null,
): Promise<{ url: string }> {
  assertReady();
  const pkg = getPackage(input.packageId);
  if (!pkg) throw new BookingError("invalid_package", "Please choose a package.");
  const players = Number(input.players);
  if (!Number.isInteger(players) || players < pkg.minPlayers || players > pkg.maxPlayers) {
    throw new BookingError("invalid_players", `Players must be between ${pkg.minPlayers} and ${pkg.maxPlayers}.`);
  }
  assertDateInWindow(input.date);
  const startMin = timeToMinutes(input.time);
  if (startMin === null) throw new BookingError("invalid_time", "Please choose a time.");

  const db = getDb();
  const col = db.collection(COLLECTIONS.bookings);
  const ref = col.doc();
  const now = Date.now();
  const amountCents = priceCents(pkg, players);
  const giftCode = input.giftCode ? normalizeCode(input.giftCode) : null;
  if (input.giftCode && !giftCode) {
    throw new BookingError("invalid_gift", "That doesn't look like a Bot Spot gift card code.");
  }
  const contact = {
    name: typeof input.name === "string" ? input.name.trim().slice(0, 120) : "",
    email: (typeof input.email === "string" && input.email.trim() ? input.email.trim().slice(0, 160) : (account?.email ?? "")).toLowerCase(),
    phone: typeof input.phone === "string" ? input.phone.trim().slice(0, 40) : "",
  };

  // Evita que alguien aparte muchos horarios sin pagar.
  const mine = await col.where("clientId", "==", clientId).get();
  const activeHolds = mine.docs.filter((d) => {
    const b = d.data() as BookingDoc;
    return b.status === "pending" && b.holdExpiresAt > now;
  }).length;
  if (activeHolds >= MAX_ACTIVE_HOLDS) {
    throw new BookingError(
      "too_many_pending",
      "You already have a booking waiting for payment. Please finish it or wait 30 minutes.",
      429,
    );
  }

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(col.where("date", "==", input.date));
    const day = buildDay(
      input.date,
      snap.docs.map((d) => d.data() as BookingDoc),
      now,
    );
    if (!availableStarts(day, pkg, players).includes(startMin)) {
      throw new BookingError("slot_unavailable", "That time is no longer available. Please pick another one.", 409);
    }
    // Gift card: se lee aqui (antes de escribir) y el saldo se aparta junto con el cupo.
    let giftCents = 0;
    let applyGift: ((cents: number, bookingId: string) => void) | null = null;
    if (giftCode) {
      try {
        const gift = await readGiftCardInTx(tx, db, giftCode);
        giftCents = giftCoverage(gift.balanceCents, amountCents);
        applyGift = gift.apply;
      } catch (e) {
        throw new BookingError("invalid_gift", e instanceof Error ? e.message : "Gift card not valid.");
      }
    }
    const fullyCovered = giftCents === amountCents;
    if (fullyCovered && (!contact.name || !EMAIL_RE.test(contact.email) || contact.phone.replace(/\D/g, "").length < 7)) {
      throw new BookingError("contact_required", "Your gift card covers everything! Please add your name, email and phone.");
    }
    const doc: BookingDoc = {
      packageId: pkg.id,
      date: input.date,
      startMin,
      durationMin: pkg.durationMin,
      players,
      occupancy: occupancyFor(pkg, players),
      amountCents,
      status: "pending",
      holdExpiresAt: now + (HOLD_MIN + 1) * 60_000,
      createdAt: now,
      clientId,
      ...(account ? { customerId: account.id } : {}),
      ...(giftCode && giftCents > 0 ? { giftCode, giftCents } : {}),
      ...(fullyCovered
        ? {
            status: "paid" as const,
            paidAt: now,
            paidWith: "giftcard" as const,
            customer: { name: contact.name, email: contact.email, phone: contact.phone },
          }
        : {}),
    };
    if (applyGift && giftCents > 0) applyGift(giftCents, ref.id);
    tx.set(ref, doc);
    return { fullyCovered, giftCents, doc };
  });

  // La gift card pago todo: no hace falta Stripe.
  if (result.fullyCovered) {
    await notifyOwnersNewBooking(ref.id, result.doc);
    return { url: `${origin}/thank-you?booking=${ref.id}` };
  }
  const chargeCents = amountCents - result.giftCents;

  const when = `${input.date} at ${formatTime(startMin)}`;
  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: chargeCents,
            product_data: {
              name: `${pkg.name} · ${players} ${players === 1 ? "player" : "players"}`,
              description: result.giftCents
                ? `The Bot Spot, Provo · ${when} · Gift card ${giftCode} applied: -${formatPrice(result.giftCents)}`
                : `The Bot Spot, Provo · ${when}`,
            },
          },
        },
      ],
      customer_creation: "always",
      ...(account ? { customer_email: account.email } : {}),
      phone_number_collection: { enabled: true },
      client_reference_id: ref.id,
      metadata: { bookingId: ref.id },
      payment_intent_data: {
        description: `Booking ${ref.id} · ${pkg.name} · ${when}`,
        metadata: { bookingId: ref.id },
      },
      expires_at: Math.floor(now / 1000) + HOLD_MIN * 60,
      success_url: `${origin}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/book-appointment?canceled=1`,
    });
    if (!session.url) throw new Error("Stripe no devolvio URL de pago");
    await ref.update({ stripeSessionId: session.id });
    return { url: session.url };
  } catch (error) {
    // Si Stripe falla, se libera el cupo y se devuelve el saldo de la gift card.
    if (giftCode && result.giftCents > 0) await refundGiftCard(giftCode, result.giftCents, ref.id);
    await ref.delete();
    throw error;
  }
}

/**
 * Marca la reserva como pagada a partir de una sesion de Checkout. Idempotente: si ya estaba
 * pagada no cambia nada (ni la fecha de pago) y el aviso a los duenos se envia una sola vez.
 */
async function applySession(session: Stripe.Checkout.Session): Promise<string | null> {
  const bookingId = session.metadata?.bookingId;
  if (!bookingId) return null;
  const db = getDb();
  const ref = db.collection(COLLECTIONS.bookings).doc(bookingId);
  if (session.payment_status === "paid") {
    const details = session.customer_details;
    const newlyPaid = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const current = snap.data() as BookingDoc | undefined;
      if (!current || current.status === "paid") return null;
      const customer = { name: details?.name ?? null, email: details?.email ?? null, phone: details?.phone ?? null };
      tx.update(ref, {
        status: "paid",
        paidAt: Date.now(),
        stripeSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null),
        customer,
        paidWith: "stripe",
      });
      return { ...current, customer };
    });
    if (newlyPaid) await notifyOwnersNewBooking(bookingId, newlyPaid);
  } else if (session.status === "expired") {
    const snap = await ref.get();
    const b = snap.data() as BookingDoc | undefined;
    if (snap.exists && b?.status === "pending") {
      await ref.update({ status: "expired" });
      // No se pago: el saldo apartado vuelve a la gift card.
      if (b.giftCode && b.giftCents) await refundGiftCard(b.giftCode, b.giftCents, bookingId);
    }
  }
  return bookingId;
}

async function notifyOwnersNewBooking(id: string, b: BookingDoc): Promise<void> {
  const pkg = getPackage(b.packageId)?.name ?? b.packageId;
  await sendEmail({
    to: OWNER_EMAIL,
    subject: `New booking: ${b.date} at ${formatTime(b.startMin)} · ${b.players} players`,
    replyTo: b.customer?.email ?? undefined,
    text: `New paid booking!

${pkg}
Date: ${b.date} at ${formatTime(b.startMin)}
Players: ${b.players}
Paid: ${formatPrice(b.amountCents)}${b.giftCents ? ` (gift card ${b.giftCode}: ${formatPrice(b.giftCents)})` : ""}

Customer: ${b.customer?.name ?? "-"}
Email: ${b.customer?.email ?? "-"}
Phone: ${b.customer?.phone ?? "-"}

Confirmation #: ${id}`,
  });
}

function toBookingSummary(id: string, b: BookingDoc): BookingSummary {
  return {
    id,
    packageName: getPackage(b.packageId)?.name ?? b.packageId,
    date: b.date,
    time: formatTime(b.startMin),
    players: b.players,
    amount: formatPrice(b.amountCents),
    status: b.status,
    email: b.customer?.email ?? null,
    giftCode: b.giftCode ?? null,
    giftAmount: b.giftCents ? formatPrice(b.giftCents) : null,
  };
}

/** Usado por /thank-you cuando la gift card pago todo (no hay sesion de Stripe). */
export async function getGiftPaidBooking(id: string): Promise<BookingSummary | null> {
  if (!isDatabaseConfigured() || !/^[A-Za-z0-9]{10,40}$/.test(id)) return null;
  const snap = await getDb().collection(COLLECTIONS.bookings).doc(id).get();
  const b = snap.data() as BookingDoc | undefined;
  return b && b.paidWith === "giftcard" ? toBookingSummary(snap.id, b) : null;
}

/** Usado por /thank-you: confirma el pago con Stripe y devuelve el resumen. */
export async function confirmBookingFromSession(sessionId: string): Promise<BookingSummary | null> {
  if (!isDatabaseConfigured() || !isStripeConfigured() || !sessionId.startsWith("cs_")) return null;
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  const bookingId = await applySession(session);
  if (!bookingId) return null;
  const snap = await getDb().collection(COLLECTIONS.bookings).doc(bookingId).get();
  if (!snap.exists) return null;
  return toBookingSummary(snap.id, snap.data() as BookingDoc);
}

/** Webhook de Stripe: verifica la firma y actualiza la reserva. */
export async function handleStripeWebhook(rawBody: string, signature: string | null): Promise<void> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new BookingError("webhook_not_configured", "STRIPE_WEBHOOK_SECRET is missing.", 500);
  if (!signature) throw new BookingError("invalid_signature", "Missing Stripe signature.", 400);
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    throw new BookingError("invalid_signature", "Invalid Stripe signature.", 400);
  }
  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded" ||
    event.type === "checkout.session.expired"
  ) {
    // El mismo webhook sirve para reservas (metadata.bookingId) y pedidos de la tienda (metadata.orderId).
    await applySession(event.data.object);
    await applyOrderSession(event.data.object);
  }
}
