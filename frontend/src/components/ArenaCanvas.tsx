"use client";

import { useEffect, useRef } from "react";

/**
 * Fondo animado del inicio: arena de combate de robots en 3D (canvas 2D con proyeccion propia,
 * sin librerias). Reflectores que barren el piso, dos robots que se persiguen y chocan con chispas,
 * y la camara se inclina al hacer scroll. Respeta `prefers-reduced-motion` (queda una imagen fija).
 */

type Vec3 = [number, number, number];

const ARENA = 5; // medio lado del piso de la arena
const WALL_H = 1.3;
const BOT = 1.4; // escala de los robots
const ORANGE = "255, 122, 0";

interface Bot {
  x: number;
  z: number;
  heading: number;
  vx: number;
  vz: number;
  retreat: number; // segundos alejandose despues de un choque
  target: [number, number];
  color: string;
  dark: string;
  spinner: boolean;
  spin: number;
}

interface Spark {
  p: Vec3;
  prev: Vec3;
  v: Vec3;
  life: number;
  max: number;
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

function newBot(x: number, z: number, color: string, dark: string, spinner: boolean): Bot {
  return { x, z, heading: 0, vx: 0, vz: 0, retreat: 0, target: [0, 0], color, dark, spinner, spin: 0 };
}

export function ArenaCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0;
    let H = 0;
    let dpr = 1;
    const stars = Array.from({ length: 140 }, () => ({
      x: Math.random(),
      y: Math.random() * 0.55,
      r: Math.random() * 1.2 + 0.2,
      t: Math.random() * Math.PI * 2,
    }));
    const bots = [newBot(-2.5, 1.5, "#ff7a00", "#8a3a00", false), newBot(2.5, -1.5, "#d6dbe2", "#5b6270", true)];
    let sparks: Spark[] = [];
    let mouseX = 0;

    // ---- Camara ----
    let cam: Vec3 = [0, 0, 0];
    let right: Vec3 = [1, 0, 0];
    let up: Vec3 = [0, 1, 0];
    let fwd: Vec3 = [0, 0, 1];
    let focal = 1;
    let cx = 0;
    let cy = 0;

    function setCamera(time: number) {
      const s = clamp(window.scrollY / Math.max(H, 1), 0, 1.6) / 1.6;
      const pitch = 0.5 + s * 0.55; // de lado (0.5 rad) a casi cenital al bajar
      const yaw = (reduced ? 0.35 : Math.sin(time * 0.00012) * 0.35) + mouseX * 0.08;
      const dist = 14 - s * 2;
      cam = [dist * Math.cos(pitch) * Math.sin(yaw), dist * Math.sin(pitch), dist * Math.cos(pitch) * Math.cos(yaw)];
      fwd = norm(sub([0, 0, 0], cam));
      right = norm(cross(fwd, [0, 1, 0]));
      up = cross(right, fwd);
      const wide = W > 900;
      focal = wide ? Math.min(W * 0.62, H * 1.05) : Math.min(W * 1.05, H * 1.2);
      // En pantallas anchas la arena va a la derecha y el texto a la izquierda.
      cx = wide ? W * (0.66 - s * 0.16) : W / 2;
      cy = H * ((wide ? 0.62 : 0.8) - s * (wide ? 0.08 : 0.3));
    }

    /** Proyecta un punto 3D a pantalla. Devuelve [x, y, profundidad]. */
    function project(p: Vec3): [number, number, number] {
      const v = sub(p, cam);
      const z = Math.max(dot(v, fwd), 0.1);
      return [cx + (dot(v, right) * focal) / z, cy - (dot(v, up) * focal) / z, z];
    }

    function poly(points: Vec3[], fill: string | CanvasGradient | null, stroke?: string, lw = 1) {
      ctx!.beginPath();
      points.forEach((p, i) => {
        const [x, y] = project(p);
        if (i === 0) ctx!.moveTo(x, y);
        else ctx!.lineTo(x, y);
      });
      ctx!.closePath();
      if (fill) {
        ctx!.fillStyle = fill;
        ctx!.fill();
      }
      if (stroke) {
        ctx!.strokeStyle = stroke;
        ctx!.lineWidth = lw;
        ctx!.stroke();
      }
    }

    function line(a: Vec3, b: Vec3, color: string, lw = 1) {
      const [ax, ay] = project(a);
      const [bx, by] = project(b);
      ctx!.beginPath();
      ctx!.moveTo(ax, ay);
      ctx!.lineTo(bx, by);
      ctx!.strokeStyle = color;
      ctx!.lineWidth = lw;
      ctx!.stroke();
    }

    function circle3d(c: Vec3, r: number, steps = 40): Vec3[] {
      return Array.from({ length: steps }, (_, i) => {
        const a = (i / steps) * Math.PI * 2;
        return [c[0] + Math.cos(a) * r, c[1], c[2] + Math.sin(a) * r] as Vec3;
      });
    }

    // ---- Escena ----
    function drawSky(time: number) {
      const g = ctx!.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#030304");
      g.addColorStop(0.6, "#0a0705");
      g.addColorStop(1, "#000");
      ctx!.fillStyle = g;
      ctx!.fillRect(0, 0, W, H);
      for (const s of stars) {
        const a = reduced ? 0.6 : 0.35 + 0.35 * Math.sin(time * 0.002 + s.t);
        ctx!.fillStyle = `rgba(255,255,255,${a})`;
        ctx!.fillRect(s.x * W, s.y * H, s.r, s.r);
      }
    }

    function drawFloor(time: number) {
      // Plataforma exterior
      const o = ARENA + 1.6;
      poly(
        [
          [-o, -0.02, -o],
          [o, -0.02, -o],
          [o, -0.02, o],
          [-o, -0.02, o],
        ],
        "#07080a",
        "rgba(255,255,255,0.06)",
      );
      // Piso de acero con luz central
      const [fx, fy] = project([0, 0, 0]);
      const [ex] = project([ARENA, 0, 0]);
      const glow = ctx!.createRadialGradient(fx, fy, 0, fx, fy, Math.abs(ex - fx) * 1.4 + 1);
      glow.addColorStop(0, "#2a2622");
      glow.addColorStop(0.6, "#16171a");
      glow.addColorStop(1, "#0c0d0f");
      poly(
        [
          [-ARENA, 0, -ARENA],
          [ARENA, 0, -ARENA],
          [ARENA, 0, ARENA],
          [-ARENA, 0, ARENA],
        ],
        glow,
      );
      // Placas del piso
      for (let i = -ARENA + 1; i < ARENA; i++) {
        line([i, 0, -ARENA], [i, 0, ARENA], "rgba(255,255,255,0.07)");
        line([-ARENA, 0, i], [ARENA, 0, i], "rgba(255,255,255,0.07)");
      }
      // Franja de peligro naranja/negra en el borde
      const band = 0.38;
      const seg = 0.5;
      for (let side = 0; side < 4; side++) {
        for (let t = -ARENA, k = 0; t < ARENA - 0.001; t += seg, k++) {
          const t2 = Math.min(t + seg, ARENA);
          const quad: Vec3[] = [
            [t, 0.005, -ARENA],
            [t2, 0.005, -ARENA],
            [t2, 0.005, -ARENA + band],
            [t, 0.005, -ARENA + band],
          ].map(([x, y, z]) => rotateY([x!, y!, z!], (side * Math.PI) / 2));
          poly(quad, k % 2 === 0 ? `rgba(${ORANGE},0.85)` : "rgba(10,10,10,0.9)");
        }
      }
      // Circulo central con pulso
      const pulse = reduced ? 0.6 : 0.45 + 0.25 * Math.sin(time * 0.003);
      poly(circle3d([0, 0.006, 0], 1.3), null, `rgba(${ORANGE},${pulse})`, 2);
      poly(circle3d([0, 0.006, 0], 0.9), null, "rgba(255,255,255,0.12)", 1);
      // Zonas de salida de cada robot
      for (const sgn of [-1, 1]) {
        poly(
          [
            [sgn * 3.2, 0.006, -0.6],
            [sgn * 4.2, 0.006, -0.6],
            [sgn * 4.2, 0.006, 0.6],
            [sgn * 3.2, 0.006, 0.6],
          ],
          null,
          "rgba(255,255,255,0.18)",
        );
      }
    }

    function rotateY(p: Vec3, a: number): Vec3 {
      const c = Math.cos(a);
      const s = Math.sin(a);
      return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
    }

    // Reflectores en las 4 esquinas que barren el piso
    function drawLights(time: number, beams: boolean) {
      ctx!.save();
      ctx!.globalCompositeOperation = "lighter";
      for (let i = 0; i < 4; i++) {
        const sx = i < 2 ? -1 : 1;
        const sz = i % 2 === 0 ? -1 : 1;
        const lamp: Vec3 = [sx * (ARENA + 2.2), 6.5, sz * (ARENA + 2.2)];
        const a = (reduced ? 0 : time * 0.00035) + i * (Math.PI / 2);
        const spot: Vec3 = [Math.cos(a) * 2.2, 0, Math.sin(a) * 2.2];
        const [lx, ly] = project(lamp);
        const [px, py, pz] = project(spot);
        const rad = (2.2 * focal) / pz;
        if (beams) {
          const g = ctx!.createLinearGradient(lx, ly, px, py);
          g.addColorStop(0, "rgba(255,240,220,0.28)");
          g.addColorStop(1, "rgba(255,200,150,0)");
          const ang = Math.atan2(py - ly, px - lx) + Math.PI / 2;
          ctx!.beginPath();
          ctx!.moveTo(lx, ly);
          ctx!.lineTo(px + Math.cos(ang) * rad, py + Math.sin(ang) * rad * 0.6);
          ctx!.lineTo(px - Math.cos(ang) * rad, py - Math.sin(ang) * rad * 0.6);
          ctx!.closePath();
          ctx!.fillStyle = g;
          ctx!.fill();
          // Mancha de luz en el piso
          const s = ctx!.createRadialGradient(px, py, 0, px, py, rad);
          s.addColorStop(0, "rgba(255,230,200,0.16)");
          s.addColorStop(1, "rgba(255,230,200,0)");
          ctx!.fillStyle = s;
          ctx!.beginPath();
          ctx!.ellipse(px, py, rad, rad * 0.55, 0, 0, Math.PI * 2);
          ctx!.fill();
        } else {
          // Cabeza del reflector
          const h = ctx!.createRadialGradient(lx, ly, 0, lx, ly, 26);
          h.addColorStop(0, "rgba(255,255,255,0.95)");
          h.addColorStop(0.3, "rgba(255,220,180,0.45)");
          h.addColorStop(1, "rgba(255,200,150,0)");
          ctx!.fillStyle = h;
          ctx!.fillRect(lx - 26, ly - 26, 52, 52);
        }
      }
      ctx!.restore();
      if (!beams) {
        // Postes de los reflectores
        for (let i = 0; i < 4; i++) {
          const sx = i < 2 ? -1 : 1;
          const sz = i % 2 === 0 ? -1 : 1;
          line([sx * (ARENA + 2.2), 0, sz * (ARENA + 2.2)], [sx * (ARENA + 2.2), 6.5, sz * (ARENA + 2.2)], "rgba(120,120,130,0.35)", 2);
        }
      }
    }

    // Paredes de policarbonato: las del fondo antes de los robots, las de enfrente despues
    function drawWalls(front: boolean) {
      const corners: Vec3[] = [
        [-ARENA, 0, -ARENA],
        [ARENA, 0, -ARENA],
        [ARENA, 0, ARENA],
        [-ARENA, 0, ARENA],
      ];
      for (let i = 0; i < 4; i++) {
        const a = corners[i]!;
        const b = corners[(i + 1) % 4]!;
        const mid: Vec3 = [(a[0] + b[0]) / 2, WALL_H / 2, (a[2] + b[2]) / 2];
        const isFront = dot(sub(mid, cam), fwd) < dot(sub([0, 0, 0], cam), fwd);
        if (isFront !== front) continue;
        const at: Vec3 = [a[0], WALL_H, a[2]];
        const bt: Vec3 = [b[0], WALL_H, b[2]];
        poly([a, b, bt, at], "rgba(170,190,215,0.05)");
        line(at, bt, "rgba(255,255,255,0.35)", 1.5);
        line(a, at, "rgba(255,255,255,0.3)", 2);
      }
    }

    // ---- Robots ----
    function botVertices(b: Bot): Vec3[] {
      const w = 0.45 * BOT;
      const l = 0.6 * BOT;
      const h = 0.38 * BOT;
      const hf = 0.06 * BOT;
      const local: Vec3[] = [
        [-w, 0, -l],
        [w, 0, -l],
        [w, 0, l],
        [-w, 0, l],
        [-w, h, -l],
        [w, h, -l],
        [w, hf, l],
        [-w, hf, l],
      ];
      return local.map((p) => {
        const r = rotateY(p, b.heading);
        return [r[0] + b.x, r[1], r[2] + b.z] as Vec3;
      });
    }

    function drawBot(b: Bot) {
      // Sombra
      poly(circle3d([b.x, 0.004, b.z], 0.85 * BOT, 24), "rgba(0,0,0,0.55)");
      const v = botVertices(b);
      const center: Vec3 = [b.x, 0.2 * BOT, b.z];
      const faces = [
        [4, 5, 6, 7], // superficie superior (cuña)
        [0, 1, 5, 4], // atras
        [3, 2, 6, 7], // frente
        [0, 3, 7, 4], // izquierda
        [1, 2, 6, 5], // derecha
      ];
      const lightDir = norm([0.3, 1, 0.4]);
      for (const f of faces) {
        const p = f.map((i) => v[i]!);
        let n = norm(cross(sub(p[1]!, p[0]!), sub(p[2]!, p[0]!)));
        const fc: Vec3 = [
          (p[0]![0] + p[2]![0]) / 2,
          (p[0]![1] + p[2]![1]) / 2,
          (p[0]![2] + p[2]![2]) / 2,
        ];
        if (dot(n, sub(fc, center)) < 0) n = [-n[0], -n[1], -n[2]];
        if (dot(n, sub(cam, fc)) <= 0) continue;
        const shade = 0.45 + 0.55 * Math.max(0, dot(n, lightDir));
        ctx!.globalAlpha = 1;
        poly(p, f[0] === 4 ? b.color : b.dark, "rgba(0,0,0,0.5)", 1);
        ctx!.globalAlpha = 1 - shade;
        poly(p, "#000");
        ctx!.globalAlpha = 1;
      }
      // Luz trasera
      const led = rotateY([0, 0.39 * BOT, -0.45 * BOT], b.heading);
      const [lx, ly] = project([led[0] + b.x, led[1], led[2] + b.z]);
      ctx!.fillStyle = b.spinner ? "rgba(255,80,60,0.95)" : "rgba(255,255,255,0.95)";
      ctx!.beginPath();
      ctx!.arc(lx, ly, 2.5, 0, Math.PI * 2);
      ctx!.fill();
      // Disco giratorio (arma)
      if (b.spinner) {
        const r = 0.42 * BOT;
        const c: Vec3 = [b.x, 0.42 * BOT, b.z];
        poly(circle3d(c, r, 28), "#9aa1ab", "rgba(0,0,0,0.6)", 1);
        const a1 = rotateY([r, 0, 0], b.spin);
        const a2 = rotateY([-r, 0, 0], b.spin);
        line([c[0] + a1[0], c[1], c[2] + a1[2]], [c[0] + a2[0], c[1], c[2] + a2[2]], `rgb(${ORANGE})`, 3);
      }
    }

    function burst(x: number, y: number, z: number, n: number) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = rand(2, 5.5);
        const p: Vec3 = [x, y, z];
        sparks.push({ p, prev: p, v: [Math.cos(a) * sp, rand(1.5, 4.5), Math.sin(a) * sp], life: 0, max: rand(0.35, 0.9) });
      }
    }

    function updateBots(dt: number) {
      const [a, b] = bots as [Bot, Bot];
      for (const [me, foe] of [
        [a, b],
        [b, a],
      ] as const) {
        me.spin += dt * 28;
        let tx = foe.x;
        let tz = foe.z;
        if (me.retreat > 0) {
          me.retreat -= dt;
          [tx, tz] = me.target;
        }
        const want = Math.atan2(tx - me.x, tz - me.z);
        let diff = want - me.heading;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        me.heading += clamp(diff, -2.6 * dt, 2.6 * dt);
        const speed = me.retreat > 0 ? 1.4 : 2.1;
        me.vx += (Math.sin(me.heading) * speed - me.vx) * Math.min(1, dt * 3);
        me.vz += (Math.cos(me.heading) * speed - me.vz) * Math.min(1, dt * 3);
        me.x += me.vx * dt;
        me.z += me.vz * dt;
        const lim = ARENA - 0.95 * BOT;
        if (Math.abs(me.x) > lim || Math.abs(me.z) > lim) {
          if (Math.abs(me.x) > lim) me.vx *= -0.6;
          if (Math.abs(me.z) > lim) me.vz *= -0.6;
          me.x = clamp(me.x, -lim, lim);
          me.z = clamp(me.z, -lim, lim);
        }
      }
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const d = Math.hypot(dx, dz);
      if (d < 1.15 * BOT && a.retreat <= 0 && b.retreat <= 0) {
        const nx = dx / (d || 1);
        const nz = dz / (d || 1);
        burst(a.x + nx * 0.55 * BOT, 0.3 * BOT, a.z + nz * 0.55 * BOT, 40);
        a.vx = -nx * 4.5;
        a.vz = -nz * 4.5;
        b.vx = nx * 4.5;
        b.vz = nz * 4.5;
        for (const bot of bots) {
          bot.retreat = rand(1.2, 2.2);
          bot.target = [rand(-3.5, 3.5), rand(-3.5, 3.5)];
        }
      }
    }

    function updateSparks(dt: number) {
      for (const s of sparks) {
        s.prev = s.p;
        s.v = [s.v[0] * 0.98, s.v[1] - 9.8 * dt, s.v[2] * 0.98];
        let y = s.p[1] + s.v[1] * dt;
        if (y < 0) {
          y = 0;
          s.v[1] *= -0.35;
        }
        s.p = [s.p[0] + s.v[0] * dt, y, s.p[2] + s.v[2] * dt];
        s.life += dt;
      }
      sparks = sparks.filter((s) => s.life < s.max);
    }

    function drawSparks() {
      ctx!.save();
      ctx!.globalCompositeOperation = "lighter";
      for (const s of sparks) {
        const k = 1 - s.life / s.max;
        line(s.prev, s.p, `hsla(${35 + 20 * k}, 100%, ${55 + 30 * k}%, ${k})`, 2);
      }
      ctx!.restore();
    }

    // ---- Bucle ----
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas!.clientWidth;
      H = canvas!.clientHeight;
      canvas!.width = Math.round(W * dpr);
      canvas!.height = Math.round(H * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function render(time: number) {
      setCamera(time);
      drawSky(time);
      drawLights(time, false);
      drawFloor(time);
      drawLights(time, true);
      drawWalls(false);
      const sorted = [...bots].sort((p, q) => project([q.x, 0, q.z])[2] - project([p.x, 0, p.z])[2]);
      sorted.forEach(drawBot);
      drawSparks();
      drawWalls(true);
    }

    let raf = 0;
    let last = performance.now();
    function frame(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      updateBots(dt);
      updateSparks(dt);
      render(now);
      raf = requestAnimationFrame(frame);
    }

    resize();
    const onResize = () => {
      resize();
      if (reduced) render(0);
    };
    const onScroll = () => {
      if (reduced) render(0);
    };
    const onMouse = (e: PointerEvent) => {
      mouseX = (e.clientX / Math.max(W, 1)) * 2 - 1;
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onMouse, { passive: true });
    if (reduced) render(0);
    else raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onMouse);
    };
  }, []);

  return <canvas ref={ref} className="arena-canvas" aria-hidden="true" />;
}
