import type { Metadata } from "next";
import { CheckoutView } from "@/components/CartView";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false },
};

export default function CheckoutPage() {
  return (
    <>
      <PageHeader title="Checkout" eyebrow="Secure payment">
        Confirm your order and pay securely with Stripe.
      </PageHeader>
      <section className="section">
        <div className="container booking-container">
          <CheckoutView />
        </div>
      </section>
    </>
  );
}
