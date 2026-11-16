import { BookingError, fail } from "@botspot/backend";

/** Convierte errores del servicio de reservas en respuestas `fail(...)`. */
export function bookingErrorResponse(error: unknown): Response {
  if (error instanceof BookingError) return fail(error.code, error.message, error.status);
  console.error("[bookings]", error);
  return fail("server_error", "Something went wrong. Please try again or call us.", 500);
}
