import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Location",
  description: "Find The Bot Spot in downtown Provo, Utah.",
};

export default function LocationPage() {
  return (
    <>
      <PageHeader title="Location" eyebrow="Visit us">
        We&apos;re in {site.city}, with free on-site parking for all our guests.
      </PageHeader>

      <section className="section">
        <div className="container grid grid-2">
          <div className="card">
            <h3>Hours</h3>
            <ul className="hours-list">
              {site.hours.map((h) => (
                <li key={h.days}>
                  <span>{h.days}</span>
                  <span>{h.time}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card">
            <h3>Getting here</h3>
            {/* TODO: agregar la direccion exacta y un mapa (ver ROADMAP.md) */}
            <p className="muted">Need directions? Give us a call or send us a message and we&apos;ll help you find us.</p>
            <div className="actions">
              <Link href="/contact" className="btn btn-outline">
                Contact us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
