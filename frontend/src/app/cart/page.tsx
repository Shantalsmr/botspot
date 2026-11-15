import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Cart",
  description: "Review the items in your cart.",
};

export default function CartPage() {
  return (
    <>
      <PageHeader title="Cart">Review the items in your cart.</PageHeader>
      <ComingSoon feature="Our online cart" />
    </>
  );
}
