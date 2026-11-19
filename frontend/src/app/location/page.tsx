import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Location",
  description: "Find The Bot Spot in downtown Provo, Utah.",
};

// Si no hubiera direccion, el mapa muestra el centro de Provo.
const mapQuery = encodeURIComponent(site.address ?? "Downtown Provo, Utah");

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
            {site.address ? (
              <p>
                <strong>{site.address}</strong>
              </p>
            ) : null}
            <p className="muted">
              Free on-site parking. Need directions? Give us a call or send us a message and we&apos;ll help you find
              us.
            </p>
            <div className="actions">
              <a
                className="btn btn-primary"
                href={`https://www.google.com/maps/dir/?api=1&destination=${mapQuery}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Get directions
              </a>
              <Link href="/contact" className="btn btn-outline">
                Contact us
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <h2>The arena</h2>
          <iframe
            className="map-frame"
            title={`Map to ${site.name}`}
            src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>

      <section className="section">
        <div className="container grid grid-2">
          <div className="card">
            <p className="eyebrow">STEM Program</p>
            <h3>Robotics classes are in Orem</h3>
            <p>
              <strong>{site.steamAddress}</strong>
            </p>
            <p className="muted">
              Our hands-on robotics classes meet at a separate location from the arena.
            </p>
            <div className="actions">
              <a
                className="btn btn-outline"
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(site.steamAddress)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Directions to classes
              </a>
              <Link href="/stem" className="btn btn-outline">
                About the program
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
