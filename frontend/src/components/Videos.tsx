"use client";

import { useEffect, useRef, useState } from "react";
import type { LoopVideo } from "@/content/site";

/**
 * Videos propios en loop (sin sonido, se reproducen solos). Se pausan fuera de pantalla para
 * ahorrar bateria y con "reducir movimiento" quedan en pausa con controles.
 */
export function LoopVideos({ videos }: { videos: LoopVideo[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const v = e.target as HTMLVideoElement;
          if (e.isIntersecting && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            void v.play().catch(() => undefined);
          } else v.pause();
        }
      },
      { threshold: 0.25 },
    );
    el.querySelectorAll("video").forEach((v) => io.observe(v));
    return () => io.disconnect();
  }, [videos]);

  return (
    <div ref={ref} className="loop-videos">
      {videos.map((v) => (
        <figure key={v.src} className="loop-video">
          <video
            src={v.src}
            poster={v.poster}
            muted
            loop
            playsInline
            preload="metadata"
            controls={reduced}
            aria-label={v.title}
          />
          <figcaption>{v.title}</figcaption>
        </figure>
      ))}
    </div>
  );
}
