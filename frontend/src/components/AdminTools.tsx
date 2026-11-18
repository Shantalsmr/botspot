"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

interface GiftMovement {
  at: number;
  amount: number;
  channel: "store" | "online";
  ref: string | null;
  note: string | null;
}

interface GiftCard {
  code: string;
  kind: "money" | "tickets";
  initial: number;
  balance: number;
  balanceLabel: string;
  createdAt: number;
  purchaserEmail: string | null;
  history: GiftMovement[];
}

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

function fmt(kind: GiftCard["kind"], amount: number): string {
  return kind === "money" ? money(amount) : `${amount} ${Math.abs(amount) === 1 ? "ticket" : "tickets"}`;
}

const when = (ms: number) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Denver",
  }).format(new Date(ms));

async function post<T>(url: string, body: unknown): Promise<ApiResponse<T>> {
  try {
    return (await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => r.json())) as ApiResponse<T>;
  } catch {
    return { ok: false, error: { code: "network", message: "Connection problem. Please try again." } };
  }
}

/** Mostrador: buscar un codigo de gift card / tickets y descontar lo que se usa en el local. */
export function GiftCardDesk() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [card, setCard] = useState<GiftCard | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDone(null);
    const res = await post<GiftCard>("/api/admin/giftcards", { action: "lookup", code });
    if (res.ok) {
      setCard(res.data);
      setAmount("");
    } else {
      setCard(null);
      setError(res.error.message);
    }
    setBusy(false);
  }

  async function redeem(e: React.FormEvent) {
    e.preventDefault();
    if (!card) return;
    const value = card.kind === "money" ? Math.round(Number(amount.replace(/[$,\s]/g, "")) * 100) : Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError(card.kind === "money" ? "Enter the dollars to use, e.g. 25." : "Enter how many tickets to use.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await post<GiftCard>("/api/admin/giftcards", { action: "redeem", code: card.code, amount: value, note });
    if (res.ok) {
      setCard(res.data);
      setDone(`Used ${fmt(card.kind, value)}. Left: ${fmt(res.data.kind, res.data.balance)}.`);
      setAmount("");
      setNote("");
      router.refresh();
    } else {
      setError(res.error.message);
    }
    setBusy(false);
  }

  return (
    <div className="card admin-tool">
      <h3>Redeem a gift card or tickets</h3>
      <form className="gift-row" onSubmit={lookup}>
        <label className="field">
          <span className="sr-only">Code</span>
          <input
            id="desk-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="BOT-XXXX-XXXX"
            autoComplete="off"
            maxLength={20}
          />
        </label>
        <button type="submit" className="btn btn-primary btn-small" disabled={busy || !code.trim()}>
          Look up
        </button>
      </form>

      {error ? (
        <p className="form-error small" role="alert">
          {error}
        </p>
      ) : null}
      {done ? (
        <p className="tool-success small" role="status">
          ✓ {done}
        </p>
      ) : null}

      {card ? (
        <div className="gift-result">
          <div className="gift-balance">
            <code className="gift-code">{card.code}</code>
            <span>
              <strong>{fmt(card.kind, card.balance)}</strong> left
              <span className="muted small">
                {" "}
                of {fmt(card.kind, card.initial)} · {card.kind === "money" ? "gift card" : "game tickets"}
              </span>
            </span>
          </div>
          {card.balance > 0 ? (
            <form className="gift-row" onSubmit={redeem}>
              <label className="field">
                <span>{card.kind === "money" ? "Dollars to use" : "Tickets to use"}</span>
                <input
                  id="desk-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={card.kind === "money" ? "25.00" : "2"}
                />
              </label>
              <label className="field">
                <span>Note (optional)</span>
                <input id="desk-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
              </label>
              <button type="submit" className="btn btn-primary btn-small" disabled={busy || !amount}>
                Redeem
              </button>
            </form>
          ) : (
            <p className="muted small">This code has been fully used.</p>
          )}
          {card.history.length > 0 ? (
            <ul className="gift-history small">
              {[...card.history].reverse().map((m, i) => (
                <li key={i}>
                  <span>{when(m.at)}</span>
                  <span>
                    {m.amount < 0 ? "Returned " : "Used "}
                    {fmt(card.kind, Math.abs(m.amount))} · {m.channel === "online" ? "online booking" : "at the arena"}
                    {m.note ? ` · ${m.note}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">Not used yet{card.purchaserEmail ? ` · bought by ${card.purchaserEmail}` : ""}.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Registro de ventas de la terminal del local (Clover). */
export function TerminalSaleForm({ today }: { today: string }) {
  const router = useRouter();
  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState("");
  const [location, setLocation] = useState("provo");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await post<{ id: string }>("/api/admin/terminal", { action: "add", date, amount, location, note });
    if (res.ok) {
      setAmount("");
      setNote("");
      router.refresh();
    } else {
      setError(res.error.message);
    }
    setBusy(false);
  }

  return (
    <form className="card admin-tool" onSubmit={submit}>
      <h3>Add terminal sales by hand</h3>
      <p className="muted small">
        Only needed while Clover isn&apos;t connected. Enter the day&apos;s total from the Clover report, or each sale.
      </p>
      <div className="form-row">
        <label className="field">
          <span>Day</span>
          <input id="term-date" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label className="field">
          <span>Amount ($)</span>
          <input
            id="term-amount"
            inputMode="decimal"
            placeholder="245.50"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Location</span>
          <select id="term-location" value={location} onChange={(e) => setLocation(e.target.value)}>
            <option value="provo">Provo arena</option>
            <option value="orem">Orem (STEAM classes)</option>
          </select>
        </label>
      </div>
      <label className="field">
        <span>Note (optional)</span>
        <input
          id="term-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
          placeholder="Tickets, snacks, walk-ins…"
        />
      </label>
      {error ? (
        <p className="form-error small" role="alert">
          {error}
        </p>
      ) : null}
      <div className="actions">
        <button type="submit" className="btn btn-primary btn-small" disabled={busy}>
          {busy ? "Saving…" : "Add sale"}
        </button>
      </div>
    </form>
  );
}

export function DeleteTerminalSale({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!confirming) {
    return (
      <button type="button" className="link-button small" onClick={() => setConfirming(true)}>
        Delete
      </button>
    );
  }
  return (
    <span className="small">
      <button
        type="button"
        className="link-button small"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await post("/api/admin/terminal", { action: "delete", id });
          router.refresh();
        }}
      >
        {busy ? "Deleting…" : "Yes, delete"}
      </button>{" "}
      ·{" "}
      <button type="button" className="link-button small" onClick={() => setConfirming(false)}>
        Cancel
      </button>
    </span>
  );
}

interface ProviderStatus {
  provider: "clover" | "stripe";
  label: string;
  configured: boolean;
  lastSyncAt: number | null;
  lastCount: number | null;
  lastError: string | null;
  setupHint: string | null;
}

/** Estado de la conexion automatica con las terminales y boton para sincronizar ahora. */
export function TerminalSyncPanel({ providers }: { providers: ProviderStatus[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const anyConfigured = providers.some((p) => p.configured);

  async function sync() {
    setBusy(true);
    setError(null);
    const res = await post<ProviderStatus[]>("/api/admin/terminal", { action: "sync" });
    if (!res.ok) setError(res.error.message);
    router.refresh();
    setBusy(false);
  }

  return (
    <div className="card admin-tool">
      <div className="sync-head">
        <h3>Card terminals</h3>
        <button type="button" className="btn btn-outline btn-small" onClick={sync} disabled={busy || !anyConfigured}>
          {busy ? "Syncing…" : "Sync now"}
        </button>
      </div>
      <p className="muted small">Connected terminals sync automatically every night. Sales show up under “Terminal”.</p>
      <ul className="sync-list">
        {providers.map((p) => (
          <li key={p.provider}>
            <span className={`status-dot${p.configured ? (p.lastError ? " is-error" : " is-on") : ""}`} aria-hidden="true" />
            <span>
              <strong>{p.label}</strong>{" "}
              <span className="muted small">
                {!p.configured
                  ? "· Not connected"
                  : p.lastError
                    ? `· Last sync failed: ${p.lastError}`
                    : p.lastSyncAt
                      ? `· Last sync ${when(p.lastSyncAt)} · ${p.lastCount ?? 0} payments`
                      : "· Connected, not synced yet"}
              </span>
              {p.setupHint ? <span className="muted small sync-hint">{p.setupHint}</span> : null}
            </span>
          </li>
        ))}
      </ul>
      {error ? (
        <p className="form-error small" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
