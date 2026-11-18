import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { ShopCatalog } from "@/components/ShopCatalog";

export const metadata: Metadata = {
  title: "Shop",
  description: "Gift cards, game tickets and merch from The Bot Spot in Provo, Utah.",
};

export default function ShopPage() {
  return (
    <>
      <PageHeader title="Shop" eyebrow="Gifts & gear">
        Gift cards, game tickets and Bot Spot merch. Pay online in seconds.
      </PageHeader>
      <section className="section">
        <div className="container">
          <ShopCatalog />
        </div>
      </section>
    </>
  );
}
