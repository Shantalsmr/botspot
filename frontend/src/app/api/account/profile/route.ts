import { updateCustomerProfile, fail, ok } from "@botspot/backend";
import { currentCustomer, errorResponse, readJson } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/account/profile — actualiza nombre y telefono del cliente. */
export async function POST(request: Request): Promise<Response> {
  const customer = await currentCustomer();
  if (!customer) return fail("unauthorized", "Please sign in again.", 401);
  const body = await readJson(request);
  if (!body) return fail("invalid_body", "Invalid request.");
  try {
    return ok(await updateCustomerProfile(customer.id, body));
  } catch (error) {
    return errorResponse(error, "account/profile");
  }
}
