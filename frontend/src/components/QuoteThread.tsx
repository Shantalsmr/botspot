"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Message {
  from: "owner" | "customer";
  text: string;
  at: number;
}

type ApiResponse = { ok: true; data: unknown } | { ok: false; error: { code: string; message: string } };

const when = (ms: number) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Denver",
  }).format(new Date(ms));

/**
 * Conversacion de una cotizacion de evento.
 * - `as="owner"` (en /admin): los duenos contestan.
 * - `as="customer"` (en /account): el cliente acepta, rechaza o pregunta.
 */
export function QuoteThread({
  id,
  as,
  messages,
  status,
  customerName,
}: {
  id: string;
  as: "owner" | "customer";
  messages: Message[];
  status: "sent" | "accepted" | "declined";
  customerName: string;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post(action: "reply" | "accept" | "decline" | "message") {
    if ((action === "reply" || action === "message") && !text.trim()) {
      setError("Write a message first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const url = as === "owner" ? "/api/admin/quotes" : "/api/account/quotes";
      const res = (await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, text }),
      }).then((r) => r.json())) as ApiResponse;
      if (res.ok) {
        setText("");
        router.refresh();
      } else {
        setError(res.error.message);
      }
    } catch {
      setError("Connection problem. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const otherName = as === "owner" ? customerName : "The Bot Spot";

  return (
    <div className="quote-thread">
      <ol className="thread">
        {messages.map((m, i) => {
          const mine = m.from === as;
          return (
            <li key={i} className={`thread-msg ${mine ? "is-mine" : "is-theirs"}`}>
              <span className="thread-meta small">
                {mine ? "You" : m.from === "owner" ? "The Bot Spot" : otherName} · {when(m.at)}
              </span>
              <p>{m.text}</p>
            </li>
          );
        })}
      </ol>

      {as === "customer" && status === "sent" ? (
        <div className="actions">
          <button type="button" className="btn btn-primary btn-small" disabled={busy} onClick={() => post("accept")}>
            Accept quote
          </button>
          <button type="button" className="btn btn-outline btn-small" disabled={busy} onClick={() => post("decline")}>
            No thanks
          </button>
        </div>
      ) : null}

      <label className="field">
        <span>{as === "owner" ? `Reply to ${customerName.split(/\s+/)[0]}` : "Questions? Send us a message"}</span>
        <textarea
          rows={3}
          value={text}
          maxLength={as === "owner" ? 3000 : 2000}
          onChange={(e) => setText(e.target.value)}
          placeholder={as === "owner" ? "Your reply…" : "Ask about dates, the price, what's included…"}
        />
      </label>
      <div className="actions">
        <button
          type="button"
          className="btn btn-outline btn-small"
          disabled={busy}
          onClick={() => post(as === "owner" ? "reply" : "message")}
        >
          {busy ? "Sending…" : "Send message"}
        </button>
      </div>
      {error ? (
        <p className="small quote-warn" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
