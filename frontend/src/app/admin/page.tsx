import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  ADMIN_COOKIE,
  getAdminDashboard,
  isAdminConfigured,
  verifyAdminSession,
  type AdminBooking,
  type AdminDashboard,
  type RevenueSource,
  type SourceTotals,
} from "@botspot/backend";
import { AdminLogin, AdminLogout, ResolveRequestButton } from "@/components/AdminAuth";
import { DeleteTerminalSale, GiftCardDesk, TerminalSaleForm, TerminalSyncPanel } from "@/components/AdminTools";
import { telHref } from "@/content/site";

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

        <SourceTable data={data} />

        <RevenueChart data={data} />

        <h2 className="admin-h2">Front desk</h2>
        <div className="grid grid-2 admin-tools">
          <GiftCardDesk />
          <div className="admin-stack">
            <TerminalSyncPanel providers={data.terminalSync} />
            {/* Registro a mano: solo hace falta mientras Clover no este conectado. */}
            <TerminalSaleForm today={data.today} />
          </div>
        </div>

        {data.requests.length > 0 ? (
          <>
            <h2 className="admin-h2">⚠️ Cancellation & change requests ({data.requests.length})</h2>
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
          </>
        ) : null}

        <h2 className="admin-h2">Upcoming bookings (next 14 days)</h2>
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

        <h2 className="admin-h2">Terminal sales</h2>
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

        <h2 className="admin-h2">Shop orders</h2>
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

        <h2 className="admin-h2">Contact messages, event requests & STEM waitlist</h2>
        {data.inquiries.length === 0 ? (
          <p className="muted">No requests yet.</p>
        ) : (
          <div className="grid grid-3">
            {data.inquiries.map((q) => (
              <article key={q.id} className="card inquiry-card">
                <span className={`badge badge-${q.type}`}>
                  {q.type === "steam" ? "STEM waitlist" : q.type === "contact" ? "Contact message" : "Event request"}
                </span>
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
                    {q.eventAddress ? ` · ${q.eventAddress}` : ""}
                  </p>
                ) : null}
                {q.message ? <p className="inquiry-message">{q.message}</p> : null}
                <p className="muted small">
                  {new Intl.DateTimeFormat("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "America/Denver",
                  }).format(new Date(q.createdAt))}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
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
      <h2 className="admin-h2">Where the money comes from</h2>
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
        <h2 className="admin-h2">Revenue per day</h2>
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
