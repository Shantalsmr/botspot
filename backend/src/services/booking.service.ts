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
import { getStripe, isStripeConfigured } from "../lib/stripe";

/** Tiempo que un cupo queda apartado mientras el cliente paga (Stripe exige minimo 30 min). */
const HOLD_MIN = 30;

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
}

/**
 * Aparta el cupo (transaccion en Firestore, evita sobreventa) y crea la sesion de Stripe Checkout.
 * Devuelve la URL de pago de Stripe.
 */
export async function createBookingCheckout(input: CreateCheckoutInput, origin: string): Promise<{ url: string }> {
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

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(col.where("date", "==", input.date));
    const day = buildDay(
      input.date,
      snap.docs.map((d) => d.data() as BookingDoc),
      now,
    );
    if (!availableStarts(day, pkg, players).includes(startMin)) {
      throw new BookingError("slot_unavailable", "That time is no longer available. Please pick another one.", 409);
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
    };
    tx.set(ref, doc);
  });

  const when = `${input.date} at ${formatTime(startMin)}`;
  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amountCents,
            product_data: {
              name: `${pkg.name} · ${players} ${players === 1 ? "player" : "players"}`,
              description: `The Bot Spot, Provo · ${when}`,
            },
          },
        },
      ],
      customer_creation: "always",
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
    // Si Stripe falla, se libera el cupo.
    await ref.delete();
    throw error;
  }
}

/** Marca la reserva como pagada a partir de una sesion de Checkout (idempotente). */
async function applySession(session: Stripe.Checkout.Session): Promise<string | null> {
  const bookingId = session.metadata?.bookingId;
  if (!bookingId) return null;
  const ref = getDb().collection(COLLECTIONS.bookings).doc(bookingId);
  if (session.payment_status === "paid") {
    const details = session.customer_details;
    await ref.update({
      status: "paid",
      paidAt: Date.now(),
      stripeSessionId: session.id,
      stripePaymentIntentId:
        typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null),
      customer: {
        name: details?.name ?? null,
        email: details?.email ?? null,
        phone: details?.phone ?? null,
      },
    });
  } else if (session.status === "expired") {
    const snap = await ref.get();
    if (snap.exists && (snap.data() as BookingDoc).status === "pending") await ref.update({ status: "expired" });
  }
  return bookingId;
}

/** Usado por /thank-you: confirma el pago con Stripe y devuelve el resumen. */
export async function confirmBookingFromSession(sessionId: string): Promise<BookingSummary | null> {
  if (!isDatabaseConfigured() || !isStripeConfigured() || !sessionId.startsWith("cs_")) return null;
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  const bookingId = await applySession(session);
  if (!bookingId) return null;
  const snap = await getDb().collection(COLLECTIONS.bookings).doc(bookingId).get();
  if (!snap.exists) return null;
  const b = snap.data() as BookingDoc;
  return {
    id: snap.id,
    packageName: getPackage(b.packageId)?.name ?? b.packageId,
    date: b.date,
    time: formatTime(b.startMin),
    players: b.players,
    amount: formatPrice(b.amountCents),
    status: b.status,
    email: b.customer?.email ?? null,
  };
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
    await applySession(event.data.object);
  }
}
