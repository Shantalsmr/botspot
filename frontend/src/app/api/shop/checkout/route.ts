import { OrderError, clientIdFromHeaders, createOrderCheckout, fail, ok, type CreateOrderInput } from "@botspot/backend";
import { currentCustomer } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/shop/checkout — valida el carrito, crea el pedido y devuelve la URL de Stripe Checkout. */
export async function POST(request: Request): Promise<Response> {
  let body: CreateOrderInput;
  try {
    body = (await request.json()) as CreateOrderInput;
  } catch {
    return fail("invalid_body", "Invalid request.");
  }
  try {
    const clientId = clientIdFromHeaders(request.headers.get("x-forwarded-for"));
    const customer = await currentCustomer();
    const account = customer ? { id: customer.id, email: customer.email } : null;
    return ok(await createOrderCheckout(body, new URL(request.url).origin, clientId, account));
  } catch (error) {
    if (error instanceof OrderError) return fail(error.code, error.message, error.status);
    console.error("[shop]", error);
    return fail("server_error", "Something went wrong. Please try again or call us.", 500);
  }
}
