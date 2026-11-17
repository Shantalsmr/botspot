import "server-only";
import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

/**
 * Clave para firmar cookies de clientes. Usa SESSION_SECRET si existe; si no, se deriva de la
 * llave de Firebase (que ya es secreta). Cambiarla cierra todas las sesiones de clientes.
 */
function sessionKey(): Buffer {
  const base = process.env.SESSION_SECRET || process.env.FIREBASE_PRIVATE_KEY;
  if (!base) throw new Error("Falta SESSION_SECRET (o FIREBASE_PRIVATE_KEY) para firmar sesiones.");
  return createHash("sha256").update(`botspot-customer-session:${base}`).digest();
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Token firmado: `parte1.parte2...firma`. */
export function signToken(parts: string[]): string {
  const payload = parts.join(".");
  return `${payload}.${createHmac("sha256", sessionKey()).update(payload).digest("hex")}`;
}

/** Devuelve las partes si la firma es valida; si no, null. */
export function verifyToken(token: string | undefined): string[] | null {
  if (!token) return null;
  const i = token.lastIndexOf(".");
  if (i <= 0) return null;
  const payload = token.slice(0, i);
  const sig = token.slice(i + 1);
  try {
    const expected = createHmac("sha256", sessionKey()).update(payload).digest("hex");
    return safeEqual(sig, expected) ? payload.split(".") : null;
  } catch {
    return null;
  }
}

/** Hash de contrasena con scrypt: `scrypt$salt$hash`. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function checkPassword(password: string, stored: string): Promise<boolean> {
  const [algo, saltHex, hashHex] = stored.split("$");
  if (algo !== "scrypt" || !saltHex || !hashHex) return false;
  const hash = await scryptAsync(password, Buffer.from(saltHex, "hex"), 64);
  return safeEqual(hash.toString("hex"), hashHex);
}

export function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

export function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}
