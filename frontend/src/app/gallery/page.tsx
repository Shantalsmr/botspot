import type { Metadata } from "next";
import Image from "next/image";
import { PageHeader } from "@/components/PageHeader";
import { LoopVideos } from "@/components/Videos";
import { gallery, loopVideos } from "@/content/site";

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
        <div className="container masonry">
          {gallery.map((p, i) => (
            <div key={p.src} className="photo">
              <Image
                src={p.src}
                alt={p.alt}
                width={p.width}
                height={p.height}
                sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 380px"
                priority={i < 3}
              />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
