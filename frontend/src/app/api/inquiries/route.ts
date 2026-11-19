import { InquiryError, createInquiry, clientIdFromHeaders, fail, ok, type InquiryInput } from "@botspot/backend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/inquiries — formulario de eventos corporativos o lista de espera STEM. */
export async function POST(request: Request): Promise<Response> {
  let body: InquiryInput;
  try {
    body = (await request.json()) as InquiryInput;
  } catch {
    return fail("invalid_body", "Invalid request.");
  }
  try {
    const clientId = clientIdFromHeaders(request.headers.get("x-forwarded-for"));
    return ok(await createInquiry(body, clientId));
  } catch (error) {
    if (error instanceof InquiryError) return fail(error.code, error.message, error.status);
    console.error("[inquiries]", error);
    return fail("server_error", "Something went wrong. Please call or email us.", 500);
  }
}
