import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Cancellation & Refund Policy",
  description: "Cancellation, rescheduling and refund policy for bookings at The Bot Spot.",
};

// PENDIENTE: politica propuesta, falta que el negocio la apruebe.
export default function CancellationPolicyPage() {
  return (
    <>
      <PageHeader title="Cancellation & Refund Policy" />
      <section className="section">
        <div className="container booking-container">
          <ul>
            <li>
              <strong>7 days or more before your booking:</strong> full refund to your original payment method.
            </li>
            <li>
              <strong>48 hours to 7 days before:</strong> free rescheduling or full credit for another date (valid for
              12 months).
            </li>
            <li>
              <strong>Less than 48 hours before, or no-show:</strong> no refund, since the time slot was reserved for
              you.
            </li>
            <li>
              <strong>If The Bot Spot cancels:</strong> full refund, always.
            </li>
          </ul>
          <p>Refunds are processed within 5–10 business days to the original payment method.</p>
          <p>
            To cancel or reschedule, call us at {site.phones[0]} or email{" "}
            <a href={`mailto:${site.email}`}>{site.email}</a> with your confirmation number.
          </p>
        </div>
      </section>
    </>
  );
}
