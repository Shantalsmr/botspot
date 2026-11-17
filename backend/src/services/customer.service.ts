import "server-only";
import { COLLECTIONS, getDb, isDatabaseConfigured } from "@botspot/database";
import { sendEmail } from "../lib/email";
import { checkPassword, hashPassword, randomToken, sha256, signToken, verifyToken } from "../lib/session";

/**
 * Cuentas de clientes (opcionales): correo + contrasena. Las contrasenas se guardan con scrypt
 * y la sesion es una cookie firmada. El navegador nunca habla con Firestore.
 */

export const CUSTOMER_COOKIE = "botspot_customer";
export const CUSTOMER_SESSION_MAX_AGE = 60 * 24 * 60 * 60; // 60 dias
const MAX_FAILED = 10;
const LOCK_WINDOW_MS = 15 * 60_000;
const RESET_TTL_MS = 60 * 60_000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CustomerDoc {
  email: string;
  name: string;
  phone: string;
  passwordHash: string;
  /** Sube al cambiar la contrasena: invalida las sesiones anteriores. */
  passwordVersion: number;
  createdAt: number;
}

export interface Customer {
  id: string;
  email: string;
  name: string;
  phone: string;
}

export class AccountError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

function assertReady(): void {
  if (!isDatabaseConfigured()) throw new AccountError("unavailable", "Accounts are temporarily unavailable.", 503);
}

const customers = () => getDb().collection(COLLECTIONS.customers);
/** El id del documento es el hash del correo: asi un correo solo puede tener una cuenta. */
const customerId = (email: string) => sha256(`customer:${email}`).slice(0, 40);
const normEmail = (email: unknown) => (typeof email === "string" ? email.trim().toLowerCase().slice(0, 160) : "");
const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function validatePassword(password: unknown): string {
  const p = typeof password === "string" ? password : "";
  if (p.length < 8) throw new AccountError("weak_password", "Your password must have at least 8 characters.");
  if (p.length > 200) throw new AccountError("weak_password", "Your password is too long.");
  return p;
}

function sessionFor(id: string, doc: CustomerDoc): string {
  const expires = String(Date.now() + CUSTOMER_SESSION_MAX_AGE * 1000);
  return signToken([id, String(doc.passwordVersion), expires]);
}

function toCustomer(id: string, d: CustomerDoc): Customer {
  return { id, email: d.email, name: d.name, phone: d.phone };
}

async function checkLock(clientId: string) {
  const ref = getDb().collection(COLLECTIONS.customerLoginAttempts).doc(clientId);
  const snap = await ref.get();
  const now = Date.now();
  const recent = ((snap.data()?.failures as number[] | undefined) ?? []).filter((t) => t > now - LOCK_WINDOW_MS);
  if (recent.length >= MAX_FAILED) {
    throw new AccountError("locked", "Too many attempts. Please wait 15 minutes and try again.", 429);
  }
  return {
    fail: () => ref.set({ failures: [...recent, now] }),
    clear: () => (snap.exists ? ref.delete() : Promise.resolve()),
  };
}

export interface RegisterInput {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  password?: unknown;
}

/** Crea la cuenta y devuelve el token de sesion. */
export async function registerCustomer(input: RegisterInput): Promise<string> {
  assertReady();
  const email = normEmail(input.email);
  const name = clean(input.name, 120);
  const phone = clean(input.phone, 40);
  if (!name) throw new AccountError("invalid_name", "Please enter your name.");
  if (!EMAIL_RE.test(email)) throw new AccountError("invalid_email", "Please enter a valid email.");
  if (phone.replace(/\D/g, "").length < 7) throw new AccountError("invalid_phone", "Please enter a valid phone number.");
  const password = validatePassword(input.password);

  const id = customerId(email);
  const doc: CustomerDoc = {
    email,
    name,
    phone,
    passwordHash: await hashPassword(password),
    passwordVersion: 1,
    createdAt: Date.now(),
  };
  try {
    await customers().doc(id).create(doc);
  } catch {
    throw new AccountError("email_taken", "There is already an account with this email. Try signing in.", 409);
  }
  return sessionFor(id, doc);
}

export async function loginCustomer(emailInput: unknown, password: unknown, clientId: string): Promise<string> {
  assertReady();
  const lock = await checkLock(clientId);
  const email = normEmail(emailInput);
  const snap = await customers().doc(customerId(email)).get();
  const doc = snap.data() as CustomerDoc | undefined;
  const ok = doc && typeof password === "string" && (await checkPassword(password, doc.passwordHash));
  if (!doc || !ok) {
    await lock.fail();
    throw new AccountError("wrong_credentials", "Wrong email or password.", 401);
  }
  await lock.clear();
  return sessionFor(snap.id, doc);
}

/** Cliente de la cookie de sesion (o null si no hay sesion valida). */
export async function getCustomerFromSession(token: string | undefined): Promise<Customer | null> {
  if (!isDatabaseConfigured()) return null;
  const parts = verifyToken(token);
  if (!parts || parts.length !== 3) return null;
  const [id, version, expires] = parts as [string, string, string];
  if (Number(expires) < Date.now()) return null;
  const snap = await customers().doc(id).get();
  const doc = snap.data() as CustomerDoc | undefined;
  if (!doc || String(doc.passwordVersion) !== version) return null;
  return toCustomer(id, doc);
}

export async function updateCustomerProfile(id: string, input: { name?: unknown; phone?: unknown }): Promise<Customer> {
  const name = clean(input.name, 120);
  const phone = clean(input.phone, 40);
  if (!name) throw new AccountError("invalid_name", "Please enter your name.");
  if (phone.replace(/\D/g, "").length < 7) throw new AccountError("invalid_phone", "Please enter a valid phone number.");
  const ref = customers().doc(id);
  await ref.update({ name, phone });
  const snap = await ref.get();
  return toCustomer(id, snap.data() as CustomerDoc);
}

/** Envia el enlace para crear una contrasena nueva. Responde igual exista o no la cuenta. */
export async function requestPasswordReset(emailInput: unknown, origin: string, clientId: string): Promise<void> {
  assertReady();
  const email = normEmail(emailInput);
  if (!EMAIL_RE.test(email)) throw new AccountError("invalid_email", "Please enter a valid email.");
  const lock = await checkLock(clientId);
  await lock.fail(); // cuenta como intento para limitar abusos
  const id = customerId(email);
  const snap = await customers().doc(id).get();
  if (!snap.exists) return;
  const token = randomToken();
  await getDb()
    .collection(COLLECTIONS.passwordResets)
    .doc(sha256(token))
    .set({ customerId: id, expiresAt: Date.now() + RESET_TTL_MS, used: false });
  const name = (snap.data() as CustomerDoc).name;
  await sendEmail({
    to: email,
    subject: "Reset your The Bot Spot password",
    text: `Hi ${name},\n\nUse this link to choose a new password (valid for 1 hour):\n${origin}/account/reset?token=${token}\n\nIf you didn't ask for this, you can ignore this email.\n\nThe Bot Spot`,
  });
}

/** Cambia la contrasena con el enlace del correo y abre sesion. */
export async function resetPassword(token: unknown, password: unknown): Promise<string> {
  assertReady();
  const newPassword = validatePassword(password);
  if (typeof token !== "string" || !token) throw new AccountError("invalid_token", "This link is not valid.");
  const db = getDb();
  const resetRef = db.collection(COLLECTIONS.passwordResets).doc(sha256(token));
  const hash = await hashPassword(newPassword);
  return db.runTransaction(async (tx) => {
    const r = await tx.get(resetRef);
    const data = r.data() as { customerId: string; expiresAt: number; used: boolean } | undefined;
    if (!data || data.used || data.expiresAt < Date.now()) {
      throw new AccountError("invalid_token", "This link has expired. Please ask for a new one.");
    }
    const cRef = customers().doc(data.customerId);
    const c = await tx.get(cRef);
    const doc = c.data() as CustomerDoc | undefined;
    if (!doc) throw new AccountError("invalid_token", "This link is not valid.");
    const updated: CustomerDoc = { ...doc, passwordHash: hash, passwordVersion: doc.passwordVersion + 1 };
    tx.update(cRef, { passwordHash: hash, passwordVersion: updated.passwordVersion });
    tx.update(resetRef, { used: true });
    return sessionFor(c.id, updated);
  });
}
