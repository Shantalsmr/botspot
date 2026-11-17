import { clientIdFromHeaders, createBookingCheckout, fail, ok, type CreateCheckoutInput } from "@botspot/backend";
import { currentCustomer } from "@/lib/server";
import { bookingErrorResponse } from "../handle-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/bookings/checkout — aparta el cupo y devuelve la URL de Stripe Checkout. */
export async function POST(request: Request): Promise<Response> {
  let body: CreateCheckoutInput;
  try {
    body = (await request.json()) as CreateCheckoutInput;
  } catch {
    return fail("invalid_body", "Invalid request.");
  }
  try {
    const clientId = clientIdFromHeaders(request.headers.get("x-forwarded-for"));
    // Si el cliente tiene sesion, la reserva queda en su cuenta y Stripe ya trae su correo.
    const customer = await currentCustomer();
    const account = customer ? { id: customer.id, email: customer.email } : null;
    return ok(await createBookingCheckout(body, new URL(request.url).origin, clientId, account));
  } catch (error) {
    return bookingErrorResponse(error);
  }
}
