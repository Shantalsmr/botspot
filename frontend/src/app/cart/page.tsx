import type { Metadata } from "next";
import { CartView } from "@/components/CartView";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Cart",
  robots: { index: false },
};

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { canceled } = await searchParams;
  return (
    <>
      <PageHeader title="Your cart" eyebrow="Almost there">
        Review your items before checkout.
      </PageHeader>
      <section className="section">
        <div className="container booking-container">
          <CartView canceled={canceled === "1"} />
        </div>
      </section>
    </>
  );
}
