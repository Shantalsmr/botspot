import "server-only";
import { COLLECTIONS, getDb, isDatabaseConfigured } from "@botspot/database";
import { isEventDuration, isEventGroupSize, type EventGroupSize } from "../catalog";
import { QUOTE_TEMPLATES, buildQuote, type EventKind, type QuoteLine } from "../event-quotes";
import { OWNER_EMAIL, sendEmail } from "../lib/email";
import type { Customer } from "./customer.service";
import { hasCustomerAccount } from "./customer.service";

/**
 * Cotizaciones de eventos que los duenos mandan a la cuenta del cliente (/account), con una
 * conversacion: el cliente puede aceptar, rechazar o preguntar, y los duenos contestan desde /admin.
 * Funciona aunque todavia no salgan correos (Resend): la cotizacion se guarda y se ve en la cuenta.
 * Se relaciona con el cliente por correo, asi que si aun no tiene cuenta la vera al crearla con ese correo.
 */

export type QuoteStatus = "sent" | "accepted" | "declined";

export interface QuoteMessage {
  from: "owner" | "customer";
  text: string;
  at: number;
}

export interface EventQuoteDoc {
  email: string;
  name: string;
  inquiryId: string | null;
  kind: EventKind;
  groupSize: EventGroupSize;
  hours: number;
  miles: number;
  eventAddress: string | null;
  lines: QuoteLine[];
  /** null = parte del precio se definio a mano (se explica en el mensaje). */
  totalCents: number | null;
  status: QuoteStatus;
  messages: QuoteMessage[];
  /** Quien debe contestar ahora (para resaltar en /admin lo pendiente). */
  awaiting: "owner" | "customer";
  createdAt: number;
  updatedAt: number;
}

export interface EventQuote extends EventQuoteDoc {
  id: string;
  kindLabel: string;
}

export interface AdminEventQuote extends EventQuote {
  /** Si el cliente ya tiene cuenta con ese correo (si no, la vera cuando la cree). */
  hasAccount: boolean;
}

export class QuoteError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGES = 60;
const quotes = () => getDb().collection(COLLECTIONS.eventQuotes);

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function assertReady(): void {
  if (!isDatabaseConfigured()) throw new QuoteError("unavailable", "The database is not connected.", 503);
}

function toQuote(id: string, d: EventQuoteDoc): EventQuote {
  return { id, ...d, kindLabel: QUOTE_TEMPLATES[d.kind]?.label ?? d.kind };
}

/** Los duenos mandan una cotizacion a la cuenta del cliente. El precio se recalcula aqui (servidor). */
export async function sendEventQuote(input: Record<string, unknown>, origin: string): Promise<{ id: string; hasAccount: boolean }> {
  assertReady();
  const email = clean(input.email, 160).toLowerCase();
  const name = clean(input.name, 120);
  const message = clean(input.message, 6000);
  const kind = typeof input.kind === "string" && input.kind in QUOTE_TEMPLATES ? (input.kind as EventKind) : null;
  if (!EMAIL_RE.test(email)) throw new QuoteError("invalid_email", "Add the customer's email so it reaches their account.");
  if (!name) throw new QuoteError("invalid_name", "Add the customer's name.");
  if (!kind || !isEventGroupSize(input.groupSize) || !isEventDuration(input.hours)) {
    throw new QuoteError("invalid_quote", "Check the template, people and hours.");
  }
  if (!message) throw new QuoteError("invalid_message", "The message is empty.");
  const miles = Math.min(Math.max(Number(input.miles) || 0, 0), 2000);
  const hours = Number(input.hours);

  const quote = buildQuote({ kind, groupSize: input.groupSize, miles, hours });
  const now = Date.now();
  const doc: EventQuoteDoc = {
    email,
    name,
    inquiryId: clean(input.inquiryId, 80) || null,
    kind,
    groupSize: input.groupSize,
    hours,
    miles,
    eventAddress: clean(input.eventAddress, 200) || null,
    lines: quote.lines,
    totalCents: quote.totalCents,
    status: "sent",
    messages: [{ from: "owner", text: message, at: now }],
    awaiting: "customer",
    createdAt: now,
    updatedAt: now,
  };
  const ref = await quotes().add(doc);

  // Aviso por correo (solo si Resend esta configurado). La cotizacion igual queda en la cuenta.
  await sendEmail({
    to: email,
    replyTo: OWNER_EMAIL,
    subject: "Your mobile arena quote from The Bot Spot",
    text: `Hi ${name.split(/\s+/)[0]},\n\nWe sent your quote to your Bot Spot account. Sign in (or create an account with this email) to see it and reply:\n${origin}/account\n\nThe Bot Spot`,
  });
  return { id: ref.id, hasAccount: await hasCustomerAccount(email) };
}

/** Los duenos contestan en la conversacion de una cotizacion. */
export async function replyToEventQuote(input: { id?: unknown; text?: unknown }): Promise<void> {
  assertReady();
  const text = clean(input.text, 3000);
  if (typeof input.id !== "string" || !input.id) throw new QuoteError("invalid", "Invalid quote.");
  if (!text) throw new QuoteError("invalid_message", "Write a message first.");
  const ref = quotes().doc(input.id);
  const email = await getDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const q = snap.data() as EventQuoteDoc | undefined;
    if (!q) throw new QuoteError("not_found", "Quote not found.", 404);
    if (q.messages.length >= MAX_MESSAGES) throw new QuoteError("too_long", "This conversation is too long. Please call the customer.");
    const now = Date.now();
    tx.update(ref, { messages: [...q.messages, { from: "owner", text, at: now }], awaiting: "customer", updatedAt: now });
    return q.email;
  });
  await sendEmail({
    to: email,
    replyTo: OWNER_EMAIL,
    subject: "New message about your Bot Spot quote",
    text: `We replied to your quote. Sign in to your Bot Spot account to read it.\n\nThe Bot Spot`,
  });
}

/** Cotizaciones de un cliente (por su correo), la mas reciente primero. */
export async function listCustomerQuotes(customer: Customer): Promise<EventQuote[]> {
  if (!isDatabaseConfigured()) return [];
  const snap = await quotes().where("email", "==", customer.email).get();
  return snap.docs.map((d) => toQuote(d.id, d.data() as EventQuoteDoc)).sort((a, b) => b.updatedAt - a.updatedAt);
}

/** El cliente acepta, rechaza o manda un mensaje sobre su cotizacion. */
export async function respondToEventQuote(
  customer: Customer,
  input: { id?: unknown; action?: unknown; text?: unknown },
): Promise<void> {
  assertReady();
  const action = input.action === "accept" || input.action === "decline" || input.action === "message" ? input.action : null;
  const text = clean(input.text, 2000);
  if (typeof input.id !== "string" || !input.id || !action) throw new QuoteError("invalid", "Invalid request.");
  if (action === "message" && !text) throw new QuoteError("invalid_message", "Write your message first.");

  const ref = quotes().doc(input.id);
  const q = await getDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const doc = snap.data() as EventQuoteDoc | undefined;
    if (!doc || doc.email !== customer.email) throw new QuoteError("not_found", "Quote not found.", 404);
    if (doc.messages.length >= MAX_MESSAGES) throw new QuoteError("too_long", "Please call us to keep talking about this quote.");
    if (action !== "message" && doc.status !== "sent") throw new QuoteError("already", "You already answered this quote.");
    const auto = action === "accept" ? "✅ I accept this quote." : action === "decline" ? "❌ No thanks, I'll pass for now." : "";
    const now = Date.now();
    tx.update(ref, {
      messages: [...doc.messages, { from: "customer", text: [auto, text].filter(Boolean).join("\n\n"), at: now }],
      status: action === "accept" ? "accepted" : action === "decline" ? "declined" : doc.status,
      awaiting: "owner",
      updatedAt: now,
    });
    return doc;
  });

  await sendEmail({
    to: OWNER_EMAIL,
    replyTo: customer.email,
    subject: `Quote ${action === "accept" ? "ACCEPTED" : action === "decline" ? "declined" : "question"}: ${q.name}`,
    text: `${customer.name} (${customer.email}, ${customer.phone}) ${action === "accept" ? "accepted" : action === "decline" ? "declined" : "replied to"} their quote.\n\n${text || ""}\n\nReply in the dashboard: /admin`,
  });
}

/** Todas las cotizaciones recientes, para /admin (las que esperan respuesta de los duenos primero). */
export async function listEventQuotes(limit = 100): Promise<AdminEventQuote[]> {
  if (!isDatabaseConfigured()) return [];
  const snap = await quotes().orderBy("updatedAt", "desc").limit(limit).get();
  const list = snap.docs.map((d) => toQuote(d.id, d.data() as EventQuoteDoc));
  const accounts = new Map<string, boolean>();
  await Promise.all(
    [...new Set(list.map((q) => q.email))].map(async (e) => accounts.set(e, await hasCustomerAccount(e))),
  );
  return list
    .map((q) => ({ ...q, hasAccount: accounts.get(q.email) ?? false }))
    .sort((a, b) => Number(b.awaiting === "owner") - Number(a.awaiting === "owner") || b.updatedAt - a.updatedAt);
}

/** Solicitud de evento del cliente que todavia no tiene cotizacion (para mostrarla como pendiente en /account). */
export interface PendingEventRequest {
  id: string;
  eventType: string | null;
  groupSize: string | null;
  hours: number | null;
  eventAddress: string | null;
  createdAt: number;
}

/**
 * Solicitudes de /events hechas con el correo del cliente que aun esperan cotizacion.
 * Una solicitud deja de estar pendiente cuando los duenos le mandan una cotizacion ligada a ella.
 */
export async function listPendingEventRequests(customer: Customer): Promise<PendingEventRequest[]> {
  if (!isDatabaseConfigured()) return [];
  const [inquirySnap, quoteSnap] = await Promise.all([
    getDb().collection(COLLECTIONS.inquiries).where("email", "==", customer.email).get(),
    quotes().where("email", "==", customer.email).get(),
  ]);
  const quoted = new Set(quoteSnap.docs.map((d) => (d.data() as EventQuoteDoc).inquiryId).filter(Boolean));
  return inquirySnap.docs
    .filter((d) => d.get("type") === "corporate" && !quoted.has(d.id))
    .map((d) => ({
      id: d.id,
      eventType: (d.get("eventType") as string | null) ?? null,
      groupSize: (d.get("groupSize") as string | null) ?? null,
      hours: (d.get("hours") as number | null) ?? null,
      eventAddress: (d.get("eventAddress") as string | null) ?? null,
      createdAt: d.get("createdAt") as number,
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
}
