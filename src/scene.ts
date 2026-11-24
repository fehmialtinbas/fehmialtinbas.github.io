// A stylised hot strip mill. The material runs along +X:
// reheating furnace (x≈0) → roughing mill R1 → finishing stands F1–F5 → laminar cooling → down coiler → coil yard.
// Scroll progress p (0 … sections-1) drives the camera and how far the material has travelled.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export interface MillOptions {
  reducedMotion: boolean;
  lowPower: boolean;
  /** Which side each section's text panel sits on, so the view can shift the action to the free side. */
  sides: ('left' | 'right')[];
}

export interface MillScene {
  setProgress(p: number): void;
  setPointer(x: number, y: number): void;
  start(onFirstFrame: () => void): void;
}

// ---------------------------------------------------------------- layout
const TABLE_Y = 0.8; // top of the roller table
const PASS_Y = TABLE_Y + 0.04; // centre line of the strip
const FURNACE_EXIT = 5;
const R1 = 16;
const STANDS = [30, 33, 36, 39, 42];
const COOL_START = 48;
const COOL_END = 62;
const COILER = 70;
const COIL_Y = 1.35;
const PULPIT = { x: 36, z: -7.6, floor: 4.4, roof: 8.0 };

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// Camera position and look-at target for each section (same order as content.ts).
const KEYS: [THREE.Vector3, THREE.Vector3][] = [
  [v(12.5, 2.1, 7.8), v(4.6, 1.3, 0)], // start: slab leaving the furnace
  [v(-12.5, 5.2, 12), v(-1.5, 1.8, 0)], // furnace, charging side with cold slabs
  [v(21, 2.9, 7.2), v(15.6, 1.5, 0)], // roughing mill
  [v(36.5, 7.2, 14.5), v(36, 1.8, 0)], // finishing stands
  [v(35, 6.9, 3.4), v(36, 5.9, -8)], // over the finishing stands, looking into the control pulpit
  [v(56, 7.2, 9.8), v(55, 0.8, 0)], // laminar cooling
  [v(73.8, 2.7, 6.8), v(69.5, 1.3, 0)], // down coiler
  [v(20, 15, 31), v(42, 0, -3)], // overview of the whole line
];

// ---------------------------------------------------------------- helpers
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
const seg = (p: number, a: number, b: number) => smooth((p - a) / (b - a));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rand = (a: number, b: number) => a + Math.random() * (b - a);

function hdr(hex: number, k: number) {
  return new THREE.Color(hex).multiplyScalar(k);
}

// Hot steel: bright scale-mottled orange that cools to dark grey along X (or a fixed heat for the coil).
function hotMaterial(heat = -1, rings = false, axis = new THREE.Vector2()) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uHeat: { value: heat },
      uCool: { value: new THREE.Vector2(COOL_START, COOL_END) },
      uRings: { value: rings ? 1 : 0 },
      uAxis: { value: axis },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      varying vec3 vNormalW;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uHeat;
      uniform vec2 uCool;
      uniform float uRings;
      uniform vec2 uAxis;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }
      void main() {
        float heat = uHeat >= 0.0 ? uHeat : 1.0 - smoothstep(uCool.x, uCool.y, vWorld.x);
        vec2 q = vWorld.xz + vWorld.yy * 0.7;
        float n = noise(q * 2.6 + vec2(uTime * 0.12, 0.0)) * 0.6 + noise(q * 9.0) * 0.4;
        // Blackbody-ish: as it cools the glow gets dimmer and redder, never beige.
        float h = clamp(heat, 0.0, 1.0);
        vec3 glowLow = vec3(0.75, 0.08, 0.01);
        vec3 glowHigh = mix(vec3(1.0, 0.34, 0.06), vec3(1.0, 0.72, 0.30), n);
        vec3 glow = mix(glowLow, glowHigh, smoothstep(0.35, 0.95, h));
        float intensity = pow(h, 1.6) * (1.2 + 1.3 * h) * (0.7 + 0.3 * smoothstep(0.2, 0.65, n));
        float light = 0.35 + 0.65 * max(dot(normalize(vNormalW), normalize(vec3(0.3, 1.0, 0.45))), 0.0);
        vec3 cold = vec3(0.11, 0.115, 0.13) * light * (1.0 - 0.6 * h) + vec3(0.04, 0.02, 0.01) * n;
        vec3 col = cold + glow * intensity;
        if (uRings > 0.5) {
          float d = length(vWorld.xy - uAxis);
          col *= 0.78 + 0.22 * smoothstep(0.25, 0.75, fract(d * 20.0));
        }
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

function textTexture(draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  draw(g, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function plateTexture(label: string) {
  return textTexture(
    (g, w, h) => {
      g.fillStyle = '#121417';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#e8b21c';
      g.lineWidth = 8;
      g.strokeRect(6, 6, w - 12, h - 12);
      g.fillStyle = '#f2c230';
      g.font = '700 78px "JetBrains Mono", Menlo, monospace';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(label, w / 2, h / 2 + 4);
    },
    256,
    128,
  );
}

// Screens inside the control pulpit: a production program, a Gantt view and the line status.
function screenTexture(kind: 0 | 1 | 2) {
  return textTexture(
    (g, w, h) => {
      g.fillStyle = '#0a1220';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#132238';
      g.fillRect(0, 0, w, 40);
      g.fillStyle = '#8fc3ff';
      g.font = '600 20px "JetBrains Mono", Menlo, monospace';
      const titles = ['PRODUCTION PROGRAM', 'SCHEDULE  ·  HSM', 'LINE STATUS  ·  L3'];
      g.fillText(titles[kind], 16, 27);
      g.font = '16px "JetBrains Mono", Menlo, monospace';
      if (kind === 0) {
        const rows = [
          ['PRG-1187', '32 slabs', 'READY'],
          ['PRG-1188', '28 slabs', 'SENT'],
          ['PRG-1189', '30 slabs', 'ACK ✓'],
          ['PRG-1190', '26 slabs', 'PLANNED'],
          ['PRG-1191', '34 slabs', 'PLANNED'],
          ['PRG-1192', '22 slabs', 'DRAFT'],
        ];
        rows.forEach((r, i) => {
          const y = 76 + i * 38;
          g.fillStyle = i === 2 ? 'rgba(255,122,26,0.18)' : i % 2 ? 'rgba(255,255,255,0.03)' : 'transparent';
          g.fillRect(8, y - 24, w - 16, 34);
          g.fillStyle = '#d7e3f5';
          g.fillText(r[0], 18, y);
          g.fillStyle = '#7f93ad';
          g.fillText(r[1], 190, y);
          g.fillStyle = r[2] === 'ACK ✓' ? '#7ee787' : r[2] === 'SENT' ? '#ffb347' : '#8fc3ff';
          g.fillText(r[2], 360, y);
        });
      } else if (kind === 1) {
        for (let i = 0; i < 7; i++) {
          const y = 62 + i * 36;
          g.fillStyle = '#5d6f88';
          g.fillText(`S${24 + i}`, 14, y + 14);
          let x = 70;
          for (let k = 0; k < 4; k++) {
            const len = 40 + ((i * 37 + k * 53) % 70);
            g.fillStyle = (i + k) % 3 === 0 ? '#ff7a1a' : (i + k) % 3 === 1 ? '#2f81f7' : '#3fb950';
            g.globalAlpha = 0.85;
            g.fillRect(x, y, len, 20);
            g.globalAlpha = 1;
            x += len + 10;
          }
        }
        g.strokeStyle = '#ff7a1a';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(300, 46);
        g.lineTo(300, h - 8);
        g.stroke();
      } else {
        const labels = ['FCE', 'R1', 'F1', 'F2', 'F3', 'F4', 'F5', 'LC', 'DC'];
        labels.forEach((t, i) => {
          const x = 24 + i * 54;
          g.fillStyle = i < 7 ? '#ff7a1a' : '#2f81f7';
          g.fillRect(x, 120, 40, 40);
          g.fillStyle = '#0a1220';
          g.font = '600 15px "JetBrains Mono", Menlo, monospace';
          g.fillText(t, x + 4, 146);
        });
        g.fillStyle = '#7ee787';
        g.font = '18px "JetBrains Mono", Menlo, monospace';
        g.fillText('L3 LINK  ● ONLINE', 24, 214);
        g.fillStyle = '#d7e3f5';
        g.fillText('STRIP  2.8 mm  ·  1 520 mm', 24, 250);
        g.fillText('FDT  880 °C  ·  CT  590 °C', 24, 282);
      }
    },
    512,
    320,
  );
}

// Soft round sprites for embers and cooling water.
function pointsMaterial(color: THREE.Color, size: number) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: color }, uSize: { value: size } },
    vertexShader: /* glsl */ `
      attribute float aAlpha;
      uniform float uSize;
      varying float vAlpha;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = min(uSize / -mv.z, 14.0);
        vAlpha = aAlpha;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vAlpha;
        gl_FragColor = vec4(uColor * a, a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

// ---------------------------------------------------------------- scene
export function createMillScene(canvas: HTMLCanvasElement, opts: MillOptions): MillScene {
  const { lowPower, reducedMotion } = opts;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, powerPreference: 'high-performance' });
  const dpr = Math.min(window.devicePixelRatio || 1, lowPower ? 1.25 : 1.75);
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;

  const scene = new THREE.Scene();
  const BG = 0x07090d;
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.FogExp2(BG, 0.016);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.28;

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 400);

  // materials
  const M = {
    floor: new THREE.MeshStandardMaterial({ color: 0x0f1216, roughness: 0.92, metalness: 0.1 }),
    housing: new THREE.MeshStandardMaterial({ color: 0x27344a, roughness: 0.5, metalness: 0.55 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.7, metalness: 0.5 }),
    roll: new THREE.MeshStandardMaterial({ color: 0x9aa3ae, roughness: 0.28, metalness: 0.95 }),
    refractory: new THREE.MeshStandardMaterial({ color: 0x4a3a32, roughness: 0.9, metalness: 0.05 }),
    yellow: new THREE.MeshStandardMaterial({ color: 0xe0a81a, roughness: 0.55, metalness: 0.3 }),
    pipe: new THREE.MeshStandardMaterial({ color: 0x3d5370, roughness: 0.45, metalness: 0.6 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x9cc8ff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }),
    glow: new THREE.MeshBasicMaterial({ color: hdr(0xff6a1a, 2.6) }),
    ember: new THREE.MeshBasicMaterial({ color: hdr(0xff8a2a, 2.0) }),
    paint: new THREE.MeshBasicMaterial({ color: 0x6b5410 }),
    ceilingLight: new THREE.MeshBasicMaterial({ color: hdr(0xbcd8ff, 1.6) }),
    deskScreen: new THREE.MeshBasicMaterial({ color: hdr(0x4f8fe0, 1.2) }),
    slit: new THREE.MeshBasicMaterial({ color: hdr(0xff5a14, 2.2) }),
    lamp: new THREE.MeshBasicMaterial({ color: hdr(0xdfe9ff, 2.4) }),
  };

  const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = scene) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  // Cylinder lying along Z (rolls, spindles, coils).
  const cylZ = (r: number, len: number, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = scene, seg = 28) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
    m.rotation.x = Math.PI / 2;
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };

  // ---- hall
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(220, 90), M.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(35, 0, 0);
  scene.add(floor);
  const grid = new THREE.GridHelper(220, 110, 0x1e2633, 0x141922);
  grid.position.set(35, 0.005, 0);
  (grid.material as THREE.Material).transparent = true;
  (grid.material as THREE.Material).opacity = 0.55;
  scene.add(grid);
  for (const z of [-3.1, 3.1]) box(78, 0.01, 0.14, M.paint, 34, 0.012, z); // walkway lines

  const colGeo = new THREE.BoxGeometry(0.9, 13, 0.9);
  const colXs: number[] = [];
  for (let x = -16; x <= 86; x += 9) colXs.push(x);
  const cols = new THREE.InstancedMesh(colGeo, M.dark, colXs.length * 2);
  const tmp = new THREE.Object3D();
  colXs.forEach((x, i) => {
    [-14.5, 14.5].forEach((z, k) => {
      tmp.position.set(x, 6.5, z);
      tmp.updateMatrix();
      cols.setMatrixAt(i * 2 + k, tmp.matrix);
    });
  });
  scene.add(cols);
  for (const z of [-14.5, 14.5]) box(104, 0.8, 0.7, M.dark, 35, 12.2, z); // crane runway
  box(1.3, 1.1, 29.5, M.yellow, 58, 12.8, 0); // overhead crane bridge
  box(2.2, 1.4, 2.6, M.yellow, 58, 12.1, 4.5); // trolley
  box(0.06, 2.4, 0.06, M.dark, 58, 10.2, 4.5); // hoist rope
  box(0.9, 0.5, 0.9, M.yellow, 58, 8.9, 4.5); // hook block
  // high-bay lamps
  const lampXs: number[] = [];
  for (let x = -12; x <= 84; x += 12) lampXs.push(x);
  const lamps = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.45, 0.6, 0.18, 16), M.lamp, lampXs.length * 2);
  lampXs.forEach((x, i) => {
    [-7, 7].forEach((z, k) => {
      tmp.position.set(x, 11.2, z);
      tmp.rotation.set(0, 0, 0);
      tmp.updateMatrix();
      lamps.setMatrixAt(i * 2 + k, tmp.matrix);
    });
  });
  scene.add(lamps);

  // ---- roller table (skips the stands and the furnace)
  const rollerXs: number[] = [];
  for (let x = 5.6; x <= COILER - 1.6; x += 0.72) {
    const nearStand = [R1, ...STANDS].some((s) => Math.abs(x - s) < 1.05);
    if (!nearStand) rollerXs.push(x);
  }
  const rollers = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.17, 0.17, 2.2, 14), M.roll, rollerXs.length);
  rollerXs.forEach((x, i) => {
    tmp.position.set(x, TABLE_Y - 0.17, 0);
    tmp.rotation.set(Math.PI / 2, 0, 0);
    tmp.updateMatrix();
    rollers.setMatrixAt(i, tmp.matrix);
  });
  scene.add(rollers);
  for (const z of [-1.25, 1.25]) box(COILER - 7, 0.5, 0.18, M.dark, (5.4 + COILER - 1.6) / 2, TABLE_Y - 0.4, z);

  // ---- reheating furnace
  const furnace = new THREE.Group();
  scene.add(furnace);
  box(10, 4.6, 6.4, M.refractory, 0, 2.3, 0, furnace);
  for (let x = -4.5; x <= 4.5; x += 1.5) box(0.16, 4.7, 6.5, M.dark, x, 2.35, 0, furnace); // steel bands
  for (let x = -3.75; x <= 3.8; x += 1.5) for (const z of [-3.21, 3.21]) box(0.3, 0.07, 0.02, M.slit, x, 2.5, z, furnace); // peep holes
  const charge = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.7), M.slit);
  charge.rotation.y = -Math.PI / 2;
  charge.position.set(-5.02, 0.9, 0);
  furnace.add(charge); // charging door glow
  box(10.2, 0.3, 6.6, M.dark, 0, 4.65, 0, furnace);
  box(0.5, 3.0, 3.4, M.dark, FURNACE_EXIT + 0.1, 1.5, 0, furnace).scale.set(1, 1, 1); // door frame
  const mouth = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.1), M.glow);
  mouth.rotation.y = Math.PI / 2;
  mouth.position.set(FURNACE_EXIT + 0.36, 1.05, 0);
  furnace.add(mouth);
  box(0.35, 1.2, 2.8, M.dark, FURNACE_EXIT + 0.45, 2.35, 0, furnace); // lifted door
  const burnerTips = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 8, 6), M.ember, 28);
  let b = 0;
  for (let x = -4; x <= 4; x += 1.35) {
    for (const [y, z] of [[3.4, 3.22], [1.6, 3.22], [3.4, -3.22], [1.6, -3.22]] as const) {
      if (b >= 28) break;
      tmp.position.set(x, y, z);
      tmp.rotation.set(0, 0, 0);
      tmp.updateMatrix();
      burnerTips.setMatrixAt(b++, tmp.matrix);
    }
  }
  burnerTips.count = b;
  furnace.add(burnerTips);
  const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, 9, 20), M.dark);
  stack.position.set(-3, 9, -2.2);
  furnace.add(stack);
  for (let i = 0; i < 4; i++) box(2.6, 0.28, 1.4, M.dark, -7.4, 0.14 + i * 0.3, 0, furnace); // cold slabs waiting to be charged

  // ---- mill stands
  const rolls: THREE.Mesh[] = [];
  function stand(x: number, label: string, big: boolean) {
    const g = new THREE.Group();
    g.position.x = x;
    scene.add(g);
    const h = big ? 6.2 : 5.2;
    const r = big ? 0.3 : 0.22;
    const backup = big ? 0.62 : 0.5;
    const gap = 0.08;
    for (const z of [-1.8, 1.8]) box(0.8, h, 0.9, M.housing, 0, h / 2, z, g);
    box(0.9, 0.8, 4.5, M.housing, 0, h - 0.4, 0, g);
    const topWork = PASS_Y + gap / 2 + r;
    const botWork = PASS_Y - gap / 2 - r;
    rolls.push(cylZ(r, 3, M.roll, 0, topWork, 0, g));
    rolls.push(cylZ(r, 3, M.roll, 0, botWork, 0, g));
    cylZ(backup, 2.8, M.roll, 0, topWork + r + backup, 0, g);
    cylZ(backup, 2.8, M.roll, 0, botWork - r - backup, 0, g);
    // drive side: spindles and motor
    cylZ(0.12, 3.4, M.dark, 0, topWork, -3.4, g, 12);
    cylZ(0.12, 3.4, M.dark, 0, botWork, -3.4, g, 12);
    box(1.6, 1.8, 1.8, M.housing, 0, 1.1, -5.8, g);
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.55), new THREE.MeshBasicMaterial({ map: plateTexture(label) }));
    plate.position.set(0, h - 0.4, 2.27);
    g.add(plate);
  }
  stand(R1, 'R1', true);
  STANDS.forEach((x, i) => stand(x, `F${i + 1}`, false));

  // ---- control pulpit: glass control room beside the finishing mill, video wall facing the line
  const pulpit = new THREE.Group();
  pulpit.position.set(PULPIT.x, 0, PULPIT.z);
  scene.add(pulpit);
  const pw = 8.4;
  const pd = 4.2;
  const ph = PULPIT.roof - PULPIT.floor;
  for (const x of [-pw / 2, pw / 2]) for (const z of [-pd / 2, pd / 2]) box(0.3, PULPIT.floor, 0.3, M.dark, x, PULPIT.floor / 2, z, pulpit);
  box(pw + 0.4, 0.3, pd + 0.4, M.dark, 0, PULPIT.floor, 0, pulpit);
  box(pw + 0.4, 0.25, pd + 0.4, M.dark, 0, PULPIT.roof, 0, pulpit);
  box(pw + 0.4, ph, 0.2, M.housing, 0, PULPIT.floor + ph / 2, -pd / 2, pulpit); // back wall
  for (const x of [-pw / 2, pw / 2]) box(0.2, ph, pd, M.housing, x, PULPIT.floor + ph / 2, 0, pulpit); // side walls
  for (const x of [-pw / 2, pw / 2]) box(0.12, ph, 0.12, M.dark, x, PULPIT.floor + ph / 2, pd / 2, pulpit); // window frame
  const front = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph - 0.2), M.glass);
  front.position.set(0, PULPIT.floor + ph / 2, pd / 2);
  pulpit.add(front);
  box(pw - 1.4, 0.06, 0.25, M.ceilingLight, 0, PULPIT.roof - 0.16, -0.4, pulpit);
  // video wall on the back wall
  ([0, 1, 2] as const).forEach((k) => {
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5), new THREE.MeshBasicMaterial({ map: screenTexture(k), toneMapped: false }));
    scr.position.set((k - 1) * 2.6, PULPIT.floor + 2.15, -pd / 2 + 0.13);
    pulpit.add(scr);
    box(2.5, 1.6, 0.06, M.dark, (k - 1) * 2.6, PULPIT.floor + 2.15, -pd / 2 + 0.1, pulpit);
  });
  // operator desk and chairs facing the window
  box(pw - 1.2, 0.12, 0.9, M.dark, 0, PULPIT.floor + 0.85, pd / 2 - 0.7, pulpit);
  box(pw - 1.2, 0.7, 0.1, M.dark, 0, PULPIT.floor + 0.45, pd / 2 - 0.3, pulpit);
  for (const x of [-2.4, 0, 2.4]) {
    box(0.6, 0.1, 0.6, M.dark, x, PULPIT.floor + 0.55, pd / 2 - 1.6, pulpit);
    box(0.6, 0.7, 0.1, M.dark, x, PULPIT.floor + 0.95, pd / 2 - 1.9, pulpit);
    const lit = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.42), M.deskScreen);
    lit.position.set(x, PULPIT.floor + 1.15, pd / 2 - 0.85);
    lit.rotation.set(-0.35, Math.PI, 0);
    pulpit.add(lit);
  }
  box(0.9, 0.12, 4.2, M.dark, -pw / 2 - 0.5, PULPIT.floor - 0.06, pd / 2 + 1.4, pulpit); // walkway to the line

  // ---- laminar cooling: header pipes, drop pipes and water
  for (const z of [-0.45, 0.45]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, COOL_END - COOL_START, 12), M.pipe);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set((COOL_START + COOL_END) / 2, 2.6, z);
    scene.add(pipe);
  }
  for (let x = COOL_START; x <= COOL_END; x += 2) {
    box(0.18, 2.9, 0.18, M.pipe, x, 1.45, -1.6);
    box(0.18, 2.9, 0.18, M.pipe, x, 1.45, 1.6);
    box(0.18, 0.18, 3.4, M.pipe, x, 2.85, 0);
  }

  // ---- down coiler and coil yard
  box(3.4, 3.2, 0.5, M.housing, COILER, 1.6, -1.25);
  box(1.6, 1.6, 1.8, M.housing, COILER, 1.4, -2.6);
  cylZ(0.3, 1.9, M.roll, COILER, COIL_Y, -0.2, scene, 20); // mandrel
  // pinch rolls
  box(0.6, 2.4, 0.5, M.housing, COILER - 3.3, 1.2, -1.3);
  box(0.6, 2.4, 0.5, M.housing, COILER - 3.3, 1.2, 1.3);
  cylZ(0.24, 2.4, M.roll, COILER - 3.3, PASS_Y + 0.3, 0);
  const coilMat = hotMaterial(0.38, true, new THREE.Vector2(COILER, COIL_Y));
  const coil = cylZ(1, 1.3, coilMat, COILER, COIL_Y, 0, scene, 48);
  const coldCoilMat = hotMaterial(0, true, new THREE.Vector2(0, 0));
  [75.5, 78.4, 81.3].forEach((x, i) => {
    const r = 1.12;
    const mat = coldCoilMat.clone();
    (mat.uniforms.uAxis.value as THREE.Vector2).set(x, r + 0.25);
    cylZ(r, 1.3, mat, x, r + 0.25, 0, scene, 40);
    cylZ(0.36, 1.32, M.dark, x, r + 0.25, 0, scene, 20);
    box(1.8, 0.3, 1.5, M.dark, x, 0.15, 0);
    void i;
  });

  // ---- moving material
  const steelMat = hotMaterial();
  const slab = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), steelMat);
  scene.add(slab);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), steelMat);
  scene.add(strip);

  // ---- lights
  scene.add(new THREE.HemisphereLight(0x8aa2c8, 0x0a0c10, 0.7));
  const moon = new THREE.DirectionalLight(0xbcd0ff, 0.9);
  moon.position.set(20, 30, 18);
  scene.add(moon);
  const furnaceLight = new THREE.PointLight(0xff6a1a, 14, 16, 1.8);
  furnaceLight.position.set(FURNACE_EXIT + 1.6, 1.3, 0);
  scene.add(furnaceLight);
  const stripLight = new THREE.PointLight(0xff5a14, 12, 12, 1.8);
  scene.add(stripLight);
  const coilLight = new THREE.PointLight(0xff4a10, 0, 9, 1.6);
  coilLight.position.set(COILER, 2.6, 2.2);
  scene.add(coilLight);
  const pulpitLight = new THREE.PointLight(0x9cc4ff, 9, 9, 1.6);
  pulpitLight.position.set(PULPIT.x, PULPIT.roof - 0.8, PULPIT.z);
  scene.add(pulpitLight);

  // ---- particles
  const N_EMBER = lowPower ? 90 : 180;
  const emberGeo = new THREE.BufferGeometry();
  const emberPos = new Float32Array(N_EMBER * 3);
  const emberAlpha = new Float32Array(N_EMBER);
  const emberVel = new Float32Array(N_EMBER * 3);
  const emberLife = new Float32Array(N_EMBER);
  const resetEmber = (i: number, life = 0) => {
    emberPos.set([rand(FURNACE_EXIT + 0.3, FURNACE_EXIT + 1.2), rand(0.5, 1.5), rand(-0.9, 0.9)], i * 3);
    emberVel.set([rand(0.4, 1.6), rand(0.5, 1.6), rand(-0.3, 0.3)], i * 3);
    emberLife[i] = life;
  };
  for (let i = 0; i < N_EMBER; i++) resetEmber(i, Math.random());
  emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
  emberGeo.setAttribute('aAlpha', new THREE.BufferAttribute(emberAlpha, 1));
  const embers = new THREE.Points(emberGeo, pointsMaterial(hdr(0xff8a30, 1.8), 48 * dpr));
  embers.frustumCulled = false;
  scene.add(embers);

  const N_WATER = lowPower ? 320 : 760;
  const waterGeo = new THREE.BufferGeometry();
  const waterPos = new Float32Array(N_WATER * 3);
  const waterAlpha = new Float32Array(N_WATER).fill(0.5);
  const waterSpeed = new Float32Array(N_WATER);
  for (let i = 0; i < N_WATER; i++) {
    waterPos.set([rand(COOL_START, COOL_END), rand(PASS_Y, 2.5), rand(-0.55, 0.55)], i * 3);
    waterSpeed[i] = rand(3.5, 5.5);
  }
  waterGeo.setAttribute('position', new THREE.BufferAttribute(waterPos, 3));
  waterGeo.setAttribute('aAlpha', new THREE.BufferAttribute(waterAlpha, 1));
  const water = new THREE.Points(waterGeo, pointsMaterial(hdr(0x6fb7ff, 0.9), 34 * dpr));
  water.frustumCulled = false;
  scene.add(water);

  // ---- post-processing
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(dpr);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.62, 0.5, 0.95);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ---- camera path
  const curvePos = new THREE.CatmullRomCurve3(KEYS.map((k) => k[0]), false, 'centripetal');
  const curveTgt = new THREE.CatmullRomCurve3(KEYS.map((k) => k[1]), false, 'centripetal');
  const last = KEYS.length - 1;

  let target = 0;
  let current = 0;
  let pointerX = 0;
  let pointerY = 0;
  let px = 0;
  let py = 0;
  let width = 1;
  let height = 1;
  let shift = 0;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    bloom.resolution.set(width * (lowPower ? 0.5 : 0.75), height * (lowPower ? 0.5 : 0.75));
    camera.aspect = width / height;
    camera.fov = camera.aspect < 0.8 ? 62 : camera.aspect < 1.2 ? 52 : 45;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // Shift the image away from the text panel: sideways on wide screens, upwards on tall ones.
  function viewShiftFor(p: number) {
    const i = Math.min(last, Math.max(0, Math.round(p)));
    if (i === last) return 0;
    const side = opts.sides[i] === 'left' ? 1 : -1;
    return side;
  }

  const look = new THREE.Vector3();
  function updateCamera(p: number, time: number) {
    const t = p / last;
    camera.position.copy(curvePos.getPoint(t));
    // the gaze turns towards the next station early, so transitions never stare into the dark
    const i = Math.min(last - 1, Math.floor(p));
    const f = p - i;
    look.copy(curveTgt.getPoint((i + (1 - Math.pow(1 - f, 2.2))) / last));
    if (!reducedMotion) {
      camera.position.x += Math.sin(time * 0.21) * 0.18 + px * 0.6;
      camera.position.y += Math.sin(time * 0.17) * 0.1 + py * 0.35;
    }
    camera.lookAt(look);
    const portrait = width / height < 0.9;
    const s = shift;
    if (Math.abs(s) < 0.001) camera.clearViewOffset();
    else if (portrait) camera.setViewOffset(width, height, 0, Math.abs(s) * height * 0.2, width, height);
    else camera.setViewOffset(width, height, -s * width * 0.17, 0, width, height);
  }

  function updateMaterial(p: number) {
    // slab: furnace → R1 → into F1
    let slabX: number;
    if (p < 1) slabX = lerp(5.7, 7.4, seg(p, 0, 1));
    else if (p < 2) slabX = lerp(7.4, 21.5, seg(p, 1, 2));
    else slabX = lerp(21.5, 28.4, seg(p, 2, 2.75));
    const rolled = seg(slabX, R1 - 1.2, R1 + 1.6);
    const thk = lerp(0.3, 0.16, rolled);
    const len = lerp(2.6, 4.8, rolled);
    slab.visible = p < 2.78;
    slab.position.set(slabX, TABLE_Y + thk / 2, 0);
    slab.scale.set(len, thk, 1.4);
    if (p > 6.2) {
      // the line keeps running: the next slab leaves the furnace during the overview
      slab.visible = true;
      slab.position.set(lerp(3.9, 8.8, seg(p, 6.2, 7)), TABLE_Y + 0.15, 0);
      slab.scale.set(2.6, 0.3, 1.4);
    }

    // strip: head runs through the finishing stands, cooling and into the coiler; tail follows at the end
    let head: number;
    if (p < 2.6) head = 26;
    else if (p < 3) head = lerp(28, 44, seg(p, 2.6, 3));
    else if (p < 4) head = lerp(44, 47.5, seg(p, 3, 4));
    else if (p < 5) head = lerp(47.5, 64, seg(p, 4, 5));
    else head = lerp(64, COILER - 1.1, seg(p, 5, 5.5));
    const tail = p < 5.5 ? 27 : lerp(27, COILER - 1.1, seg(p, 5.5, 7));
    const L = head - tail;
    strip.visible = L > 0.05;
    strip.position.set((head + tail) / 2, PASS_Y, 0);
    strip.scale.set(Math.max(L, 0.001), 0.06, 1.25);

    const r = p < 5.35 ? 0 : lerp(0.4, 1.25, seg(p, 5.35, 7));
    coil.visible = r > 0;
    coil.scale.set(Math.max(r, 0.001), 1, Math.max(r, 0.001));
    coilLight.intensity = r > 0 ? 8 : 0;

    const hotX = strip.visible ? Math.min(head, COOL_START) : slabX;
    stripLight.position.set(hotX - 0.8, 1.7, 1.2);
    stripLight.intensity = p > 6.6 ? lerp(12, 0, seg(p, 6.6, 7)) : 12;
  }

  function updateParticles(dt: number) {
    for (let i = 0; i < N_EMBER; i++) {
      emberLife[i] += dt * 0.45;
      if (emberLife[i] > 1) resetEmber(i);
      const k = i * 3;
      emberVel[k + 1] += dt * 0.25;
      emberPos[k] += emberVel[k] * dt;
      emberPos[k + 1] += emberVel[k + 1] * dt;
      emberPos[k + 2] += emberVel[k + 2] * dt;
      emberAlpha[i] = Math.sin(emberLife[i] * Math.PI);
    }
    emberGeo.attributes.position.needsUpdate = true;
    emberGeo.attributes.aAlpha.needsUpdate = true;
    for (let i = 0; i < N_WATER; i++) {
      const k = i * 3 + 1;
      waterPos[k] -= waterSpeed[i] * dt;
      if (waterPos[k] < PASS_Y + 0.05) {
        waterPos[i * 3] = rand(COOL_START, COOL_END);
        waterPos[k] = 2.5;
        waterPos[i * 3 + 2] = rand(-0.55, 0.55);
      }
    }
    waterGeo.attributes.position.needsUpdate = true;
  }

  let started = false;
  let firstFrame: (() => void) | null = null;
  let lastT = performance.now();
  const clock0 = performance.now();

  function frame(now: number) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    const time = (now - clock0) / 1000;
    if (reducedMotion) current = target;
    else current += (target - current) * (1 - Math.exp(-dt * 3.2));
    px += (pointerX - px) * (1 - Math.exp(-dt * 2));
    py += (pointerY - py) * (1 - Math.exp(-dt * 2));
    shift += (viewShiftFor(current) - shift) * (1 - Math.exp(-dt * 2.5));
    if (reducedMotion) shift = viewShiftFor(current);

    updateMaterial(current);
    updateCamera(current, time);
    if (!reducedMotion) updateParticles(dt);
    steelMat.uniforms.uTime.value = time;
    coilMat.uniforms.uTime.value = time;
    furnaceLight.intensity = 14 + (reducedMotion ? 0 : Math.sin(time * 13) * 1.5 + Math.sin(time * 7.3) * 2);

    composer.render();
    if (firstFrame) {
      const cb = firstFrame;
      firstFrame = null;
      cb();
    }
  }

  return {
    setProgress(p: number) {
      target = Math.min(last, Math.max(0, p));
      if (!started) current = target;
    },
    setPointer(x: number, y: number) {
      pointerX = x;
      pointerY = y;
    },
    start(onFirstFrame: () => void) {
      if (started) return;
      started = true;
      firstFrame = onFirstFrame;
      requestAnimationFrame(frame);
    },
  };
}
