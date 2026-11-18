import type { Metadata } from "next";
import Link from "next/link";
import { confirmBookingFromSession, getGiftPaidBooking, type BookingSummary } from "@botspot/backend";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Thank you",
  robots: { index: false },
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { session_id, booking: giftBookingId } = await searchParams;
  let booking: BookingSummary | null = null;
  try {
    if (typeof session_id === "string") booking = await confirmBookingFromSession(session_id);
    // Reserva pagada completa con gift card (no paso por Stripe).
    else if (typeof giftBookingId === "string") booking = await getGiftPaidBooking(giftBookingId);
  } catch (error) {
    console.error("[thank-you]", error);
  }
  const paid = booking?.status === "paid";

  return (
    <>
      <PageHeader title="Thank you" eyebrow="See you in the arena!">
        {paid
          ? "Your booking is confirmed. A receipt is on its way to your email."
          : "Thanks for choosing The Bot Spot. We'll be in touch with the details."}
      </PageHeader>
      <section className="section">
        <div className="container booking-container">
          {booking ? (
            <div className="card">
              <h3>{paid ? "Booking confirmed" : "Payment processing"}</h3>
              <dl className="booking-summary">
                <dt>Experience</dt>
                <dd>{booking.packageName}</dd>
                <dt>Date</dt>
                <dd>{booking.date}</dd>
                <dt>Time</dt>
                <dd>{booking.time}</dd>
                <dt>Players</dt>
                <dd>{booking.players}</dd>
                <dt>Total</dt>
                <dd>{booking.amount}</dd>
                {booking.giftCode ? (
                  <>
                    <dt>Gift card</dt>
                    <dd>
                      {booking.giftCode} · −{booking.giftAmount}
                    </dd>
                  </>
                ) : null}
                <dt>Confirmation #</dt>
                <dd>{booking.id}</dd>
              </dl>
            </div>
          ) : null}
          <div className="actions">
            <Link href="/" className="btn btn-primary">
              Back to home
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
