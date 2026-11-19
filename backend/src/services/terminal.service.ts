import "server-only";
import { COLLECTIONS, getDb, isDatabaseConfigured } from "@botspot/database";
import { isValidDate, nowInProvo } from "../catalog";
import { formatMoney } from "../shop";

/**
 * Ventas cobradas en las terminales del local. Llegan de dos formas:
 *  - automaticas: terminal-sync.service.ts las trae de Clover o Stripe Terminal (source "clover" / "stripe");
 *  - manuales: los duenos las registran en /admin mientras no haya conexion (source "manual").
 * El panel las suma como ingresos de "Terminal".
 */

export const LOCATIONS = {
  provo: "Provo arena",
  orem: "Orem (STEM classes)",
} as const;

export type LocationId = keyof typeof LOCATIONS;

const SOURCE_LABELS = { manual: "Added by hand", clover: "Clover (auto)", stripe: "Stripe Terminal (auto)" } as const;

export interface TerminalSaleDoc {
  /** Dia de la venta (YYYY-MM-DD, hora de Provo). */
  date: string;
  amountCents: number;
  location: LocationId;
  note: string | null;
  createdAt: number;
  /** De donde vino el registro. Los registros viejos sin campo son manuales. */
  source?: "manual" | "clover" | "stripe";
  /** Id del pago en Clover o Stripe (solo automaticas). */
  externalId?: string;
}

export interface TerminalSale extends TerminalSaleDoc {
  id: string;
  amount: string;
  locationLabel: string;
  sourceLabel: string;
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
    source: "manual",
  };
  const ref = await getDb().collection(COLLECTIONS.terminalSales).add(doc);
  return { id: ref.id };
}

export async function deleteTerminalSale(id: unknown): Promise<void> {
  // Solo se borran registros manuales; los automaticos volverian en la siguiente sincronizacion.
  if (typeof id !== "string" || !/^[A-Za-z0-9]{10,40}$/.test(id)) throw new TerminalError("invalid_id", "Invalid sale.");
  await getDb().collection(COLLECTIONS.terminalSales).doc(id).delete();
}

/** Ventas de la terminal desde una fecha (incluida). */
export async function listTerminalSales(fromDate: string): Promise<TerminalSale[]> {
  const snap = await getDb().collection(COLLECTIONS.terminalSales).where("date", ">=", fromDate).get();
  return snap.docs
    .map((d) => {
      const s = d.data() as TerminalSaleDoc;
      return {
        id: d.id,
        ...s,
        amount: formatMoney(s.amountCents),
        locationLabel: LOCATIONS[s.location] ?? s.location,
        sourceLabel: SOURCE_LABELS[s.source ?? "manual"],
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}
