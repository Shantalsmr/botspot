/**
 * Plantillas de cotizacion para eventos fuera del local (arenas moviles), una por tipo de cliente.
 * Feedback de David (18 nov. 2026): que cada solicitud de /events llegue al panel con un formato listo
 * segun el tipo (company, school, university, festival) y con precio segun la distancia desde The Bot Spot.
 *
 * Modulo puro (sin "server-only"): lo usa el armador de cotizaciones de /admin en el navegador.
 * Se importa como `@botspot/backend/event-quotes`. No cobra nada: solo arma el texto para mandarlo por correo.
 *
 * PRECIOS PROPUESTOS, PENDIENTES DE APROBAR CON EL NEGOCIO. Se tomaron como referencia los precios del local
 * (evento privado 2 h = $400, $25 por persona la hora). Cambiarlos aqui actualiza todas las cotizaciones.
 * - Company: precio completo (es el cliente que mas paga).
 * - University: ~25% menos que company (clubes y organizaciones estudiantiles).
 * - School: precio de costo, casi solo gasolina y personal. El objetivo es visibilidad: fotos, volantes
 *   para las familias y codigo de descuento para que vengan al local.
 * - Festival: tarifa fija mas baja + opcion de cobrar por batalla al publico (la gente paga y se ve la marca).
 */
import type { EventGroupSize } from "./catalog";

export type EventKind = "company" | "school" | "university" | "festival" | "other";

/** Direccion de salida para calcular la distancia (la arena de Provo). */
export const QUOTE_ORIGIN = "255 N University Ave, Provo, UT 84604";

/** Horas que incluye el precio base. */
export const BASE_HOURS = 2;

export interface QuoteTemplate {
  kind: EventKind;
  label: string;
  /** Nota interna para los duenos: que buscamos con este tipo de cliente. */
  goal: string;
  /** Precio base (centavos) por rango de personas, por BASE_HOURS horas. null = cotizar a mano. */
  base: Record<EventGroupSize, number | null>;
  /** Cada hora extra (centavos). */
  extraHourCents: number;
  /** Millas sin costo de traslado (dentro de este radio no se cobra el viaje). */
  freeMiles: number;
  /** Multiplicador sobre la tarifa de traslado (escuelas pagan la mitad). */
  travelFactor: number;
  /** Primer parrafo del correo (al cliente, en ingles). */
  pitch: string;
  /** Lo que incluye (al cliente). */
  includes: string[];
  /** Pendientes internos antes de mandar la cotizacion. */
  checklist: string[];
  /** Opcion adicional que se ofrece en el correo (opcional). */
  option?: string;
}

const usd = (dollars: number) => dollars * 100;

export const QUOTE_TEMPLATES: Record<EventKind, QuoteTemplate> = {
  company: {
    kind: "company",
    label: "Company / team event",
    goal: "Full price. Team building: friendly competition, a mini tournament and photos for their team.",
    base: { "1–25": usd(650), "26–50": usd(950), "51–100": usd(1400), "101–250": usd(2200), "250+": null },
    extraHourCents: usd(250),
    freeMiles: 15,
    travelFactor: 1,
    pitch:
      "Thanks for thinking of The Bot Spot for your team! We bring our mobile robot battle arena to your office or venue and run a team-building tournament your crew will be talking about for weeks.",
    includes: [
      "Mobile battle arena, robots and controllers, set up and taken down by our team",
      "Bot Spot staff running the battles the whole time",
      "Team tournament with brackets and a champion",
      "Photos of the event for your team",
    ],
    checklist: ["Confirm date and hours", "Indoor space of about 20 × 20 ft and a power outlet", "Ask if they want branded prizes"],
  },
  university: {
    kind: "university",
    label: "University",
    goal: "About 25% below company. Clubs, engineering departments and student events; good audience for STEM and tournaments.",
    base: { "1–25": usd(475), "26–50": usd(700), "51–100": usd(1050), "101–250": usd(1650), "250+": null },
    extraHourCents: usd(175),
    freeMiles: 15,
    travelFactor: 1,
    pitch:
      "Thanks for reaching out! Our mobile robot battle arena is a hit at student events: quick to learn, loud, and very competitive. We run the whole thing so your organizers can enjoy it too.",
    includes: [
      "Mobile battle arena, robots and controllers, set up and taken down by our team",
      "Bot Spot staff running the battles the whole time",
      "Open play or a bracket tournament, your choice",
      "A short talk on how the robots are built (great for engineering clubs)",
    ],
    checklist: ["Confirm the student organization or department", "Indoor space of about 20 × 20 ft and a power outlet", "Ask if a student discount code for the arena helps them"],
  },
  school: {
    kind: "school",
    label: "School",
    goal: "VISIBILITY, not profit. Charge close to cost (fuel + staff). In exchange: photos we can post, flyers for families and a family discount code.",
    base: { "1–25": usd(150), "26–50": usd(150), "51–100": usd(200), "101–250": usd(250), "250+": usd(300) },
    extraHourCents: usd(50),
    freeMiles: 25,
    travelFactor: 0.5,
    pitch:
      "Thank you for inviting The Bot Spot to your school! We love showing students how robots work. We offer schools a special rate: we bring our mobile arena, every student gets to drive, and we talk about the science and engineering behind the bots.",
    includes: [
      "Mobile battle arena, robots and controllers, set up and taken down by our team",
      "Every student gets a turn to drive",
      "A short STEM talk: how the robots are designed, wired and built",
      "Flyers with a family discount for a visit to our arena in Provo",
    ],
    checklist: [
      "Ask permission to take photos (no faces without parent consent) and post them",
      "Bring flyers with the family discount code",
      "Mention the STEM Program waitlist to teachers",
      "Confirm grades / ages and number of class groups",
    ],
    option: "Special school rate: we keep it close to cost because we love bringing STEM to students.",
  },
  festival: {
    kind: "festival",
    label: "Festival / public event",
    goal: "Big crowds = brand exposure. Lower flat fee, or offer pay-per-battle for the public so the organizer pays less.",
    base: { "1–25": usd(500), "26–50": usd(650), "51–100": usd(850), "101–250": usd(1200), "250+": usd(1600) },
    extraHourCents: usd(200),
    freeMiles: 15,
    travelFactor: 1,
    pitch:
      "Thanks for your interest! Our mobile robot battle arena draws a crowd at festivals and public events: people line up to drive, and everyone else gathers around to watch.",
    includes: [
      "Mobile battle arena, robots and controllers, set up and taken down by our team",
      "Bot Spot staff running battles nonstop",
      "Quick battles so the line keeps moving",
      "Our banner and signage at the arena",
    ],
    checklist: [
      "Ask about expected attendance and booth size (about 20 × 20 ft)",
      "Power outlet and shade / cover if outdoors",
      "Bring banner, flyers and the Instagram / TikTok QR code",
    ],
    option:
      "Option to lower your cost: we can charge the public per battle (for example $5) instead of a higher flat fee. Ask us for details.",
  },
  other: {
    kind: "other",
    label: "Other",
    goal: "Use company prices and adjust by hand.",
    base: { "1–25": usd(650), "26–50": usd(950), "51–100": usd(1400), "101–250": usd(2200), "250+": null },
    extraHourCents: usd(250),
    freeMiles: 15,
    travelFactor: 1,
    pitch:
      "Thanks for reaching out to The Bot Spot! We bring our mobile robot battle arena to your event and run everything, so your guests just show up and battle.",
    includes: [
      "Mobile battle arena, robots and controllers, set up and taken down by our team",
      "Bot Spot staff running the battles the whole time",
      "Open play or a tournament, your choice",
    ],
    checklist: ["Confirm what kind of event it is", "Indoor space of about 20 × 20 ft and a power outlet"],
  },
};

/**
 * Tarifa de traslado por distancia (millas de ida desde la arena), antes del travelFactor y del radio gratis.
 * Fuera de 120 millas: cotizar a mano (puede requerir hotel o dos dias).
 */
export const TRAVEL_TIERS: { upTo: number; cents: number; label: string }[] = [
  { upTo: 40, cents: usd(75), label: "Up to 40 miles" },
  { upTo: 80, cents: usd(150), label: "40–80 miles" },
  { upTo: 120, cents: usd(250), label: "80–120 miles" },
];

/** Tipo de evento guardado en el formulario de /events (texto de la opcion) → plantilla. */
export function eventKindFromLabel(label: string | null | undefined): EventKind {
  const l = (label ?? "").toLowerCase();
  if (l.startsWith("company")) return "company";
  if (l.startsWith("school")) return "school";
  if (l.startsWith("university")) return "university";
  if (l.startsWith("festival")) return "festival";
  return "other";
}

export interface QuoteLine {
  label: string;
  cents: number;
}

export interface Quote {
  template: QuoteTemplate;
  lines: QuoteLine[];
  /** null = falta cotizar algo a mano (250+ personas o mas de 120 millas). */
  totalCents: number | null;
  /** Por que hay que cotizar a mano. */
  manualReason: string | null;
}

export function buildQuote(input: { kind: EventKind; groupSize: EventGroupSize; miles: number; hours: number }): Quote {
  const t = QUOTE_TEMPLATES[input.kind];
  const hours = Math.max(BASE_HOURS, Math.round(input.hours));
  const miles = Math.max(0, input.miles);
  const lines: QuoteLine[] = [];
  let manualReason: string | null = null;

  const base = t.base[input.groupSize];
  if (base === null) manualReason = `${input.groupSize} people: price this one by hand (more arenas / staff).`;
  else lines.push({ label: `Mobile arena · ${BASE_HOURS} hours · ${input.groupSize} people`, cents: base });

  if (hours > BASE_HOURS) {
    const extra = hours - BASE_HOURS;
    lines.push({ label: `${extra} extra ${extra === 1 ? "hour" : "hours"}`, cents: extra * t.extraHourCents });
  }

  if (miles > t.freeMiles) {
    const tier = TRAVEL_TIERS.find((x) => miles <= x.upTo);
    if (!tier) manualReason = manualReason ?? "More than 120 miles away: price travel by hand.";
    else lines.push({ label: `Travel (${Math.round(miles)} miles)`, cents: Math.round((tier.cents * t.travelFactor) / 100) * 100 });
  } else {
    lines.push({ label: `Travel (within ${t.freeMiles} miles)`, cents: 0 });
  }

  const totalCents = manualReason ? null : lines.reduce((n, l) => n + l.cents, 0);
  return { template: t, lines, totalCents, manualReason };
}

const fmtUsd = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);

/** Texto del correo para el cliente (en ingles). */
export function quoteEmail(
  quote: Quote,
  info: { name: string; eventAddress: string | null; groupSize: string; hours: number; phone: string; businessName: string },
): { subject: string; body: string } {
  const t = quote.template;
  const fullName = (info.name ?? "").trim();
  const first = fullName.split(/\s+/)[0] || "there";
  const lines = quote.lines.map((l) => `- ${l.label}: ${l.cents === 0 ? "included" : fmtUsd(l.cents)}`);
  const body = [
    `Hi ${first},`,
    "",
    t.pitch,
    "",
    "Here is your quote:",
    `- Group size: ${info.groupSize} people`,
    `- Duration: ${Math.max(BASE_HOURS, info.hours)} hours`,
    info.eventAddress ? `- Location: ${info.eventAddress}` : null,
    ...lines,
    quote.totalCents !== null ? `Total: ${fmtUsd(quote.totalCents)}` : "Total: we'll confirm the final price with you.",
    "",
    "What's included:",
    ...t.includes.map((i) => `- ${i}`),
    t.option ? "" : null,
    t.option ?? null,
    "",
    "This quote is valid for 14 days. Reply to this email or call us at " + info.phone + " to lock in your date.",
    "",
    "Thanks!",
    info.businessName,
  ]
    .filter((l): l is string => l !== null)
    .join("\n");
  return { subject: `Your ${info.businessName} mobile arena quote`, body };
}
