import type { Metadata } from "next";
import Link from "next/link";
import { BookingForm } from "@/components/BookingForm";
import { currentCustomer } from "@/lib/server";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Book an Appointment",
  description: "Reserve your robot battle or private event at The Bot Spot in Provo.",
};

export const runtime = "nodejs";

export default async function BookAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { canceled } = await searchParams;
  const customer = await currentCustomer();
  return (
    <>
      <PageHeader title="Book an Appointment">Pick your battle, choose a time and pay securely online.</PageHeader>
      <section className="section">
        <div className="container booking-container">
          <p className="account-note muted">
            {customer ? (
              <>
                Signed in as <strong>{customer.name}</strong>. This booking will be saved to{" "}
                <Link href="/account">your account</Link>.
              </>
            ) : (
              <>
                Have an account? <Link href="/account/login?next=/book-appointment">Sign in</Link> to book faster and
                manage your bookings. Or just continue as a guest.
              </>
            )}
          </p>
          <BookingForm canceled={canceled === "1"} />
        </div>
      </section>
    </>
  );
}
