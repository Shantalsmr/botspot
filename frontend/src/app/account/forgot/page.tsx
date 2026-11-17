import type { Metadata } from "next";
import { ForgotForm } from "@/components/AccountForms";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = { title: "Forgot your password?", robots: { index: false } };

export default function Page() {
  return (
    <>
      <PageHeader title="Forgot your password?">Enter your email and we&apos;ll send you a link to choose a new one.</PageHeader>
      <section className="section">
        <div className="container auth-container">
          <ForgotForm />
        </div>
      </section>
    </>
  );
}
