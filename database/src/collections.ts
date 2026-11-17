/**
 * Nombres de las colecciones de Firestore en un solo lugar.
 * Cuando agreguemos una funcion nueva (reservas, tienda, contacto...)
 * su coleccion se declara aqui.
 */
export const COLLECTIONS = {
  /** Reservas de batallas / fiestas. Primera funcion a construir (ver ROADMAP.md). */
  bookings: "bookings",
  /** Formularios: eventos corporativos / arenas moviles y lista de espera STEAM. */
  inquiries: "inquiries",
  /** Intentos fallidos de entrar al panel /admin (para bloquear ataques de fuerza bruta). */
  adminLoginAttempts: "adminLoginAttempts",
  /** Cuentas de clientes (opcionales). Id = hash del correo. */
  customers: "customers",
  /** Intentos fallidos de inicio de sesion de clientes. */
  customerLoginAttempts: "customerLoginAttempts",
  /** Enlaces para crear contrasena nueva (id = hash del token). */
  passwordResets: "passwordResets",
  /** Solicitudes de cancelacion o cambio de una reserva. */
  bookingRequests: "bookingRequests",
  /** Documentos internos, p. ej. la prueba de conexion. */
  system: "_system",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
