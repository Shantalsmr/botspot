"use client";

import { useState } from "react";

type ApiResponse = { ok: true; data: { id: string } } | { ok: false; error: { code: string; message: string } };

/** Formulario de eventos corporativos (`corporate`) o lista de espera STEAM (`steam`). */
export function InquiryForm({ type }: { type: "corporate" | "steam" }) {
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
        <h3>{type === "steam" ? "You're on the list!" : "Thanks! We got your request."}</h3>
        <p className="muted">
          {type === "steam"
            ? "We'll let you know as soon as the STEAM Program opens."
            : "We'll contact you soon with a custom quote for your event."}
        </p>
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
          <span>Phone</span>
          <input name="phone" type="tel" autoComplete="tel" required maxLength={40} />
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
          <label className="field">
            <span>Tell us more (optional)</span>
            <textarea name="message" rows={4} maxLength={2000} placeholder="Date, number of people, how long…" />
          </label>
        </>
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
          {status === "sending" ? "Sending…" : type === "steam" ? "Join the waitlist" : "Request a quote"}
        </button>
      </div>
    </form>
  );
}
