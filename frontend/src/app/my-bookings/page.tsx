import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "My Bookings",
  description: "See and manage your reservations.",
};

export default function MyBookingsPage() {
  return (
    <>
      <PageHeader title="My Bookings">See and manage your reservations.</PageHeader>
      <ComingSoon feature="Online bookings" />
    </>
  );
}
