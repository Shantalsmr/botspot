import type { Metadata } from "next";
import { InquiryForm } from "@/components/InquiryForm";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Corporate Events & Mobile Arenas",
  description: "We bring the robot battle arena to your business, school, university or event in Utah.",
};

const perks = [
  { icon: "🚚", title: "We come to you", text: "Our mobile arenas set up at your office, campus or event." },
  { icon: "🤝", title: "Team building", text: "Friendly competition that gets everyone talking and laughing." },
  { icon: "📋", title: "Custom quote", text: "Pricing based on distance, group size and how long you want to play." },
];

export default function EventsPage() {
  return (
    <>
      <PageHeader title="Corporate Events & Mobile Arenas" eyebrow="We bring the battle">
        Robot battles for businesses, schools, universities and public events. Tell us about your event and we&apos;ll
        send you a custom quote.
      </PageHeader>
      <section className="section">
        <div className="container grid grid-3">
          {perks.map((p) => (
            <article key={p.title} className="card">
              <div className="card-icon" aria-hidden="true">
                {p.icon}
              </div>
              <h3>{p.title}</h3>
              <p className="muted">{p.text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="section section-alt">
        <div className="container booking-container">
          <h2>Request a quote</h2>
          <InquiryForm type="corporate" />
        </div>
      </section>
    </>
  );
}
