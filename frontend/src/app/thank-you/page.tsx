import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Thank you",
  robots: { index: false },
};

// Se usara al confirmar una reserva (ver ROADMAP.md, fase 1).
export default function ThankYouPage() {
  return (
    <>
      <PageHeader title="Thank you" eyebrow="See you in the arena!">
        Thanks for choosing The Bot Spot. We&apos;ll be in touch with the details.
      </PageHeader>
      <section className="section">
        <div className="container actions">
          <Link href="/" className="btn btn-primary">
            Back to home
          </Link>
        </div>
      </section>
    </>
  );
}
