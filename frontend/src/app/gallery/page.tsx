import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { LoopVideos } from "@/components/Videos";
import { galleryChapters, loopVideos, photo, site } from "@/content/site";

export const metadata: Metadata = {
  title: "Gallery",
  description: "See the fun in every visit: robot battles, classic games and nonstop entertainment.",
};

export default function GalleryPage() {
  return (
    <>
      <PageHeader title="Gallery" eyebrow="See the fun in every visit!">
        Step inside our arcade and experience the thrill of robot battles, classic games, and nonstop
        entertainment. From birthday parties to family outings, every moment is packed with laughter,
        competition, and unforgettable memories.
      </PageHeader>

      {/* Videos originales en loop (cuando los duenos pasen los .mp4). */}
      {loopVideos.length > 0 ? (
        <section className="section">
          <div className="container">
            <p className="eyebrow">Videos</p>
            <h2 className="display">Battles in action</h2>
            <LoopVideos videos={loopVideos} />
          </div>
        </section>
      ) : null}

      <section className="section">
        <div className="container">
          <nav className="chapter-nav" aria-label="Gallery chapters">
            {galleryChapters.map((c) => (
              <a key={c.id} href={`#${c.id}`} className="chapter-chip">
                {c.title}
              </a>
            ))}
          </nav>
        </div>
      </section>

      {galleryChapters.map((c, ci) => (
        <section key={c.id} id={c.id} className={`section gallery-chapter${ci % 2 ? " section-alt" : ""}`}>
          <div className="container">
            <div className="chapter-head">
              <p className="eyebrow">{c.eyebrow}</p>
              <h2 className="display">{c.title}</h2>
              <p className="muted">{c.story}</p>
            </div>
            <div className="masonry">
              {c.photos.map(({ name, caption }, i) => {
                const p = photo(name);
                return (
                  <figure key={name} className="photo gallery-figure">
                    <Image
                      src={p.src}
                      alt={p.alt}
                      width={p.width}
                      height={p.height}
                      sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 380px"
                      priority={ci === 0 && i < 3}
                    />
                    <figcaption>{caption}</figcaption>
                  </figure>
                );
              })}
            </div>
          </div>
        </section>
      ))}

      <section className="section">
        <div className="container gallery-cta">
          <h2>Your story is next</h2>
          <p className="muted">Book a battle, bring your crew, and tag us so your photo can make it here.</p>
          <div className="actions">
            <Link href="/book-appointment" className="btn btn-primary">
              Book a battle
            </Link>
            <a className="btn btn-outline" href={site.social.instagram} target="_blank" rel="noopener noreferrer">
              Instagram
            </a>
            {site.social.tiktok ? (
              <a className="btn btn-outline" href={site.social.tiktok} target="_blank" rel="noopener noreferrer">
                TikTok
              </a>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
