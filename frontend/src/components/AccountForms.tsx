"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PasswordInput } from "./PasswordInput";

type ApiResponse<T = unknown> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

async function post<T = unknown>(url: string, body: unknown): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await res.json()) as ApiResponse<T>;
  } catch {
    return { ok: false, error: { code: "network", message: "Something went wrong. Please try again." } };
  }
}

function useSubmit() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function run(fn: () => Promise<ApiResponse>, onOk: () => void) {
    setBusy(true);
    setError(null);
    const res = await fn();
    if (res.ok) onOk();
    else setError(res.error.message);
    setBusy(false);
  }
  return { error, busy, run };
}

function ErrorText({ error }: { error: string | null }) {
  return error ? (
    <p className="form-error" role="alert">
      {error}
    </p>
  ) : null;
}

/** Iniciar sesion o crear cuenta. */
export function AuthForm({ mode, next }: { mode: "login" | "register"; next: string }) {
  const router = useRouter();
  const { error, busy, run } = useSubmit();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    void run(
      () => post(`/api/account/${mode}`, data),
      () => {
        router.push(next);
        router.refresh();
      },
    );
  }

  return (
    <form className="card auth-form" onSubmit={submit}>
      {mode === "register" ? (
        <>
          <label className="field">
            <span>Name</span>
            <input name="name" autoComplete="name" required maxLength={120} />
          </label>
          <label className="field">
            <span>Phone</span>
            <input name="phone" type="tel" autoComplete="tel" required maxLength={40} />
          </label>
        </>
      ) : null}
      <label className="field">
        <span>Email</span>
        <input name="email" type="email" autoComplete="email" required maxLength={160} />
      </label>
      <label className="field">
        <span>Password</span>
        <PasswordInput
          name="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          minLength={8}
          required
        />
        {mode === "register" ? <small className="muted">At least 8 characters.</small> : null}
      </label>
      <ErrorText error={error} />
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
      </button>
      {mode === "login" ? (
        <p className="muted small">
          <Link href="/account/forgot">Forgot your password?</Link> · New here?{" "}
          <Link href={`/account/register?next=${encodeURIComponent(next)}`}>Create an account</Link>
        </p>
      ) : (
        <p className="muted small">
          Already have an account? <Link href={`/account/login?next=${encodeURIComponent(next)}`}>Sign in</Link>
        </p>
      )}
    </form>
  );
}

/** Pedir el enlace para una contrasena nueva. */
export function ForgotForm() {
  const [sent, setSent] = useState(false);
  const { error, busy, run } = useSubmit();
  if (sent) {
    return (
      <div className="card" role="status">
        <h3>Check your email</h3>
        <p className="muted">If there is an account with that email, we sent you a link to choose a new password.</p>
      </div>
    );
  }
  return (
    <form
      className="card auth-form"
      onSubmit={(e) => {
        e.preventDefault();
        const email = new FormData(e.currentTarget).get("email");
        void run(
          () => post("/api/account/forgot", { email }),
          () => setSent(true),
        );
      }}
    >
      <label className="field">
        <span>Email</span>
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <ErrorText error={error} />
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? "Sending…" : "Send me a link"}
      </button>
    </form>
  );
}

/** Crear la contrasena nueva con el enlace del correo. */
export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const { error, busy, run } = useSubmit();
  return (
    <form
      className="card auth-form"
      onSubmit={(e) => {
        e.preventDefault();
        const password = new FormData(e.currentTarget).get("password");
        void run(
          () => post("/api/account/reset", { token, password }),
          () => {
            router.push("/account");
            router.refresh();
          },
        );
      }}
    >
      <label className="field">
        <span>New password</span>
        <PasswordInput name="password" autoComplete="new-password" minLength={8} required />
        <small className="muted">At least 8 characters.</small>
      </label>
      <ErrorText error={error} />
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}

/** Editar nombre y telefono. */
export function ProfileForm({ name, phone, email }: { name: string; phone: string; email: string }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const { error, busy, run } = useSubmit();
  return (
    <form
      className="card auth-form"
      onSubmit={(e) => {
        e.preventDefault();
        setSaved(false);
        const data = Object.fromEntries(new FormData(e.currentTarget).entries());
        void run(
          () => post("/api/account/profile", data),
          () => {
            setSaved(true);
            router.refresh();
          },
        );
      }}
    >
      <h3>Your details</h3>
      <p className="muted small">{email}</p>
      <label className="field">
        <span>Name</span>
        <input name="name" defaultValue={name} autoComplete="name" required maxLength={120} />
      </label>
      <label className="field">
        <span>Phone</span>
        <input name="phone" type="tel" defaultValue={phone} autoComplete="tel" required maxLength={40} />
      </label>
      <ErrorText error={error} />
      {saved ? (
        <p className="muted small" role="status">
          Saved.
        </p>
      ) : null}
      <button type="submit" className="btn btn-outline" disabled={busy}>
        {busy ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

const POLICY_TEXT: Record<string, string> = {
  full_refund: "More than 7 days away: you can get a full refund.",
  reschedule_or_credit: "48 hours to 7 days away: free reschedule or full credit for another date.",
  no_refund: "Less than 48 hours away: this booking can't be refunded.",
};

/** Pedir cancelacion o cambio de una reserva. */
export function BookingRequest({ bookingId, policy }: { bookingId: string; policy: string }) {
  const router = useRouter();
  const [open, setOpen] = useState<null | "cancel" | "reschedule">(null);
  const [message, setMessage] = useState("");
  const { error, busy, run } = useSubmit();

  if (!open) {
    return (
      <div className="request-actions">
        <p className="muted small">{POLICY_TEXT[policy]}</p>
        <div className="actions">
          <button type="button" className="btn btn-outline btn-small" onClick={() => setOpen("reschedule")}>
            Change date
          </button>
          <button type="button" className="btn btn-outline btn-small" onClick={() => setOpen("cancel")}>
            Cancel booking
          </button>
        </div>
      </div>
    );
  }
  return (
    <form
      className="request-form"
      onSubmit={(e) => {
        e.preventDefault();
        void run(
          () => post("/api/account/requests", { bookingId, type: open, message }),
          () => router.refresh(),
        );
      }}
    >
      <label className="field">
        <span>{open === "cancel" ? "Why are you canceling? (optional)" : "Which date and time would you prefer?"}</span>
        <textarea
          rows={3}
          maxLength={1000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required={open === "reschedule"}
        />
      </label>
      <p className="muted small">{POLICY_TEXT[policy]} We&apos;ll contact you to confirm.</p>
      <ErrorText error={error} />
      <div className="actions">
        <button type="submit" className="btn btn-primary btn-small" disabled={busy}>
          {busy ? "Sending…" : open === "cancel" ? "Send cancellation request" : "Send change request"}
        </button>
        <button type="button" className="btn btn-outline btn-small" onClick={() => setOpen(null)}>
          Back
        </button>
      </div>
    </form>
  );
}

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn btn-outline"
      onClick={async () => {
        await post("/api/account/logout", {});
        router.push("/");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
