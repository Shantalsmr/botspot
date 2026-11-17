import { registerCustomer, fail, ok } from "@botspot/backend";
import { errorResponse, readJson, setCustomerCookie } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/account/register — crea una cuenta de cliente y abre sesion. */
export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request);
  if (!body) return fail("invalid_body", "Invalid request.");
  try {
    await setCustomerCookie(await registerCustomer(body));
    return ok({ signedIn: true });
  } catch (error) {
    return errorResponse(error, "account/register");
  }
}
