/**
 * Catalogo de reservas: paquetes, precios, horario y capacidad.
 * Modulo puro (sin "server-only"): lo usa el servidor para cobrar y validar,
 * y el formulario del navegador para mostrar precios y horarios.
 * Se importa como `@botspot/backend/catalog`.
 *
 * Datos confirmados por el negocio (Notion, nov. 2026).
 */

export const TIMEZONE = "America/Denver";
/** Personas jugando a la vez en las 2 arenas. */
export const MAX_CAPACITY = 16;
/** Las reservas empiezan cada 30 minutos. */
export const SLOT_STEP_MIN = 30;
/** Cuantos dias hacia adelante se puede reservar. */
export const BOOKING_WINDOW_DAYS = 60;
/** Minimo de minutos de anticipacion para reservar el mismo dia. */
export const SAME_DAY_LEAD_MIN = 30;
/** Precio por persona extra en grupos (1 hora). */
const EXTRA_PERSON_CENTS = 2500;

export type PackageId = "battle-30" | "battle-60" | "private-event";

export interface BookingPackage {
  id: PackageId;
  name: string;
  description: string;
  durationMin: number;
  minPlayers: number;
  maxPlayers: number;
  /** El evento privado cierra todo el local (ocupa toda la capacidad). */
  private: boolean;
}

export const PACKAGES: readonly BookingPackage[] = [
  {
    id: "battle-30",
    name: "Robot Battle · 30 min",
    description: "$15 per player.",
    durationMin: 30,
    minPlayers: 1,
    maxPlayers: MAX_CAPACITY,
    private: false,
  },
  {
    id: "battle-60",
    name: "Robot Battle · 1 hour",
    description: "$25 per player. Group rates: 4 players $90 · 8 players $150 · 16 players $280.",
    durationMin: 60,
    minPlayers: 1,
    maxPlayers: MAX_CAPACITY,
    private: false,
  },
  {
    id: "private-event",
    name: "Private Event · 2 hours",
    description: "The whole venue just for your group (up to about 24 guests). $400 flat.",
    durationMin: 120,
    minPlayers: 1,
    maxPlayers: 24,
    private: true,
  },
];

export function getPackage(id: string): BookingPackage | undefined {
  return PACKAGES.find((p) => p.id === id);
}

/** Paquetes de grupo de 1 hora (precio fijo). */
const GROUP_RATES = [
  { size: 4, cents: 9000 },
  { size: 8, cents: 15000 },
  { size: 16, cents: 28000 },
] as const;

/**
 * Precio total en centavos. Para 1 hora se elige automaticamente la opcion mas barata:
 * por persona, o un paquete de grupo + $25 por cada persona extra.
 */
export function priceCents(pkg: BookingPackage, players: number): number {
  if (pkg.id === "private-event") return 40000;
  if (pkg.id === "battle-30") return players * 1500;
  let best = players * EXTRA_PERSON_CENTS;
  for (const rate of GROUP_RATES) {
    const cost = rate.cents + Math.max(0, players - rate.size) * EXTRA_PERSON_CENTS;
    if (cost < best) best = cost;
  }
  return best;
}

/** Cuantos cupos de las arenas ocupa una reserva. */
export function occupancyFor(pkg: BookingPackage, players: number): number {
  return pkg.private ? MAX_CAPACITY : players;
}

/**
 * Horario de reservas por dia de la semana (0 = domingo), en minutos desde medianoche.
 * Mantener igual a `site.hours` en frontend/src/content/site.ts.
 */
const OPENING_HOURS: Record<number, { open: number; close: number } | null> = {
  0: null,
  1: { open: 17 * 60, close: 21 * 60 + 30 },
  2: { open: 17 * 60, close: 21 * 60 + 30 },
  3: { open: 17 * 60, close: 21 * 60 + 30 },
  4: { open: 17 * 60, close: 21 * 60 + 30 },
  5: { open: 17 * 60, close: 22 * 60 + 30 },
  6: { open: 12 * 60, close: 22 * 60 + 30 },
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDate(date: string): boolean {
  if (!DATE_RE.test(date)) return false;
  const d = new Date(`${date}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
}

export function hoursFor(date: string): { open: number; close: number } | null {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  return OPENING_HOURS[weekday] ?? null;
}

/** Fecha (YYYY-MM-DD) y minuto del dia actuales en Provo. */
export function nowInProvo(now: Date = new Date()): { date: string; minute: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minute: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function minutesToTime(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

export function timeToMinutes(time: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(time);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** "17:30" -> "5:30 PM" */
export function formatTime(min: number): string {
  const h = Math.floor(min / 60);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(min % 60).padStart(2, "0")} ${suffix}`;
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

/**
 * Cupos libres por bloque de 30 min para un dia.
 * `used` = cupos ya ocupados por bloque (clave: minuto de inicio del bloque).
 */
export interface DayAvailability {
  date: string;
  open: number | null;
  close: number | null;
  /** Primer minuto en que se puede empezar (por el limite del mismo dia). */
  earliestStart: number;
  used: Record<number, number>;
}

/** Horas de inicio posibles para un paquete y numero de personas. */
export function availableStarts(day: DayAvailability, pkg: BookingPackage, players: number): number[] {
  if (day.open === null || day.close === null) return [];
  const need = occupancyFor(pkg, players);
  const starts: number[] = [];
  for (let start = day.open; start + pkg.durationMin <= day.close; start += SLOT_STEP_MIN) {
    if (start < day.earliestStart) continue;
    let fits = true;
    for (let b = start; b < start + pkg.durationMin; b += SLOT_STEP_MIN) {
      if ((day.used[b] ?? 0) + need > MAX_CAPACITY) {
        fits = false;
        break;
      }
    }
    if (fits) starts.push(start);
  }
  return starts;
}

/**
 * Eventos corporativos / arenas moviles: rangos de personas que el cliente elige en `/events`.
 * El servidor solo acepta estos valores (feedback de David, 18 nov. 2026).
 */
export const EVENT_GROUP_SIZES = ["1–25", "26–50", "51–100", "101–250", "250+"] as const;
export type EventGroupSize = (typeof EVENT_GROUP_SIZES)[number];

export function isEventGroupSize(value: unknown): value is EventGroupSize {
  return typeof value === "string" && (EVENT_GROUP_SIZES as readonly string[]).includes(value);
}
