import { clientIdFromHeaders, requestPasswordReset, fail, ok } from "@botspot/backend";
import { errorResponse, readJson } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/account/forgot — envia el enlace para crear una contrasena nueva. */
export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request);
  if (!body) return fail("invalid_body", "Invalid request.");
  try {
    const clientId = clientIdFromHeaders(request.headers.get("x-forwarded-for"));
    await requestPasswordReset(body.email, new URL(request.url).origin, clientId);
    return ok({ sent: true });
  } catch (error) {
    return errorResponse(error, "account/forgot");
  }
}
