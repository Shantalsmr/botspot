"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BOOKING_WINDOW_DAYS,
  PACKAGES,
  addDays,
  availableStarts,
  formatPrice,
  formatTime,
  getPackage,
  hoursFor,
  minutesToTime,
  nowInProvo,
  priceCents,
  type DayAvailability,
  type PackageId,
} from "@botspot/backend/catalog";

type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

/** Formulario de reserva: paquete, personas, fecha y hora; luego redirige a Stripe Checkout. */
export function BookingForm({ canceled }: { canceled: boolean }) {
  const today = useMemo(() => nowInProvo().date, []);
  const [packageId, setPackageId] = useState<PackageId>("battle-60");
  const [players, setPlayers] = useState(4);
  // Fecha inicial: hoy si abre y aun quedan horas; si no, el siguiente dia abierto.
  const [date, setDate] = useState(() => {
    const now = nowInProvo();
    for (let i = 0; i < 7; i++) {
      const d = addDays(now.date, i);
      const h = hoursFor(d);
      if (h && (i > 0 || now.minute + 90 < h.close)) return d;
    }
    return now.date;
  });
  const [time, setTime] = useState<number | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [day, setDay] = useState<DayAvailability | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(canceled ? "Payment was canceled. Your time was not booked." : null);

  const pkg = getPackage(packageId) ?? PACKAGES[0]!;
  const safePlayers = Math.min(Math.max(players, pkg.minPlayers), pkg.maxPlayers);
  const total = priceCents(pkg, safePlayers);
  const starts = day ? availableStarts(day, pkg, safePlayers) : [];

  useEffect(() => {
    let active = true;
    setLoading(true);
    setDay(null);
    fetch(`/api/bookings/availability?date=${date}`)
      .then((r) => r.json() as Promise<ApiResponse<DayAvailability>>)
      .then((res) => {
        if (!active) return;
        if (res.ok) setDay(res.data);
        else setError(res.error.message);
      })
      .catch(() => active && setError("Could not load available times."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [date]);

  // Si la hora elegida deja de estar disponible (cambio de paquete/personas), se limpia.
  useEffect(() => {
    if (time !== null && !starts.includes(time)) setTime(null);
  }, [starts, time]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (time === null || !agreed) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = (await fetch("/api/bookings/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId, players: safePlayers, date, time: minutesToTime(time) }),
      }).then((r) => r.json())) as ApiResponse<{ url: string }>;
      if (res.ok) {
        window.location.href = res.data.url;
        return;
      }
      setError(res.error.message);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  }

  return (
    <form className="booking-form card" onSubmit={submit}>
      <fieldset>
        <legend>1. Choose your experience</legend>
        <div className="package-options">
          {PACKAGES.map((p) => (
            <label key={p.id} className={`package-option${p.id === packageId ? " is-selected" : ""}`}>
              <input
                type="radio"
                name="package"
                value={p.id}
                checked={p.id === packageId}
                onChange={() => setPackageId(p.id)}
              />
              <strong>{p.name}</strong>
              <span className="muted">{p.description}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="form-row">
        <label className="field">
          <span>2. {pkg.private ? "Guests" : "Players"}</span>
          <input
            type="number"
            min={pkg.minPlayers}
            max={pkg.maxPlayers}
            value={players}
            onChange={(e) => setPlayers(Number(e.target.value) || pkg.minPlayers)}
          />
        </label>
        <label className="field">
          <span>3. Date</span>
          <input
            type="date"
            min={today}
            max={addDays(today, BOOKING_WINDOW_DAYS)}
            value={date}
            required
            onChange={(e) => e.target.value && setDate(e.target.value)}
          />
        </label>
      </div>

      <fieldset>
        <legend>4. Start time</legend>
        {loading ? (
          <p className="muted">Loading available times…</p>
        ) : day && day.open === null ? (
          <p className="muted">We&apos;re closed that day. Please pick another date.</p>
        ) : day && starts.length === 0 ? (
          <p className="muted">No times available for this group size on that day. Try another date.</p>
        ) : (
          <div className="time-options">
            {starts.map((m) => (
              <button
                key={m}
                type="button"
                className={`time-option${m === time ? " is-selected" : ""}`}
                aria-pressed={m === time}
                onClick={() => setTime(m)}
              >
                {formatTime(m)}
              </button>
            ))}
          </div>
        )}
      </fieldset>

      <label className="checkbox">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        <span>
          I agree to the{" "}
          <Link href="/cancellation-policy" target="_blank">
            cancellation &amp; refund policy
          </Link>
          .
        </span>
      </label>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="booking-total">
        <div>
          <span className="muted">Total</span>
          <strong>{formatPrice(total)}</strong>
        </div>
        <button type="submit" className="btn btn-primary" disabled={time === null || !agreed || submitting}>
          {submitting ? "Redirecting…" : "Continue to payment"}
        </button>
      </div>
      <p className="muted small">Secure payment by Stripe. Full payment is due when booking.</p>
    </form>
  );
}
