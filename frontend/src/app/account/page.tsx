import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  listCustomerBookings,
  listCustomerOrders,
  listCustomerQuotes,
  listPendingEventRequests,
  type CustomerBooking,
  type EventQuote,
  type OrderSummary,
  type PendingEventRequest,
} from "@botspot/backend";
import { BookingRequest, LogoutButton, ProfileForm } from "@/components/AccountForms";
import { PageHeader } from "@/components/PageHeader";
import { QuoteThread } from "@/components/QuoteThread";
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

/** Fecha corta de un timestamp: "Nov 18". */
const shortDate = (ms: number) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "America/Denver" }).format(new Date(ms));

const usd = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);

/**
 * Dashboard del cliente (feedback de David, 18 nov. 2026): cada cosa en su espacio (eventos, reservas,
 * pedidos de la tienda), en secciones desplegables y una fila por elemento con su etiqueta de color.
 * Se abre sola solo la seccion que pide algo del cliente (una cotizacion por contestar) y las proximas reservas.
 */
export default async function AccountPage() {
  const customer = await currentCustomer();
  if (!customer) redirect("/account/login?next=/account");

  const [bookings, quotes, pending, orders] = await Promise.all([
    listCustomerBookings(customer),
    listCustomerQuotes(customer),
    listPendingEventRequests(customer),
    listCustomerOrders(customer),
  ]);
  const upcoming = bookings.filter((b) => b.upcoming);
  const past = bookings.filter((b) => !b.upcoming).reverse();
  const toAnswer = quotes.filter((q) => q.status === "sent" && q.awaiting === "customer").length;
  const events = pending.length + quotes.length;

  return (
    <>
      <PageHeader title={`Hi, ${customer.name.split(" ")[0]}!`} eyebrow="My account">
        Your bookings, events, orders and details in one place.
      </PageHeader>
      <section className="section">
        <div className="container account-grid">
          <div>
            <div className="account-head">
              <div className="account-summary">
                <span>
                  <strong>{upcoming.length}</strong> upcoming {upcoming.length === 1 ? "booking" : "bookings"}
                </span>
                {events > 0 ? (
                  <span>
                    <strong>{events}</strong> {events === 1 ? "event" : "events"}
                  </span>
                ) : null}
                {toAnswer > 0 ? <span className="status-pill status-reply">{toAnswer} to answer</span> : null}
              </div>
              <Link href="/book-appointment" className="btn btn-primary">
                Book a battle
              </Link>
            </div>

            {events > 0 ? (
              <Section title="Events & quotes" count={events} open={toAnswer > 0 || pending.length > 0}>
                <div className="quote-rows">
                  {pending.map((r) => (
                    <PendingRow key={r.id} r={r} />
                  ))}
                  {quotes.map((q) => (
                    <QuoteRow key={q.id} q={q} />
                  ))}
                </div>
              </Section>
            ) : null}

            <Section title="Upcoming bookings" count={upcoming.length} open>
              {upcoming.length === 0 ? (
                <p className="muted">
                  No upcoming bookings yet. <Link href="/book-appointment">Book a battle</Link>
                </p>
              ) : (
                <div className="quote-rows">
                  {upcoming.map((b) => (
                    <BookingRow key={b.id} b={b} />
                  ))}
                </div>
              )}
            </Section>

            <Section title="My orders" count={orders.length} hint="Merch, gift cards & tickets">
              {orders.length === 0 ? (
                <p className="muted">
                  No orders yet. <Link href="/shop">Visit the shop</Link>
                </p>
              ) : (
                <div className="quote-rows">
                  {orders.map((o) => (
                    <OrderRow key={o.id} o={o} />
                  ))}
                </div>
              )}
            </Section>

            {past.length > 0 ? (
              <Section title="Past bookings" count={past.length}>
                <div className="quote-rows">
                  {past.map((b) => (
                    <BookingRow key={b.id} b={b} />
                  ))}
                </div>
              </Section>
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

/** Seccion desplegable (mismo estilo que el panel /admin). */
function Section({
  title,
  count,
  hint,
  open = false,
  children,
}: {
  title: string;
  count: number;
  hint?: string;
  open?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className="admin-section" open={open}>
      <summary>
        <span className="admin-section-title">{title}</span>
        <span className="admin-count">{count}</span>
        {hint ? <span className="muted small admin-section-hint">{hint}</span> : null}
      </summary>
      <div className="admin-section-body">{children}</div>
    </details>
  );
}

/** Fila desplegable: una linea con lo principal y la etiqueta; el detalle se abre con un clic. */
function Row({
  title,
  meta,
  side,
  pill,
  highlight = false,
  children,
}: {
  title: string;
  meta: string;
  side?: string;
  pill: { label: string; tone: string };
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className={`card quote-card quote-row${highlight ? " is-waiting" : ""}`}>
      <summary>
        <span className="quote-row-main">
          <strong>{title}</strong>
          <span className="muted small">{meta}</span>
        </span>
        <span className="quote-row-side">
          {side ? <strong>{side}</strong> : null}
          <span className={`status-pill status-${pill.tone}`}>{pill.label}</span>
        </span>
      </summary>
      <div className="quote-row-body">{children}</div>
    </details>
  );
}

/** Etiqueta de estado (color + una palabra), igual que en /admin. */
const QUOTE_STATUS: Record<EventQuote["status"], { label: string; tone: string }> = {
  sent: { label: "Pending", tone: "pending" },
  accepted: { label: "Accepted", tone: "accepted" },
  declined: { label: "Declined", tone: "declined" },
};

/** Solicitud de evento enviada desde /events que todavia espera la cotizacion de los duenos. */
function PendingRow({ r }: { r: PendingEventRequest }) {
  return (
    <Row
      title={`Mobile arena${r.eventType ? ` · ${r.eventType}` : ""}`}
      meta={[r.groupSize ? `${r.groupSize} people` : null, r.hours ? `${r.hours} h` : null, `Sent ${shortDate(r.createdAt)}`]
        .filter(Boolean)
        .join(" · ")}
      pill={{ label: "In progress", tone: "progress" }}
    >
      {r.eventAddress ? <p className="muted small">📍 {r.eventAddress}</p> : null}
      <p>We got your request and we&apos;re preparing your quote. It will show up right here, where you can accept it or ask us questions.</p>
    </Row>
  );
}

/** Cotizacion de un evento que mandaron los duenos, con la conversacion para responder. */
function QuoteRow({ q }: { q: EventQuote }) {
  const toAnswer = q.status === "sent" && q.awaiting === "customer";
  return (
    <Row
      title={`Mobile arena · ${q.kindLabel}`}
      meta={`${q.groupSize} people · ${q.hours} h · ${shortDate(q.updatedAt)}`}
      side={q.totalCents !== null ? usd(q.totalCents) : undefined}
      pill={QUOTE_STATUS[q.status]}
      highlight={toAnswer}
    >
      {q.eventAddress ? <p className="muted small">📍 {q.eventAddress}</p> : null}
      <table className="admin-table quote-lines">
        <tbody>
          {q.lines.map((l) => (
            <tr key={l.label}>
              <td>{l.label}</td>
              <td className="num">{l.cents === 0 ? "Included" : usd(l.cents)}</td>
            </tr>
          ))}
          <tr className="total-row">
            <td>Total</td>
            <td className="num">{q.totalCents !== null ? usd(q.totalCents) : "See message"}</td>
          </tr>
        </tbody>
      </table>
      <QuoteThread id={q.id} as="customer" messages={q.messages} status={q.status} customerName={q.name} />
    </Row>
  );
}

function BookingRow({ b }: { b: CustomerBooking }) {
  const pill = !b.upcoming
    ? { label: "Done", tone: "done" }
    : b.requestStatus === "open"
      ? { label: "Change requested", tone: "pending" }
      : { label: "Confirmed", tone: "accepted" };
  return (
    <Row
      title={b.packageName}
      meta={`${niceDate(b.date)} · ${b.time} · ${b.players} ${b.players === 1 ? "player" : "players"}`}
      side={b.amount}
      pill={pill}
    >
      <p className="muted small">Confirmation #{b.id}</p>
      {b.upcoming ? (
        b.requestStatus === "open" ? (
          <p className="small">We got your change request and we&apos;ll contact you soon.</p>
        ) : (
          <BookingRequest bookingId={b.id} policy={b.policy} />
        )
      ) : null}
    </Row>
  );
}

function OrderRow({ o }: { o: OrderSummary }) {
  const items = o.lines.reduce((n, l) => n + l.qty, 0);
  return (
    <Row
      title={o.lines.map((l) => l.name).join(", ")}
      meta={`${shortDate(o.paidAt ?? o.createdAt)} · ${items} ${items === 1 ? "item" : "items"}`}
      side={o.amount}
      pill={{ label: "Paid", tone: "accepted" }}
    >
      <ul className="small order-lines">
        {o.lines.map((l) => (
          <li key={`${l.productId}-${l.variant ?? ""}`}>
            {l.qty} × {l.name}
            {l.variant ? ` (${l.variant})` : ""}{" "}
            <span className="muted">· {l.fulfillment === "email" ? "sent by email" : "pick up at the arena"}</span>
          </li>
        ))}
      </ul>
      {o.giftCodes.length > 0 ? (
        <div className="small">
          <p>
            <strong>Your codes</strong> (show them at the front desk or use gift cards when you book online):
          </p>
          {o.giftCodes.map((c) => (
            <code key={c.code} className="admin-code">
              {c.code}
            </code>
          ))}
        </div>
      ) : null}
      <p className="muted small">Order #{o.id}</p>
    </Row>
  );
}
