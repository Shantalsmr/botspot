import {
  ADMIN_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  AdminError,
  clientIdFromHeaders,
  fail,
  loginAdmin,
  ok,
} from "@botspot/backend";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/admin/login — revisa la contrasena del panel y abre la sesion (cookie). */
export async function POST(request: Request): Promise<Response> {
  let password = "";
  try {
    password = String(((await request.json()) as { password?: unknown }).password ?? "");
  } catch {
    return fail("invalid_body", "Invalid request.");
  }
  try {
    const token = await loginAdmin(password, clientIdFromHeaders(request.headers.get("x-forwarded-for")));
    (await cookies()).set(ADMIN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: ADMIN_SESSION_MAX_AGE,
    });
    return ok({ loggedIn: true });
  } catch (error) {
    if (error instanceof AdminError) return fail(error.code, error.message, error.status);
    console.error("[admin/login]", error);
    return fail("server_error", "Something went wrong.", 500);
  }
}
