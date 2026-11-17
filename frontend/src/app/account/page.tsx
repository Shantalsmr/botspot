import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listCustomerBookings, type CustomerBooking } from "@botspot/backend";
import { BookingRequest, LogoutButton, ProfileForm } from "@/components/AccountForms";
import { PageHeader } from "@/components/PageHeader";
import { currentCustomer } from "@/lib/server";

export const metadata: Metadata = { title: "My account", robots: { index: false } };
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** "2026-11-17" -> "Tue, Nov 17, 2026" */
function niceDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

export default async function AccountPage() {
  const customer = await currentCustomer();
  if (!customer) redirect("/account/login?next=/account");

  const bookings = await listCustomerBookings(customer);
  const upcoming = bookings.filter((b) => b.upcoming);
  const past = bookings.filter((b) => !b.upcoming).reverse();

  return (
    <>
      <PageHeader title={`Hi, ${customer.name.split(" ")[0]}!`} eyebrow="My account">
        Your bookings and details in one place.
      </PageHeader>
      <section className="section">
        <div className="container account-grid">
          <div>
            <div className="account-head">
              <h2>Upcoming bookings</h2>
              <Link href="/book-appointment" className="btn btn-primary">
                Book a battle
              </Link>
            </div>
            {upcoming.length === 0 ? (
              <p className="muted">No upcoming bookings yet.</p>
            ) : (
              upcoming.map((b) => <BookingCard key={b.id} b={b} />)
            )}

            {past.length > 0 ? (
              <>
                <h2 className="account-past">Past bookings</h2>
                {past.map((b) => (
                  <BookingCard key={b.id} b={b} />
                ))}
              </>
            ) : null}
          </div>
          <aside className="account-side">
            <ProfileForm name={customer.name} phone={customer.phone} email={customer.email} />
            <LogoutButton />
          </aside>
        </div>
      </section>
    </>
  );
}

function BookingCard({ b }: { b: CustomerBooking }) {
  return (
    <article className={`card booking-card${b.upcoming ? "" : " is-past"}`}>
      <div className="booking-card-main">
        <div>
          <h3>{b.packageName}</h3>
          <p className="booking-when">
            {niceDate(b.date)} · {b.time}
          </p>
          <p className="muted small">
            {b.players} {b.players === 1 ? "player" : "players"} · {b.amount} · Confirmation #{b.id}
          </p>
        </div>
      </div>
      {b.upcoming ? (
        b.requestStatus === "open" ? (
          <p className="badge">Change request sent · we&apos;ll contact you</p>
        ) : (
          <BookingRequest bookingId={b.id} policy={b.policy} />
        )
      ) : null}
    </article>
  );
}
