import "server-only";
import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { readFirebaseEnv } from "./env";

const APP_NAME = "botspot";

/**
 * Devuelve (o crea una sola vez) la app de Firebase Admin.
 * Se reutiliza entre peticiones para no abrir conexiones nuevas en cada request
 * (importante en las funciones serverless de Vercel).
 */
export function getFirebaseApp(): App {
  const existing = getApps().find((app) => app.name === APP_NAME);
  if (existing) return getApp(APP_NAME);

  const env = readFirebaseEnv();
  if (!env) {
    throw new Error(
      "Firebase no esta configurado. Define FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY (ver .env.example).",
    );
  }

  return initializeApp(
    {
      credential: cert({
        projectId: env.projectId,
        clientEmail: env.clientEmail,
        privateKey: env.privateKey,
      }),
      projectId: env.projectId,
    },
    APP_NAME,
  );
}

let firestore: Firestore | undefined;

/** Instancia unica de Firestore. */
export function getDb(): Firestore {
  if (!firestore) {
    firestore = getFirestore(getFirebaseApp());
  }
  return firestore;
}
