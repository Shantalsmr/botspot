import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { nowInProvo } from "@botspot/backend/catalog";
import { PageHeader } from "@/components/PageHeader";
import { photo, site, tournaments } from "@/content/site";

export const metadata: Metadata = {
  title: "Tournaments",
  description: "Watch The Bot Spot robot battle tournaments live on YouTube and see what's coming up next.",
};

// Se vuelve a generar cada hora para que los torneos pasados dejen de salir como "proximos".
export const revalidate = 3600;

/** "2026-12-05" -> "Saturday, Dec 5" */
function niceDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(`${date}T12:00:00Z`),
  );
}

export default function TournamentsPage() {
  const { channelId, url } = site.youtube;
  // La lista de "subidas" de un canal es su id con "UU" en vez de "UC".
  const uploads = channelId ? `UU${channelId.slice(2)}` : null;
  const today = nowInProvo().date;
  const upcoming = tournaments.filter((t) => t.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const hero = photo("arena-night");

  return (
    <>
      <PageHeader title="Tournaments" eyebrow="Watch the battles">
        Our robot battle tournaments stream live on YouTube. Watch from anywhere, cheer for your friends, and catch
        every knockout.
      </PageHeader>

      <section className="section">
        <div className="container">
          {channelId ? (
            <div className="stream">
              <div className="stream-head">
                <span className="live-pill">● Live</span>
                <h2>Watch live</h2>
              </div>
              <div className="video-frame">
                <iframe
                  src={`https://www.youtube.com/embed/live_stream?channel=${channelId}`}
                  title="The Bot Spot live tournament stream"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
              <p className="muted small">
                Not live right now? Watch past tournaments below, or subscribe to get notified when we go live.
              </p>
            </div>
          ) : (
            <div className="card stream-soon">
              <div className="photo">
                <Image src={hero.src} alt={hero.alt} width={hero.width} height={hero.height} sizes="(max-width: 800px) 100vw, 520px" />
              </div>
              <div>
                <p className="eyebrow">Coming soon</p>
                <h2>Live tournament streams</h2>
                <p className="muted">
                  We&apos;re setting up our live streams. Soon you&apos;ll be able to watch every tournament right here.
                  Follow us to hear when the first one goes live.
                </p>
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
            </div>
          )}
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <h2>Upcoming tournaments</h2>
          {upcoming.length === 0 ? (
            <p className="muted">
              New tournaments are announced on our social media. Want to compete? Book a battle to practice, or ask us
              at the front desk.
            </p>
          ) : (
            <div className="grid grid-3">
              {upcoming.map((t) => (
                <article key={`${t.date}-${t.title}`} className="card">
                  <p className="eyebrow">
                    {niceDate(t.date)} · {t.time}
                  </p>
                  <h3>{t.title}</h3>
                  <p className="muted">{t.description}</p>
                </article>
              ))}
            </div>
          )}
          <div className="actions">
            <Link href="/book-appointment" className="btn btn-primary">
              Book practice time
            </Link>
            {url ? (
              <a className="btn btn-outline" href={`${url}?sub_confirmation=1`} target="_blank" rel="noopener noreferrer">
                Subscribe on YouTube
              </a>
            ) : null}
          </div>
        </div>
      </section>

      {uploads ? (
        <section className="section">
          <div className="container">
            <h2>Past tournaments</h2>
            <div className="video-frame">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/videoseries?list=${uploads}`}
                title="Past tournaments from The Bot Spot"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
