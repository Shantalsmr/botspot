/**
 * Formato comun para todas las respuestas de la API.
 * Usa el `Response` estandar de la web, asi funciona igual en las rutas
 * de Next.js (App Router) y en cualquier funcion de Vercel.
 */
export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = { ok: false; error: { code: string; message: string } };
export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export function ok<T>(data: T, init?: ResponseInit): Response {
  const body: ApiSuccess<T> = { ok: true, data };
  return Response.json(body, init);
}

export function fail(code: string, message: string, status = 400): Response {
  const body: ApiFailure = { ok: false, error: { code, message } };
  return Response.json(body, { status });
}
