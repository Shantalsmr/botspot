"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ArenaScene } from "./arenaScene";

/**
 * Inicio: la arena 3D queda fija mientras se baja y la pelea avanza con el scroll.
 * Cada tramo del scroll tiene su texto (preparados, 3-2-1, conduce, ataca, revienta el globo, tu turno).
 * La escena (three.js) se carga aparte para no frenar la primera pintura de la pagina.
 */

interface Beat {
  from: number;
  to: number;
  label: string;
}

/** Tramos del scroll (deben coincidir con TIMELINE en arenaScene.ts). */
const BEATS: Beat[] = [
  { from: 0, to: 0.13, label: "Ready" },
  { from: 0.13, to: 0.28, label: "3 · 2 · 1" },
  { from: 0.28, to: 0.45, label: "Drive" },
  { from: 0.45, to: 0.63, label: "Attack" },
  { from: 0.63, to: 0.78, label: "Pop!" },
  { from: 0.78, to: 1.01, label: "Your turn" },
];

function countdown(p: number): string {
  if (p < 0.2) return "3";
  if (p < 0.24) return "2";
  if (p < 0.27) return "1";
  return "GO!";
}

export function ArenaStory({ city }: { city: string }) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;
    let scene: ArenaScene | null = null;
    let disposed = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const readProgress = () => {
      const rect = section.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      return total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
    };
    const onScroll = () => {
      const p = readProgress();
      setProgress(p);
      scene?.setProgress(p);
    };
    const onResize = () => scene?.resize();
    const onPointer = (e: PointerEvent) =>
      scene?.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);

    import("./arenaScene")
      .then(({ createArenaScene }) => {
        if (disposed) return;
        try {
          scene = createArenaScene(canvas, {
            reducedMotion: reduced,
            offsetRight: () => (window.innerWidth >= 1000 ? 0.16 : 0),
            offsetDown: () => (window.innerWidth < 760 ? 0.14 : 0),
          });
          scene.setProgress(readProgress());
        } catch (error) {
          console.error("[arena]", error);
          setFailed(true);
        }
      })
      .catch(() => setFailed(true));

    // Solo se anima mientras la arena se ve en pantalla.
    const io = new IntersectionObserver(([entry]) => scene?.setActive(Boolean(entry?.isIntersecting)));
    io.observe(section);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointer, { passive: true });
    return () => {
      disposed = true;
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointer);
      scene?.dispose();
    };
  }, []);

  const active = BEATS.findIndex((b) => progress >= b.from && progress < b.to);
  const show = (i: number) => (active === i ? " is-active" : "");

  return (
    <section ref={sectionRef} className="arena-story" aria-label="Robot battle">
      <div className="arena-stage">
        {failed ? (
          <Image
            src="/images/gallery/arena-glow.jpg"
            alt=""
            fill
            sizes="100vw"
            className="arena-fallback"
            priority
          />
        ) : (
          <canvas ref={canvasRef} className="arena-gl" aria-hidden="true" />
        )}
        <div className="arena-shade" aria-hidden="true" />

        <div className="container arena-captions">
          {/* 0 · Portada */}
          <div className={`beat beat-hero${show(0)}`}>
            <p className="eyebrow">Robot combat arena · {city}</p>
            <h1 className="display">
              Take control.
              <br />
              <span className="accent">Battle robots.</span>
            </h1>
            <p className="hero-lead">
              Drive a real fighting robot in our custom-built arenas. Pop your rival&apos;s balloon to win. Scroll to
              watch a battle.
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

          {/* 1 · Semaforo */}
          <div className={`beat${show(1)}`} aria-hidden={active !== 1}>
            <p className="eyebrow">Get ready</p>
            <p className="beat-count display" key={countdown(progress)}>
              {countdown(progress)}
            </p>
            <p className="beat-text">Every battle starts at the light. Red, yellow… green means go.</p>
          </div>

          {/* 2 · Conducir */}
          <div className={`beat${show(2)}`} aria-hidden={active !== 2}>
            <p className="eyebrow">Round 1</p>
            <h2 className="display">Drive.</h2>
            <p className="beat-text">Grab a controller and take command of a real battle robot. No experience needed.</p>
          </div>

          {/* 3 · Atacar */}
          <div className={`beat${show(3)}`} aria-hidden={active !== 3}>
            <p className="eyebrow">Round 1</p>
            <h2 className="display">Attack.</h2>
            <p className="beat-text">Bump, push and outsmart your opponent. Swing your robot&apos;s arms at the right moment.</p>
          </div>

          {/* 4 · Globo */}
          <div className={`beat${show(4)}`} aria-hidden={active !== 4}>
            <p className="eyebrow">Knockout</p>
            <h2 className="display beat-pop">Pop!</h2>
            <p className="beat-text">Pop the balloon on your rival&apos;s robot and the round is yours.</p>
          </div>

          {/* 5 · Llamado */}
          <div className={`beat${show(5)}`} aria-hidden={active !== 5}>
            <p className="eyebrow">Winner</p>
            <h2 className="display">Your turn.</h2>
            <p className="beat-text">Up to 16 players at once, all ages. Book online in seconds.</p>
            <div className="actions">
              <Link href="/book-appointment" className="btn btn-primary" tabIndex={active === 5 ? 0 : -1}>
                Book your battle
              </Link>
              <Link href="/tournaments" className="btn btn-outline" tabIndex={active === 5 ? 0 : -1}>
                Watch tournaments
              </Link>
            </div>
          </div>
        </div>

        <ol className="arena-rounds" aria-hidden="true">
          {BEATS.map((b, i) => (
            <li key={b.label} className={i === active ? "is-active" : i < active ? "is-done" : ""}>
              <span>{b.label}</span>
            </li>
          ))}
        </ol>
        <div className={`scroll-cue${progress > 0.03 ? " is-hidden" : ""}`} aria-hidden="true">
          <span />
          Scroll to fight
        </div>
      </div>
    </section>
  );
}
