import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Check Out",
  description: "Complete your order.",
};

export default function CheckoutPage() {
  return (
    <>
      <PageHeader title="Check Out">Complete your order.</PageHeader>
      <ComingSoon feature="Online checkout" />
    </>
  );
}
