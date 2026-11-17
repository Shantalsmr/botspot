import { resolveRequest, fail, ok } from "@botspot/backend";
import { errorResponse, isAdmin, readJson } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/admin/requests — los duenos marcan una solicitud como atendida. */
export async function POST(request: Request): Promise<Response> {
  if (!(await isAdmin())) return fail("unauthorized", "Please sign in again.", 401);
  const body = await readJson(request);
  if (!body) return fail("invalid_body", "Invalid request.");
  try {
    await resolveRequest(body.id);
    return ok({ resolved: true });
  } catch (error) {
    return errorResponse(error, "admin/requests");
  }
}
