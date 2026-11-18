import Image from "next/image";
import Link from "next/link";
import { ArenaBackdrop } from "@/components/arena/ArenaBackdrop";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { LoopVideos } from "@/components/Videos";
import { activities, loopVideos, photo, promotions, site } from "@/content/site";

// Se regenera cada hora para que las promociones vencidas desaparezcan solas.
export const revalidate = 3600;

const steps = [
  { n: "01", title: "Pick your battle", text: "30 minutes, a full hour, or the whole venue for your group." },
  { n: "02", title: "Choose a time", text: "See open times instantly and pay securely online." },
  { n: "03", title: "Take control", text: "Grab a controller, enter the arena and pop your rival's balloon." },
];

/** Fotos de accion (mientras llegan los videos originales en loop). */
const action = ["arena-red-lights", "kids-driving", "arena-action", "kids-robots"];

/** Las mejores fotos reales del local para el mosaico del inicio. */
const mosaic = ["group-robots-1", "battle-kids", "arena-glow", "friends-robots", "family-robots"];

/** Fecha de hoy en Provo (YYYY-MM-DD) para ocultar promociones vencidas. */
function todayInProvo(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver" }).format(new Date());
}

export default function HomePage() {
  const today = todayInProvo();
  const activePromos = promotions.filter((p) => p.expires >= today);
  const party = photo("party-group");
  const crowd = photo("arena-battle-crowd");

  return (
    <div className="home">
      <RevealOnScroll />
      {/* La arena queda fija detras de todo el inicio; la pelea y la camara avanzan con el scroll. */}
      <ArenaBackdrop />

      <section className="home-hero">
        <div className="container">
          <div className="home-hero-copy">
            <p className="eyebrow">Robot combat arena · {site.city}</p>
            <h1 className="display">
              Take control.
              <br />
              <span className="accent">Battle robots.</span>
            </h1>
            <p className="hero-lead">
              Drive a real fighting robot in our custom-built arenas. Pop your rival&apos;s balloon to win. Scroll down
              and watch the battle.
            </p>
            <div className="actions">
              <Link href="/book-appointment" className="btn btn-primary">
                Book your battle
              </Link>
              <Link href="/parties" className="btn btn-outline">
                Plan a party
              </Link>
            </div>
          </div>
        </div>
        <div className="scroll-cue" aria-hidden="true">
          <span />
          Scroll to fight
        </div>
      </section>

      <section id="how-it-works" className="section">
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
        <section className="section">
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

      <section className="section">
        <div className="container">
          <div className="mosaic-head">
            <div>
              <p className="eyebrow reveal">Real battles. Real people.</p>
              <h2 className="display reveal">This is The Bot Spot</h2>
            </div>
            <Link href="/gallery" className="btn btn-outline reveal">
              See the gallery
            </Link>
          </div>
          <div className="home-mosaic">
            {mosaic.map((name, i) => {
              const p = photo(name);
              return (
                <div key={name} className={`photo reveal mosaic-${i}`}>
                  <Image
                    src={p.src}
                    alt={p.alt}
                    fill
                    sizes={i === 0 ? "(max-width: 800px) 100vw, 580px" : "(max-width: 800px) 50vw, 290px"}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="mosaic-head">
            <div>
              <p className="eyebrow reveal">Watch the action</p>
              <h2 className="display reveal">Straight from the arena</h2>
            </div>
            <a className="btn btn-outline reveal" href={site.social.instagram} target="_blank" rel="noopener noreferrer">
              More on Instagram
            </a>
          </div>
          {/* Videos propios en loop cuando lleguen; mientras, fotos de accion. */}
          {loopVideos.length > 0 ? (
            <LoopVideos videos={loopVideos.slice(0, 3)} />
          ) : (
            <div className="photo-strip action-strip">
              {action.map((name) => {
                const p = photo(name);
                return (
                  <div key={name} className="photo reveal">
                    <Image src={p.src} alt={p.alt} width={p.width} height={p.height} sizes="(max-width: 700px) 50vw, 280px" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container grid grid-2 split">
          <div className="photo reveal">
            <Image src={party.src} alt={party.alt} width={party.width} height={party.height} sizes="(max-width: 900px) 100vw, 560px" />
          </div>
          <div className="reveal">
            <p className="eyebrow">Parties & events</p>
            <h2 className="display">Celebrate in the arena</h2>
            <p className="muted">
              Birthdays, team nights and tournaments: book battles for your whole group, or close the venue just for
              you with a private event.
            </p>
            <div className="actions">
              <Link href="/parties" className="btn btn-primary">
                See parties & events
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container grid grid-2 split">
          <div className="reveal">
            <p className="eyebrow">Fun designed for</p>
            <h2 className="display">Friends. Families. Couples.</h2>
            <p className="muted">Two custom-built arenas, real battle robots and non-stop action for every age.</p>
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
            <Image src={crowd.src} alt={crowd.alt} width={crowd.width} height={crowd.height} sizes="(max-width: 900px) 100vw, 560px" />
          </div>
        </div>
      </section>

      <section className="section">
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

      <section className="home-final">
        <div className="container">
          <h2 className="display">
            Your arena is
            <br />
            <span className="accent">waiting this week.</span>
          </h2>
          <div className="actions">
            <Link href="/book-appointment" className="btn btn-primary">
              See open times
            </Link>
            <Link href="/parties" className="btn btn-outline">
              Plan a party
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
