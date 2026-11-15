import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { activities } from "@/content/site";

export const metadata: Metadata = {
  title: "Parties & Activities",
  description: "Robot battle arenas, classic arcade games, birthday parties and tournaments in downtown Provo.",
};

export default function PartiesPage() {
  return (
    <>
      <PageHeader title="Our Activities" eyebrow="Parties">
        Explore all the fun at our downtown Provo family robot arcade.
      </PageHeader>

      <section className="section">
        <div className="container grid grid-3">
          {activities.map((activity) => (
            <article key={activity.title} className="card">
              <div className="card-icon" aria-hidden="true">
                {activity.icon}
              </div>
              <h3>{activity.title}</h3>
              <p className="muted">{activity.description}</p>
            </article>
          ))}
        </div>
        <div className="container actions">
          <Link href="/book-appointment" className="btn btn-primary">
            Plan a party
          </Link>
          <Link href="/contact" className="btn btn-outline">
            Ask about group rates
          </Link>
        </div>
      </section>
    </>
  );
}
