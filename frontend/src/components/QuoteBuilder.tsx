"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  EVENT_DURATIONS,
  EVENT_GROUP_SIZES,
  isEventDuration,
  isEventGroupSize,
  type EventGroupSize,
} from "@botspot/backend/catalog";
import {
  BASE_HOURS,
  QUOTE_ORIGIN,
  QUOTE_TEMPLATES,
  buildQuote,
  eventKindFromLabel,
  quoteEmail,
  type EventKind,
} from "@botspot/backend/event-quotes";

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);

const KINDS = Object.values(QUOTE_TEMPLATES);

/**
 * Armador de cotizacion: toma la plantilla segun el tipo de cliente, el rango de personas y las millas
 * (que el dueno ve en Google Maps), y arma el correo listo para mandar.
 * - Dentro de una solicitud de /events: los datos del cliente vienen del formulario.
 * - Suelto (`standalone`): para clientes que llaman o escriben por WhatsApp; los datos se escriben aqui.
 */
export function QuoteBuilder({
  name: initialName = "",
  email: initialEmail = "",
  eventType = null,
  eventAddress: initialAddress = null,
  groupSize = null,
  hours: initialHours = null,
  phone,
  businessName,
  standalone = false,
  inquiryId = null,
}: {
  /** Solicitud de /events de donde sale la cotizacion (null si es suelta). */
  inquiryId?: string | null;
  name?: string;
  email?: string;
  eventType?: string | null;
  eventAddress?: string | null;
  groupSize?: string | null;
  /** Horas que pidio el cliente en el formulario. */
  hours?: number | null;
  phone: string;
  businessName: string;
  standalone?: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [address, setAddress] = useState(initialAddress ?? "");
  const eventAddress = address.trim() || null;
  const [kind, setKind] = useState<EventKind>(eventKindFromLabel(eventType));
  const [size, setSize] = useState<EventGroupSize>(isEventGroupSize(groupSize) ? groupSize : "26–50");
  const [miles, setMiles] = useState("");
  const [hours, setHours] = useState<number>(isEventDuration(initialHours) ? initialHours : BASE_HOURS);
  const [copied, setCopied] = useState(false);
  /** Texto escrito a mano por el dueno (null = el generado por la plantilla). */
  const [edited, setEdited] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();

  const quote = buildQuote({ kind, groupSize: size, miles: Number(miles) || 0, hours });
  const generated = quoteEmail(quote, { name: name.trim() || "there", eventAddress, groupSize: size, hours, phone, businessName });
  const mail = { subject: generated.subject, body: edited ?? generated.body };

  async function sendToAccount() {
    setSending(true);
    setResult(null);
    try {
      const res = (await fetch("/api/admin/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          inquiryId,
          name,
          email,
          eventAddress,
          kind,
          groupSize: size,
          hours,
          miles: Number(miles) || 0,
          message: mail.body,
        }),
      }).then((r) => r.json())) as
        | { ok: true; data: { id: string; hasAccount: boolean } }
        | { ok: false; error: { message: string } };
      if (res.ok) {
        setResult({
          ok: true,
          text: res.data.hasAccount
            ? "Sent! The customer can see it in their account and reply."
            : "Saved! This email has no account yet: they'll see it when they sign up with it. Let them know by phone or WhatsApp.",
        });
        router.refresh();
      } else {
        setResult({ ok: false, text: res.error.message });
      }
    } catch {
      setResult({ ok: false, text: "Connection problem. Please try again." });
    } finally {
      setSending(false);
    }
  }
  const t = quote.template;
  const mapsUrl = eventAddress
    ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(QUOTE_ORIGIN)}&destination=${encodeURIComponent(eventAddress)}`
    : null;

  /** Resultado del calculo de millas (para mostrar a que direccion y cuanto tiempo de manejo). */
  const [route, setRoute] = useState<{ miles: number; minutes: number | null; resolvedAddress: string } | null>(null);
  const [routeState, setRouteState] = useState<"idle" | "loading" | "error">("idle");
  const [routeError, setRouteError] = useState<string | null>(null);
  /** Direccion para la que se calcularon las millas (si cambia, hay que recalcular). */
  const [routeFor, setRouteFor] = useState<string | null>(null);

  async function calculateMiles() {
    if (!eventAddress) {
      setRouteState("error");
      setRouteError("Add the event address first.");
      return;
    }
    setRouteState("loading");
    setRouteError(null);
    try {
      const res = (await fetch("/api/admin/distance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: eventAddress }),
      }).then((r) => r.json())) as
        | { ok: true; data: { miles: number; minutes: number | null; resolvedAddress: string } }
        | { ok: false; error: { message: string } };
      if (res.ok) {
        setRoute(res.data);
        setRouteFor(eventAddress);
        setMiles(String(res.data.miles));
        setRouteState("idle");
      } else {
        setRouteState("error");
        setRouteError(res.error.message);
      }
    } catch {
      setRouteState("error");
      setRouteError("Connection problem. Try again or check it in Google Maps.");
    }
  }

  /** Al abrir el armador con direccion, calcula las millas solo (una vez por direccion). */
  function onToggle(e: React.SyntheticEvent<HTMLDetailsElement>) {
    if (e.currentTarget.open && eventAddress && routeFor !== eventAddress && routeState !== "loading" && !miles) {
      void calculateMiles();
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(mail.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <details className={`quote-builder${standalone ? " card quote-standalone" : ""}`} onToggle={onToggle}>
      <summary className={`btn btn-small ${standalone ? "btn-primary" : "btn-outline"}`}>
        {standalone ? "+ New quote (phone, WhatsApp, walk-in)" : "Prepare quote"}
      </summary>
      <div className="quote-body">
        {standalone ? (
          <div className="quote-fields">
            <label className="field">
              <span>Customer name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
            </label>
            <label className="field">
              <span>Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={160} />
            </label>
            <label className="field quote-wide">
              <span>Event address</span>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onBlur={() => {
                  if (eventAddress && routeFor !== eventAddress) void calculateMiles();
                }}
                maxLength={200}
                placeholder="Street, city, state"
              />
            </label>
          </div>
        ) : null}
        <p className={`quote-goal quote-goal-${kind}`}>
          <strong>{t.label}:</strong> {t.goal}
        </p>

        <div className="quote-fields">
          <label className="field">
            <span>Template</span>
            <select value={kind} onChange={(e) => setKind(e.target.value as EventKind)}>
              {KINDS.map((k) => (
                <option key={k.kind} value={k.kind}>
                  {k.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>People</span>
            <select value={size} onChange={(e) => setSize(e.target.value as EventGroupSize)}>
              {EVENT_GROUP_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Miles from the arena</span>
            <input inputMode="decimal" value={miles} onChange={(e) => setMiles(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0" />
          </label>
          <label className="field">
            <span>Hours</span>
            <select value={hours} onChange={(e) => setHours(Number(e.target.value))}>
              {EVENT_DURATIONS.map((h) => (
                <option key={h} value={h}>
                  {h} hours
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="quote-route small">
          <button
            type="button"
            className="btn btn-outline btn-small"
            onClick={calculateMiles}
            disabled={routeState === "loading" || !eventAddress}
          >
            {routeState === "loading" ? "Calculating…" : routeFor === eventAddress && route ? "Recalculate miles" : "Calculate miles"}
          </button>
          {route && routeFor === eventAddress && routeState !== "loading" ? (
            <span>
              🚗 <strong>{route.miles} miles</strong>
              {route.minutes !== null ? ` · about ${route.minutes} min drive` : ""} from Provo to{" "}
              <span className="muted">{route.resolvedAddress}</span>
            </span>
          ) : null}
          {route && routeFor !== eventAddress && eventAddress ? (
            <span className="quote-warn">The address changed: recalculate the miles.</span>
          ) : null}
          {routeState === "error" && routeError ? <span className="quote-warn">{routeError}</span> : null}
          {!eventAddress ? <span className="muted">Add the event address to calculate the miles.</span> : null}
          {mapsUrl ? (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
              Check in Google Maps ↗
            </a>
          ) : null}
        </div>

        <table className="admin-table quote-lines">
          <tbody>
            {quote.lines.map((l) => (
              <tr key={l.label}>
                <td>{l.label}</td>
                <td className="num">{l.cents === 0 ? "Included" : money(l.cents)}</td>
              </tr>
            ))}
            <tr className="total-row">
              <td>Total</td>
              <td className="num">{quote.totalCents !== null ? money(quote.totalCents) : "By hand"}</td>
            </tr>
          </tbody>
        </table>
        {quote.manualReason ? <p className="small quote-warn">⚠️ {quote.manualReason}</p> : null}

        <p className="small">
          <strong>Before sending:</strong>
        </p>
        <ul className="small quote-checklist">
          {t.checklist.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>

        <label className="field">
          <span>
            Message to the customer{" "}
            {edited !== null ? (
              <button type="button" className="link-button small" onClick={() => setEdited(null)}>
                (reset to template)
              </button>
            ) : (
              <span className="muted small">(you can edit it)</span>
            )}
          </span>
          <textarea rows={12} value={mail.body} onChange={(e) => setEdited(e.target.value)} maxLength={6000} />
        </label>
        {edited !== null ? (
          <p className="muted small">You edited the text: changing people, miles or hours won&apos;t update it until you reset it.</p>
        ) : null}
        <div className="actions">
          <button type="button" className="btn btn-primary btn-small" onClick={sendToAccount} disabled={sending}>
            {sending ? "Sending…" : "Send to customer's account"}
          </button>
          <a
            className="btn btn-outline btn-small"
            href={`mailto:${encodeURIComponent(email.trim())}?subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.body)}`}
          >
            Open in my email
          </a>
          <button type="button" className="btn btn-outline btn-small" onClick={copy}>
            {copied ? "Copied!" : "Copy text"}
          </button>
        </div>
        {result ? (
          <p className={`small ${result.ok ? "quote-ok" : "quote-warn"}`} role="status">
            {result.text}
          </p>
        ) : null}
        <p className="muted small">Proposed prices: confirm them with the owners before sending.</p>
      </div>
    </details>
  );
}
