import "server-only";
import { QUOTE_ORIGIN } from "../event-quotes";

/**
 * Millas por carretera desde la arena de Provo hasta la direccion de un evento (para el traslado en las cotizaciones).
 * - Si existe GOOGLE_MAPS_API_KEY (Distance Matrix API): usa Google Maps, lo mas preciso.
 * - Si no: OpenStreetMap (Nominatim para ubicar la direccion + OSRM para la ruta). Gratis y sin llave,
 *   pero con limite de uso: sirve para unas cuantas cotizaciones al dia, no para trafico masivo.
 * Solo se llama desde /admin (ruta protegida), nunca desde el navegador del cliente.
 */

export class DistanceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

export interface DrivingDistance {
  miles: number;
  minutes: number | null;
  /** Como entendio el servicio la direccion (para que el dueno confirme que es la correcta). */
  resolvedAddress: string;
  provider: "google" | "openstreetmap";
}

const METERS_PER_MILE = 1609.344;
// Identifica al sitio ante OpenStreetMap, como pide su politica de uso.
const USER_AGENT = "TheBotSpotWebsite/1.0 (+https://thebotspot.org)";
const TIMEOUT_MS = 10_000;

/** Cache en memoria (dura mientras viva la funcion serverless): misma direccion = misma respuesta. */
const cache = new Map<string, { at: number; value: DrivingDistance }>();
const CACHE_MS = 24 * 60 * 60_000;

async function getJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  if (!res.ok) throw new DistanceError("provider_error", "The map service didn't answer. Try again or use Google Maps.", 502);
  return (await res.json()) as T;
}

async function viaGoogle(address: string, key: string): Promise<DrivingDistance> {
  const url =
    "https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial" +
    `&origins=${encodeURIComponent(QUOTE_ORIGIN)}&destinations=${encodeURIComponent(address)}&key=${encodeURIComponent(key)}`;
  const data = await getJson<{
    status: string;
    destination_addresses?: string[];
    rows?: { elements?: { status: string; distance?: { value: number }; duration?: { value: number } }[] }[];
  }>(url);
  const el = data.rows?.[0]?.elements?.[0];
  if (data.status !== "OK" || !el || el.status !== "OK" || !el.distance) {
    throw new DistanceError("not_found", "We couldn't find a driving route to that address. Check it and try again.", 404);
  }
  return {
    miles: el.distance.value / METERS_PER_MILE,
    minutes: el.duration ? Math.round(el.duration.value / 60) : null,
    resolvedAddress: data.destination_addresses?.[0] ?? address,
    provider: "google",
  };
}

interface Place {
  lat: string;
  lon: string;
  display_name: string;
}

async function geocode(address: string): Promise<Place> {
  const url =
    "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=us" + `&q=${encodeURIComponent(address)}`;
  const list = await getJson<Place[]>(url, { "User-Agent": USER_AGENT, "Accept-Language": "en" });
  const place = list[0];
  if (!place) throw new DistanceError("not_found", "We couldn't find that address. Add the city and state (e.g. Orem, UT).", 404);
  return place;
}

let originPlace: Place | null = null;

async function viaOpenStreetMap(address: string): Promise<DrivingDistance> {
  originPlace ??= await geocode(QUOTE_ORIGIN);
  const dest = await geocode(address);
  const url =
    `https://router.project-osrm.org/route/v1/driving/${originPlace.lon},${originPlace.lat};${dest.lon},${dest.lat}` +
    "?overview=false";
  const data = await getJson<{ code: string; routes?: { distance: number; duration: number }[] }>(url, {
    "User-Agent": USER_AGENT,
  });
  const route = data.routes?.[0];
  if (data.code !== "Ok" || !route) {
    throw new DistanceError("not_found", "We couldn't find a driving route to that address.", 404);
  }
  return {
    miles: route.distance / METERS_PER_MILE,
    minutes: Math.round(route.duration / 60),
    resolvedAddress: dest.display_name,
    provider: "openstreetmap",
  };
}

/** Millas por carretera (solo ida) desde la arena hasta `address`, redondeadas a 1 decimal. */
export async function getDrivingDistance(addressInput: unknown): Promise<DrivingDistance> {
  const address = typeof addressInput === "string" ? addressInput.trim().slice(0, 200) : "";
  if (address.length < 5) throw new DistanceError("invalid_address", "Add the event address first.");

  const key = address.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;

  const googleKey = process.env.GOOGLE_MAPS_API_KEY;
  let value: DrivingDistance;
  try {
    value = googleKey ? await viaGoogle(address, googleKey) : await viaOpenStreetMap(address);
  } catch (error) {
    if (error instanceof DistanceError) throw error;
    throw new DistanceError("provider_error", "The map service didn't answer. Try again or use Google Maps.", 502);
  }
  value = { ...value, miles: Math.round(value.miles * 10) / 10 };
  cache.set(key, { at: Date.now(), value });
  return value;
}
