import "server-only";
import { COLLECTIONS, getDb } from "@botspot/database";
import { formatPrice, formatTime, getPackage, nowInProvo } from "../catalog";
import { OWNER_EMAIL, sendEmail } from "../lib/email";
import type { BookingDoc } from "./booking.service";
import type { Customer } from "./customer.service";

/**
 * Reservas de un cliente con cuenta y sus solicitudes de cancelacion o cambio.
 * Los duenos revisan las solicitudes en /admin (reembolsos en Stripe, a mano, segun la politica).
 */

export type RequestType = "cancel" | "reschedule";

export interface BookingRequestDoc {
  bookingId: string;
  customerId: string;
  type: RequestType;
  message: string | null;
  status: "open" | "done";
  createdAt: number;
  resolvedAt?: number;
}

export interface CustomerBooking {
  id: string;
  date: string;
  time: string;
  startMin: number;
  packageName: string;
  players: number;
  amount: string;
  upcoming: boolean;
  requestStatus: "open" | "done" | null;
  /** Lo que la politica permite segun la anticipacion. */
  policy: "full_refund" | "reschedule_or_credit" | "no_refund" | "past";
}

export class RequestError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

/** Horas que faltan para la reserva (hora de Provo). */
function hoursUntil(b: { date: string; startMin: number }): number {
  const now = nowInProvo();
  const days = (Date.parse(`${b.date}T00:00:00Z`) - Date.parse(`${now.date}T00:00:00Z`)) / 86_400_000;
  return days * 24 + (b.startMin - now.minute) / 60;
}

function policyFor(h: number): CustomerBooking["policy"] {
  if (h <= 0) return "past";
  if (h >= 7 * 24) return "full_refund";
  if (h >= 48) return "reschedule_or_credit";
  return "no_refund";
}

/** Reservas pagadas del cliente: las hechas con su cuenta y las hechas como invitado con su correo. */
export async function listCustomerBookings(customer: Customer): Promise<CustomerBooking[]> {
  const col = getDb().collection(COLLECTIONS.bookings);
  const [byAccount, byEmail] = await Promise.all([
    col.where("customerId", "==", customer.id).get(),
    col.where("customer.email", "==", customer.email).get(),
  ]);
  const seen = new Map<string, BookingDoc>();
  for (const d of [...byAccount.docs, ...byEmail.docs]) seen.set(d.id, d.data() as BookingDoc);
  return [...seen.entries()]
    .filter(([, b]) => b.status === "paid")
    .map(([id, b]) => {
      const h = hoursUntil(b);
      return {
        id,
        date: b.date,
        time: formatTime(b.startMin),
        startMin: b.startMin,
        packageName: getPackage(b.packageId)?.name ?? b.packageId,
        players: b.players,
        amount: formatPrice(b.amountCents),
        upcoming: h > 0,
        requestStatus: b.requestStatus ?? null,
        policy: policyFor(h),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin);
}

/** El cliente pide cancelar o cambiar una reserva suya. */
export async function createBookingRequest(
  customer: Customer,
  input: { bookingId?: unknown; type?: unknown; message?: unknown },
): Promise<void> {
  const type = input.type === "cancel" || input.type === "reschedule" ? input.type : null;
  if (!type || typeof input.bookingId !== "string") throw new RequestError("invalid", "Invalid request.");
  const message = typeof input.message === "string" ? input.message.trim().slice(0, 1000) || null : null;

  const db = getDb();
  const bookingRef = db.collection(COLLECTIONS.bookings).doc(input.bookingId);
  const booking = await db.runTransaction(async (tx) => {
    const snap = await tx.get(bookingRef);
    const b = snap.data() as BookingDoc | undefined;
    const mine = b && (b.customerId === customer.id || b.customer?.email === customer.email);
    if (!b || !mine || b.status !== "paid") throw new RequestError("not_found", "Booking not found.", 404);
    if (hoursUntil(b) <= 0) throw new RequestError("past", "This booking has already happened.");
    if (b.requestStatus === "open") {
      throw new RequestError("already_open", "You already sent a request for this booking. We'll contact you soon.");
    }
    const req: BookingRequestDoc = {
      bookingId: snap.id,
      customerId: customer.id,
      type,
      message,
      status: "open",
      createdAt: Date.now(),
    };
    tx.set(db.collection(COLLECTIONS.bookingRequests).doc(), req);
    tx.update(bookingRef, { requestStatus: "open" });
    return b;
  });

  await sendEmail({
    to: OWNER_EMAIL,
    replyTo: customer.email,
    subject: `${type === "cancel" ? "Cancellation" : "Reschedule"} request: ${booking.date} at ${formatTime(booking.startMin)}`,
    text: `${customer.name} asked to ${type === "cancel" ? "CANCEL" : "RESCHEDULE"} a booking.\n\nBooking: ${booking.date} at ${formatTime(booking.startMin)} · ${booking.players} players · ${formatPrice(booking.amountCents)}\nConfirmation #: ${input.bookingId}\nPolicy: ${policyFor(hoursUntil(booking)).replace(/_/g, " ")}\n\nMessage: ${message ?? "-"}\n\nEmail: ${customer.email}\nPhone: ${customer.phone}\n\nReview it in the dashboard: /admin`,
  });
}

export interface AdminRequest {
  id: string;
  type: RequestType;
  message: string | null;
  createdAt: number;
  bookingId: string;
  bookingDate: string;
  bookingTime: string;
  packageName: string;
  players: number;
  amount: string;
  policy: CustomerBooking["policy"];
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
}

/** Solicitudes abiertas, para /admin. */
export async function listOpenRequests(): Promise<AdminRequest[]> {
  const db = getDb();
  const snap = await db.collection(COLLECTIONS.bookingRequests).where("status", "==", "open").get();
  const out: AdminRequest[] = [];
  for (const d of snap.docs) {
    const r = d.data() as BookingRequestDoc;
    const b = (await db.collection(COLLECTIONS.bookings).doc(r.bookingId).get()).data() as BookingDoc | undefined;
    if (!b) continue;
    out.push({
      id: d.id,
      type: r.type,
      message: r.message,
      createdAt: r.createdAt,
      bookingId: r.bookingId,
      bookingDate: b.date,
      bookingTime: formatTime(b.startMin),
      packageName: getPackage(b.packageId)?.name ?? b.packageId,
      players: b.players,
      amount: formatPrice(b.amountCents),
      policy: policyFor(hoursUntil(b)),
      customerName: b.customer?.name ?? null,
      customerEmail: b.customer?.email ?? null,
      customerPhone: b.customer?.phone ?? null,
    });
  }
  return out.sort((a, b) => a.createdAt - b.createdAt);
}

/** Los duenos marcan una solicitud como atendida. */
export async function resolveRequest(id: unknown): Promise<void> {
  if (typeof id !== "string" || !id) throw new RequestError("invalid", "Invalid request.");
  const db = getDb();
  const ref = db.collection(COLLECTIONS.bookingRequests).doc(id);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const r = snap.data() as BookingRequestDoc | undefined;
    if (!r) throw new RequestError("not_found", "Request not found.", 404);
    tx.update(ref, { status: "done", resolvedAt: Date.now() });
    tx.update(db.collection(COLLECTIONS.bookings).doc(r.bookingId), { requestStatus: "done" });
  });
}
