import { getHealthReport, ok } from "@botspot/backend";

// firebase-admin necesita Node.js (no Edge) y la respuesta nunca se cachea.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health
 * Prueba basica del backend y de la conexion con Firebase (Firestore).
 */
export async function GET(): Promise<Response> {
  const report = await getHealthReport();
  const status = report.database.status === "error" ? 503 : 200;
  return ok(report, { status });
}
