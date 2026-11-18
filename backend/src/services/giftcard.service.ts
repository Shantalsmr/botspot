import "server-only";
import { randomInt } from "node:crypto";
import { COLLECTIONS, getDb, isDatabaseConfigured } from "@botspot/database";
import { formatMoney, type Credit } from "../shop";

type Firestore = ReturnType<typeof getDb>;
type Transaction = Parameters<Parameters<Firestore["runTransaction"]>[0]>[0];

/**
 * Gift cards y paquetes de tickets. Cada unidad pagada en la tienda genera un codigo unico
 * (id del documento = codigo, p. ej. "BOT-7KQ2-M9XP") con saldo:
 *  - kind "money":   saldo en centavos; se usa en el local o al reservar en linea.
 *  - kind "tickets": tickets de juego (5 min c/u); se usan en el local.
 * Cada movimiento queda en `history` (canje en el local, uso en linea o devolucion).
 */

export type GiftKind = Credit["kind"];

export interface GiftMovement {
  at: number;
  /** Positivo = se desconto; negativo = se devolvio (p. ej. una reserva en linea que no se pago). */
  amount: number;
  channel: "store" | "online";
  ref: string | null;
  note: string | null;
}

export interface GiftCardDoc {
  kind: GiftKind;
  /** Centavos (money) o tickets. */
  initial: number;
  balance: number;
  productId: string;
  orderId: string;
  purchaserEmail: string | null;
  createdAt: number;
  history: GiftMovement[];
}

export interface GiftCardSummary {
  code: string;
  kind: GiftKind;
  initial: number;
  balance: number;
  /** "$35 of $50" o "6 of 10 tickets". */
  balanceLabel: string;
  orderId: string;
  purchaserEmail: string | null;
  createdAt: number;
  history: GiftMovement[];
}

export interface IssuedCode {
  code: string;
  productId: string;
  name: string;
  kind: GiftKind;
  amount: number;
}

export class GiftCardError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

// Sin letras/numeros que se confunden (0/O, 1/I/L).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomBlock(): string {
  let s = "";
  for (let i = 0; i < 4; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return s;
}

export function generateCode(): string {
  return `BOT-${randomBlock()}-${randomBlock()}`;
}

/** Acepta "bot 7kq2m9xp", "BOT-7KQ2-M9XP", etc. Devuelve null si no tiene forma de codigo. */
export function normalizeCode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  let raw = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (raw.startsWith("BOT")) raw = raw.slice(3);
  if (raw.length !== 8) return null;
  return `BOT-${raw.slice(0, 4)}-${raw.slice(4)}`;
}

export function formatBalance(kind: GiftKind, amount: number): string {
  if (kind === "money") return formatMoney(amount);
  return `${amount} ${amount === 1 ? "ticket" : "tickets"}`;
}

function toSummary(code: string, g: GiftCardDoc): GiftCardSummary {
  return {
    code,
    kind: g.kind,
    initial: g.initial,
    balance: g.balance,
    balanceLabel: `${formatBalance(g.kind, g.balance)} of ${formatBalance(g.kind, g.initial)}`,
    orderId: g.orderId,
    purchaserEmail: g.purchaserEmail,
    createdAt: g.createdAt,
    history: g.history,
  };
}

function ready(): Firestore {
  if (!isDatabaseConfigured()) {
    throw new GiftCardError("unavailable", "Gift cards are temporarily unavailable. Please call us.", 503);
  }
  return getDb();
}

function cardRef(db: Firestore, code: string) {
  return db.collection(COLLECTIONS.giftCards).doc(code);
}

/**
 * Crea los codigos de un pedido pagado, dentro de la transaccion que lo marca como pagado
 * (asi nunca se generan dos veces). Solo escribe: llamar despues de todas las lecturas.
 */
export function issueCodesInTx(
  tx: Transaction,
  db: Firestore,
  orderId: string,
  purchaserEmail: string | null,
  units: { productId: string; name: string; credit: Credit }[],
): IssuedCode[] {
  const now = Date.now();
  return units.map((u) => {
    const code = generateCode();
    const amount = u.credit.kind === "money" ? u.credit.cents : u.credit.count;
    const doc: GiftCardDoc = {
      kind: u.credit.kind,
      initial: amount,
      balance: amount,
      productId: u.productId,
      orderId,
      purchaserEmail,
      createdAt: now,
      history: [],
    };
    // create() falla si el codigo ya existiera (probabilidad ~1 en 10^12): la transaccion se reintenta.
    tx.create(cardRef(db, code), doc);
    return { code, productId: u.productId, name: u.name, kind: u.credit.kind, amount };
  });
}

/** Busca un codigo (panel /admin). */
export async function lookupGiftCard(input: unknown): Promise<GiftCardSummary> {
  const db = ready();
  const code = normalizeCode(input);
  if (!code) throw new GiftCardError("invalid_code", "That doesn't look like a Bot Spot code (BOT-XXXX-XXXX).");
  const snap = await cardRef(db, code).get();
  if (!snap.exists) throw new GiftCardError("not_found", "Code not found. Check it and try again.", 404);
  return toSummary(code, snap.data() as GiftCardDoc);
}

/** Canje en el local: descuenta dolares (money) o tickets. `amount` en centavos o tickets. */
export async function redeemInStore(input: unknown, amount: unknown, note: unknown): Promise<GiftCardSummary> {
  const db = ready();
  const code = normalizeCode(input);
  if (!code) throw new GiftCardError("invalid_code", "That doesn't look like a Bot Spot code (BOT-XXXX-XXXX).");
  const value = Number(amount);
  if (!Number.isInteger(value) || value <= 0) throw new GiftCardError("invalid_amount", "Enter an amount to redeem.");
  const ref = cardRef(db, code);
  const updated = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new GiftCardError("not_found", "Code not found.", 404);
    const g = snap.data() as GiftCardDoc;
    if (value > g.balance) {
      throw new GiftCardError("insufficient", `Only ${formatBalance(g.kind, g.balance)} left on this code.`);
    }
    const movement: GiftMovement = {
      at: Date.now(),
      amount: value,
      channel: "store",
      ref: null,
      note: typeof note === "string" ? note.trim().slice(0, 200) || null : null,
    };
    const next: GiftCardDoc = { ...g, balance: g.balance - value, history: [...g.history, movement] };
    tx.set(ref, next);
    return next;
  });
  return toSummary(code, updated);
}

/** Para el formulario de reservas: cuanto saldo en dolares tiene una gift card. */
export async function checkGiftCardForBooking(input: unknown): Promise<{ code: string; balanceCents: number }> {
  const db = ready();
  const code = normalizeCode(input);
  if (!code) throw new GiftCardError("invalid_code", "That doesn't look like a Bot Spot gift card code.");
  const snap = await cardRef(db, code).get();
  if (!snap.exists) throw new GiftCardError("not_found", "Gift card not found. Check the code and try again.", 404);
  const g = snap.data() as GiftCardDoc;
  if (g.kind !== "money") {
    throw new GiftCardError("tickets_in_store", "Game tickets are used at the front desk, not for online bookings.");
  }
  if (g.balance <= 0) throw new GiftCardError("empty", "This gift card has no balance left.");
  return { code, balanceCents: g.balance };
}

/**
 * Lee la gift card dentro de una transaccion de reserva (lectura: llamar antes de escribir).
 * Devuelve una funcion que aplica el descuento (escritura) o lanza error si no sirve.
 */
export async function readGiftCardInTx(
  tx: Transaction,
  db: Firestore,
  code: string,
): Promise<{ balanceCents: number; apply: (cents: number, bookingId: string) => void }> {
  const ref = cardRef(db, code);
  const snap = await tx.get(ref);
  if (!snap.exists) throw new GiftCardError("not_found", "Gift card not found.", 404);
  const g = snap.data() as GiftCardDoc;
  if (g.kind !== "money" || g.balance <= 0) throw new GiftCardError("empty", "This gift card has no balance left.");
  return {
    balanceCents: g.balance,
    apply: (cents, bookingId) => {
      const movement: GiftMovement = { at: Date.now(), amount: cents, channel: "online", ref: bookingId, note: null };
      tx.set(ref, { ...g, balance: g.balance - cents, history: [...g.history, movement] });
    },
  };
}

/** Devuelve saldo a una gift card (reserva en linea que no se termino de pagar). */
export async function refundGiftCard(code: string, cents: number, bookingId: string): Promise<void> {
  const db = getDb();
  const ref = cardRef(db, code);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const g = snap.data() as GiftCardDoc;
    // Evita devolver dos veces lo mismo.
    if (g.history.some((m) => m.ref === bookingId && m.amount < 0)) return;
    const movement: GiftMovement = { at: Date.now(), amount: -cents, channel: "online", ref: bookingId, note: "Booking not paid" };
    tx.set(ref, { ...g, balance: g.balance + cents, history: [...g.history, movement] });
  });
}
