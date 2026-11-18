import { fail, lookupGiftCard, ok, redeemInStore } from "@botspot/backend";
import { errorResponse, isAdmin, readJson } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/giftcards — los duenos buscan un codigo o lo canjean en el local.
 * Body: { action: "lookup", code } | { action: "redeem", code, amount, note }
 * `amount` en centavos (gift cards) o en tickets.
 */
export async function POST(request: Request): Promise<Response> {
  if (!(await isAdmin())) return fail("unauthorized", "Please sign in again.", 401);
  const body = await readJson(request);
  if (!body) return fail("invalid_body", "Invalid request.");
  try {
    if (body.action === "redeem") return ok(await redeemInStore(body.code, body.amount, body.note));
    return ok(await lookupGiftCard(body.code));
  } catch (error) {
    return errorResponse(error, "admin/giftcards");
  }
}
