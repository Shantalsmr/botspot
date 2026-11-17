import { resetPassword, fail, ok } from "@botspot/backend";
import { errorResponse, readJson, setCustomerCookie } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/account/reset — guarda la contrasena nueva (enlace del correo) y abre sesion. */
export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request);
  if (!body) return fail("invalid_body", "Invalid request.");
  try {
    await setCustomerCookie(await resetPassword(body.token, body.password));
    return ok({ signedIn: true });
  } catch (error) {
    return errorResponse(error, "account/reset");
  }
}
