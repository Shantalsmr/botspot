/**
 * Lee y valida las variables de entorno de Firebase.
 * Si falta alguna, devuelve `null` en vez de lanzar un error, para que
 * el sitio pueda funcionar (sin base de datos) mientras se configura.
 */
export interface FirebaseEnv {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

export function readFirebaseEnv(): FirebaseEnv | null {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !rawKey) return null;

  return {
    projectId,
    clientEmail,
    // En Vercel la llave suele guardarse con "\n" literales: los convertimos en saltos reales.
    privateKey: rawKey.replace(/\\n/g, "\n"),
  };
}

export function isDatabaseConfigured(): boolean {
  return readFirebaseEnv() !== null;
}
