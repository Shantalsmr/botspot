import { checkGiftCardForBooking, fail, ok } from "@botspot/backend";
import { errorResponse } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/giftcards/check?code=BOT-XXXX-XXXX — saldo de una gift card para usarla al reservar. */
export async function GET(request: Request): Promise<Response> {
  const code = new URL(request.url).searchParams.get("code");
  if (!code) return fail("invalid_code", "Enter your gift card code.");
  try {
    return ok(await checkGiftCardForBooking(code));
  } catch (error) {
    return errorResponse(error, "giftcards/check");
  }
}
