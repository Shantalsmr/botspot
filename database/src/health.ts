import "server-only";
import { getDb } from "./client";
import { isDatabaseConfigured } from "./env";

export type DatabaseStatus =
  | { status: "connected"; latencyMs: number }
  | { status: "not_configured"; message: string }
  | { status: "error"; message: string };

/**
 * Prueba basica de conexion: pide la lista de colecciones a Firestore.
 * No lee ni escribe datos del negocio.
 */
export async function checkDatabaseConnection(): Promise<DatabaseStatus> {
  if (!isDatabaseConfigured()) {
    return {
      status: "not_configured",
      message: "Faltan las variables de entorno de Firebase.",
    };
  }

  const started = Date.now();
  try {
    await getDb().listCollections();
    return { status: "connected", latencyMs: Date.now() - started };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
