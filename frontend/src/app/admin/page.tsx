import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  ADMIN_COOKIE,
  getAdminDashboard,
  isAdminConfigured,
  verifyAdminSession,
  type AdminBooking,
  type AdminDashboard,
  type AdminEventQuote,
  type InquirySummary,
  type RevenueSource,
  type SourceTotals,
} from "@botspot/backend";
import { AdminLogin, AdminLogout, ResolveRequestButton } from "@/components/AdminAuth";
import { DeleteTerminalSale, GiftCardDesk, TerminalSaleForm, TerminalSyncPanel } from "@/components/AdminTools";
import { QuoteBuilder } from "@/components/QuoteBuilder";
import { QuoteThread } from "@/components/QuoteThread";
import { site, telHref } from "@/content/site";

/** Personas por grupo de clases STEM: al llenarse, se manda el horario de inicio. */
const STEM_GROUP_SIZE = site.stemGroupSize;

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);

const POLICY_LABEL: Record<string, string> = {
  full_refund: "7+ days away → full refund",
  reschedule_or_credit: "48 h – 7 days → reschedule or credit",
  no_refund: "Less than 48 h → no refund",
  past: "Already happened",
};

/** "+13855551234" -> "(385) 555-1234" (otros formatos se dejan igual). */
function usPhone(phone: string): string {
  const d = phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : phone;
}

/** "2026-11-17" -> "Tue, Nov 17" */
function niceDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(`${date}T12:00:00Z`),
  );
}

export default async function AdminPage() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;

  if (!isAdminConfigured()) {
    return (
      <section className="section">
        <div className="container booking-container">
          <div className="card">
            <h2>Dashboard not set up yet</h2>
            <p className="muted">Add ADMIN_PASSWORD (at least 8 characters) to the environment variables.</p>
          </div>
        </div>
      </section>
    );
  }

  if (!verifyAdminSession(token)) {
    return (
      <section className="section">
        <div className="container admin-login-wrap">
          <AdminLogin />
        </div>
      </section>
    );
  }

  const data = await getAdminDashboard();
  return <Dashboard data={data} />;
}

function Dashboard({ data }: { data: AdminDashboard }) {
  const byDate = new Map<string, AdminBooking[]>();
  for (const b of data.upcoming) byDate.set(b.date, [...(byDate.get(b.date) ?? []), b]);
  const events = data.inquiries.filter((q) => q.type === "corporate");
  const messages = data.inquiries.filter((q) => q.type === "contact");
  // Lista de espera por orden de llegada (el primero en anotarse va en el grupo 1).
  const waitlist = data.inquiries.filter((q) => q.type === "steam").sort((a, b) => a.createdAt - b.createdAt);
  const awaitingOwner = data.quotes.filter((q) => q.awaiting === "owner").length;
  // Solicitudes de /events que todavia no tienen cotizacion: las mas viejas arriba (llevan mas tiempo esperando).
  const quotedIds = new Set(data.quotes.map((q) => q.inquiryId).filter((x): x is string => Boolean(x)));
  const needsQuote = events.filter((q) => !quotedIds.has(q.id)).sort((a, b) => a.createdAt - b.createdAt);
  const quotedEvents = events.filter((q) => quotedIds.has(q.id));

  return (
    <section className="section admin">
      <div className="container">
        <div className="admin-top">
          <div>
            <p className="eyebrow">Owners&apos; dashboard</p>
            <h1>Today · {niceDate(data.today)}</h1>
          </div>
          <AdminLogout />
        </div>

        <div className="stat-grid">
          <Stat label="Revenue today" value={money(data.todayTotals.total)} />
          <Stat label="Last 7 days" value={money(data.weekTotals.total)} />
          <Stat label="This month" value={money(data.monthTotals.total)} />
          <Stat label="Bookings today" value={String(data.bookingsToday)} sub={`${data.playersToday} players`} />
        </div>

        {/* Grafica de ventas siempre visible (no desplegable): es lo primero que quieren ver los duenos. */}
        <div className="admin-chart">
          <RevenueChart data={data} />
        </div>

        {/*
          Secciones desplegables (feedback de David, 18 nov. 2026): la pagina no debe sentirse larga.
          Abiertas por defecto solo las que piden accion: solicitudes de cambio y proximas reservas.
        */}
        {data.requests.length > 0 ? (
          <AdminSection title="⚠️ Cancellation & change requests" count={data.requests.length} open alert>
            <p className="muted small">
              Refunds are done in Stripe (Payments → the payment → Refund). Then mark the request as handled.
            </p>
            <div className="grid grid-3">
              {data.requests.map((r) => (
                <article key={r.id} className="card request-card">
                  <span className="badge">{r.type === "cancel" ? "Cancel" : "Change date"}</span>
                  <h3>
                    {niceDate(r.bookingDate)} · {r.bookingTime}
                  </h3>
                  <p className="muted">
                    {r.packageName} · {r.players} players · {r.amount}
                  </p>
                  <p>
                    <strong>Policy:</strong> {POLICY_LABEL[r.policy]}
                  </p>
                  {r.message ? <p className="inquiry-message">“{r.message}”</p> : null}
                  <p>
                    {r.customerName ?? "—"}
                    <br />
                    {r.customerPhone ? <a href={telHref(usPhone(r.customerPhone))}>{usPhone(r.customerPhone)}</a> : null}
                    {r.customerPhone && r.customerEmail ? <br /> : null}
                    {r.customerEmail ? <a href={`mailto:${r.customerEmail}`}>{r.customerEmail}</a> : null}
                  </p>
                  <p className="muted small">Confirmation #{r.bookingId}</p>
                  <ResolveRequestButton id={r.id} />
                </article>
              ))}
            </div>
          </AdminSection>
        ) : null}

        <AdminSection title="Upcoming bookings" count={data.upcoming.length} hint="Next 14 days" open>
        {data.upcoming.length === 0 ? (
          <p className="muted">No paid bookings yet.</p>
        ) : (
          [...byDate.entries()].map(([date, list]) => (
            <div key={date} className="admin-day">
              <h3>
                {date === data.today ? "Today · " : ""}
                {niceDate(date)}
                <span className="muted">
                  {" "}
                  · {list.length} {list.length === 1 ? "booking" : "bookings"} ·{" "}
                  {list.reduce((n, b) => n + b.players, 0)} players
                </span>
              </h3>
              <div className="table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Experience</th>
                      <th>Players</th>
                      <th>Customer</th>
                      <th>Contact</th>
                      <th className="num">Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((b) => (
                      <tr key={b.id}>
                        <td>{b.time}</td>
                        <td>{b.packageName}</td>
                        <td>{b.players}</td>
                        <td>{b.name ?? "—"}</td>
                        <td>
                          {b.phone ? <a href={telHref(usPhone(b.phone))}>{usPhone(b.phone)}</a> : null}
                          {b.phone && b.email ? <br /> : null}
                          {b.email ? <a href={`mailto:${b.email}`}>{b.email}</a> : null}
                        </td>
                        <td className="num">{b.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
        </AdminSection>

        <AdminSection title="Money by source" hint="Bookings, shop & terminal · today, 7 days, month">
          <SourceTable data={data} />
        </AdminSection>

        <AdminSection title="Front desk" hint="Gift cards, tickets & terminal">
          <div className="grid grid-2 admin-tools">
            <GiftCardDesk />
            <div className="admin-stack">
              <TerminalSyncPanel providers={data.terminalSync} />
              {/* Registro a mano: solo hace falta mientras Clover no este conectado. */}
              <TerminalSaleForm today={data.today} />
            </div>
          </div>
        </AdminSection>

        <AdminSection title="Terminal sales" count={data.terminalSales.length}>
        {data.terminalSales.length === 0 ? (
          <p className="muted">No terminal sales yet. Connect Clover or add them by hand above.</p>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Location</th>
                  <th>Source</th>
                  <th>Note</th>
                  <th className="num">Amount</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.terminalSales.map((t) => (
                  <tr key={t.id}>
                    <td>{niceDate(t.date)}</td>
                    <td>{t.locationLabel}</td>
                    <td>{t.sourceLabel}</td>
                    <td>{t.note ?? "—"}</td>
                    <td className="num">{t.amount}</td>
                    <td>
                      {(t.source ?? "manual") === "manual" ? <DeleteTerminalSale id={t.id} /> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </AdminSection>

        <AdminSection title="Shop orders" count={data.orders.length}>
        {data.orders.length === 0 ? (
          <p className="muted">No shop orders yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Paid</th>
                  <th>Items</th>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      {new Intl.DateTimeFormat("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        timeZone: "America/Denver",
                      }).format(new Date(o.paidAt ?? o.createdAt))}
                    </td>
                    <td>
                      {o.lines.map((l) => (
                        <div key={`${l.productId}-${l.variant ?? ""}`}>
                          {l.qty} × {l.name}
                          {l.variant ? ` (${l.variant})` : ""}{" "}
                          <span className="muted small">{l.fulfillment === "email" ? "· email" : "· pickup"}</span>
                        </div>
                      ))}
                      {o.giftCodes.length > 0 ? (
                        <div className="small">
                          {o.giftCodes.map((c) => (
                            <code key={c.code} className="admin-code">
                              {c.code}
                            </code>
                          ))}
                        </div>
                      ) : null}
                      {o.note ? <div className="muted small">“{o.note}”</div> : null}
                    </td>
                    <td>{o.customer?.name ?? "—"}</td>
                    <td>
                      {o.customer?.phone ? (
                        <a href={telHref(usPhone(o.customer.phone))}>{usPhone(o.customer.phone)}</a>
                      ) : null}
                      {o.customer?.phone && o.customer?.email ? <br /> : null}
                      {o.customer?.email ? <a href={`mailto:${o.customer.email}`}>{o.customer.email}</a> : null}
                    </td>
                    <td className="num">{o.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        </AdminSection>

        <AdminSection
          title="Event requests"
          count={events.length}
          hint={needsQuote.length > 0 ? `${needsQuote.length} waiting for a quote` : "Corporate events & mobile arenas"}
          open={needsQuote.length > 0}
          alert={needsQuote.length > 0}
        >
          <QuoteBuilder phone={site.phones[0]} businessName={site.name} standalone />
          {events.length === 0 ? <p className="muted">No event requests from the website yet.</p> : null}
          {needsQuote.length > 0 ? (
            <>
              <h3 className="admin-subhead"><span className="status-pill status-reply">To quote</span> Waiting for a quote ({needsQuote.length})</h3>
              <InquiryGrid list={needsQuote} empty="" withQuote pending />
            </>
          ) : null}
          {quotedEvents.length > 0 ? (
            <details className="admin-subsection">
              <summary>Already quoted ({quotedEvents.length})</summary>
              <InquiryGrid list={quotedEvents} empty="" withQuote quotedIds={quotedIds} />
            </details>
          ) : null}
        </AdminSection>

        <AdminSection
          title="Quotes & replies"
          count={data.quotes.length}
          hint={awaitingOwner > 0 ? `${awaitingOwner} waiting for your reply` : "Sent to customers' accounts"}
          open={awaitingOwner > 0}
          alert={awaitingOwner > 0}
        >
          <QuoteList quotes={data.quotes} />
        </AdminSection>

        <AdminSection title="STEM waitlist" count={waitlist.length} hint={`Groups of ${STEM_GROUP_SIZE}`}>
          <StemWaitlist list={waitlist} />
        </AdminSection>

        <AdminSection title="Contact messages" count={messages.length}>
          <InquiryGrid list={messages} empty="No messages yet." />
        </AdminSection>
      </div>
    </section>
  );
}

/** Seccion desplegable del panel (`<details>` nativo: funciona sin JavaScript y con teclado). */
function AdminSection({
  title,
  count,
  hint,
  open = false,
  alert = false,
  children,
}: {
  title: string;
  count?: number;
  hint?: string;
  open?: boolean;
  alert?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className={`admin-section${alert ? " admin-section-alert" : ""}`} open={open}>
      <summary>
        <span className="admin-section-title">{title}</span>
        {count !== undefined ? <span className="admin-count">{count}</span> : null}
        {hint ? <span className="muted small admin-section-hint">{hint}</span> : null}
      </summary>
      <div className="admin-section-body">{children}</div>
    </details>
  );
}

const fullDate = (ms: number) =>
  new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Denver" }).format(
    new Date(ms),
  );

/** "today" / "1 day" / "3 days": cuanto lleva esperando una solicitud. */
function waitingFor(createdAt: number): string {
  const days = Math.floor((Date.now() - createdAt) / 86_400_000);
  return days <= 0 ? "today" : days === 1 ? "1 day" : `${days} days`;
}

/**
 * Etiqueta de estado (color + una palabra):
 * Reply = te toca contestar (naranja) · Pending = esperando al cliente (amarillo)
 * Accepted = aceptada (verde) · Declined = rechazada (rojo).
 */
function quoteStatus(q: AdminEventQuote): { label: string; tone: "reply" | "pending" | "accepted" | "declined" } {
  if (q.status === "accepted") return { label: "Accepted", tone: "accepted" };
  if (q.status === "declined") return { label: "Declined", tone: "declined" };
  if (q.awaiting === "owner") return { label: "Reply", tone: "reply" };
  return { label: "Pending", tone: "pending" };
}

/**
 * Cotizaciones mandadas a la cuenta del cliente, en grupos desplegables para que no se vea todo largo.
 * Solo se abre solo el grupo que pide accion (el cliente contesto y espera respuesta).
 */
function QuoteList({ quotes }: { quotes: AdminEventQuote[] }) {
  if (quotes.length === 0) {
    return <p className="muted">No quotes sent yet. Use “Prepare quote” or “+ New quote” and send it to the customer&apos;s account.</p>;
  }
  const groups: { key: string; tone: string; word: string; title: string; list: AdminEventQuote[]; open: boolean }[] = [
    { key: "reply", tone: "reply", word: "Reply", title: "Waiting for your reply", list: quotes.filter((q) => q.awaiting === "owner"), open: true },
    {
      key: "pending",
      tone: "pending",
      word: "Pending",
      title: "Waiting for the customer",
      list: quotes.filter((q) => q.awaiting === "customer" && q.status === "sent"),
      open: false,
    },
    {
      key: "accepted",
      tone: "accepted",
      word: "Accepted",
      title: "Ready to schedule",
      list: quotes.filter((q) => q.awaiting === "customer" && q.status === "accepted"),
      open: false,
    },
    {
      key: "declined",
      tone: "declined",
      word: "Declined",
      title: "Not this time",
      list: quotes.filter((q) => q.awaiting === "customer" && q.status === "declined"),
      open: false,
    },
  ];
  return (
    <>
      {groups
        .filter((g) => g.list.length > 0)
        .map((g) => (
          <details key={g.key} className={`admin-subsection quote-group quote-group-${g.key}`} open={g.open}>
            <summary>
              <span className={`status-pill status-${g.tone}`}>{g.word}</span> {g.title} <span className="admin-count">{g.list.length}</span>
            </summary>
            <QuoteCards quotes={g.list} />
          </details>
        ))}
    </>
  );
}

/** Ultimo mensaje recortado, para la vista compacta. */
function lastMessage(q: AdminEventQuote): string {
  const m = q.messages[q.messages.length - 1];
  if (!m) return "";
  const text = m.text.replace(/\s+/g, " ").trim();
  return `${m.from === "owner" ? "You" : q.name.split(/\s+/)[0]}: ${text.length > 90 ? `${text.slice(0, 90)}…` : text}`;
}

/**
 * Cada cotizacion es una fila compacta (nombre, tipo, total, estado y ultimo mensaje);
 * la cotizacion completa y la conversacion se despliegan con un clic.
 */
function QuoteCards({ quotes }: { quotes: AdminEventQuote[] }) {
  return (
    <div className="quote-rows">
      {quotes.map((q) => (
        <details key={q.id} className={`card quote-card quote-row${q.awaiting === "owner" ? " is-waiting" : ""}`}>
          <summary>
            <span className="quote-row-main">
              <strong>{q.name}</strong>
              <span className="muted small">
                {q.kindLabel} · {q.groupSize} people · {q.hours} h ·{" "}
                {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "America/Denver" }).format(
                  new Date(q.updatedAt),
                )}
              </span>
              <span className="quote-row-last small">{lastMessage(q)}</span>
            </span>
            <span className="quote-row-side">
              <strong>{q.totalCents !== null ? money(q.totalCents) : "By hand"}</strong>
              <span className={`status-pill status-${quoteStatus(q).tone}`}>{quoteStatus(q).label}</span>
            </span>
          </summary>
          <div className="quote-row-body">
          <p className="muted small">
            {q.kindLabel} · {q.groupSize} people · {q.hours} hours
            {q.eventAddress ? ` · ${q.eventAddress}` : ""}
          </p>
          <p className="small">
            <a href={`mailto:${q.email}`}>{q.email}</a> ·{" "}
            {q.hasAccount ? (
              <span>has an account</span>
            ) : (
              <span className="quote-warn">no account yet: they&apos;ll see it when they sign up with this email</span>
            )}
          </p>
          <p>
            <strong>{q.totalCents !== null ? money(q.totalCents) : "Price by hand"}</strong>
            {q.awaiting === "owner" ? <span className="quote-warn small"> · waiting for your reply</span> : null}
          </p>
          <QuoteThread id={q.id} as="owner" messages={q.messages} status={q.status} customerName={q.name} />
          </div>
        </details>
      ))}
    </div>
  );
}

/**
 * Solicitudes de eventos en una sola linea (nombre, tipo, personas, horas, fecha y estado);
 * los datos de contacto, el mensaje y el armador de cotizacion se despliegan con un clic.
 */
function EventRows({
  list,
  pending,
  quotedIds,
}: {
  list: InquirySummary[];
  pending: boolean;
  quotedIds?: Set<string>;
}) {
  const short = (ms: number) =>
    new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "America/Denver" }).format(new Date(ms));
  return (
    <div className="quote-rows">
      {list.map((q) => (
        <details key={q.id} className={`card quote-card quote-row${pending ? " is-waiting" : ""}`}>
          <summary>
            <span className="quote-row-main">
              <strong>{q.name}</strong>
              <span className="muted small">
                {[q.eventType, q.groupSize ? `${q.groupSize} people` : null, q.hours ? `${q.hours} h` : null, short(q.createdAt)]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
            <span className="quote-row-side">
              {pending ? (
                <span className="status-pill status-reply">To quote · {waitingFor(q.createdAt)}</span>
              ) : quotedIds?.has(q.id) ? (
                <span className="status-pill status-progress">Quoted</span>
              ) : null}
            </span>
          </summary>
          <div className="quote-row-body">
            <p className="small">
              <a href={`mailto:${q.email}`}>{q.email}</a>
              {q.phone ? (
                <>
                  {" · "}
                  <a href={telHref(q.phone)}>{q.phone}</a>
                </>
              ) : null}
            </p>
            {q.eventAddress ? <p className="muted small">📍 {q.eventAddress}</p> : null}
            {q.message ? <p className="inquiry-message">{q.message}</p> : null}
            <p className="muted small">Received {fullDate(q.createdAt)}</p>
            <QuoteBuilder
              name={q.name}
              email={q.email}
              eventType={q.eventType}
              eventAddress={q.eventAddress}
              groupSize={q.groupSize}
              hours={q.hours}
              inquiryId={q.id}
              phone={site.phones[0]}
              businessName={site.name}
            />
          </div>
        </details>
      ))}
    </div>
  );
}

function InquiryGrid({
  list,
  empty,
  withQuote = false,
  quotedIds,
  pending = false,
}: {
  list: InquirySummary[];
  empty: string;
  withQuote?: boolean;
  /** Solicitudes que todavia esperan cotizacion (se marcan con cuantos dias llevan). */
  pending?: boolean;
  /** Solicitudes que ya tienen una cotizacion enviada. */
  quotedIds?: Set<string>;
}) {
  if (list.length === 0) return <p className="muted">{empty}</p>;
  if (withQuote) return <EventRows list={list} pending={pending} quotedIds={quotedIds} />;
  return (
    <div className="grid grid-3">
      {list.map((q) => (
        <article key={q.id} className={`card inquiry-card${pending ? " is-waiting" : ""}`}>
          {quotedIds?.has(q.id) ? <span className="status-pill status-progress">Quoted</span> : null}
          {pending ? <span className="status-pill status-reply">To quote · {waitingFor(q.createdAt)}</span> : null}
          <h3>{q.name}</h3>
          <p>
            <a href={`mailto:${q.email}`}>{q.email}</a>
            <br />
            {q.phone ? <a href={telHref(q.phone)}>{q.phone}</a> : null}
          </p>
          {q.eventType ? (
            <p className="muted">
              {q.eventType}
              {q.groupSize ? ` · ${q.groupSize} people` : ""}
              {q.hours ? ` · ${q.hours} hours` : ""}
              {q.eventAddress ? ` · ${q.eventAddress}` : ""}
            </p>
          ) : null}
          {q.message ? <p className="inquiry-message">{q.message}</p> : null}
          <p className="muted small">{fullDate(q.createdAt)}</p>
          {withQuote ? (
            <QuoteBuilder
              name={q.name}
              email={q.email}
              eventType={q.eventType}
              eventAddress={q.eventAddress}
              groupSize={q.groupSize}
              hours={q.hours}
              inquiryId={q.id}
              phone={site.phones[0]}
              businessName={site.name}
            />
          ) : null}
        </article>
      ))}
    </div>
  );
}

/**
 * Lista de espera STEM en grupos por orden de llegada (feedback de David): cuando un grupo se llena,
 * los duenos les mandan el horario de inicio con un solo correo (todos en copia oculta).
 */
function StemWaitlist({ list }: { list: InquirySummary[] }) {
  if (list.length === 0) return <p className="muted">Nobody on the waitlist yet.</p>;
  const groups: InquirySummary[][] = [];
  for (let i = 0; i < list.length; i += STEM_GROUP_SIZE) groups.push(list.slice(i, i + STEM_GROUP_SIZE));

  return (
    <div className="stem-groups">
      {groups.map((group, i) => {
        const full = group.length === STEM_GROUP_SIZE;
        const bcc = group.map((q) => q.email).join(",");
        const subject = encodeURIComponent(`Your STEM class at ${site.name} is ready to start!`);
        return (
          <article key={i} className={`card stem-group${full ? " stem-group-full" : ""}`}>
            <div className="stem-group-head">
              <h3>Group {i + 1}</h3>
              <span className={`badge${full ? " badge-ready" : ""}`}>
                {full ? "Full · send the schedule" : `${group.length} / ${STEM_GROUP_SIZE}`}
              </span>
            </div>
            <div className="stem-meter" aria-hidden="true">
              <span style={{ width: `${(group.length / STEM_GROUP_SIZE) * 100}%` }} />
            </div>
            <ol className="stem-list">
              {group.map((q) => (
                <li key={q.id}>
                  <strong>{q.name}</strong>
                  <span className="muted small">
                    {" "}
                    · <a href={`mailto:${q.email}`}>{q.email}</a>
                    {q.phone ? (
                      <>
                        {" "}
                        · <a href={telHref(q.phone)}>{q.phone}</a>
                      </>
                    ) : null}
                  </span>
                  {q.message ? <div className="muted small">“{q.message}”</div> : null}
                </li>
              ))}
            </ol>
            <a className={`btn ${full ? "btn-primary" : "btn-outline"}`} href={`mailto:?bcc=${bcc}&subject=${subject}`}>
              Email this group
            </a>
          </article>
        );
      })}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="stat card">
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      {sub ? <span className="muted small">{sub}</span> : null}
    </div>
  );
}

const SOURCES: { key: RevenueSource; label: string }[] = [
  { key: "bookings", label: "Online bookings" },
  { key: "shop", label: "Online shop" },
  { key: "terminal", label: "Terminal (in store)" },
];

/** De donde viene el dinero: hoy, 7 dias y mes, separado por origen. */
function SourceTable({ data }: { data: AdminDashboard }) {
  const periods: { label: string; t: SourceTotals }[] = [
    { label: "Today", t: data.todayTotals },
    { label: "Last 7 days", t: data.weekTotals },
    { label: "This month", t: data.monthTotals },
  ];
  return (
    <div className="card">
      <h3 className="admin-h2">Where the money comes from</h3>
      <div className="table-wrap">
        <table className="admin-table source-table">
          <thead>
            <tr>
              <th>Source</th>
              {periods.map((p) => (
                <th key={p.label} className="num">
                  {p.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SOURCES.map((src) => (
              <tr key={src.key}>
                <td>
                  <span className={`swatch swatch-${src.key}`} aria-hidden="true" /> {src.label}
                </td>
                {periods.map((p) => (
                  <td key={p.label} className="num">
                    {money(p.t[src.key])}
                    {p.t.total > 0 ? (
                      <span className="muted small"> · {Math.round((p.t[src.key] / p.t.total) * 100)}%</span>
                    ) : null}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="total-row">
              <td>Total</td>
              {periods.map((p) => (
                <td key={p.label} className="num">
                  {money(p.t.total)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Ingresos por dia (ultimos 30 dias), apilados por origen, con tooltip y tabla accesible. */
function RevenueChart({ data }: { data: AdminDashboard }) {
  const max = Math.max(...data.daily.map((d) => d.total), 1);
  const first = data.daily[0];
  const last = data.daily[data.daily.length - 1];
  return (
    <div className="card revenue">
      <div className="revenue-head">
        <h3 className="admin-h2">Revenue per day</h3>
        <span className="muted small">Last 30 days · by payment date · max {money(max)}</span>
      </div>
      <div className="chart-legend small">
        {SOURCES.map((src) => (
          <span key={src.key}>
            <span className={`swatch swatch-${src.key}`} aria-hidden="true" /> {src.label}
          </span>
        ))}
      </div>
      <div className="bars" role="img" aria-label="Stacked bar chart of revenue per day by source for the last 30 days">
        {data.daily.map((d) => (
          <div key={d.date} className="bar-col" tabIndex={0}>
            <div className="bar-stack" style={{ height: `${d.total === 0 ? 0 : Math.max(2, (d.total / max) * 100)}%` }}>
              {SOURCES.map((src) =>
                d[src.key] > 0 ? (
                  <div
                    key={src.key}
                    className={`bar-seg swatch-${src.key}`}
                    style={{ height: `${(d[src.key] / d.total) * 100}%` }}
                  />
                ) : null,
              )}
            </div>
            <div className="bar-tip" role="tooltip">
              <strong>{money(d.total)}</strong>
              <span>{niceDate(d.date)}</span>
              {SOURCES.map((src) =>
                d[src.key] > 0 ? (
                  <span key={src.key}>
                    {src.label}: {money(d[src.key])}
                  </span>
                ) : null,
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="bars-axis muted small">
        <span>{first ? niceDate(first.date) : ""}</span>
        <span>{last ? niceDate(last.date) : ""}</span>
      </div>
      <details className="revenue-table">
        <summary>Show as table</summary>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th className="num">Bookings</th>
                <th className="num">Shop</th>
                <th className="num">Terminal</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {[...data.daily].reverse().map((d) => (
                <tr key={d.date}>
                  <td>{niceDate(d.date)}</td>
                  <td className="num">
                    {money(d.bookings)} <span className="muted small">({d.bookingCount})</span>
                  </td>
                  <td className="num">
                    {money(d.shop)} <span className="muted small">({d.orderCount})</span>
                  </td>
                  <td className="num">{money(d.terminal)}</td>
                  <td className="num">{money(d.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
