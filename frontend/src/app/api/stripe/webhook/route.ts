import { handleStripeWebhook, ok } from "@botspot/backend";
import { bookingErrorResponse } from "../../bookings/handle-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/stripe/webhook — eventos de Stripe (pago completado / sesion vencida). */
export async function POST(request: Request): Promise<Response> {
  try {
    await handleStripeWebhook(await request.text(), request.headers.get("stripe-signature"));
    return ok({ received: true });
  } catch (error) {
    return bookingErrorResponse(error);
  }
}
