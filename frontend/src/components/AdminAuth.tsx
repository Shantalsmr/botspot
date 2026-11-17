"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PasswordInput } from "./PasswordInput";

type ApiResponse = { ok: true } | { ok: false; error: { message: string } };

/** Formulario de contrasena del panel /admin. */
export function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const res = (await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      }).then((r) => r.json())) as ApiResponse;
      if (res.ok) {
        router.refresh();
        return;
      }
      setError(res.error.message);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setSending(false);
  }

  return (
    <form className="card admin-login" onSubmit={submit}>
      <h2>Owners&apos; dashboard</h2>
      <label className="field">
        <span>Password</span>
        <PasswordInput
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoFocus
        />
      </label>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary" disabled={sending || !password}>
        {sending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}

/** Marca una solicitud de cancelacion/cambio como atendida. */
export function ResolveRequestButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-primary btn-small"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/admin/requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        router.refresh();
      }}
    >
      {busy ? "Saving…" : "Mark as handled"}
    </button>
  );
}

/** Boton para cerrar la sesion del panel. */
export function AdminLogout() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn btn-outline"
      onClick={async () => {
        await fetch("/api/admin/logout", { method: "POST" });
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
