import "server-only";
import {
  ADMIN_COOKIE,
  AccountError,
  AdminError,
  BookingError,
  CUSTOMER_COOKIE,
  CUSTOMER_SESSION_MAX_AGE,
  InquiryError,
  RequestError,
  fail,
  getCustomerFromSession,
  verifyAdminSession,
  type Customer,
} from "@botspot/backend";
import { cookies } from "next/headers";

/** Utilidades para rutas /api y paginas del servidor (sesiones y errores). */

export async function currentCustomer(): Promise<Customer | null> {
  return getCustomerFromSession((await cookies()).get(CUSTOMER_COOKIE)?.value);
}

export async function isAdmin(): Promise<boolean> {
  return verifyAdminSession((await cookies()).get(ADMIN_COOKIE)?.value);
}

export async function setCustomerCookie(token: string): Promise<void> {
  (await cookies()).set(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CUSTOMER_SESSION_MAX_AGE,
  });
}

export async function clearCustomerCookie(): Promise<void> {
  (await cookies()).delete(CUSTOMER_COOKIE);
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = (await request.json()) as unknown;
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Convierte errores esperados de los servicios en `fail(...)`; el resto en 500. */
export function errorResponse(error: unknown, tag: string): Response {
  if (
    error instanceof AccountError ||
    error instanceof RequestError ||
    error instanceof BookingError ||
    error instanceof InquiryError ||
    error instanceof AdminError
  ) {
    return fail(error.code, error.message, error.status);
  }
  console.error(`[${tag}]`, error);
  return fail("server_error", "Something went wrong. Please try again.", 500);
}
