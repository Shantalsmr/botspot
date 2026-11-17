import type { Metadata } from "next";
import Link from "next/link";
import { ResetForm } from "@/components/AccountForms";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await searchParams;
  return (
    <>
      <PageHeader title="Choose a new password" />
      <section className="section">
        <div className="container auth-container">
          {typeof token === "string" && token ? (
            <ResetForm token={token} />
          ) : (
            <p className="muted">
              This link is not valid. <Link href="/account/forgot">Ask for a new one</Link>.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
