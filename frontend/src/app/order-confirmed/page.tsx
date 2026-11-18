import type { Metadata } from "next";
import Link from "next/link";
import { confirmOrderFromSession, type OrderSummary } from "@botspot/backend";
import { formatMoney } from "@botspot/backend/shop";
import { ClearCartOnSuccess } from "@/components/CartView";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Order confirmed",
  robots: { index: false },
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function OrderConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { session_id } = await searchParams;
  let order: OrderSummary | null = null;
  if (typeof session_id === "string") {
    try {
      order = await confirmOrderFromSession(session_id);
    } catch (error) {
      console.error("[order-confirmed]", error);
    }
  }
  const paid = order?.status === "paid";
  const hasPickup = order?.lines.some((l) => l.fulfillment === "pickup") ?? false;
  const hasEmail = order?.lines.some((l) => l.fulfillment === "email") ?? false;

  return (
    <>
      <PageHeader title="Thank you" eyebrow={paid ? "Order confirmed" : "Thanks for your order"}>
        {paid
          ? "Your payment went through. A receipt is on its way to your email."
          : "We're checking your payment. If you were charged, we'll email you the details."}
      </PageHeader>
      <section className="section">
        <div className="container booking-container">
          {paid ? <ClearCartOnSuccess /> : null}
          {order && order.giftCodes.length > 0 ? (
            <div className="card gift-codes">
              <p className="eyebrow">Your {order.giftCodes.length === 1 ? "code" : "codes"}</p>
              <p className="muted small">
                Save {order.giftCodes.length === 1 ? "it" : "them"} or take a screenshot. We also emailed{" "}
                {order.giftCodes.length === 1 ? "it" : "them"} to you.
              </p>
              <ul>
                {order.giftCodes.map((c) => (
                  <li key={c.code}>
                    <code className="gift-code">{c.code}</code>
                    <span>
                      <strong>{c.kind === "money" ? formatMoney(c.amount) : `${c.amount} tickets`}</strong>
                      <span className="muted small">
                        {c.kind === "money" ? "Use at the arena or online when you book" : "Use at the front desk · 5 min each"}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {order ? (
            <div className="card">
              <h3>{paid ? "Order confirmed" : "Payment processing"}</h3>
              <ul className="cart-lines">
                {order.lines.map((l) => (
                  <li key={`${l.productId}-${l.variant ?? ""}`} className="cart-line">
                    <div className="cart-info">
                      <strong>{l.name}</strong>
                      <span className="muted small">
                        {l.variant ? `Size ${l.variant} · ` : ""}× {l.qty}
                      </span>
                    </div>
                    <strong className="cart-line-total">{formatMoney(l.unitCents * l.qty)}</strong>
                  </li>
                ))}
              </ul>
              <dl className="booking-summary">
                <dt>Total paid</dt>
                <dd>{order.amount}</dd>
                <dt>Order #</dt>
                <dd>{order.id}</dd>
              </dl>
              <ul className="checkout-notes small muted">
                {hasEmail && !paid ? <li>📧 Your codes will appear here and in your email once the payment clears.</li> : null}
                {hasPickup ? <li>📍 Show this order number at the front desk to pick up your items.</li> : null}
              </ul>
            </div>
          ) : null}
          <div className="actions">
            <Link href="/book-appointment" className="btn btn-primary">
              Book a battle
            </Link>
            <Link href="/shop" className="btn btn-outline">
              Back to the shop
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
