import { fail, getDrivingDistance, ok } from "@botspot/backend";
import { errorResponse, isAdmin, readJson } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/admin/distance — millas por carretera desde la arena hasta la direccion de un evento. */
export async function POST(request: Request): Promise<Response> {
  if (!(await isAdmin())) return fail("unauthorized", "Please sign in again.", 401);
  const body = await readJson(request);
  if (!body) return fail("invalid_body", "Invalid request.");
  try {
    return ok(await getDrivingDistance(body.address));
  } catch (error) {
    return errorResponse(error, "admin/distance");
  }
}
