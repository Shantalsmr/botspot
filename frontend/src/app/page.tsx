import Image from "next/image";
import Link from "next/link";
import { ArenaCanvas } from "@/components/ArenaCanvas";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { activities, promotions, site } from "@/content/site";

// Se regenera cada hora para que las promociones vencidas desaparezcan solas.
export const revalidate = 3600;

const steps = [
  { n: "01", title: "Pick your battle", text: "30 minutes, a full hour, or the whole venue for your group." },
  { n: "02", title: "Choose a time", text: "See open times instantly and pay securely online." },
  { n: "03", title: "Take control", text: "Grab a controller, enter the arena and fight for the win." },
];

/** Fecha de hoy en Provo (YYYY-MM-DD) para ocultar promociones vencidas. */
function todayInProvo(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver" }).format(new Date());
}

export default function HomePage() {
  const today = todayInProvo();
  const activePromos = promotions.filter((p) => p.expires >= today);

  return (
    <div className="home">
      <ArenaCanvas />
      <RevealOnScroll />

      <section className="hero-arena">
        <div className="container hero-arena-copy">
          <p className="eyebrow">Robot combat arena · {site.city}</p>
          <h1 className="display">
            Take control.
            <br />
            <span className="accent">Battle robots.</span>
          </h1>
          <p className="hero-lead">
            Drive a real fighting robot in our custom-built arenas. Challenge your friends, your family or your whole
            crew. Book online in seconds.
          </p>
          <div className="actions">
            <Link href="/book-appointment" className="btn btn-primary">
              Book your battle
            </Link>
            <Link href="/parties" className="btn btn-outline">
              Plan a party
            </Link>
          </div>
          <ul className="hero-checks">
            <li>Instant online booking</li>
            <li>Up to 16 players at once</li>
            <li>All ages</li>
          </ul>
        </div>
        <a href="#how-it-works" className="scroll-hint" aria-label="Scroll down">
          <span />
        </a>
      </section>

      <section id="how-it-works" className="section glass">
        <div className="container">
          <p className="eyebrow reveal">It&apos;s that easy</p>
          <h2 className="display reveal">Your arena in 3 steps</h2>
          <div className="grid grid-3 steps">
            {steps.map((s) => (
              <article key={s.n} className="card step reveal">
                <span className="step-number">{s.n}</span>
                <h3>{s.title}</h3>
                <p className="muted">{s.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {activePromos.length > 0 ? (
        <section className="section glass">
          <div className="container">
            <p className="eyebrow reveal">This week only</p>
            <h2 className="display reveal">Promotions</h2>
            <div className="grid grid-3">
              {activePromos.map((p) => (
                <article key={p.title} className="card promo reveal">
                  <h3>{p.title}</h3>
                  <p className="muted">{p.description}</p>
                  <p className="promo-expires">Ends {p.expires}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="section glass">
        <div className="container grid grid-2">
          <div className="photo reveal">
            <Image
              src="/images/arena-crowd.jpg"
              alt="A crowd watching a robot battle in the arena"
              width={1600}
              height={1200}
              sizes="(max-width: 900px) 100vw, 560px"
            />
          </div>
          <div className="reveal">
            <p className="eyebrow">Parties & events</p>
            <h2 className="display">Celebrate in the arena</h2>
            <p className="muted">
              Birthdays, team nights and tournaments: book battles for your whole group, or close the venue just for
              you with a private event.
            </p>
            <div className="actions">
              <Link href="/parties" className="btn btn-outline">
                See parties & events
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section glass">
        <div className="container grid grid-2">
          <div className="reveal">
            <p className="eyebrow">Fun designed for</p>
            <h2 className="display">Friends. Families. Couples.</h2>
            <p className="muted">
              Two custom-built arenas, real weaponized robots and non-stop action for every age.
            </p>
            <div className="actions">
              <Link href="/book-appointment" className="btn btn-primary">
                Book now
              </Link>
              <Link href="/faq" className="btn btn-outline">
                FAQ
              </Link>
            </div>
          </div>
          <div className="photo reveal">
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

      <section className="section glass">
        <div className="container">
          <p className="eyebrow reveal">What you can do</p>
          <h2 className="display reveal">Explore all the fun</h2>
          <div className="grid grid-3">
            {activities.slice(0, 3).map((activity) => (
              <article key={activity.title} className="card reveal">
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
    </div>
  );
}
