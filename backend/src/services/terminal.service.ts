import "server-only";
import { COLLECTIONS, getDb, isDatabaseConfigured } from "@botspot/database";
import { isValidDate, nowInProvo } from "../catalog";
import { formatMoney } from "../shop";

/**
 * Ventas cobradas en la terminal del local (Clover). Clover no esta conectado al sitio, asi que
 * los duenos registran el total del dia (o cada venta) en /admin y el panel lo suma a los ingresos.
 * Si en el futuro usan Stripe Terminal, estas ventas se podrian leer solas desde Stripe.
 */

export const LOCATIONS = {
  provo: "Provo arena",
  orem: "Orem (STEAM classes)",
} as const;

export type LocationId = keyof typeof LOCATIONS;

export interface TerminalSaleDoc {
  /** Dia de la venta (YYYY-MM-DD, hora de Provo). */
  date: string;
  amountCents: number;
  location: LocationId;
  note: string | null;
  createdAt: number;
}

export interface TerminalSale extends TerminalSaleDoc {
  id: string;
  amount: string;
  locationLabel: string;
}

export class TerminalError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

export interface TerminalSaleInput {
  date?: unknown;
  /** Dolares, p. ej. "245.50". */
  amount?: unknown;
  location?: unknown;
  note?: unknown;
}

/** Registra una venta (o el total del dia) de la terminal. */
export async function addTerminalSale(input: TerminalSaleInput): Promise<{ id: string }> {
  if (!isDatabaseConfigured()) throw new TerminalError("unavailable", "Database is not configured.", 503);
  const date = typeof input.date === "string" && isValidDate(input.date) ? input.date : null;
  if (!date) throw new TerminalError("invalid_date", "Choose the day of the sale.");
  if (date > nowInProvo().date) throw new TerminalError("invalid_date", "The date can't be in the future.");
  const dollars = Number(String(input.amount ?? "").replace(/[$,\s]/g, ""));
  const amountCents = Math.round(dollars * 100);
  if (!Number.isFinite(dollars) || amountCents <= 0 || amountCents > 10_000_000) {
    throw new TerminalError("invalid_amount", "Enter the amount in dollars, for example 245.50.");
  }
  const location: LocationId = input.location === "orem" ? "orem" : "provo";
  const doc: TerminalSaleDoc = {
    date,
    amountCents,
    location,
    note: typeof input.note === "string" ? input.note.trim().slice(0, 200) || null : null,
    createdAt: Date.now(),
  };
  const ref = await getDb().collection(COLLECTIONS.terminalSales).add(doc);
  return { id: ref.id };
}

export async function deleteTerminalSale(id: unknown): Promise<void> {
  if (typeof id !== "string" || !/^[A-Za-z0-9]{10,40}$/.test(id)) throw new TerminalError("invalid_id", "Invalid sale.");
  await getDb().collection(COLLECTIONS.terminalSales).doc(id).delete();
}

/** Ventas de la terminal desde una fecha (incluida). */
export async function listTerminalSales(fromDate: string): Promise<TerminalSale[]> {
  const snap = await getDb().collection(COLLECTIONS.terminalSales).where("date", ">=", fromDate).get();
  return snap.docs
    .map((d) => {
      const s = d.data() as TerminalSaleDoc;
      return { id: d.id, ...s, amount: formatMoney(s.amountCents), locationLabel: LOCATIONS[s.location] ?? s.location };
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}
