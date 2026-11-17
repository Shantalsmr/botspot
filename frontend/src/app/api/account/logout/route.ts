import { ok } from "@botspot/backend";
import { clearCustomerCookie } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/account/logout — cierra la sesion del cliente. */
export async function POST(): Promise<Response> {
  await clearCustomerCookie();
  return ok({ signedIn: false });
}
