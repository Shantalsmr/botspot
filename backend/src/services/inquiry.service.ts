import "server-only";
import { COLLECTIONS, getDb, isDatabaseConfigured } from "@botspot/database";

export type InquiryType = "corporate" | "steam" | "contact";

export interface InquiryInput {
  type: string;
  name?: string;
  email?: string;
  phone?: string;
  eventAddress?: string;
  eventType?: string;
  message?: string;
  /** Campo trampa: los humanos no lo ven; si viene lleno es un bot. */
  website?: string;
}

export interface InquiryDoc {
  type: InquiryType;
  name: string;
  email: string;
  phone: string;
  eventAddress: string | null;
  eventType: string | null;
  message: string | null;
  createdAt: number;
  clientId: string;
}

/** Error esperado de formularios; la ruta /api lo convierte en `fail(code, message, status)`. */
export class InquiryError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PER_HOUR = 5;

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Guarda un formulario de eventos corporativos o de la lista de espera STEAM. */
export async function createInquiry(input: InquiryInput, clientId: string): Promise<{ id: string }> {
  if (!isDatabaseConfigured()) {
    throw new InquiryError("unavailable", "The form is temporarily unavailable. Please call or email us.", 503);
  }
  // Bot: se responde "ok" sin guardar nada.
  if (clean(input.website, 200)) return { id: "ok" };

  const type = input.type === "corporate" || input.type === "steam" || input.type === "contact" ? input.type : null;
  if (!type) throw new InquiryError("invalid_type", "Invalid form.");

  const doc: InquiryDoc = {
    type,
    name: clean(input.name, 120),
    email: clean(input.email, 160).toLowerCase(),
    phone: clean(input.phone, 40),
    eventAddress: type === "corporate" ? clean(input.eventAddress, 200) : null,
    eventType: type === "corporate" ? clean(input.eventType, 120) : null,
    message: clean(input.message, 2000) || null,
    createdAt: Date.now(),
    clientId,
  };

  if (!doc.name) throw new InquiryError("invalid_name", "Please enter your name.");
  if (!EMAIL_RE.test(doc.email)) throw new InquiryError("invalid_email", "Please enter a valid email.");
  // En el formulario de contacto el telefono es opcional.
  if ((type !== "contact" || doc.phone) && doc.phone.replace(/\D/g, "").length < 7) {
    throw new InquiryError("invalid_phone", "Please enter a valid phone number.");
  }
  if (type === "contact" && !doc.message) throw new InquiryError("invalid_message", "Please write your message.");
  if (type === "corporate" && (!doc.eventAddress || !doc.eventType)) {
    throw new InquiryError("invalid_event", "Please tell us the event address and type.");
  }

  const col = getDb().collection(COLLECTIONS.inquiries);
  const recent = await col.where("clientId", "==", clientId).get();
  const lastHour = recent.docs.filter((d) => (d.data() as InquiryDoc).createdAt > Date.now() - 3_600_000).length;
  if (lastHour >= MAX_PER_HOUR) {
    throw new InquiryError("too_many", "You've sent several forms already. Please call or email us.", 429);
  }

  const ref = await col.add(doc);
  return { id: ref.id };
}

export interface InquirySummary extends Omit<InquiryDoc, "clientId"> {
  id: string;
}

/** Ultimos formularios recibidos (para el panel /admin). */
export async function listInquiries(limit = 50): Promise<InquirySummary[]> {
  const snap = await getDb().collection(COLLECTIONS.inquiries).orderBy("createdAt", "desc").limit(limit).get();
  return snap.docs.map((d) => {
    const { clientId: _omit, ...rest } = d.data() as InquiryDoc;
    return { id: d.id, ...rest };
  });
}
