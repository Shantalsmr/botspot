import { getDayAvailability, ok } from "@botspot/backend";
import { bookingErrorResponse } from "../handle-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/bookings/availability?date=YYYY-MM-DD — cupos ocupados del dia. */
export async function GET(request: Request): Promise<Response> {
  try {
    const date = new URL(request.url).searchParams.get("date") ?? "";
    return ok(await getDayAvailability(date));
  } catch (error) {
    return bookingErrorResponse(error);
  }
}
