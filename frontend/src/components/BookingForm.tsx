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
  // Gift card opcional: se verifica el saldo antes de pagar; el servidor lo vuelve a validar.
  const [giftInput, setGiftInput] = useState("");
  const [gift, setGift] = useState<{ code: string; balanceCents: number } | null>(null);
  const [giftError, setGiftError] = useState<string | null>(null);
  const [checkingGift, setCheckingGift] = useState(false);
  const [contact, setContact] = useState({ name: "", email: "", phone: "" });

  const pkg = getPackage(packageId) ?? PACKAGES[0]!;
  const safePlayers = Math.min(Math.max(players, pkg.minPlayers), pkg.maxPlayers);
  const total = priceCents(pkg, safePlayers);
  const starts = day ? availableStarts(day, pkg, safePlayers) : [];
  const giftCents = gift ? Math.min(gift.balanceCents, total) : 0;
  const dueCents = total - giftCents;
  const giftCoversAll = gift !== null && dueCents === 0;

  async function applyGift() {
    if (!giftInput.trim()) return;
    setCheckingGift(true);
    setGiftError(null);
    try {
      const res = (await fetch(`/api/giftcards/check?code=${encodeURIComponent(giftInput.trim())}`).then((r) =>
        r.json(),
      )) as ApiResponse<{ code: string; balanceCents: number }>;
      if (res.ok) setGift(res.data);
      else setGiftError(res.error.message);
    } catch {
      setGiftError("Could not check the gift card. Please try again.");
    }
    setCheckingGift(false);
  }

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
        body: JSON.stringify({
          packageId,
          players: safePlayers,
          date,
          time: minutesToTime(time),
          ...(gift ? { giftCode: gift.code } : {}),
          ...(giftCoversAll ? contact : {}),
        }),
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

      <fieldset>
        <legend>5. Gift card (optional)</legend>
        {gift ? (
          <div className="gift-applied">
            <span>
              <strong>{gift.code}</strong> · {formatPrice(gift.balanceCents)} available
            </span>
            <button
              type="button"
              className="link-button small"
              onClick={() => {
                setGift(null);
                setGiftInput("");
              }}
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="gift-row">
            <label className="field">
              <span className="sr-only">Gift card code</span>
              <input
                id="gift-code"
                value={giftInput}
                onChange={(e) => setGiftInput(e.target.value)}
                placeholder="BOT-XXXX-XXXX"
                autoComplete="off"
                maxLength={20}
              />
            </label>
            <button
              type="button"
              className="btn btn-outline btn-small"
              onClick={applyGift}
              disabled={checkingGift || !giftInput.trim()}
            >
              {checkingGift ? "Checking…" : "Apply"}
            </button>
          </div>
        )}
        {giftError ? (
          <p className="form-error small" role="alert">
            {giftError}
          </p>
        ) : null}
        {giftCoversAll ? (
          <div className="form-row">
            <label className="field">
              <span>Name</span>
              <input
                id="contact-name"
                autoComplete="name"
                required
                maxLength={120}
                value={contact.name}
                onChange={(e) => setContact({ ...contact, name: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Email</span>
              <input
                id="contact-email"
                type="email"
                autoComplete="email"
                required
                maxLength={160}
                value={contact.email}
                onChange={(e) => setContact({ ...contact, email: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Phone</span>
              <input
                id="contact-phone"
                type="tel"
                autoComplete="tel"
                required
                maxLength={40}
                value={contact.phone}
                onChange={(e) => setContact({ ...contact, phone: e.target.value })}
              />
            </label>
          </div>
        ) : null}
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
          <span className="muted">{gift ? "Due today" : "Total"}</span>
          <strong>{formatPrice(dueCents)}</strong>
          {gift ? (
            <span className="muted small">
              {formatPrice(total)} − {formatPrice(giftCents)} gift card
            </span>
          ) : null}
        </div>
        <button type="submit" className="btn btn-primary" disabled={time === null || !agreed || submitting}>
          {submitting ? "Booking…" : giftCoversAll ? "Book with gift card" : "Continue to payment"}
        </button>
      </div>
      <p className="muted small">Secure payment by Stripe. Full payment is due when booking.</p>
    </form>
  );
}
