import "server-only";
import { createHash } from "node:crypto";

/**
 * Identificador anonimo del visitante: hash de su IP (nunca se guarda la IP real).
 * Sirve para limitar abusos (reservas sin pagar, spam de formularios, intentos de login).
 */
export function clientIdFromHeaders(forwardedFor: string | null): string {
  const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";
  return createHash("sha256").update(`botspot:${ip}`).digest("hex").slice(0, 32);
}
