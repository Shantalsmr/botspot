import type { Metadata } from "next";
import { BookingForm } from "@/components/BookingForm";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Book an Appointment",
  description: "Reserve your robot battle or private event at The Bot Spot in Provo.",
};

export default async function BookAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { canceled } = await searchParams;
  return (
    <>
      <PageHeader title="Book an Appointment">Pick your battle, choose a time and pay securely online.</PageHeader>
      <section className="section">
        <div className="container booking-container">
          <BookingForm canceled={canceled === "1"} />
        </div>
      </section>
    </>
  );
}
