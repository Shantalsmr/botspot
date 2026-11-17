import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AccountForms";
import { PageHeader } from "@/components/PageHeader";
import { currentCustomer } from "@/lib/server";

export const metadata: Metadata = { title: "Create your account", robots: { index: false } };
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Solo rutas internas (evita redirigir a otro sitio). */
function safeNext(value: string | string[] | undefined): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/account";
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const next = safeNext((await searchParams).next);
  if (await currentCustomer()) redirect(next);
  return (
    <>
      <PageHeader title="Create your account">Save your details, see all your bookings and request changes online.</PageHeader>
      <section className="section">
        <div className="container auth-container">
          <AuthForm mode="register" next={next} />
        </div>
      </section>
    </>
  );
}
