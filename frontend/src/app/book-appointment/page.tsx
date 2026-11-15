import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Book an Appointment",
  description: "Reserve your robot battle or plan a party.",
};

export default function BookAppointmentPage() {
  return (
    <>
      <PageHeader title="Book an Appointment">Reserve your robot battle or plan a party.</PageHeader>
      <ComingSoon feature="Online booking" />
    </>
  );
}
