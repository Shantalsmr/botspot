import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/**
 * Arena 3D del inicio (three.js). La pelea esta guionizada y avanza con el scroll:
 * `setProgress(0..1)` decide donde esta cada robot, la camara, el semaforo y si el globo ya revento.
 * Subir el scroll la regresa. Los robots imitan a los de The Bot Spot: base redonda de color con
 * dos ruedas, torso gris con panel de hexagonos o LEDs, cabeza redonda con ojos tipo gafas, dos
 * brazos y un globo atado arriba (gana quien revienta el globo del otro).
 *
 * Linea de tiempo (progreso):
 *   0.00 preparados · 0.14 semaforo rojo → amarillo → verde (0.27) · 0.42 primer choque
 *   0.58 segundo choque · 0.70 el naranja revienta el globo azul · 0.78+ celebracion del ganador
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

const ARENA = 4; // medio lado del piso de la arena (metros "de escena")
const WALL_H = 1.25;
const BASE_R = 0.55;
const BALLOON_Y = 1.18;

// ---------- utilidades ----------
const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Progreso local de p dentro de [a, b], suavizado. */
const seg = (p: number, a: number, b: number) => smooth(clamp((p - a) / (b - a)));
const angleLerp = (a: number, b: number, t: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;

/** Generador pseudoaleatorio con semilla (las pelotas quedan siempre en el mismo lugar). */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Panel de hexagonos del pecho (como el de los robots reales). */
function hexTexture(color: string): THREE.CanvasTexture {
  return canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = "#2a2d31";
    ctx.fillRect(0, 0, 256, 256);
    const r = 22;
    const w = Math.sqrt(3) * r;
    ctx.fillStyle = color;
    for (let row = -1; row < 9; row++) {
      for (let col = -1; col < 8; col++) {
        const x = col * w + (row % 2 ? w / 2 : 0);
        const y = row * r * 1.5;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i + Math.PI / 6;
          ctx.lineTo(x + Math.cos(a) * (r - 4), y + Math.sin(a) * (r - 4));
        }
        ctx.closePath();
        ctx.fill();
      }
    }
  });
}

/** Panel de barras LED (robot azul). */
function ledTexture(): THREE.CanvasTexture {
  return canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = "#0b1426";
    ctx.fillRect(0, 0, 256, 256);
    ctx.shadowColor = "#7fb6ff";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#cfe3ff";
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) ctx.fillRect(34 + j * 66, 46 + i * 62, 54, 30);
    }
  });
}

// ---------- robot ----------
interface RobotStyle {
  base: string;
  torso: string;
  head: string;
  balloon: string;
  chest: "hex" | "led";
  chestColor: string;
}

class Robot {
  readonly group = new THREE.Group();
  private body = new THREE.Group();
  private armL = new THREE.Group();
  private armR = new THREE.Group();
  private wheelL: THREE.Mesh;
  private wheelR: THREE.Mesh;
  readonly balloon = new THREE.Group();
  private string: THREE.Line;
  private chestMat: THREE.MeshStandardMaterial;
  x = 0;
  z = 0;
  heading = 0;
  private wheelSpin = 0;

  constructor(style: RobotStyle) {
    const plastic = (color: string, rough = 0.45) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.05 });
    const dark = new THREE.MeshStandardMaterial({ color: "#151618", roughness: 0.7 });
    const metal = new THREE.MeshStandardMaterial({ color: "#b9bec6", roughness: 0.3, metalness: 0.85 });

    // Base redonda: aro de color + cubierta gris clara
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(BASE_R, BASE_R * 1.02, 0.13, 48), plastic(style.base, 0.4));
    ring.position.y = 0.11;
    ring.scale.z = 1.08;
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(BASE_R * 0.86, BASE_R * 0.86, 0.03, 48), plastic("#c9ccd1", 0.6));
    deck.position.y = 0.185;
    deck.scale.z = 1.08;
    // Ruedas
    const wheelGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.09, 24);
    wheelGeo.rotateZ(Math.PI / 2);
    this.wheelL = new THREE.Mesh(wheelGeo, dark);
    this.wheelR = new THREE.Mesh(wheelGeo, dark);
    this.wheelL.position.set(-BASE_R * 0.98, 0.16, 0);
    this.wheelR.position.set(BASE_R * 0.98, 0.16, 0);
    for (const w of [this.wheelL, this.wheelR]) {
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 12).rotateZ(Math.PI / 2), metal);
      w.add(hub);
    }

    // Torso con panel en el pecho
    const torso = new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.36, 0.34, 4, 0.06), plastic(style.torso, 0.5));
    torso.position.y = 0.39;
    this.chestMat = new THREE.MeshStandardMaterial({
      map: style.chest === "hex" ? hexTexture(style.chestColor) : ledTexture(),
      emissive: style.chest === "led" ? new THREE.Color("#5c8dff") : new THREE.Color("#000"),
      emissiveIntensity: style.chest === "led" ? 1.4 : 0,
      emissiveMap: style.chest === "led" ? ledTexture() : null,
      roughness: 0.5,
    });
    const chest = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.24), this.chestMat);
    chest.position.set(0, 0.39, 0.172);
    // Cuello y cabeza redonda
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.06, 16), dark);
    neck.position.y = 0.6;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 24), plastic(style.head, 0.35));
    head.position.y = 0.76;
    // Ojos tipo gafas
    for (const sx of [-1, 1]) {
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.07, 20).rotateX(Math.PI / 2), plastic("#a6abb3", 0.4));
      rim.position.set(sx * 0.075, 0.79, 0.17);
      const lens = new THREE.Mesh(
        new THREE.CircleGeometry(0.038, 20),
        new THREE.MeshStandardMaterial({ color: "#0d0f12", roughness: 0.15, metalness: 0.3 }),
      );
      lens.position.set(sx * 0.075, 0.79, 0.206);
      // Orejas / tornillos a los lados de la cabeza
      const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.09, 12), plastic("#8e939b", 0.4));
      ear.rotation.z = sx * -0.9;
      ear.position.set(sx * 0.19, 0.86, 0);
      this.body.add(rim, lens, ear);
    }
    // Brazos: varilla negra con martillo gris y una punta para reventar globos
    for (const [arm, sx] of [
      [this.armL, -1],
      [this.armR, 1],
    ] as const) {
      arm.position.set(sx * 0.25, 0.48, 0);
      const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), plastic("#8e939b"));
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.5, 8), dark);
      rod.position.y = 0.25;
      const hammer = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.08, 0.08, 2, 0.02), plastic("#9aa0a8"));
      hammer.position.y = 0.52;
      const pin = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.09, 6), metal);
      pin.position.set(0, 0.52, 0.08);
      pin.rotation.x = Math.PI / 2;
      arm.add(shoulder, rod, hammer, pin);
      arm.rotation.z = sx * -0.35;
    }

    // Globo con su hilo
    const balloonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 32, 24),
      new THREE.MeshPhysicalMaterial({
        color: style.balloon,
        roughness: 0.18,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
        sheen: 0.4,
        transparent: true,
        opacity: 0.92,
      }),
    );
    balloonMesh.scale.set(1, 1.18, 1);
    const knot = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.05, 8), balloonMesh.material);
    knot.position.y = -0.25;
    knot.rotation.x = Math.PI;
    this.balloon.add(balloonMesh, knot);
    this.balloon.position.y = BALLOON_Y;
    const stringGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.95, 0), new THREE.Vector3(0, BALLOON_Y - 0.27, 0)]);
    this.string = new THREE.Line(stringGeo, new THREE.LineBasicMaterial({ color: "#e8e8e8", transparent: true, opacity: 0.7 }));

    this.body.add(torso, chest, neck, head, this.armL, this.armR);
    this.group.add(ring, deck, this.wheelL, this.wheelR, this.body, this.balloon, this.string);
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
  }

  /** Coloca el robot. `swing` 0..1 sube los brazos (ataque); `tilt` inclina el cuerpo. */
  pose(x: number, z: number, heading: number, swing: number, tilt: number, bob: number) {
    const dist = Math.hypot(x - this.x, z - this.z);
    this.wheelSpin += dist / 0.16;
    this.x = x;
    this.z = z;
    this.heading = heading;
    this.group.position.set(x, 0, z);
    this.group.rotation.y = heading;
    this.wheelL.rotation.x = this.wheelSpin;
    this.wheelR.rotation.x = this.wheelSpin;
    this.body.position.y = bob;
    this.body.rotation.x = tilt;
    this.armL.rotation.x = -0.2 - swing * 1.4;
    this.armR.rotation.x = -0.2 - swing * 1.1;
  }

  setBalloon(visible: boolean, sway: number) {
    this.balloon.visible = visible;
    this.string.visible = visible;
    this.balloon.rotation.z = sway;
    this.balloon.position.x = Math.sin(sway) * 0.12;
  }

  /** Punto del globo en coordenadas del mundo. */
  balloonWorld(): THREE.Vector3 {
    return new THREE.Vector3(this.x, BALLOON_Y, this.z);
  }

  setVictory(amount: number) {
    this.armL.rotation.x = lerp(this.armL.rotation.x, -2.6, amount);
    this.armR.rotation.x = lerp(this.armR.rotation.x, -2.6, amount);
  }
}

// ---------- particulas ----------
let dotTex: THREE.CanvasTexture | null = null;
/** Punto redondo con brillo (las particulas no se ven como cuadritos). */
function dotTexture(): THREE.CanvasTexture {
  dotTex ??= canvasTexture(64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(255,255,255,0.85)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  });
  return dotTex;
}
class Particles {
  readonly points: THREE.Points;
  private pos: Float32Array;
  private col: Float32Array;
  private vel: Float32Array;
  private life: Float32Array;
  private max: Float32Array;
  private next = 0;

  constructor(
    private count: number,
    size: number,
    private gravity: number,
    private drag: number,
  ) {
    this.pos = new Float32Array(count * 3);
    this.col = new Float32Array(count * 3);
    this.vel = new Float32Array(count * 3);
    this.life = new Float32Array(count).fill(1);
    this.max = new Float32Array(count).fill(1);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(this.col, 3));
    this.points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size,
        map: dotTexture(),
        alphaTest: 0.01,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      }),
    );
    this.points.frustumCulled = false;
    for (let i = 0; i < count; i++) this.pos[i * 3 + 1] = -100;
  }

  emit(at: THREE.Vector3, n: number, colors: THREE.Color[], speed: number, up: number, ttl: number) {
    for (let k = 0; k < n; k++) {
      const i = this.next;
      this.next = (this.next + 1) % this.count;
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      this.pos.set([at.x, at.y, at.z], i * 3);
      this.vel.set([Math.cos(a) * s, up * (0.5 + Math.random()), Math.sin(a) * s], i * 3);
      const c = colors[Math.floor(Math.random() * colors.length)]!;
      this.col.set([c.r, c.g, c.b], i * 3);
      this.life[i] = 0;
      this.max[i] = ttl * (0.6 + Math.random() * 0.8);
    }
  }

  update(dt: number) {
    for (let i = 0; i < this.count; i++) {
      if (this.life[i]! >= this.max[i]!) {
        this.pos[i * 3 + 1] = -100;
        continue;
      }
      this.life[i]! += dt;
      const fade = 1 - this.life[i]! / this.max[i]!;
      this.vel[i * 3 + 1]! -= this.gravity * dt;
      for (let a = 0; a < 3; a++) {
        this.vel[i * 3 + a]! *= 1 - this.drag * dt;
        this.pos[i * 3 + a]! += this.vel[i * 3 + a]! * dt;
      }
      if (this.pos[i * 3 + 1]! < 0.02) {
        this.pos[i * 3 + 1] = 0.02;
        this.vel[i * 3 + 1]! *= -0.3;
      }
      for (let a = 0; a < 3; a++) this.col[i * 3 + a]! *= 0.985 + 0.015 * fade;
    }
    this.points.geometry.attributes.position!.needsUpdate = true;
    this.points.geometry.attributes.color!.needsUpdate = true;
  }
}

// ---------- coreografia ----------
interface BotPose {
  x: number;
  z: number;
  heading: number;
  swing: number;
  tilt: number;
}

const START = 2.7;

/** Posicion del robot naranja (o) y azul (b) segun el progreso. Determinista: el scroll manda. */
function choreography(p: number, t: number, still: boolean): { o: BotPose; b: BotPose } {
  const wobble = (k: number) => (still ? 0 : Math.sin(t * k));
  // 1) En sus lugares de salida, mirandose
  let o = { x: -START, z: 0 };
  let b = { x: START, z: 0 };
  // 2) Arrancan y chocan en el centro
  const charge = seg(p, TIMELINE.green + 0.01, TIMELINE.clash1);
  o.x = lerp(-START, -0.56, charge * charge);
  b.x = lerp(START, 0.56, charge * charge);
  o.z = Math.sin(charge * Math.PI) * 0.5;
  b.z = -Math.sin(charge * Math.PI) * 0.5;
  // 3) Rebote despues del choque
  const bounce = seg(p, TIMELINE.clash1, TIMELINE.clash1 + 0.05);
  o = { x: lerp(o.x, -1.6, bounce), z: lerp(o.z, 0.4, bounce) };
  b = { x: lerp(b.x, 1.6, bounce), z: lerp(b.z, -0.4, bounce) };
  // 4) Se rodean (orbita alrededor del centro) y vuelven a chocar
  const circle = seg(p, TIMELINE.clash1 + 0.05, TIMELINE.pop);
  if (circle > 0) {
    const theta = Math.PI - 0.25 + circle * 2.4;
    const inward = 1 - Math.exp(-Math.pow((p - TIMELINE.clash2) / 0.022, 2)) * 0.62; // se acercan en el choque 2
    const r = 1.65 * inward;
    const oc = { x: Math.cos(theta) * r, z: Math.sin(theta) * r };
    const bc = { x: -oc.x, z: -oc.z };
    o = { x: lerp(o.x, oc.x, Math.min(1, circle * 6)), z: lerp(o.z, oc.z, Math.min(1, circle * 6)) };
    b = { x: lerp(b.x, bc.x, Math.min(1, circle * 6)), z: lerp(b.z, bc.z, Math.min(1, circle * 6)) };
  }
  // 5) Flanqueo: el naranja se pone al lado del azul para alcanzar el globo
  const flank = seg(p, TIMELINE.clash2 + 0.03, TIMELINE.pop);
  if (flank > 0) {
    const toB = Math.atan2(b.x - o.x, b.z - o.z);
    const side = { x: b.x + Math.cos(toB) * 0.95, z: b.z - Math.sin(toB) * 0.95 };
    o = { x: lerp(o.x, side.x, flank), z: lerp(o.z, side.z, flank) };
  }
  // 6) Despues del globo: el azul sale disparado a una esquina, el naranja va al centro
  const after = seg(p, TIMELINE.pop, TIMELINE.winner + 0.04);
  const bCorner = { x: 2.9, z: 2.6 };
  b = { x: lerp(b.x, bCorner.x, after), z: lerp(b.z, bCorner.z, after) };
  o = { x: lerp(o.x, 0, after), z: lerp(o.z, 0.2, after) };

  // Orientacion: se miran entre ellos; el azul gira descontrolado al perder; el ganador da vueltas.
  const face = (me: { x: number; z: number }, foe: { x: number; z: number }) => Math.atan2(foe.x - me.x, foe.z - me.z);
  let oh = face(o, b);
  let bh = face(b, o);
  bh += after * Math.PI * 3;
  const victory = seg(p, TIMELINE.winner, 1);
  oh = angleLerp(oh, 0.35, after) + victory * Math.PI * 2;

  const fighting = p > TIMELINE.green && p < TIMELINE.pop + 0.02;
  const strike = Math.exp(-Math.pow((p - (TIMELINE.pop - 0.012)) / 0.012, 2));
  return {
    o: {
      ...o,
      heading: oh + wobble(3.1) * 0.04,
      swing: (fighting ? 0.35 + 0.35 * Math.max(0, wobble(9)) : 0.1) + strike * 0.9,
      tilt: (fighting ? 0.08 : 0) + strike * 0.25,
    },
    b: {
      ...b,
      heading: bh + wobble(2.7) * 0.04,
      swing: fighting ? 0.3 + 0.35 * Math.max(0, wobble(8.3)) : 0.1,
      tilt: after > 0 ? -0.25 * (1 - victory * 0.5) : fighting ? 0.08 : 0,
    },
  };
}

/** Camara: [progreso, posicion, objetivo]. */
const CAMERA_KEYS: [number, [number, number, number], [number, number, number]][] = [
  [0.0, [0.6, 6.4, 9.6], [0, 0.2, 0]],
  [0.2, [0, 4.6, 7.6], [0, 0.35, 0]],
  [0.36, [-3.2, 3.1, 5.6], [0, 0.4, 0]],
  [0.52, [3.6, 2.9, 4.6], [0, 0.45, 0]],
  [0.66, [2.9, 2.1, 3.9], [0.4, 0.6, 0]],
  [0.78, [0.6, 3.1, 6.2], [0.8, 0.5, 0.8]],
  [1.0, [-2.3, 2.3, 3.8], [0, 0.65, 0.2]],
];

function cameraAt(p: number): { pos: THREE.Vector3; target: THREE.Vector3 } {
  let i = 0;
  while (i < CAMERA_KEYS.length - 2 && p > CAMERA_KEYS[i + 1]![0]) i++;
  const [p0, a0, t0] = CAMERA_KEYS[i]!;
  const [p1, a1, t1] = CAMERA_KEYS[i + 1]!;
  const k = seg(p, p0, p1);
  return {
    pos: new THREE.Vector3(lerp(a0[0], a1[0], k), lerp(a0[1], a1[1], k), lerp(a0[2], a1[2], k)),
    target: new THREE.Vector3(lerp(t0[0], t1[0], k), lerp(t0[1], t1[1], k), lerp(t0[2], t1[2], k)),
  };
}

// ---------- escena ----------
export function createArenaScene(canvas: HTMLCanvasElement, opts: Options): ArenaScene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  const mobile = window.innerWidth < 760;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#050506");
  scene.fog = new THREE.Fog("#050506", 14, 30);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.35;

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);

  // Luces: principal con sombras, relleno y luces de color como en la arena real
  const hemi = new THREE.HemisphereLight("#ffe9d6", "#14100c", 0.5);
  const key = new THREE.DirectionalLight("#fff3e6", 2.4);
  key.position.set(3, 9, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  key.shadow.camera.left = -6;
  key.shadow.camera.right = 6;
  key.shadow.camera.top = 6;
  key.shadow.camera.bottom = -6;
  key.shadow.bias = -0.0005;
  const rimOrange = new THREE.PointLight("#ff7a00", 14, 12, 1.6);
  rimOrange.position.set(-4, 2.4, 2.5);
  const rimBlue = new THREE.PointLight("#3a7bff", 14, 12, 1.6);
  rimBlue.position.set(4, 2.4, -2.5);
  scene.add(hemi, key, rimOrange, rimBlue);

  // Piso del local, mueble negro y piso de la arena
  const venueFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: "#1b1b1d", roughness: 0.85 }),
  );
  venueFloor.rotation.x = -Math.PI / 2;
  venueFloor.position.y = -0.9;
  venueFloor.receiveShadow = true;
  const yellowLine = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 40), new THREE.MeshStandardMaterial({ color: "#e0b100", roughness: 0.6 }));
  yellowLine.rotation.x = -Math.PI / 2;
  yellowLine.rotation.z = 0.5;
  yellowLine.position.set(6.5, -0.895, 2);
  const cabinet = new THREE.Mesh(
    new THREE.BoxGeometry(ARENA * 2 + 0.5, 0.9, ARENA * 2 + 0.5),
    new THREE.MeshStandardMaterial({ color: "#0b0b0c", roughness: 0.6 }),
  );
  cabinet.position.y = -0.45;
  cabinet.receiveShadow = true;
  const floorTex = canvasTexture(1024, 1024, (ctx) => {
    ctx.fillStyle = "#17181b";
    ctx.fillRect(0, 0, 1024, 1024);
    // Rayones del piso (de tantas batallas)
    const rnd = seeded(7);
    for (let i = 0; i < 900; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${0.015 + rnd() * 0.05})`;
      ctx.lineWidth = rnd() * 1.4;
      const x = rnd() * 1024;
      const y = rnd() * 1024;
      const a = rnd() * Math.PI;
      const l = 20 + rnd() * 120;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + rnd() * 20, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
      ctx.stroke();
    }
    // Zonas de salida
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 4;
    ctx.strokeRect(70, 400, 150, 224);
    ctx.strokeRect(804, 400, 150, 224);
    ctx.beginPath();
    ctx.arc(512, 512, 120, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,122,0,0.55)";
    ctx.stroke();
  });
  const arenaFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(ARENA * 2, ARENA * 2),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.45, metalness: 0.35 }),
  );
  arenaFloor.rotation.x = -Math.PI / 2;
  arenaFloor.receiveShadow = true;
  scene.add(venueFloor, yellowLine, cabinet, arenaFloor);

  // Tira LED alrededor del piso (azul/morado como en las fotos)
  const ledMat = new THREE.MeshStandardMaterial({ color: "#3b4bff", emissive: "#4a3bff", emissiveIntensity: 2.2 });
  for (let i = 0; i < 4; i++) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(ARENA * 2, 0.025, 0.03), ledMat);
    strip.rotation.y = (i * Math.PI) / 2;
    const d = ARENA - 0.02;
    strip.position.set(i % 2 ? (i === 1 ? d : -d) : 0, 0.015, i % 2 ? 0 : i === 0 ? d : -d);
    scene.add(strip);
  }

  // Paredes de policarbonato con marco de aluminio y esquineros verdes
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: "#cfe0ff",
    roughness: 0.06,
    metalness: 0,
    transparent: true,
    opacity: 0.1,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const alu = new THREE.MeshStandardMaterial({ color: "#c3c8cf", roughness: 0.28, metalness: 0.9 });
  const green = new THREE.MeshStandardMaterial({ color: "#5cd65c", roughness: 0.45 });
  for (let i = 0; i < 4; i++) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(ARENA * 2, WALL_H), glassMat);
    const a = (i * Math.PI) / 2;
    wall.position.set(Math.sin(a) * ARENA, WALL_H / 2, Math.cos(a) * ARENA);
    wall.rotation.y = a;
    wall.renderOrder = 2;
    const rail = new THREE.Mesh(new THREE.BoxGeometry(ARENA * 2 + 0.1, 0.06, 0.06), alu);
    rail.position.set(Math.sin(a) * ARENA, WALL_H, Math.cos(a) * ARENA);
    rail.rotation.y = a;
    rail.castShadow = true;
    scene.add(wall, rail);
  }
  for (const sx of [-1, 0, 1]) {
    for (const sz of [-1, 0, 1]) {
      if (sx === 0 && sz === 0) continue;
      if (sx !== 0 && sz !== 0) {
        const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), green);
        bracket.position.set(sx * ARENA, 0.08, sz * ARENA);
        scene.add(bracket);
      }
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.07, WALL_H + 0.06, 0.07), alu);
      post.position.set(sx * ARENA, WALL_H / 2, sz * ARENA);
      post.castShadow = true;
      scene.add(post);
    }
  }

  // Pared de madera del local con la pantalla del logo
  const woodTex = canvasTexture(1024, 512, (ctx) => {
    for (let i = 0; i < 16; i++) {
      const l = 22 + Math.round(Math.random() * 10);
      ctx.fillStyle = `hsl(28, 38%, ${l}%)`;
      ctx.fillRect(i * 64, 0, 64, 512);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(i * 64, 0, 2, 512);
      for (let k = 0; k < 14; k++) {
        ctx.strokeStyle = `rgba(60,30,10,${0.08 + Math.random() * 0.12})`;
        ctx.beginPath();
        const x = i * 64 + Math.random() * 64;
        ctx.moveTo(x, 0);
        ctx.bezierCurveTo(x + 6, 170, x - 6, 340, x + 3, 512);
        ctx.stroke();
      }
    }
  });
  woodTex.wrapS = THREE.RepeatWrapping;
  woodTex.repeat.set(3, 1);
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(36, 9), new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.85 }));
  backWall.position.set(0, 3.6, -9);
  backWall.receiveShadow = true;
  const tvTex = canvasTexture(1024, 576, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 1024, 576);
    g.addColorStop(0, "#020613");
    g.addColorStop(1, "#06143a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1024, 576);
    ctx.textAlign = "center";
    ctx.shadowColor = "#2f8bff";
    ctx.shadowBlur = 30;
    ctx.fillStyle = "#e9f3ff";
    ctx.font = "italic 900 170px Arial Narrow, Arial, sans-serif";
    ctx.fillText("BOT SPOT", 512, 300);
    ctx.shadowColor = "#ff7a00";
    ctx.fillStyle = "#ffb15c";
    ctx.font = "italic 800 64px Arial Narrow, Arial, sans-serif";
    ctx.fillText("IT'S BATTLE TIME", 512, 410);
  });
  const tv = new THREE.Mesh(
    new THREE.PlaneGeometry(5.2, 2.9),
    new THREE.MeshStandardMaterial({ map: tvTex, emissive: "#ffffff", emissiveMap: tvTex, emissiveIntensity: 0.9 }),
  );
  tv.position.set(-1.5, 3.9, -8.95);
  const tvFrame = new THREE.Mesh(new THREE.BoxGeometry(5.4, 3.1, 0.1), new THREE.MeshStandardMaterial({ color: "#0a0a0a", roughness: 0.4 }));
  tvFrame.position.set(-1.5, 3.9, -9.02);
  scene.add(backWall, tvFrame, tv);

  // Semaforo de salida
  const lightPole = new THREE.Group();
  lightPole.position.set(-ARENA - 0.7, 0, -ARENA + 0.4);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 12), alu);
  pole.position.y = 1.2 - 0.9;
  pole.scale.y = 1.4;
  const housing = new THREE.Mesh(new RoundedBoxGeometry(0.38, 1.0, 0.32, 3, 0.05), new THREE.MeshStandardMaterial({ color: "#111", roughness: 0.5 }));
  housing.position.y = 2.1;
  const lampColors = ["#ff2a1a", "#ffc21a", "#2bff5e"];
  const lamps = lampColors.map((c, i) => {
    const m = new THREE.MeshStandardMaterial({ color: "#222", emissive: c, emissiveIntensity: 0 });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 16), m);
    lamp.position.set(0, 2.42 - i * 0.31, 0.15);
    lightPole.add(lamp);
    return m;
  });
  const signal = new THREE.PointLight("#ff2a1a", 0, 5, 2);
  signal.position.set(0.4, 2.1, 0.6);
  lightPole.add(pole, housing, signal);
  lightPole.rotation.y = 0.75;
  scene.add(lightPole);

  // Pelotas de colores regadas en la arena
  const rnd = seeded(42);
  const ballColors = ["#ff3b3b", "#2ee66b", "#ffd21a", "#3b8bff", "#ff5fd2", "#ff8c1a"];
  const balls = Array.from({ length: mobile ? 12 : 18 }, (_, i) => {
    const r = 0.08 + rnd() * 0.05;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(r, 20, 14),
      new THREE.MeshStandardMaterial({ color: ballColors[i % ballColors.length], roughness: 0.35 }),
    );
    let x = 0;
    let z = 0;
    do {
      x = (rnd() * 2 - 1) * (ARENA - 0.4);
      z = (rnd() * 2 - 1) * (ARENA - 0.4);
    } while (Math.abs(z) < 1.4 && Math.abs(x) > 1.6); // fuera de las zonas de salida
    mesh.position.set(x, r, z);
    mesh.castShadow = true;
    scene.add(mesh);
    return { mesh, r, vx: 0, vz: 0, home: new THREE.Vector3(x, r, z) };
  });

  // Robots: naranja (gana) y azul
  const orange = new Robot({ base: "#ff6a00", torso: "#9ea3aa", head: "#ff7a00", balloon: "#ff2d2d", chest: "hex", chestColor: "#ff7a00" });
  const blue = new Robot({ base: "#1f5fff", torso: "#e9edf2", head: "#2f6bff", balloon: "#2f8bff", chest: "led", chestColor: "#5c8dff" });
  scene.add(orange.group, blue.group);

  // Chispas, pedazos de globo y confeti
  const sparks = new Particles(mobile ? 260 : 420, 0.06, 6, 1.2);
  const confetti = new Particles(mobile ? 220 : 380, 0.09, 2.2, 1.6);
  (confetti.points.material as THREE.PointsMaterial).blending = THREE.NormalBlending;
  scene.add(sparks.points, confetti.points);
  const sparkColors = [new THREE.Color("#ffd27a"), new THREE.Color("#ff9a2e"), new THREE.Color("#fff3c4")];
  const popColors = [new THREE.Color("#2f8bff"), new THREE.Color("#8cc4ff"), new THREE.Color("#ffffff")];
  const confettiColors = ["#ff7a00", "#ffd21a", "#2ee66b", "#3b8bff", "#ff5fd2", "#ffffff"].map((c) => new THREE.Color(c));
  const popRing = new THREE.Mesh(
    new THREE.RingGeometry(0.2, 0.26, 40),
    new THREE.MeshBasicMaterial({ color: "#bfe0ff", transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
  );
  scene.add(popRing);
  let popAge = 10;

  // ---------- estado ----------
  let target = 0;
  let progress = 0;
  let lastProgress = 0;
  let pointer = { x: 0, y: 0 };
  let active = true;
  let raf = 0;
  let last = performance.now();
  let confettiTimer = 0;
  let zoomOut = 1;
  const still = opts.reducedMotion;

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const shift = opts.offsetRight();
    const down = opts.offsetDown();
    if (shift || down) camera.setViewOffset(w, h, -w * shift, -h * down, w, h);
    else camera.clearViewOffset();
    // En pantallas angostas o verticales la camara se aleja para que quepan los dos robots.
    zoomOut = clamp(1.5 / camera.aspect, 1, 2.1);
    camera.fov = 38;
    camera.updateProjectionMatrix();
  }

  function crossed(at: number) {
    return lastProgress < at && progress >= at;
  }

  function step(now: number) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const t = now / 1000;
    lastProgress = progress;
    // El progreso sigue al scroll con suavidad (mas rapido si el salto es grande).
    progress += (target - progress) * Math.min(1, dt * (still ? 30 : 6));
    if (Math.abs(target - progress) < 0.0005) progress = target;

    const { o, b } = choreography(progress, t, still);
    const bob = (k: number) => (still ? 0 : Math.sin(t * k) * 0.012);
    orange.pose(o.x, o.z, o.heading, o.swing, o.tilt, bob(5.1));
    blue.pose(b.x, b.z, b.heading, b.swing, b.tilt, bob(4.7));
    const victory = seg(progress, TIMELINE.winner, TIMELINE.winner + 0.08);
    orange.setVictory(victory);
    orange.setBalloon(true, still ? 0 : Math.sin(t * 1.7) * 0.12);
    blue.setBalloon(progress < TIMELINE.pop, still ? 0 : Math.sin(t * 1.9 + 1) * 0.12);

    // Eventos al pasar por un momento de la pelea (solo hacia adelante)
    const mid = new THREE.Vector3((o.x + b.x) / 2, 0.45, (o.z + b.z) / 2);
    if (crossed(TIMELINE.clash1) || crossed(TIMELINE.clash2)) sparks.emit(mid, mobile ? 70 : 110, sparkColors, 3.2, 3.5, 0.8);
    if (crossed(TIMELINE.pop)) {
      const at = blue.balloonWorld();
      sparks.emit(at, 90, popColors, 2.6, 1.5, 0.9);
      popRing.position.copy(at);
      popAge = 0;
    }
    if (progress < TIMELINE.pop) popAge = 10;
    popAge += dt;
    popRing.lookAt(camera.position);
    popRing.scale.setScalar(1 + popAge * 9);
    (popRing.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.8 - popAge * 2.4);

    if (progress > TIMELINE.winner && !still) {
      confettiTimer -= dt;
      if (confettiTimer <= 0) {
        confetti.emit(new THREE.Vector3(orange.x, 2.2, orange.z), 26, confettiColors, 1.6, 2.2, 2.4);
        confettiTimer = 0.35;
      }
    }
    sparks.update(dt);
    confetti.update(dt);

    // Pelotas: los robots las empujan
    for (const ball of balls) {
      for (const bot of [orange, blue]) {
        const dx = ball.mesh.position.x - bot.x;
        const dz = ball.mesh.position.z - bot.z;
        const d = Math.hypot(dx, dz);
        const min = BASE_R * 1.05 + ball.r;
        if (d < min && d > 0.0001) {
          const push = (min - d) / d;
          ball.mesh.position.x += dx * push;
          ball.mesh.position.z += dz * push;
          ball.vx += (dx / d) * 1.8;
          ball.vz += (dz / d) * 1.8;
        }
      }
      ball.vx *= 1 - Math.min(1, dt * 1.6);
      ball.vz *= 1 - Math.min(1, dt * 1.6);
      ball.mesh.position.x += ball.vx * dt;
      ball.mesh.position.z += ball.vz * dt;
      const lim = ARENA - ball.r - 0.03;
      if (Math.abs(ball.mesh.position.x) > lim) {
        ball.mesh.position.x = Math.sign(ball.mesh.position.x) * lim;
        ball.vx *= -0.6;
      }
      if (Math.abs(ball.mesh.position.z) > lim) {
        ball.mesh.position.z = Math.sign(ball.mesh.position.z) * lim;
        ball.vz *= -0.6;
      }
      ball.mesh.rotation.x += (ball.vz * dt) / ball.r;
      ball.mesh.rotation.z -= (ball.vx * dt) / ball.r;
    }
    // Al volver al inicio, las pelotas regresan a su lugar.
    if (progress < 0.05) for (const ball of balls) ball.mesh.position.lerp(ball.home, Math.min(1, dt * 2));

    // Semaforo
    const state = progress < TIMELINE.yellow ? 0 : progress < TIMELINE.green ? 1 : 2;
    lamps.forEach((m, i) => {
      m.emissiveIntensity = i === state ? 3.2 : 0.05;
    });
    signal.color.set(lampColors[state]!);
    signal.intensity = 6;

    // Camara
    const cam = cameraAt(progress);
    cam.pos.sub(cam.target).multiplyScalar(zoomOut).add(cam.target);
    const sway = still ? 0 : Math.sin(t * 0.25) * 0.25;
    camera.position.set(cam.pos.x + sway + pointer.x * 0.6, cam.pos.y + pointer.y * 0.3, cam.pos.z);
    camera.lookAt(cam.target);

    // Luces de color laten un poco
    rimOrange.intensity = 12 + (still ? 0 : Math.sin(t * 2) * 2);
    rimBlue.intensity = progress > TIMELINE.pop ? lerp(14, 5, seg(progress, TIMELINE.pop, TIMELINE.winner)) : 12;

    renderer.render(scene, camera);
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
      cancelAnimationFrame(raf);
      active = false;
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Points || o instanceof THREE.Line) {
          o.geometry.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of mats) {
            for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose();
            m.dispose();
          }
        }
      });
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
