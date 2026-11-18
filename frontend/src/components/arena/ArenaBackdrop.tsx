"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { ArenaScene } from "./arenaScene";

/**
 * Fondo del inicio: la arena queda fija detras de toda la pagina y la pelea avanza con el scroll
 * de la pagina completa (subir la regresa). El contenido flota encima en tarjetas de vidrio.
 * Abajo hay un marcador con el momento de la pelea.
 */

/** Momentos de la pelea (deben coincidir con TIMELINE en arenaScene.ts). */
const ROUNDS = [
  { from: 0, label: "Ready" },
  { from: 0.14, label: "3 · 2 · 1" },
  { from: 0.27, label: "Fight" },
  { from: 0.42, label: "Clash" },
  { from: 0.7, label: "Pop!" },
  { from: 0.78, label: "Winner" },
];

export function ArenaBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [round, setRound] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let scene: ArenaScene | null = null;
    let disposed = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const readProgress = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    };
    const onScroll = () => {
      const p = readProgress();
      let r = 0;
      ROUNDS.forEach((x, i) => {
        if (p >= x.from) r = i;
      });
      setRound(r);
      scene?.setProgress(p);
    };
    const onResize = () => {
      scene?.resize();
      onScroll();
    };
    const onPointer = (e: PointerEvent) =>
      scene?.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    // Sin pestana visible no se anima (ahorra bateria).
    const onVisibility = () => scene?.setActive(document.visibilityState === "visible");

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

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      disposed = true;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      scene?.dispose();
    };
  }, []);

  return (
    <>
      <div className="arena-backdrop" aria-hidden="true">
        {failed ? (
          <Image src="/images/gallery/arena-glow.jpg" alt="" fill sizes="100vw" className="arena-fallback" priority />
        ) : (
          <canvas ref={canvasRef} className="arena-gl" />
        )}
      </div>
      <ol className="arena-rounds" aria-hidden="true">
        {ROUNDS.map((r, i) => (
          <li key={r.label} className={i === round ? "is-active" : i < round ? "is-done" : ""}>
            <span>{r.label}</span>
          </li>
        ))}
      </ol>
    </>
  );
}
