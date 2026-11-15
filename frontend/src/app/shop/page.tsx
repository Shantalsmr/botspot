import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Shop",
  description: "Pick your perfect fun package at The Bot Spot.",
};

export default function ShopPage() {
  return (
    <>
      <PageHeader title="Shop" eyebrow="Packages">
        Pick your perfect fun package.
      </PageHeader>
      <ComingSoon feature="Our online shop" />
    </>
  );
}
