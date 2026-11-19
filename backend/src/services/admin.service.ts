import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { COLLECTIONS, getDb, isDatabaseConfigured } from "@botspot/database";
import { addDays, formatPrice, formatTime, getPackage, nowInProvo } from "../catalog";
import type { BookingDoc } from "./booking.service";
import { listOpenRequests, type AdminRequest } from "./booking-request.service";
import { listInquiries, type InquirySummary } from "./inquiry.service";
import { listEventQuotes, type AdminEventQuote } from "./event-quote.service";
import { listPaidOrders, type OrderSummary } from "./order.service";
import { listTerminalSales, type TerminalSale } from "./terminal.service";
import { getTerminalSyncStatus, type ProviderStatus } from "./terminal-sync.service";

/**
 * Panel /admin para los duenos: una sola contrasena (ADMIN_PASSWORD) y una cookie firmada.
 * Cambiar ADMIN_PASSWORD en Vercel cierra todas las sesiones abiertas.
 */

export const ADMIN_COOKIE = "botspot_admin";
const SESSION_DAYS = 30;
export const ADMIN_SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60;
const MAX_FAILED = 10;
const LOCK_WINDOW_MS = 15 * 60_000;

export class AdminError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

function adminPassword(): string | null {
  const p = process.env.ADMIN_PASSWORD;
  return p && p.length >= 8 ? p : null;
}

export function isAdminConfigured(): boolean {
  return adminPassword() !== null && isDatabaseConfigured();
}

function signingKey(password: string): Buffer {
  return createHash("sha256").update(`botspot-admin:${password}`).digest();
}

function sign(payload: string, password: string): string {
  return createHmac("sha256", signingKey(password)).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Valida la cookie de sesion. */
export function verifyAdminSession(token: string | undefined): boolean {
  const password = adminPassword();
  if (!password || !token) return false;
  const [expires, sig] = token.split(".");
  if (!expires || !sig || Number(expires) < Date.now()) return false;
  return safeEqual(sig, sign(expires, password));
}

/** Revisa la contrasena (con bloqueo tras varios intentos fallidos) y devuelve el token de sesion. */
export async function loginAdmin(password: string, clientId: string): Promise<string> {
  const real = adminPassword();
  if (!real || !isDatabaseConfigured()) {
    throw new AdminError("not_configured", "The admin panel is not set up yet (ADMIN_PASSWORD is missing).", 503);
  }
  const ref = getDb().collection(COLLECTIONS.adminLoginAttempts).doc(clientId);
  const snap = await ref.get();
  const now = Date.now();
  const recent = ((snap.data()?.failures as number[] | undefined) ?? []).filter((t) => t > now - LOCK_WINDOW_MS);
  if (recent.length >= MAX_FAILED) {
    throw new AdminError("locked", "Too many attempts. Please wait 15 minutes and try again.", 429);
  }
  const hashedInput = createHash("sha256").update(password).digest("hex");
  const hashedReal = createHash("sha256").update(real).digest("hex");
  if (!safeEqual(hashedInput, hashedReal)) {
    await ref.set({ failures: [...recent, now] });
    throw new AdminError("wrong_password", "Wrong password.", 401);
  }
  if (snap.exists) await ref.delete();
  const expires = String(now + ADMIN_SESSION_MAX_AGE * 1000);
  return `${expires}.${sign(expires, real)}`;
}

// ---------- Datos del panel ----------

export interface AdminBooking {
  id: string;
  date: string;
  time: string;
  packageName: string;
  players: number;
  amount: string;
  name: string | null;
  email: string | null;
  phone: string | null;
}

/** De donde viene el dinero. */
export type RevenueSource = "bookings" | "shop" | "terminal";

export interface SourceTotals {
  bookings: number;
  shop: number;
  terminal: number;
  total: number;
}

export interface DayRevenue extends SourceTotals {
  date: string;
  /** Reservas pagadas ese dia. */
  bookingCount: number;
  /** Pedidos de la tienda pagados ese dia. */
  orderCount: number;
}

export interface AdminDashboard {
  today: string;
  /** Ingresos (centavos) por origen: hoy, ultimos 7 dias y este mes. */
  todayTotals: SourceTotals;
  weekTotals: SourceTotals;
  monthTotals: SourceTotals;
  bookingsToday: number;
  playersToday: number;
  /** Ingresos de los ultimos 30 dias, por dia de pago (hora de Provo) y origen. */
  daily: DayRevenue[];
  upcoming: AdminBooking[];
  /** Solicitudes de cancelacion/cambio abiertas. */
  requests: AdminRequest[];
  inquiries: InquirySummary[];
  /** Cotizaciones de eventos enviadas a la cuenta del cliente, con su conversacion. */
  quotes: AdminEventQuote[];
  /** Ultimos pedidos pagados de la tienda. */
  orders: OrderSummary[];
  /** Ventas de la terminal (Clover) de este mes y los ultimos 30 dias. */
  terminalSales: TerminalSale[];
  /** Estado de la conexion automatica con Clover / Stripe Terminal. */
  terminalSync: ProviderStatus[];
}

function provoDate(ms: number): string {
  return nowInProvo(new Date(ms)).date;
}

function toAdminBooking(id: string, b: BookingDoc): AdminBooking {
  return {
    id,
    date: b.date,
    time: formatTime(b.startMin),
    packageName: getPackage(b.packageId)?.name ?? b.packageId,
    players: b.players,
    amount: formatPrice(b.amountCents),
    name: b.customer?.name ?? null,
    email: b.customer?.email ?? null,
    phone: b.customer?.phone ?? null,
  };
}

const emptyTotals = (): SourceTotals => ({ bookings: 0, shop: 0, terminal: 0, total: 0 });

/** Resumen para los duenos: ingresos por origen y por dia, reservas de hoy y proximas, y formularios. */
export async function getAdminDashboard(): Promise<AdminDashboard> {
  const today = nowInProvo().date;
  const monthStart = `${today.slice(0, 8)}01`;
  const weekStart = addDays(today, -6);
  const from30 = addDays(today, -29);

  const byDay = new Map<string, DayRevenue>();
  for (let i = 0; i < 30; i++) {
    const d = addDays(from30, i);
    byDay.set(d, { date: d, ...emptyTotals(), bookingCount: 0, orderCount: 0 });
  }
  const todayTotals = emptyTotals();
  const weekTotals = emptyTotals();
  const monthTotals = emptyTotals();

  /** Suma `cents` al dia y a los totales que correspondan. */
  function add(day: string, source: RevenueSource, cents: number): DayRevenue | undefined {
    for (const [from, totals] of [
      [today, todayTotals],
      [weekStart, weekTotals],
      [monthStart, monthTotals],
    ] as const) {
      if (day >= from) {
        totals[source] += cents;
        totals.total += cents;
      }
    }
    const slot = byDay.get(day);
    if (slot) {
      slot[source] += cents;
      slot.total += cents;
    }
    return slot;
  }

  // Reservas en linea: cuenta lo cobrado con tarjeta (la parte pagada con gift card ya se conto
  // cuando se vendio la gift card en la tienda).
  const snap = await getDb().collection(COLLECTIONS.bookings).where("status", "==", "paid").get();
  const paid = snap.docs.map((d) => ({ id: d.id, b: d.data() as BookingDoc }));
  for (const { b } of paid) {
    const slot = add(provoDate(b.paidAt ?? b.createdAt), "bookings", b.amountCents - (b.giftCents ?? 0));
    if (slot) slot.bookingCount += 1;
  }

  // Tienda en linea.
  const orders = await listPaidOrders();
  for (const o of orders) {
    const slot = add(provoDate(o.paidAt ?? o.createdAt), "shop", o.amountCents);
    if (slot) slot.orderCount += 1;
  }

  // Terminal del local (registrada a mano).
  const terminalSales = await listTerminalSales(monthStart < from30 ? monthStart : from30);
  for (const s of terminalSales) add(s.date, "terminal", s.amountCents);

  const upcomingDocs = paid
    .filter(({ b }) => b.date >= today && b.date <= addDays(today, 14))
    .sort((x, y) => x.b.date.localeCompare(y.b.date) || x.b.startMin - y.b.startMin);
  const todays = upcomingDocs.filter(({ b }) => b.date === today);

  return {
    today,
    todayTotals,
    weekTotals,
    monthTotals,
    bookingsToday: todays.length,
    playersToday: todays.reduce((n, { b }) => n + b.players, 0),
    daily: [...byDay.values()],
    upcoming: upcomingDocs.map(({ id, b }) => toAdminBooking(id, b)),
    requests: await listOpenRequests(),
    // Alto para que la lista de espera STEM salga completa (ademas de mensajes y eventos).
    inquiries: await listInquiries(500),
    quotes: await listEventQuotes(),
    orders: orders.slice(0, 30),
    terminalSales,
    terminalSync: await getTerminalSyncStatus(),
  };
}
