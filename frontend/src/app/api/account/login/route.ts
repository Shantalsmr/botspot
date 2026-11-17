import { clientIdFromHeaders, loginCustomer, fail, ok } from "@botspot/backend";
import { errorResponse, readJson, setCustomerCookie } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/account/login — inicia sesion de cliente. */
export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request);
  if (!body) return fail("invalid_body", "Invalid request.");
  try {
    const clientId = clientIdFromHeaders(request.headers.get("x-forwarded-for"));
    await setCustomerCookie(await loginCustomer(body.email, body.password, clientId));
    return ok({ signedIn: true });
  } catch (error) {
    return errorResponse(error, "account/login");
  }
}
