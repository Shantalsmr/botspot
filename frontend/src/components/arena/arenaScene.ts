/**
 * Arena del inicio dibujada en canvas 2D con proyeccion 3D propia (sin librerias): cielo con
 * estrellas, reflectores que barren el piso, franjas de peligro naranja/negro y paredes de vidrio.
 *
 * Los robots imitan a los de The Bot Spot: base ancha con visera negra y ruedas, torso con tres
 * barras LED, pinzas negras, cabeza cuadrada (gafas y bigote / visor) y un globo arriba.
 *
 * La pelea esta guionizada y avanza con el scroll (`setProgress(0..1)`); subir la regresa:
 *   0.00 preparados · 0.14 circulo rojo → amarillo → verde (0.27) · 0.42 primer choque
 *   0.58 segundo choque · 0.70 el naranja revienta el globo del cian · 0.78+ celebracion
 * La arena queda fija detras de todo el inicio y la camara viaja con el scroll de la pagina:
 * vista amplia en la portada → baja al ras del piso entre los robots durante la pelea →
 * sube a una vista desde arriba con el ganador en el centro al final de la pagina.
 */

export const TIMELINE = {
  red: 0.14,
  yellow: 0.2,
  green: 0.27,
  clash1: 0.42,
  clash2: 0.58,
  pop: 0.7,
  winner: 0.78,
} as const;

export interface ArenaScene {
  setProgress: (p: number) => void;
  setPointer: (x: number, y: number) => void;
  resize: () => void;
  setActive: (active: boolean) => void;
  dispose: () => void;
}

interface Options {
  reducedMotion: boolean;
  /** Desplaza la arena a la derecha (pantallas anchas, texto a la izquierda). */
  offsetRight: () => number;
  /** Desplaza la arena hacia abajo (celular, texto arriba). */
  offsetDown: () => number;
}

type Vec3 = [number, number, number];

const ARENA = 5; // medio lado del piso
const WALL_H = 1.3;
const BOT = 1.4; // escala de los robots
const ORANGE = "255, 122, 26";
const CYAN = "47, 214, 242";

// ---------- utilidades ----------
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const seg = (p: number, a: number, b: number) => smooth(clamp((p - a) / (b - a)));
const angleLerp = (a: number, b: number, t: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

function rotateY(p: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
}

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, "$1$1") : h, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

// ---------- robots ----------
interface RobotStyle {
  body: string;
  bodyDark: string;
  head: string;
  led: string;
  balloon: string;
  face: "mustache" | "visor";
}

const ORANGE_BOT: RobotStyle = {
  body: "#ff7a1a",
  bodyDark: "#b84a0a",
  head: "#e0262c",
  led: "#ffe2a3",
  balloon: "#ffc61a",
  face: "mustache",
};

const CYAN_BOT: RobotStyle = {
  body: "#22bcd9",
  bodyDark: "#0d6f85",
  head: "#dde4ea",
  led: "#c4f8ff",
  balloon: "#ff3b6b",
  face: "visor",
};

interface Pose {
  x: number;
  z: number;
  heading: number;
  /** 0..1+ golpe con las pinzas hacia el frente */
  jab: number;
  /** 0..1 brazos arriba (celebracion) */
  cheer: number;
  /** salto (metros de escena) */
  hop: number;
}

// ---------- coreografia (el scroll manda) ----------
const K = 1.27; // escala de distancias para el tamano de estos robots
const START = 2.7 * K;

function choreography(p: number, t: number, still: boolean): { o: Pose; b: Pose } {
  const wob = (k: number) => (still ? 0 : Math.sin(t * k));
  // En sus zonas de salida, mirandose
  let o = { x: -START, z: 0 };
  let b = { x: START, z: 0 };
  // Arrancan y chocan en el centro
  const charge = seg(p, TIMELINE.green + 0.01, TIMELINE.clash1);
  o.x = lerp(-START, -0.56 * K, charge * charge);
  b.x = lerp(START, 0.56 * K, charge * charge);
  o.z = Math.sin(charge * Math.PI) * 0.5 * K;
  b.z = -Math.sin(charge * Math.PI) * 0.5 * K;
  // Rebote
  const bounce = seg(p, TIMELINE.clash1, TIMELINE.clash1 + 0.05);
  o = { x: lerp(o.x, -1.6 * K, bounce), z: lerp(o.z, 0.4 * K, bounce) };
  b = { x: lerp(b.x, 1.6 * K, bounce), z: lerp(b.z, -0.4 * K, bounce) };
  // Se rodean y vuelven a chocar
  const circle = seg(p, TIMELINE.clash1 + 0.05, TIMELINE.pop);
  if (circle > 0) {
    const theta = Math.PI - 0.25 + circle * 2.4;
    const inward = 1 - Math.exp(-Math.pow((p - TIMELINE.clash2) / 0.022, 2)) * 0.62;
    const r = 1.65 * K * inward;
    const oc = { x: Math.cos(theta) * r, z: Math.sin(theta) * r };
    const k = Math.min(1, circle * 6);
    o = { x: lerp(o.x, oc.x, k), z: lerp(o.z, oc.z, k) };
    b = { x: lerp(b.x, -oc.x, k), z: lerp(b.z, -oc.z, k) };
  }
  // Flanqueo: el naranja se pone al lado del cian para alcanzar el globo
  const flank = seg(p, TIMELINE.clash2 + 0.03, TIMELINE.pop);
  if (flank > 0) {
    const toB = Math.atan2(b.x - o.x, b.z - o.z);
    const side = { x: b.x + Math.cos(toB) * 0.95 * K, z: b.z - Math.sin(toB) * 0.95 * K };
    o = { x: lerp(o.x, side.x, flank), z: lerp(o.z, side.z, flank) };
  }
  // Despues del globo: el cian sale disparado a una esquina, el naranja va al centro
  const after = seg(p, TIMELINE.pop, TIMELINE.winner + 0.04);
  b = { x: lerp(b.x, 3.3, after), z: lerp(b.z, 3.0, after) };
  o = { x: lerp(o.x, 0, after), z: lerp(o.z, 0.3, after) };

  const face = (me: { x: number; z: number }, foe: { x: number; z: number }) => Math.atan2(foe.x - me.x, foe.z - me.z);
  const victory = seg(p, TIMELINE.winner, 1);
  const oh = angleLerp(face(o, b), 0.5, after) + victory * Math.PI * 2;
  const bh = face(b, o) + after * Math.PI * 3;
  const fighting = p > TIMELINE.green && p < TIMELINE.pop + 0.02;
  const strike = Math.exp(-Math.pow((p - (TIMELINE.pop - 0.012)) / 0.012, 2));
  const cheer = seg(p, TIMELINE.winner, TIMELINE.winner + 0.06);
  return {
    o: {
      ...o,
      heading: oh + wob(3.1) * 0.04,
      jab: (fighting ? 0.25 + 0.45 * Math.max(0, wob(9)) : 0) + strike,
      cheer,
      hop: cheer > 0 && !still ? Math.abs(Math.sin(t * 6)) * 0.35 * cheer : 0,
    },
    b: {
      ...b,
      heading: bh + wob(2.7) * 0.04,
      jab: fighting ? 0.25 + 0.45 * Math.max(0, wob(8.3)) : 0,
      cheer: 0,
      hop: 0,
    },
  };
}

interface Spark {
  p: Vec3;
  prev: Vec3;
  v: Vec3;
  life: number;
  max: number;
  color: string;
  drag: number;
  gravity: number;
}

interface Part {
  c: Vec3; // centro local (sin escala)
  h: Vec3; // medio tamano local (sin escala)
  color: string;
  top?: string;
  after?: (toWorld: (l: Vec3) => Vec3, frontVisible: boolean) => void;
}

const LIGHT = norm([0.3, 1, 0.4]);
const LOCAL_FACES: { idx: number[]; n: Vec3 }[] = [
  { idx: [4, 5, 6, 7], n: [0, 1, 0] },
  { idx: [3, 2, 6, 7], n: [0, 0, 1] },
  { idx: [0, 1, 5, 4], n: [0, 0, -1] },
  { idx: [0, 3, 7, 4], n: [-1, 0, 0] },
  { idx: [1, 2, 6, 5], n: [1, 0, 0] },
];

const rect = (x: number, y: number, w: number, h: number): [number, number][] => [
  [x - w, y - h],
  [x + w, y - h],
  [x + w, y + h],
  [x - w, y + h],
];
const ring = (x: number, y: number, r: number, n = 18): [number, number][] =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [x + Math.cos(a) * r, y + Math.sin(a) * r] as [number, number];
  });

// ---------- escena ----------
export function createArenaScene(canvas: HTMLCanvasElement, opts: Options): ArenaScene {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");
  const c2 = ctx;
  const still = opts.reducedMotion;

  let W = 0;
  let H = 0;
  const stars = Array.from({ length: 140 }, () => ({
    x: Math.random(),
    y: Math.random() * 0.55,
    r: Math.random() * 1.2 + 0.2,
    t: Math.random() * Math.PI * 2,
  }));
  let sparks: Spark[] = [];
  let target = 0;
  let progress = 0;
  let lastProgress = 0;
  let pointer = { x: 0, y: 0 };
  let active = true;
  let raf = 0;
  let last = performance.now();
  let popAt = -1e9;
  let popPos: Vec3 = [0, 0, 0];
  let confettiTimer = 0;
  let snapped = false;

  // ---- camara ----
  let cam: Vec3 = [0, 0, 0];
  let right: Vec3 = [1, 0, 0];
  let up: Vec3 = [0, 1, 0];
  let fwd: Vec3 = [0, 0, 1];
  let focal = 1;
  let cx = 0;
  let cy = 0;
  let look: Vec3 = [0, 0, 0];

  /** Punto que sigue la camara (entre los robots, o el ganador al final). */
  let focus: Vec3 = [0, 0.3, 0];

  /** [progreso, inclinacion, distancia, giro, cuanto sigue a los robots] */
  const CAMERA_KEYS: [number, number, number, number, number][] = [
    [0.0, 0.5, 14, 0.35, 0],
    [0.12, 0.55, 12.5, 0.2, 0],
    [0.3, 0.27, 8.6, -0.15, 0.55],
    [0.45, 0.22, 8.1, -0.6, 0.8],
    [0.6, 0.3, 8.3, -1.2, 0.8],
    [0.7, 0.25, 8.0, -1.6, 0.9],
    [0.8, 0.72, 11, -2.0, 0.4],
    [1.0, 1.38, 15.5, -2.25, 0],
  ];

  function setCamera(time: number) {
    const p = progress;
    let i = 0;
    while (i < CAMERA_KEYS.length - 2 && p > CAMERA_KEYS[i + 1]![0]) i++;
    const k0 = CAMERA_KEYS[i]!;
    const k1 = CAMERA_KEYS[i + 1]!;
    const k = seg(p, k0[0], k1[0]);
    const pitch = lerp(k0[1], k1[1], k);
    const dist = lerp(k0[2], k1[2], k);
    const idle = still ? 0 : Math.sin(time * 0.00012) * 0.18;
    const yaw = lerp(k0[3], k1[3], k) + idle + pointer.x * 0.08;
    const follow = lerp(k0[4], k1[4], k);
    look = [focus[0] * follow, 0.3 + (focus[1] - 0.3) * follow, focus[2] * follow];
    cam = [
      look[0] + dist * Math.cos(pitch) * Math.sin(yaw),
      look[1] + dist * Math.sin(pitch) + pointer.y * 0.3,
      look[2] + dist * Math.cos(pitch) * Math.cos(yaw),
    ];
    // La camara nunca entra a la arena (se queda fuera de las paredes).
    const rh = Math.hypot(cam[0], cam[2]);
    const minR = ARENA * 1.5;
    if (rh < minR && pitch < 1.1) {
      cam[0] *= minR / (rh || 1);
      cam[2] *= minR / (rh || 1);
    }
    fwd = norm(sub(look, cam));
    right = norm(cross(fwd, Math.abs(fwd[1]) > 0.98 ? [0, 0, -1] : [0, 1, 0]));
    up = cross(right, fwd);
    const wide = W > 900;
    focal = wide ? Math.min(W * 0.62, H * 1.05) : Math.min(W * 1.15, H * 1.25);
    // En la portada la arena va a un lado del texto; despues se centra.
    const hero = 1 - seg(p, 0.03, 0.12);
    cx = W * (0.5 + opts.offsetRight() * hero);
    // Al final la arena baja un poco para que el ganador se vea debajo del ultimo titulo.
    cy = H * ((wide ? 0.6 : 0.62) + opts.offsetDown() * hero - (1 - hero) * 0.06 + seg(p, 0.8, 0.95) * 0.26);
  }

  function project(p: Vec3): [number, number, number] {
    const v = sub(p, cam);
    const z = Math.max(dot(v, fwd), 0.1);
    return [cx + (dot(v, right) * focal) / z, cy - (dot(v, up) * focal) / z, z];
  }

  const behind = (p: Vec3) => dot(sub(p, cam), fwd) < 0.25;

  function poly(points: Vec3[], fill: string | CanvasGradient | null, stroke?: string, lw = 1) {
    if (points.some(behind)) return;
    c2.beginPath();
    points.forEach((p, i) => {
      const [x, y] = project(p);
      if (i === 0) c2.moveTo(x, y);
      else c2.lineTo(x, y);
    });
    c2.closePath();
    if (fill) {
      c2.fillStyle = fill;
      c2.fill();
    }
    if (stroke) {
      c2.strokeStyle = stroke;
      c2.lineWidth = lw;
      c2.stroke();
    }
  }

  function line(a: Vec3, b: Vec3, color: string, lw = 1) {
    if (behind(a) || behind(b)) return;
    const [ax, ay] = project(a);
    const [bx, by] = project(b);
    c2.beginPath();
    c2.moveTo(ax, ay);
    c2.lineTo(bx, by);
    c2.strokeStyle = color;
    c2.lineWidth = lw;
    c2.stroke();
  }

  function circle3d(c: Vec3, r: number, steps = 40): Vec3[] {
    return Array.from({ length: steps }, (_, i) => {
      const a = (i / steps) * Math.PI * 2;
      return [c[0] + Math.cos(a) * r, c[1], c[2] + Math.sin(a) * r] as Vec3;
    });
  }

  // ---- escenario (como la primera version) ----
  function drawSky(time: number) {
    const g = c2.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#030405");
    g.addColorStop(0.6, "#0a0806");
    g.addColorStop(1, "#000");
    c2.fillStyle = g;
    c2.fillRect(0, 0, W, H);
    for (const s of stars) {
      const a = still ? 0.6 : 0.35 + 0.35 * Math.sin(time * 0.002 + s.t);
      c2.fillStyle = `rgba(255,255,255,${a})`;
      c2.fillRect(s.x * W, s.y * H, s.r, s.r);
    }
  }

  function countdownColor(): string {
    if (progress < TIMELINE.yellow) return "255, 59, 48";
    if (progress < TIMELINE.green) return "255, 198, 26";
    if (progress < TIMELINE.green + 0.05) return "46, 230, 107";
    return ORANGE;
  }

  function drawFloor(time: number) {
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
    const [fx, fy] = project([0, 0, 0]);
    const [ex] = project([ARENA, 0, 0]);
    const glow = c2.createRadialGradient(fx, fy, 0, fx, fy, Math.abs(ex - fx) * 1.4 + 1);
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
    for (let i = -ARENA + 1; i < ARENA; i++) {
      line([i, 0, -ARENA], [i, 0, ARENA], "rgba(255,255,255,0.07)");
      line([-ARENA, 0, i], [ARENA, 0, i], "rgba(255,255,255,0.07)");
    }
    // Franja de peligro naranja/negra en el borde
    const band = 0.38;
    const stepLen = 0.5;
    for (let side = 0; side < 4; side++) {
      for (let t = -ARENA, k = 0; t < ARENA - 0.001; t += stepLen, k++) {
        const t2 = Math.min(t + stepLen, ARENA);
        const quad = (
          [
            [t, 0.005, -ARENA],
            [t2, 0.005, -ARENA],
            [t2, 0.005, -ARENA + band],
            [t, 0.005, -ARENA + band],
          ] as Vec3[]
        ).map((p) => rotateY(p, (side * Math.PI) / 2));
        poly(quad, k % 2 === 0 ? `rgba(${ORANGE},0.85)` : "rgba(10,10,10,0.9)");
      }
    }
    // Circulo central: hace de semaforo (rojo, amarillo, verde) y luego late en naranja
    const col = countdownColor();
    const beforeGo = progress < TIMELINE.green + 0.05;
    const pulse = still ? 0.7 : beforeGo ? 0.75 + 0.2 * Math.sin(time * 0.008) : 0.45 + 0.25 * Math.sin(time * 0.003);
    if (beforeGo) {
      const [gx, gy, gz] = project([0, 0.01, 0]);
      const rr = (1.6 * focal) / gz;
      const halo = c2.createRadialGradient(gx, gy, 0, gx, gy, rr);
      halo.addColorStop(0, `rgba(${col},0.35)`);
      halo.addColorStop(1, `rgba(${col},0)`);
      c2.fillStyle = halo;
      c2.beginPath();
      c2.ellipse(gx, gy, rr, rr * 0.6, 0, 0, Math.PI * 2);
      c2.fill();
    }
    poly(circle3d([0, 0.006, 0], 1.3), null, `rgba(${col},${pulse})`, beforeGo ? 3 : 2);
    poly(circle3d([0, 0.006, 0], 0.9), null, "rgba(255,255,255,0.12)", 1);
    // Zonas de salida
    for (const sgn of [-1, 1]) {
      poly(
        [
          [sgn * 2.9, 0.006, -0.9],
          [sgn * 4.3, 0.006, -0.9],
          [sgn * 4.3, 0.006, 0.9],
          [sgn * 2.9, 0.006, 0.9],
        ],
        null,
        "rgba(255,255,255,0.18)",
      );
    }
  }

  // Reflectores en las 4 esquinas que barren el piso
  function drawLights(time: number, beams: boolean) {
    c2.save();
    c2.globalCompositeOperation = "lighter";
    for (let i = 0; i < 4; i++) {
      const sx = i < 2 ? -1 : 1;
      const sz = i % 2 === 0 ? -1 : 1;
      const lamp: Vec3 = [sx * (ARENA + 2.2), 6.5, sz * (ARENA + 2.2)];
      const a = (still ? 0 : time * 0.00035) + i * (Math.PI / 2);
      const spot: Vec3 = [Math.cos(a) * 2.2, 0, Math.sin(a) * 2.2];
      if (behind(lamp) || behind(spot)) continue;
      const [lx, ly] = project(lamp);
      const [px, py, pz] = project(spot);
      const rad = (2.2 * focal) / pz;
      if (beams) {
        const g = c2.createLinearGradient(lx, ly, px, py);
        g.addColorStop(0, "rgba(255,240,220,0.28)");
        g.addColorStop(1, "rgba(255,200,150,0)");
        const ang = Math.atan2(py - ly, px - lx) + Math.PI / 2;
        c2.beginPath();
        c2.moveTo(lx, ly);
        c2.lineTo(px + Math.cos(ang) * rad, py + Math.sin(ang) * rad * 0.6);
        c2.lineTo(px - Math.cos(ang) * rad, py - Math.sin(ang) * rad * 0.6);
        c2.closePath();
        c2.fillStyle = g;
        c2.fill();
        const s = c2.createRadialGradient(px, py, 0, px, py, rad);
        s.addColorStop(0, "rgba(255,230,200,0.16)");
        s.addColorStop(1, "rgba(255,230,200,0)");
        c2.fillStyle = s;
        c2.beginPath();
        c2.ellipse(px, py, rad, rad * 0.55, 0, 0, Math.PI * 2);
        c2.fill();
      } else {
        const h = c2.createRadialGradient(lx, ly, 0, lx, ly, 26);
        h.addColorStop(0, "rgba(255,255,255,0.95)");
        h.addColorStop(0.3, "rgba(255,220,180,0.45)");
        h.addColorStop(1, "rgba(255,200,150,0)");
        c2.fillStyle = h;
        c2.fillRect(lx - 26, ly - 26, 52, 52);
      }
    }
    c2.restore();
    if (!beams) {
      for (let i = 0; i < 4; i++) {
        const sx = i < 2 ? -1 : 1;
        const sz = i % 2 === 0 ? -1 : 1;
        line([sx * (ARENA + 2.2), 0, sz * (ARENA + 2.2)], [sx * (ARENA + 2.2), 6.5, sz * (ARENA + 2.2)], "rgba(120,120,130,0.35)", 2);
      }
    }
  }

  // Paredes de vidrio: las del fondo antes de los robots, las de enfrente despues
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
      const isFront = dot(sub(mid, cam), fwd) < dot(sub([0, WALL_H / 2, 0], cam), fwd);
      if (isFront !== front) continue;
      const at: Vec3 = [a[0], WALL_H, a[2]];
      const bt: Vec3 = [b[0], WALL_H, b[2]];
      poly([a, b, bt, at], "rgba(170,190,215,0.05)");
      line(at, bt, "rgba(255,255,255,0.35)", 1.5);
      line(a, at, "rgba(255,255,255,0.3)", 2);
    }
  }

  // ---- robots cuadrados ----
  /** Dibuja una caja con sombreado por cara (solo las caras que miran a la camara). */
  function drawBox(part: Part, toWorld: (l: Vec3) => Vec3, heading: number) {
    const [px, py, pz] = part.c;
    const [w, h, d] = part.h;
    const local: Vec3[] = [
      [px - w, py - h, pz - d],
      [px + w, py - h, pz - d],
      [px + w, py - h, pz + d],
      [px - w, py - h, pz + d],
      [px - w, py + h, pz - d],
      [px + w, py + h, pz - d],
      [px + w, py + h, pz + d],
      [px - w, py + h, pz + d],
    ];
    const v = local.map(toWorld);
    let frontVisible = false;
    for (const f of LOCAL_FACES) {
      const pts = f.idx.map((i) => v[i]!);
      const n = rotateY(f.n, heading);
      const fc: Vec3 = [(pts[0]![0] + pts[2]![0]) / 2, (pts[0]![1] + pts[2]![1]) / 2, (pts[0]![2] + pts[2]![2]) / 2];
      if (dot(n, sub(cam, fc)) <= 0) continue;
      if (f.n[2] === 1) frontVisible = true;
      const shade = 0.42 + 0.58 * Math.max(0, dot(n, LIGHT));
      poly(pts, f.n[1] === 1 && part.top ? part.top : part.color, "rgba(0,0,0,0.45)", 1);
      c2.globalAlpha = 1 - shade;
      poly(pts, "#000");
      c2.globalAlpha = 1;
    }
    part.after?.(toWorld, frontVisible);
  }

  /** Figura plana sobre la cara frontal (puntos locales en el plano z = zf). */
  function faceShape(toWorld: (l: Vec3) => Vec3, pts: [number, number][], zf: number, fill: string, glow = 0) {
    if (glow) {
      c2.save();
      c2.shadowColor = fill;
      c2.shadowBlur = glow;
    }
    poly(
      pts.map(([x, y]) => toWorld([x, y, zf])),
      fill,
    );
    if (glow) c2.restore();
  }

  function robotParts(s: RobotStyle, pose: Pose, ledLevel: number): Part[] {
    const jab = clamp(pose.jab, 0, 1.4);
    const cheer = pose.cheer;
    const arm = (sx: number): Part[] => {
      const lift = cheer * 0.42;
      const reach = jab * 0.16 * (1 - cheer);
      return [
        { c: [sx * 0.32, 0.59 + lift * 0.4, reach * 0.4], h: [0.065, 0.075, 0.08], color: s.body },
        {
          c: [sx * 0.33, 0.45 + lift + jab * 0.08, 0.03 + reach],
          h: [0.078, 0.065, 0.072],
          color: "#141518",
          top: "#2a2c31",
        },
      ];
    };
    const led = `rgba(${hexToRgb(s.led)},${ledLevel})`;
    return [
      // Base ancha con visera negra
      {
        c: [0, 0.13, 0],
        h: [0.5, 0.11, 0.46],
        color: s.body,
        after: (tw, front) => {
          if (!front) return;
          faceShape(tw, rect(0, 0.14, 0.42, 0.05), 0.462, "#060708");
          faceShape(tw, rect(0.2, 0.14, 0.025, 0.035), 0.463, "rgba(255,255,255,0.6)");
        },
      },
      { c: [0, 0.255, 0], h: [0.33, 0.02, 0.28], color: "#141518" },
      // Ruedas
      { c: [-0.56, 0.15, 0.05], h: [0.06, 0.15, 0.16], color: "#0f1012", top: "#22242a" },
      { c: [0.56, 0.15, 0.05], h: [0.06, 0.15, 0.16], color: "#0f1012", top: "#22242a" },
      // Cuello
      { c: [0, 0.32, 0], h: [0.09, 0.05, 0.08], color: s.bodyDark },
      // Torso con panel de tres barras LED
      {
        c: [0, 0.53, 0],
        h: [0.25, 0.18, 0.17],
        color: s.body,
        after: (tw, front) => {
          if (!front) return;
          faceShape(tw, rect(0, 0.53, 0.19, 0.125), 0.172, "#101114");
          for (const dy of [0.065, 0, -0.065]) faceShape(tw, rect(0, 0.53 + dy, 0.155, 0.021), 0.174, led, 14);
        },
      },
      ...arm(-1),
      ...arm(1),
      // Cabeza cuadrada
      {
        c: [0, 0.91, 0],
        h: [0.2, 0.15, 0.15],
        color: s.head,
        after: (tw, front) => {
          if (!front) return;
          if (s.face === "mustache") {
            faceShape(tw, rect(0, 0.945, 0.2, 0.009), 0.152, "#0c0d0f");
            for (const sx of [-1, 1]) {
              faceShape(tw, ring(sx * 0.088, 0.93, 0.07), 0.153, "#0c0d0f");
              faceShape(tw, ring(sx * 0.088, 0.93, 0.05), 0.154, "#f6f9ff", 12);
            }
            faceShape(
              tw,
              [
                [0, 0.852],
                [-0.035, 0.862],
                [-0.085, 0.856],
                [-0.11, 0.83],
                [-0.07, 0.838],
                [-0.03, 0.83],
                [0, 0.842],
                [0.03, 0.83],
                [0.07, 0.838],
                [0.11, 0.83],
                [0.085, 0.856],
                [0.035, 0.862],
              ],
              0.153,
              "#0c0d0f",
            );
          } else {
            faceShape(tw, rect(0, 0.93, 0.15, 0.05), 0.152, "#060708");
            for (const sx of [-1, 1]) faceShape(tw, rect(sx * 0.065, 0.93, 0.03, 0.02), 0.154, led, 12);
            faceShape(tw, rect(0, 0.84, 0.06, 0.01), 0.153, "#5d6573");
          }
        },
      },
      { c: [-0.11, 1.075, 0], h: [0.03, 0.025, 0.03], color: "#141518" },
      { c: [0.11, 1.075, 0], h: [0.03, 0.025, 0.03], color: "#141518" },
    ];
  }

  function balloonTop(pose: Pose, sway: number): Vec3 {
    return [pose.x + Math.sin(sway) * 0.18, 1.44 * BOT + pose.hop, pose.z];
  }

  function drawBalloon(s: RobotStyle, pose: Pose, sway: number) {
    const top = balloonTop(pose, sway);
    const [bx, by, bz] = project(top);
    const r = (0.22 * BOT * focal) / bz;
    line([pose.x, 1.06 * BOT + pose.hop, pose.z], [top[0], top[1] - 0.24 * BOT, top[2]], "rgba(240,240,240,0.7)", 1);
    const g = c2.createRadialGradient(bx - r * 0.35, by - r * 0.45, r * 0.1, bx, by, r * 1.2);
    g.addColorStop(0, "rgba(255,255,255,0.9)");
    g.addColorStop(0.2, s.balloon);
    g.addColorStop(1, s.balloon);
    c2.fillStyle = g;
    c2.beginPath();
    c2.ellipse(bx, by, r, r * 1.18, sway * 0.6, 0, Math.PI * 2);
    c2.fill();
    c2.beginPath();
    c2.moveTo(bx - r * 0.12, by + r * 1.15);
    c2.lineTo(bx + r * 0.12, by + r * 1.15);
    c2.lineTo(bx, by + r * 1.32);
    c2.closePath();
    c2.fill();
  }

  function drawRobot(s: RobotStyle, pose: Pose, balloon: boolean, leds: number, sway: number) {
    poly(circle3d([pose.x, 0.004, pose.z], 0.85 * BOT, 24), "rgba(0,0,0,0.55)");
    const toWorld = (l: Vec3): Vec3 => {
      const r = rotateY([l[0] * BOT, l[1] * BOT + pose.hop, l[2] * BOT], pose.heading);
      return [r[0] + pose.x, r[1], r[2] + pose.z];
    };
    // Las piezas mas lejanas primero (el brazo de atras queda detras del torso).
    const parts = robotParts(s, pose, leds)
      .map((p) => ({ p, d: project(toWorld(p.c))[2] }))
      .sort((a, b) => b.d - a.d);
    for (const { p } of parts) drawBox(p, toWorld, pose.heading);
    if (balloon) drawBalloon(s, pose, sway);
  }

  // ---- particulas ----
  function burst(at: Vec3, n: number, colors: string[], speed: number, upv: number, ttl: number, gravity = 9.8, drag = 0.98) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = rand(0.4, 1.2) * speed;
      sparks.push({
        p: at,
        prev: at,
        v: [Math.cos(a) * sp, rand(0.5, 1.5) * upv, Math.sin(a) * sp],
        life: 0,
        max: rand(0.6, 1.2) * ttl,
        color: colors[i % colors.length]!,
        gravity,
        drag,
      });
    }
  }

  function updateSparks(dt: number) {
    for (const s of sparks) {
      s.prev = s.p;
      s.v = [s.v[0] * s.drag, s.v[1] - s.gravity * dt, s.v[2] * s.drag];
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
    c2.save();
    c2.globalCompositeOperation = "lighter";
    for (const s of sparks) {
      c2.globalAlpha = 1 - s.life / s.max;
      line(s.prev, s.p, s.color, 2.2);
    }
    c2.restore();
  }

  function drawPopRing(now: number) {
    const age = (now - popAt) / 1000;
    if (age < 0 || age > 0.5) return;
    const [x, y, z] = project(popPos);
    const r = ((0.3 + age * 4) * focal) / z;
    c2.strokeStyle = `rgba(255,208,220,${0.8 - age * 1.6})`;
    c2.lineWidth = 3;
    c2.beginPath();
    c2.arc(x, y, r, 0, Math.PI * 2);
    c2.stroke();
  }

  // ---- bucle ----
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    c2.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const crossed = (at: number) => lastProgress < at && progress >= at;

  function step(now: number) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const t = now / 1000;
    lastProgress = progress;
    progress += (target - progress) * Math.min(1, dt * (still ? 30 : 6));
    if (Math.abs(target - progress) < 0.0005) progress = target;

    const { o, b } = choreography(progress, t, still);
    const popped = progress >= TIMELINE.pop;
    const swayO = still ? 0 : Math.sin(t * 1.7) * 0.15;
    const swayB = still ? 0 : Math.sin(t * 1.9 + 1) * 0.15;
    if (!popped) popPos = balloonTop(b, swayB);

    // Eventos al pasar por un momento de la pelea (solo hacia adelante)
    const mid: Vec3 = [(o.x + b.x) / 2, 0.45 * BOT, (o.z + b.z) / 2];
    if (crossed(TIMELINE.clash1) || crossed(TIMELINE.clash2)) burst(mid, 46, ["#ffd27a", "#ff9a2e", "#fff3c4"], 4.5, 4, 0.8);
    if (crossed(TIMELINE.pop)) {
      popAt = now;
      burst(popPos, 40, ["#ff3b6b", "#ffb3c6", "#ffffff"], 3.2, 2, 0.9);
    }
    if (progress > TIMELINE.winner && !still) {
      confettiTimer -= dt;
      if (confettiTimer <= 0) {
        burst([o.x, 2.6 * BOT, o.z], 14, ["#ff7a1a", "#2fd6f2", "#ffc61a", "#f2f8fa", "#b07a4a"], 1.8, 1.5, 2.2, 2.2, 0.97);
        confettiTimer = 0.3;
      }
    }
    updateSparks(dt);

    const winner = seg(progress, TIMELINE.pop, TIMELINE.winner + 0.04);
    const fx = lerp((o.x + b.x) / 2, o.x, winner);
    const fz = lerp((o.z + b.z) / 2, o.z, winner);
    focus = [lerp(focus[0], fx, Math.min(1, dt * 4)), 0.5, lerp(focus[2], fz, Math.min(1, dt * 4))];
    setCamera(now);
    drawSky(now);
    drawLights(now, false);
    drawFloor(now);
    drawLights(now, true);
    drawWalls(false);
    const bots = [
      { s: ORANGE_BOT, pose: o, balloon: true, leds: 0.9 + (still ? 0 : 0.1 * Math.sin(t * 6)), sway: swayO },
      { s: CYAN_BOT, pose: b, balloon: !popped, leds: popped ? 0.25 : 0.9 + (still ? 0 : 0.1 * Math.sin(t * 6.5)), sway: swayB },
    ].sort((x, y) => project([y.pose.x, 0, y.pose.z])[2] - project([x.pose.x, 0, x.pose.z])[2]);
    for (const bot of bots) drawRobot(bot.s, bot.pose, bot.balloon, bot.leds, bot.sway);
    drawSparks();
    drawPopRing(now);
    drawWalls(true);
    // Brillo bajo del color de quien va ganando (cian mientras pelean, naranja al ganar)
    const tint = c2.createLinearGradient(0, H, 0, H * 0.55);
    tint.addColorStop(0, `rgba(${popped ? ORANGE : CYAN},0.08)`);
    tint.addColorStop(1, "rgba(0,0,0,0)");
    c2.fillStyle = tint;
    c2.fillRect(0, H * 0.55, W, H * 0.45);
  }

  function loop(now: number) {
    step(now);
    raf = active ? requestAnimationFrame(loop) : 0;
  }

  resize();
  raf = requestAnimationFrame(loop);

  return {
    setProgress(p) {
      target = clamp(p);
      // La primera vez (p. ej. al recargar a media pagina) salta directo, sin recorrer la pelea.
      if (!snapped) {
        progress = lastProgress = target;
        snapped = true;
      }
      if (!active) step(performance.now());
    },
    setPointer(x, y) {
      pointer = still ? { x: 0, y: 0 } : { x, y };
    },
    resize() {
      resize();
      if (!active) step(performance.now());
    },
    setActive(next) {
      if (next === active) return;
      active = next;
      if (active) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      } else cancelAnimationFrame(raf);
    },
    dispose() {
      active = false;
      cancelAnimationFrame(raf);
    },
  };
}
