import Image from "next/image";
import Link from "next/link";
import { activities, site } from "@/content/site";

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="container">
          <div className="hero-banner">
            <Image
              src="/images/hero-logo.jpg"
              alt="The Bot Spot – It's Battle Time"
              width={1584}
              height={672}
              priority
              sizes="(max-width: 1160px) 100vw, 1160px"
            />
          </div>

          <div className="hero-copy">
            <h1>
              Come battle with <span className="accent">robots</span>
            </h1>
            <p>
              …and experience the wildest side of technology! Have fun with exciting{" "}
              <span className="highlight">ROBOT GAMES</span>, challenge your friends, and make unforgettable
              memories.
            </p>
            <div className="actions">
              <Link href="/book-appointment" className="btn btn-primary">
                ✨ Make a Reservation or Plan a Party 🤖
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container grid grid-2">
          <div className="photo">
            <Image
              src="/images/arena-crowd.jpg"
              alt="A crowd watching a robot battle in the arena"
              width={1600}
              height={1200}
              sizes="(max-width: 900px) 100vw, 560px"
            />
          </div>
          <div>
            <p className="eyebrow">Parties & events</p>
            <h2>Celebrate your birthday</h2>
            <p className="muted">
              …or plan a party with your crew for robot-powered fun. Robot battles, arcade games and space for
              cake, pizza and presents.
            </p>
            <div className="actions">
              <Link href="/parties" className="btn btn-outline">
                See our activities
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container grid grid-2">
          <div>
            <p className="eyebrow">Fun designed for</p>
            <h2>Friends. Families. Couples.</h2>
            <p className="price-tag">${site.pricePerPerson}</p>
            <p className="muted">per person for an unforgettable, action-packed experience.</p>
            <div className="actions">
              <Link href="/book-appointment" className="btn btn-primary">
                Book now
              </Link>
              <Link href="/faq" className="btn btn-outline">
                FAQ
              </Link>
            </div>
          </div>
          <div className="photo">
            <Image
              src="/images/arena.jpg"
              alt="The Bot Spot robot battle arena"
              width={1600}
              height={900}
              sizes="(max-width: 900px) 100vw, 560px"
            />
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <p className="eyebrow">What you can do</p>
          <h2>Explore all the fun</h2>
          <div className="grid grid-3">
            {activities.slice(0, 3).map((activity) => (
              <article key={activity.title} className="card">
                <div className="card-icon" aria-hidden="true">
                  {activity.icon}
                </div>
                <h3>{activity.title}</h3>
                <p className="muted">{activity.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
