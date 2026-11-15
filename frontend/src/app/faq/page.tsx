import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { faqs } from "@/content/site";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to the questions we hear most often about The Bot Spot.",
};

export default function FaqPage() {
  return (
    <>
      <PageHeader title="FAQ" eyebrow="Got questions? We've got answers!">
        Planning your visit should be just as easy as playing your favorite game. Here are some quick answers to
        the questions we hear most often.
      </PageHeader>

      <section className="section">
        <div className="container">
          <div className="faq-list">
            {faqs.map((faq) => (
              <details key={faq.question}>
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
