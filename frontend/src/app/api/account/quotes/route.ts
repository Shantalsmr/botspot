import { fail, ok, respondToEventQuote } from "@botspot/backend";
import { currentCustomer, errorResponse, readJson } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/account/quotes — el cliente acepta, rechaza o pregunta sobre su cotizacion. */
export async function POST(request: Request): Promise<Response> {
  const customer = await currentCustomer();
  if (!customer) return fail("unauthorized", "Please sign in again.", 401);
  const body = await readJson(request);
  if (!body) return fail("invalid_body", "Invalid request.");
  try {
    await respondToEventQuote(customer, body);
    return ok({ sent: true });
  } catch (error) {
    return errorResponse(error, "account/quotes");
  }
}
