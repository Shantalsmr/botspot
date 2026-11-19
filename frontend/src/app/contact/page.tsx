import type { Metadata } from "next";
import { InquiryForm } from "@/components/InquiryForm";
import { PageHeader } from "@/components/PageHeader";
import { site, telHref } from "@/content/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Plan your visit, a party or a group event at The Bot Spot.",
};

export default function ContactPage() {
  return (
    <>
      <PageHeader title="Contact" eyebrow="Let's connect">
        Ready to enter the arena? Planning a party, group event, or an unforgettable night out? The Bot Spot brings
        high-energy robot battles and arcade excitement together.
      </PageHeader>

      <section className="section">
        <div className="container grid grid-3">
          <div className="card">
            <h3>Call The Bot Spot</h3>
            {site.phones.map((phone) => (
              <p key={phone}>
                <a href={telHref(phone)}>{phone}</a>
              </p>
            ))}
            <p className="muted">We speak {site.phoneLanguages}.</p>
          </div>
          <div className="card">
            <h3>Email</h3>
            <p>
              <a href={`mailto:${site.email}`}>{site.email}</a>
            </p>
          </div>
          <div className="card">
            <h3>Hours & booking</h3>
            <ul className="hours-list">
              {site.hours.map((h) => (
                <li key={h.days}>
                  <span>{h.days}</span>
                  <span>{h.time}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <h2>Send us a message</h2>
          <p className="muted">
            Want to book a robot battle party, organize a group event, or ask a quick question? Send us a message
            and our team will help you line up the details for an epic Bot Spot experience.
          </p>
          <InquiryForm type="contact" />
          <div className="actions">
            <a className="btn btn-outline" href={site.social.instagram} target="_blank" rel="noopener noreferrer">
              Instagram
            </a>
            {site.social.tiktok ? (
              <a className="btn btn-outline" href={site.social.tiktok} target="_blank" rel="noopener noreferrer">
                TikTok
              </a>
            ) : null}
            <a className="btn btn-outline" href={site.social.facebook} target="_blank" rel="noopener noreferrer">
              Facebook
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
