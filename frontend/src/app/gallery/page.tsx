import type { Metadata } from "next";
import Image from "next/image";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Gallery",
  description: "See the fun in every visit: robot battles, classic games and nonstop entertainment.",
};

const photos = [
  { src: "/images/arena-crowd.jpg", alt: "Crowd cheering during a robot battle", width: 1600, height: 1200 },
  { src: "/images/arena.jpg", alt: "Robot battle arena", width: 1600, height: 900 },
  { src: "/images/hero-logo.jpg", alt: "The Bot Spot logo", width: 1584, height: 672 },
];

export default function GalleryPage() {
  return (
    <>
      <PageHeader title="Gallery" eyebrow="See the fun in every visit!">
        Step inside our arcade and experience the thrill of robot battles, classic games, and nonstop
        entertainment. From birthday parties to family outings, every moment is packed with laughter,
        competition, and unforgettable memories.
      </PageHeader>

      <section className="section">
        <div className="container grid grid-2">
          {photos.map((photo) => (
            <div key={photo.src} className="photo">
              <Image
                src={photo.src}
                alt={photo.alt}
                width={photo.width}
                height={photo.height}
                sizes="(max-width: 900px) 100vw, 560px"
              />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
