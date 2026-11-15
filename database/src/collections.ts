/**
 * Nombres de las colecciones de Firestore en un solo lugar.
 * Cuando agreguemos una funcion nueva (reservas, tienda, contacto...)
 * su coleccion se declara aqui.
 */
export const COLLECTIONS = {
  /** Reservas de batallas / fiestas. Primera funcion a construir (ver ROADMAP.md). */
  bookings: "bookings",
  /** Documentos internos, p. ej. la prueba de conexion. */
  system: "_system",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
