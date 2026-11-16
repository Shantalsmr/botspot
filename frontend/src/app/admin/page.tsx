import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  ADMIN_COOKIE,
  getAdminDashboard,
  isAdminConfigured,
  verifyAdminSession,
  type AdminBooking,
  type AdminDashboard,
} from "@botspot/backend";
import { AdminLogin, AdminLogout } from "@/components/AdminAuth";
import { telHref } from "@/content/site";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);

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
          <Stat label="Revenue today" value={money(data.revenueTodayCents)} />
          <Stat label="Last 7 days" value={money(data.revenueWeekCents)} />
          <Stat label="This month" value={money(data.revenueMonthCents)} />
          <Stat label="Bookings today" value={String(data.bookingsToday)} sub={`${data.playersToday} players`} />
        </div>

        <RevenueChart data={data} />

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

        <h2 className="admin-h2">Event requests & STEAM waitlist</h2>
        {data.inquiries.length === 0 ? (
          <p className="muted">No requests yet.</p>
        ) : (
          <div className="grid grid-3">
            {data.inquiries.map((q) => (
              <article key={q.id} className="card inquiry-card">
                <span className={`badge badge-${q.type}`}>{q.type === "steam" ? "STEAM waitlist" : "Event request"}</span>
                <h3>{q.name}</h3>
                <p>
                  <a href={`mailto:${q.email}`}>{q.email}</a>
                  <br />
                  <a href={telHref(q.phone)}>{q.phone}</a>
                </p>
                {q.eventType ? (
                  <p className="muted">
                    {q.eventType}
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

/** Ingresos por dia (ultimos 30 dias): barras con tooltip al pasar el mouse y tabla accesible. */
function RevenueChart({ data }: { data: AdminDashboard }) {
  const max = Math.max(...data.daily.map((d) => d.cents), 1);
  const first = data.daily[0];
  const last = data.daily[data.daily.length - 1];
  return (
    <div className="card revenue">
      <div className="revenue-head">
        <h2 className="admin-h2">Revenue per day</h2>
        <span className="muted small">Last 30 days · by payment date · max {money(max)}</span>
      </div>
      <div className="bars" role="img" aria-label="Bar chart of revenue per day for the last 30 days">
        {data.daily.map((d) => (
          <div key={d.date} className="bar-col" tabIndex={0}>
            <div className="bar" style={{ height: `${d.cents === 0 ? 0 : Math.max(2, (d.cents / max) * 100)}%` }} />
            <div className="bar-tip" role="tooltip">
              <strong>{money(d.cents)}</strong>
              <span>
                {niceDate(d.date)} · {d.bookings} {d.bookings === 1 ? "booking" : "bookings"}
              </span>
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
                <th>Bookings</th>
                <th className="num">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {[...data.daily].reverse().map((d) => (
                <tr key={d.date}>
                  <td>{niceDate(d.date)}</td>
                  <td>{d.bookings}</td>
                  <td className="num">{money(d.cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
