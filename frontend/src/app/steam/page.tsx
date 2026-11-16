import type { Metadata } from "next";
import { InquiryForm } from "@/components/InquiryForm";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "STEAM Program",
  description: "Hands-on robotics classes: design, build and battle your own robot. Join the waitlist.",
};

const timeline = [
  { step: "Design", text: "Sketch your robot and plan its weapon and armor." },
  { step: "Solder", text: "Learn real electronics by wiring up the brains of your bot." },
  { step: "Assemble", text: "Put the frame, motors and electronics together." },
  { step: "Test", text: "Drive it, tune it and fix what breaks." },
  { step: "Tournament", text: "Battle the robot you built in our arena!" },
];

export default function SteamPage() {
  return (
    <>
      <PageHeader title="STEAM Program" eyebrow="Coming soon">
        Hands-on robotics classes where students design, build and battle their own robot. Classes are held at a
        separate location. Join the waitlist and we&apos;ll let you know when registration opens.
      </PageHeader>
      <section className="section">
        <div className="container">
          <ol className="timeline">
            {timeline.map((t, i) => (
              <li key={t.step} className="card">
                <span className="step-number">{String(i + 1).padStart(2, "0")}</span>
                <h3>{t.step}</h3>
                <p className="muted">{t.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="section section-alt">
        <div className="container booking-container">
          <h2>Join the waitlist</h2>
          <InquiryForm type="steam" />
        </div>
      </section>
    </>
  );
}
