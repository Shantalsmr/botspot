import { addTerminalSale, deleteTerminalSale, fail, ok, syncTerminalSales } from "@botspot/backend";
import { errorResponse, isAdmin, readJson } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/terminal — registrar o borrar ventas de la terminal del local (Clover).
 * Body: { action: "add", date, amount, location, note } | { action: "delete", id } | { action: "sync" }
 */
export async function POST(request: Request): Promise<Response> {
  if (!(await isAdmin())) return fail("unauthorized", "Please sign in again.", 401);
  const body = await readJson(request);
  if (!body) return fail("invalid_body", "Invalid request.");
  try {
    if (body.action === "sync") return ok(await syncTerminalSales());
    if (body.action === "delete") {
      await deleteTerminalSale(body.id);
      return ok({ deleted: true });
    }
    return ok(await addTerminalSale(body));
  } catch (error) {
    return errorResponse(error, "admin/terminal");
  }
}
