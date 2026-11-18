import { fail, ok, syncTerminalSales } from "@botspot/backend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/cron/terminal-sync — lo llama el cron de Vercel una vez al dia (ver frontend/vercel.json)
 * para traer las ventas de Clover / Stripe Terminal. Vercel manda "Authorization: Bearer CRON_SECRET".
 */
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return fail("unauthorized", "Not allowed.", 401);
  }
  try {
    const status = await syncTerminalSales();
    return ok(status.map((s) => ({ provider: s.provider, configured: s.configured, count: s.lastCount, error: s.lastError })));
  } catch (error) {
    console.error("[cron/terminal-sync]", error);
    return fail("sync_failed", "Terminal sync failed.", 500);
  }
}
