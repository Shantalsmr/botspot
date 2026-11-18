import "server-only";
import { COLLECTIONS, getDb, isDatabaseConfigured } from "@botspot/database";
import { nowInProvo } from "../catalog";
import { getStripe, isStripeConfigured } from "../lib/stripe";
import type { LocationId, TerminalSaleDoc } from "./terminal.service";

/**
 * Sincroniza las ventas de las terminales del local con el panel /admin (coleccion terminalSales).
 *
 *  - Clover (API REST v3): se activa al definir CLOVER_API_TOKEN y CLOVER_MERCHANT_ID
 *    (y CLOVER_ENV=sandbox para pruebas). El token se crea en el panel de Clover:
 *    Account & Setup → API Tokens, con permiso de lectura de "Payments".
 *  - Stripe Terminal: usa la misma STRIPE_SECRET_KEY; solo toma cobros con tarjeta presente
 *    (card_present), asi nunca cuenta los pagos en linea del sitio.
 *
 * Cada pago se guarda con id "clover_<id>" o "stripe_<id>": volver a sincronizar no duplica nada,
 * solo actualiza (p. ej. si hubo un reembolso). Corre a diario (cron de Vercel) o con el boton
 * "Sync now" del panel.
 */

export type SyncProvider = "clover" | "stripe";

export interface ProviderStatus {
  provider: SyncProvider;
  label: string;
  configured: boolean;
  lastSyncAt: number | null;
  lastCount: number | null;
  lastError: string | null;
  /** Que falta para activarlo (si no esta configurado). */
  setupHint: string | null;
}

interface SyncState {
  lastSyncAt: number;
  lastCount: number;
  lastError: string | null;
}

/** Al sincronizar por primera vez se traen los ultimos 35 dias (cubre el mes del panel). */
const FIRST_SYNC_DAYS = 35;
/** En cada sincronizacion se repasa 1 dia hacia atras para captar reembolsos y ventas tardias. */
const OVERLAP_MS = 24 * 60 * 60 * 1000;
const STATE_DOC = "terminalSync";
/** Ubicacion por defecto de las terminales (la arena de Provo). Cambiable con TERMINAL_LOCATION=orem. */
const defaultLocation = (): LocationId => (process.env.TERMINAL_LOCATION === "orem" ? "orem" : "provo");

export function isCloverConfigured(): boolean {
  return Boolean(process.env.CLOVER_API_TOKEN && process.env.CLOVER_MERCHANT_ID);
}

function cloverBaseUrl(): string {
  // CLOVER_API_BASE solo para pruebas (servidor falso) o regiones de Clover fuera de EE. UU.
  if (process.env.CLOVER_API_BASE) return process.env.CLOVER_API_BASE.replace(/\/$/, "");
  return process.env.CLOVER_ENV === "sandbox" ? "https://apisandbox.dev.clover.com" : "https://api.clover.com";
}

const stateRef = () => getDb().collection(COLLECTIONS.system).doc(STATE_DOC);

async function readState(): Promise<Partial<Record<SyncProvider, SyncState>>> {
  const snap = await stateRef().get();
  return (snap.data() as Partial<Record<SyncProvider, SyncState>> | undefined) ?? {};
}

async function writeState(provider: SyncProvider, state: SyncState): Promise<void> {
  await stateRef().set({ [provider]: state }, { merge: true });
}

function sinceMs(state: SyncState | undefined): number {
  const first = Date.now() - FIRST_SYNC_DAYS * 24 * 60 * 60 * 1000;
  return state && !state.lastError ? Math.max(first, state.lastSyncAt - OVERLAP_MS) : first;
}

/** Guarda (o actualiza) las ventas por lotes; las que quedan en $0 por reembolso total se borran. */
async function upsertSales(rows: { id: string; doc: TerminalSaleDoc }[]): Promise<void> {
  const db = getDb();
  const col = db.collection(COLLECTIONS.terminalSales);
  for (let i = 0; i < rows.length; i += 400) {
    const batch = db.batch();
    for (const { id, doc } of rows.slice(i, i + 400)) {
      if (doc.amountCents > 0) batch.set(col.doc(id), doc);
      else batch.delete(col.doc(id));
    }
    await batch.commit();
  }
}

// ---------- Clover ----------

interface CloverPayment {
  id: string;
  amount: number;
  tipAmount?: number;
  createdTime: number;
  result?: string;
  refunds?: { elements?: { amount: number }[] };
  device?: { id: string };
}

async function fetchCloverPayments(from: number): Promise<CloverPayment[]> {
  const mId = process.env.CLOVER_MERCHANT_ID!;
  const out: CloverPayment[] = [];
  const limit = 1000;
  for (let offset = 0; offset < 50_000; offset += limit) {
    const url = new URL(`${cloverBaseUrl()}/v3/merchants/${encodeURIComponent(mId)}/payments`);
    url.searchParams.append("filter", `createdTime>=${from}`);
    url.searchParams.set("expand", "refunds");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));
    const res = await fetch(url, { headers: { Authorization: `Bearer ${process.env.CLOVER_API_TOKEN}` } });
    if (!res.ok) {
      const hint = res.status === 401 ? " (check CLOVER_API_TOKEN)" : res.status === 404 ? " (check CLOVER_MERCHANT_ID)" : "";
      throw new Error(`Clover respondio ${res.status}${hint}`);
    }
    const body = (await res.json()) as { elements?: CloverPayment[] };
    const page = body.elements ?? [];
    out.push(...page);
    if (page.length < limit) break;
  }
  return out;
}

async function syncClover(from: number): Promise<number> {
  const payments = await fetchCloverPayments(from);
  const rows = payments
    .filter((p) => !p.result || p.result === "SUCCESS")
    .map((p) => {
      const refunded = (p.refunds?.elements ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);
      const tip = p.tipAmount ?? 0;
      const doc: TerminalSaleDoc = {
        date: nowInProvo(new Date(p.createdTime)).date,
        amountCents: p.amount + tip - refunded,
        location: defaultLocation(),
        note: [tip ? `tip ${(tip / 100).toFixed(2)}` : null, refunded ? `refunded ${(refunded / 100).toFixed(2)}` : null]
          .filter(Boolean)
          .join(" · ") || null,
        createdAt: p.createdTime,
        source: "clover",
        externalId: p.id,
      };
      return { id: `clover_${p.id}`, doc };
    });
  await upsertSales(rows);
  return rows.length;
}

// ---------- Stripe Terminal ----------

async function syncStripeTerminal(from: number): Promise<number> {
  const rows: { id: string; doc: TerminalSaleDoc }[] = [];
  for await (const charge of getStripe().charges.list({ created: { gte: Math.floor(from / 1000) }, limit: 100 })) {
    if (charge.payment_method_details?.type !== "card_present" || !charge.paid) continue;
    rows.push({
      id: `stripe_${charge.id}`,
      doc: {
        date: nowInProvo(new Date(charge.created * 1000)).date,
        amountCents: charge.amount_captured - charge.amount_refunded,
        location: defaultLocation(),
        note: charge.amount_refunded ? `refunded ${(charge.amount_refunded / 100).toFixed(2)}` : null,
        createdAt: charge.created * 1000,
        source: "stripe",
        externalId: charge.id,
      },
    });
  }
  await upsertSales(rows);
  return rows.length;
}

// ---------- Publico ----------

const PROVIDERS: { provider: SyncProvider; label: string; configured: () => boolean; hint: string; run: (from: number) => Promise<number> }[] = [
  {
    provider: "clover",
    label: "Clover",
    configured: isCloverConfigured,
    hint: "Add CLOVER_API_TOKEN and CLOVER_MERCHANT_ID in Vercel to connect.",
    run: syncClover,
  },
  {
    provider: "stripe",
    label: "Stripe Terminal",
    configured: isStripeConfigured,
    hint: "Uses the Stripe account already connected. Sales appear once a Stripe card reader is used.",
    run: syncStripeTerminal,
  },
];

export async function getTerminalSyncStatus(): Promise<ProviderStatus[]> {
  const state = isDatabaseConfigured() ? await readState() : {};
  return PROVIDERS.map((p) => {
    const s = state[p.provider];
    const configured = p.configured();
    return {
      provider: p.provider,
      label: p.label,
      configured,
      lastSyncAt: s?.lastSyncAt ?? null,
      lastCount: s?.lastCount ?? null,
      lastError: s?.lastError ?? null,
      setupHint: configured ? null : p.hint,
    };
  });
}

/** Sincroniza todas las terminales configuradas. Un error en una no detiene la otra. */
export async function syncTerminalSales(): Promise<ProviderStatus[]> {
  if (!isDatabaseConfigured()) throw new Error("Database is not configured.");
  const state = await readState();
  for (const p of PROVIDERS) {
    if (!p.configured()) continue;
    const startedAt = Date.now();
    try {
      const count = await p.run(sinceMs(state[p.provider]));
      await writeState(p.provider, { lastSyncAt: startedAt, lastCount: count, lastError: null });
    } catch (error) {
      console.error(`[terminal-sync:${p.provider}]`, error);
      await writeState(p.provider, {
        lastSyncAt: startedAt,
        lastCount: 0,
        lastError: error instanceof Error ? error.message : "Sync failed",
      });
    }
  }
  return getTerminalSyncStatus();
}
