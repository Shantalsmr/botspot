"use client";

import Link from "next/link";
import { useState } from "react";
import { EVENT_DURATIONS, EVENT_GROUP_SIZES } from "@botspot/backend/catalog";

type ApiResponse = { ok: true; data: { id: string } } | { ok: false; error: { code: string; message: string } };

/** Formulario de eventos corporativos (`corporate`), lista de espera STEM (`steam`) o contacto (`contact`). */
export function InquiryForm({ type }: { type: "corporate" | "steam" | "contact" }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const res = (await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, type }),
      }).then((r) => r.json())) as ApiResponse;
      if (res.ok) {
        setStatus("sent");
        return;
      }
      setError(res.error.message);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setStatus("idle");
  }

  if (status === "sent") {
    return (
      <div className="card form-success" role="status">
        <h3>
          {type === "steam" ? "You're on the list!" : type === "contact" ? "Message sent!" : "Thanks! We got your request."}
        </h3>
        <p className="muted">
          {type === "steam"
            ? "We'll let you know as soon as the STEM Program opens."
            : type === "contact"
              ? "Thanks for reaching out. We usually reply within one business day."
              : "We'll send a custom quote for your event to your Bot Spot account, where you can accept it or ask us questions."}
        </p>
        {type === "corporate" ? (
          <div className="actions">
            <Link href="/account/register?next=/account" className="btn btn-primary btn-small">
              Create your account
            </Link>
            <Link href="/account/login?next=/account" className="btn btn-outline btn-small">
              I already have one
            </Link>
          </div>
        ) : null}
        {type === "corporate" ? (
          <p className="muted small">Use the same email you just entered so your quote shows up there.</p>
        ) : null}
      </div>
    );
  }

  return (
    <form className="card inquiry-form" onSubmit={submit}>
      <div className="form-row">
        <label className="field">
          <span>Name</span>
          <input name="name" autoComplete="name" required maxLength={120} />
        </label>
        <label className="field">
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" required maxLength={160} />
        </label>
        <label className="field">
          <span>Phone{type === "contact" ? " (optional)" : ""}</span>
          <input name="phone" type="tel" autoComplete="tel" required={type !== "contact"} maxLength={40} />
        </label>
      </div>
      {type === "corporate" ? (
        <>
          <div className="form-row">
            <label className="field">
              <span>Event address</span>
              <input name="eventAddress" autoComplete="street-address" required maxLength={200} />
            </label>
            <label className="field">
              <span>Type of event</span>
              <select name="eventType" required defaultValue="">
                <option value="" disabled>
                  Choose one
                </option>
                <option>Company / team event</option>
                <option>School</option>
                <option>University</option>
                <option>Festival / public event</option>
                <option>Other</option>
              </select>
            </label>
          </div>
          <div className="form-row">
            <label className="field">
              <span>How many people?</span>
              <select name="groupSize" required defaultValue="">
                <option value="" disabled>
                  Choose a range
                </option>
                {EVENT_GROUP_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size} people
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>How long?</span>
              <select name="hours" required defaultValue="">
                <option value="" disabled>
                  Choose a duration
                </option>
                {EVENT_DURATIONS.map((h) => (
                  <option key={h} value={h}>
                    {h} hours
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            <span>Tell us more (optional)</span>
            <textarea name="message" rows={4} maxLength={2000} placeholder="Date, start time, anything we should know…" />
          </label>
        </>
      ) : null}
      {type === "contact" ? (
        <label className="field">
          <span>Message</span>
          <textarea name="message" rows={5} required maxLength={2000} placeholder="How can we help?" />
        </label>
      ) : null}
      {/* Campo trampa para bots: oculto para personas */}
      <label className="hp" aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="actions">
        <button type="submit" className="btn btn-primary" disabled={status === "sending"}>
          {status === "sending"
            ? "Sending…"
            : type === "steam"
              ? "Join the waitlist"
              : type === "contact"
                ? "Send message"
                : "Request a quote"}
        </button>
      </div>
    </form>
  );
}
