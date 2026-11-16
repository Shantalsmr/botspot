import { ADMIN_COOKIE, ok } from "@botspot/backend";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/admin/logout — cierra la sesion del panel. */
export async function POST(): Promise<Response> {
  (await cookies()).delete(ADMIN_COOKIE);
  return ok({ loggedIn: false });
}
