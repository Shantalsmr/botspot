import "server-only";
import { checkDatabaseConnection, type DatabaseStatus } from "@botspot/database";

export interface HealthReport {
  service: "thebotspot-api";
  timestamp: string;
  environment: string;
  database: DatabaseStatus;
}

/** Estado general del backend y de la conexion con Firestore. */
export async function getHealthReport(): Promise<HealthReport> {
  return {
    service: "thebotspot-api",
    timestamp: new Date().toISOString(),
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    database: await checkDatabaseConnection(),
  };
}
