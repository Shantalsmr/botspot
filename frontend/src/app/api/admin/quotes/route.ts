import { fail, ok, replyToEventQuote, sendEventQuote } from "@botspot/backend";
import { errorResponse, isAdmin, readJson } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/quotes — los duenos mandan una cotizacion a la cuenta del cliente
 * (`action: "send"`) o contestan en su conversacion (`action: "reply"`).
 */
export async function POST(request: Request): Promise<Response> {
  if (!(await isAdmin())) return fail("unauthorized", "Please sign in again.", 401);
  const body = await readJson(request);
  if (!body) return fail("invalid_body", "Invalid request.");
  try {
    if (body.action === "reply") {
      await replyToEventQuote(body);
      return ok({ replied: true });
    }
    return ok(await sendEventQuote(body, new URL(request.url).origin));
  } catch (error) {
    return errorResponse(error, "admin/quotes");
  }
}
