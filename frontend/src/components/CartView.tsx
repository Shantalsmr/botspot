"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MAX_QTY, cartTotalCents, formatMoney, getProduct, lineKey } from "@botspot/backend/shop";
import { useCart } from "./Cart";

type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

/** Lineas del carrito (editable en /cart, solo lectura en /checkout). */
function CartLines({ editable }: { editable: boolean }) {
  const { lines, setQty, remove } = useCart();
  return (
    <ul className="cart-lines">
      {lines.map((l) => {
        const p = getProduct(l.productId);
        if (!p) return null;
        const key = lineKey(l);
        return (
          <li key={key} className="cart-line">
            <span className="cart-icon" aria-hidden="true">
              {p.icon}
            </span>
            <div className="cart-info">
              <strong>{p.name}</strong>
              <span className="muted small">
                {l.variant ? `Size ${l.variant} · ` : ""}
                {formatMoney(p.priceCents)} each · {p.fulfillment === "email" ? "by email" : "pickup"}
              </span>
            </div>
            {editable ? (
              <div className="qty" aria-label={`Quantity of ${p.name}`}>
                <button type="button" onClick={() => setQty(key, l.qty - 1)} aria-label="One less">
                  −
                </button>
                <span>{l.qty}</span>
                <button
                  type="button"
                  onClick={() => setQty(key, l.qty + 1)}
                  disabled={l.qty >= MAX_QTY}
                  aria-label="One more"
                >
                  +
                </button>
              </div>
            ) : (
              <span className="muted">× {l.qty}</span>
            )}
            <strong className="cart-line-total">{formatMoney(p.priceCents * l.qty)}</strong>
            {editable ? (
              <button type="button" className="link-button small" onClick={() => remove(key)}>
                Remove
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function EmptyCart() {
  return (
    <div className="card coming-soon">
      <p className="eyebrow">Your cart</p>
      <h2>Your cart is empty</h2>
      <p className="muted">Gift cards, battle passes and Bot Spot merch are waiting for you.</p>
      <div className="actions">
        <Link href="/shop" className="btn btn-primary">
          Go to the shop
        </Link>
      </div>
    </div>
  );
}

/** Pagina /cart: editar cantidades y pasar al pago. */
export function CartView({ canceled }: { canceled: boolean }) {
  const { lines, ready } = useCart();
  if (!ready) return <p className="muted">Loading your cart…</p>;
  if (lines.length === 0) {
    return (
      <>
        {canceled ? <p className="form-error">Payment was canceled. Nothing was charged.</p> : null}
        <EmptyCart />
      </>
    );
  }
  return (
    <div className="card">
      {canceled ? (
        <p className="form-error" role="alert">
          Payment was canceled. Nothing was charged — your cart is still here.
        </p>
      ) : null}
      <CartLines editable />
      <div className="booking-total">
        <span>Total</span>
        <strong>{formatMoney(cartTotalCents(lines))}</strong>
      </div>
      <div className="actions">
        <Link href="/checkout" className="btn btn-primary">
          Checkout
        </Link>
        <Link href="/shop" className="btn btn-outline">
          Keep shopping
        </Link>
      </div>
    </div>
  );
}

/** Pagina /checkout: resumen, nota opcional y pago seguro con Stripe. */
export function CheckoutView() {
  const { lines, ready } = useCart();
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!ready) return <p className="muted">Loading your cart…</p>;
  if (lines.length === 0) return <EmptyCart />;

  const hasEmail = lines.some((l) => getProduct(l.productId)?.fulfillment === "email");
  const hasPickup = lines.some((l) => getProduct(l.productId)?.fulfillment === "pickup");

  async function pay() {
    setSubmitting(true);
    setError(null);
    try {
      const res = (await fetch("/api/shop/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines, note }),
      }).then((r) => r.json())) as ApiResponse<{ url: string }>;
      if (res.ok) {
        window.location.assign(res.data.url);
        return;
      }
      setError(res.error.message);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  }

  return (
    <div className="card">
      <h3>Order summary</h3>
      <CartLines editable={false} />
      <div className="booking-total">
        <span>Total</span>
        <strong>{formatMoney(cartTotalCents(lines))}</strong>
      </div>
      <ul className="checkout-notes small muted">
        {hasEmail ? <li>🎁 Gift cards and tickets come as a code, shown after payment and sent to your email.</li> : null}
        {hasPickup ? <li>📍 Merch and party items are ready for pickup at the front desk.</li> : null}
        <li>🔒 Secure payment by Stripe. We never see your card number.</li>
      </ul>
      <label className="field">
        <span>Note (optional)</span>
        <textarea
          rows={3}
          maxLength={500}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Gift message, recipient's name, party date…"
        />
      </label>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="actions">
        <button type="button" className="btn btn-primary" onClick={pay} disabled={submitting}>
          {submitting ? "Opening secure payment…" : `Pay ${formatMoney(cartTotalCents(lines))}`}
        </button>
        <Link href="/cart" className="btn btn-outline">
          Edit cart
        </Link>
      </div>
    </div>
  );
}

/** Vacia el carrito al llegar a /order-confirmed con un pago exitoso. */
export function ClearCartOnSuccess() {
  const { clear, ready } = useCart();
  useEffect(() => {
    if (ready) clear();
  }, [ready, clear]);
  return null;
}
