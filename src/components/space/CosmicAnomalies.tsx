import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * Deep-space phenomena shared by Voyage and the site background:
 * black holes, wormholes, nebulae, spiral galaxies, comets, meteor showers,
 * pulsars, supernova remnants, quasars and solar flares/prominences.
 * `scale` sets the distance unit so each scene can place them across its
 * own (expanded) volume. Everything is procedural — no external assets.
 */

const seeded = (seed: number) => {
  let v = seed >>> 0;
  return () => {
    v = (v * 1664525 + 1013904223) >>> 0;
    return v / 4294967296;
  };
};

const glowTexture = (() => {
  let tex: THREE.CanvasTexture | null = null;
  return () => {
    if (tex) return tex;
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.25, "rgba(255,255,255,0.55)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    tex = new THREE.CanvasTexture(c);
    return tex;
  };
})();


type V3 = [number, number, number];
import nebulaUrl from "@/assets/space/nebula.jpg";
import galaxyUrl from "@/assets/space/galaxy.jpg";
import supernovaUrl from "@/assets/space/supernova.jpg";
import blackholeUrl from "@/assets/space/blackhole.jpg";
import wormholeUrl from "@/assets/space/wormhole.jpg";
import cometUrl from "@/assets/space/comet.jpg";
import pulsarUrl from "@/assets/space/pulsar.jpg";
import quasarUrl from "@/assets/space/quasar.jpg";

/** Photo-style images (AI-generated, not telescope photos) on pure black,
 *  blended additively so the black disappears into the starfield. */
const texCache = new Map<string, THREE.Texture>();
const photo = (url: string) => {
  let t = texCache.get(url);
  if (!t) {
    t = new THREE.TextureLoader().load(url);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    texCache.set(url, t);
  }
  return t;
};
/** Soft radial mask so square image edges never show. */
const edgeMask = (() => {
  let tex: THREE.CanvasTexture | null = null;
  return () => {
    if (tex) return tex;
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(128, 128, 20, 128, 128, 128);
    grad.addColorStop(0, "#fff");
    grad.addColorStop(0.55, "#888");
    grad.addColorStop(1, "#000");
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    tex = new THREE.CanvasTexture(c);
    return tex;
  };
})();
/** Layered at slightly different depths/scales/rotations so the object reads
 *  as a volume floating in the void rather than a flat picture. */
const PhotoSprite = ({ url, size, rotation = 0, opacity = 0.75, position }: { url: string; size: number; rotation?: number; opacity?: number; position?: V3 }) => {
  const layers = useMemo(() => [
    { o: [0, 0, 0] as V3, k: 1, r: 0, a: 0.6 },
    { o: [size * 0.06, size * 0.03, -size * 0.12] as V3, k: 1.12, r: 0.18, a: 0.28 },
    { o: [-size * 0.05, -size * 0.04, size * 0.1] as V3, k: 0.86, r: -0.14, a: 0.22 },
  ], [size]);
  return (
    <group position={position}>
      {layers.map((l, i) => (
        <sprite key={i} position={l.o} scale={[size * l.k, size * l.k, 1]}>
          <spriteMaterial map={photo(url)} alphaMap={edgeMask()} rotation={rotation + l.r} transparent opacity={opacity * l.a * 1.4} depthWrite={false} fog={false} blending={THREE.AdditiveBlending} />
        </sprite>
      ))}
    </group>
  );
};

const at = (p: V3, s: number): V3 => [p[0] * s, p[1] * s, p[2] * s];


const BlackHole = ({ position, size }: { position: V3; size: number; animate?: boolean }) => (
  <group position={position}>
    <mesh>
      <sphereGeometry args={[size * 0.3, 32, 32]} />
      <meshBasicMaterial color="#000000" />
    </mesh>
    <PhotoSprite url={blackholeUrl} size={size * 2.2} />
  </group>
);

/* ---------------- Wormhole: swirling tunnel mouth ---------------- */
const Wormhole = ({ position, size, animate }: { position: V3; size: number; animate: boolean }) => {
  const m = useRef<THREE.SpriteMaterial>(null);
  useFrame((_, d) => { if (animate && m.current) m.current.rotation += Math.min(d, 0.05) * 0.05; });
  return (
    <sprite position={position} scale={[size * 2.4, size * 2.4, 1]}>
      <spriteMaterial ref={m} map={photo(wormholeUrl)} alphaMap={edgeMask()} transparent opacity={0.75} depthWrite={false} blending={THREE.AdditiveBlending} />
    </sprite>
  );
};

/* ---------------- Nebula: layered gas sprites ---------------- */
const Nebula = ({ position, size, seed }: { position: V3; size: number; colors?: string[]; seed: number }) => (
  <PhotoSprite url={nebulaUrl} position={position} size={size * 2.2} rotation={seed * 0.7} opacity={0.6} />
);

/* ---------------- Spiral galaxy point cloud ---------------- */
const SpiralGalaxy = ({ position, size, tilt }: { position: V3; size: number; seed?: number; tilt: V3; count?: number }) => (
  <mesh position={position} rotation={tilt}>
    <planeGeometry args={[size * 2.2, size * 2.2]} />
    <meshBasicMaterial map={photo(galaxyUrl)} alphaMap={edgeMask()} transparent opacity={0.75} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
  </mesh>
);

/* ---------------- Comet: nucleus, coma and sun-facing-away tail ---------------- */
const Comet = ({ orbit, size, speed, phase, animate }: { orbit: [number, number, number]; size: number; speed: number; phase: number; animate: boolean }) => {
  const g = useRef<THREE.Group>(null);
  const t = useRef(phase);
  const p = useMemo(() => new THREE.Vector3(), []);
  const away = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, d) => {
    if (animate) t.current += Math.min(d, 0.05) * speed;
    const [a, b, tilt] = orbit;
    const z = Math.sin(t.current) * b;
    p.set(Math.cos(t.current) * a, z * Math.sin(tilt), z * Math.cos(tilt));
    if (!g.current) return;
    g.current.position.copy(p);
    g.current.lookAt(away.copy(p).multiplyScalar(2)); // tail points away from the sun
  });
  const w = size * 120;
  return (
    <group ref={g}>
      {[0, Math.PI / 2].map((rz) => (
        <group key={rz} rotation={[0, 0, rz]}>
          <mesh position={[0, 0, w * 0.37]} rotation={[0, -Math.PI / 2, 0]}>
            <planeGeometry args={[w, w / 2]} />
            <meshBasicMaterial map={photo(cometUrl)} transparent opacity={0.8} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

/* ---------------- Meteor shower: recycled streaks ---------------- */
const MeteorShower = ({ center, spread, count, animate }: { center: V3; spread: number; count: number; animate: boolean }) => {
  const ref = useRef<THREE.LineSegments>(null);
  const state = useMemo(() => {
    const rnd = seeded(907);
    const meteors = Array.from({ length: count }, () => ({
      p: new THREE.Vector3((rnd() - 0.5) * spread, (rnd() - 0.5) * spread, (rnd() - 0.5) * spread),
      v: 0.4 + rnd() * 0.8,
    }));
    const dir = new THREE.Vector3(-1, -0.45, 0.3).normalize();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 6), 3));
    return { meteors, dir, geo, rnd };
  }, [count, spread]);
  useFrame((_, d) => {
    const dt = animate ? Math.min(d, 0.05) : 0;
    const arr = state.geo.attributes.position.array as Float32Array;
    const len = spread * 0.04;
    state.meteors.forEach((m, i) => {
      m.p.addScaledVector(state.dir, m.v * spread * 0.25 * dt);
      if (m.p.length() > spread * 0.6) m.p.set((state.rnd() - 0.2) * spread * 0.5, (state.rnd() + 0.1) * spread * 0.3, (state.rnd() - 0.5) * spread);
      arr.set([m.p.x, m.p.y, m.p.z, m.p.x - state.dir.x * len, m.p.y - state.dir.y * len, m.p.z - state.dir.z * len], i * 6);
    });
    state.geo.attributes.position.needsUpdate = true;
  });
  return (
    <lineSegments ref={ref} geometry={state.geo} position={center} frustumCulled={false}>
      <lineBasicMaterial color="#cfe8ff" transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} />
    </lineSegments>
  );
};

/* ---------------- Pulsar: neutron star with sweeping beams ---------------- */
const Pulsar = ({ position, size, animate }: { position: V3; size: number; animate: boolean }) => {
  const m = useRef<THREE.SpriteMaterial>(null);
  useFrame((_, d) => { if (animate && m.current) m.current.rotation += Math.min(d, 0.05) * 1.5; });
  return (
    <sprite position={position} scale={[size * 14, size * 14, 1]}>
      <spriteMaterial ref={m} map={photo(pulsarUrl)} alphaMap={edgeMask()} transparent opacity={0.75} depthWrite={false} blending={THREE.AdditiveBlending} />
    </sprite>
  );
};

/* ---------------- Supernova remnant: expanding filament shell ---------------- */
const Supernova = ({ position, size, animate }: { position: V3; size: number; animate: boolean }) => {
  const sp = useRef<THREE.Sprite>(null);
  const t = useRef(1);
  useFrame((_, d) => {
    if (animate) t.current = t.current > 1.4 ? 0.8 : t.current + Math.min(d, 0.05) * 0.01;
    sp.current?.scale.set(size * 2.4 * t.current, size * 2.4 * t.current, 1);
  });
  return (
    <sprite ref={sp} position={position}>
      <spriteMaterial map={photo(supernovaUrl)} alphaMap={edgeMask()} transparent opacity={0.75} depthWrite={false} blending={THREE.AdditiveBlending} />
    </sprite>
  );
};

/* ---------------- Quasar: blazing core with relativistic jets ---------------- */
const Quasar = ({ position, size }: { position: V3; size: number }) => (
  <PhotoSprite url={quasarUrl} position={position} size={size * 14} />
);

/* ---------------- Solar flares / prominence loops on the sun ---------------- */
export const SolarFlares = ({ radius, animate }: { radius: number; animate: boolean }) => {
  const g = useRef<THREE.Group>(null);
  const loops = useMemo(() => {
    const rnd = seeded(77);
    return Array.from({ length: 7 }, () => ({
      rot: [rnd() * Math.PI * 2, rnd() * Math.PI * 2, rnd() * Math.PI * 2] as V3,
      r: radius * (0.18 + rnd() * 0.25),
      phase: rnd() * Math.PI * 2,
    }));
  }, [radius]);
  const t = useRef(0);
  useFrame((_, d) => {
    if (!animate || !g.current) return;
    t.current += Math.min(d, 0.05);
    g.current.children.forEach((c, i) => {
      const s = 0.85 + 0.25 * Math.sin(t.current * 0.6 + loops[i].phase);
      c.scale.setScalar(s);
    });
  });
  return (
    <group ref={g}>
      {loops.map((l, i) => (
        <group key={i} rotation={l.rot}>
          <mesh position={[0, radius * 0.98, 0]}>
            <torusGeometry args={[l.r, l.r * 0.08, 8, 48, Math.PI]} />
            <meshBasicMaterial color="#ff8a3a" transparent opacity={0.75} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

export interface CosmicAnomaliesProps {
  /** Distance unit; anomalies sit from ~1 to ~1000 units out. */
  scale: number;
  animate: boolean;
  full: boolean;
  /** Include comets/meteors that fly around the origin (sun). */
  local?: boolean;
}

const CosmicAnomalies = ({ scale: s, animate, full, local = true }: CosmicAnomaliesProps) => {
  const nebulaA = useMemo(() => ["#3b6dff", "#5fb7ff", "#7a4dff"], []);
  const nebulaB = useMemo(() => ["#ff6a3d", "#ff9e5e", "#3b8cff"], []);
  const nebulaC = useMemo(() => ["#2fd6c8", "#4a8dff", "#9a6bff"], []);
  return (
    <group>
      {local && (
        <>
          <Comet orbit={[3 * s, 1.2 * s, 0.4]} size={0.012 * s} speed={0.05} phase={0.5} animate={animate} />
          <Comet orbit={[5 * s, 1.8 * s, -0.7]} size={0.016 * s} speed={0.03} phase={2.6} animate={animate} />
          {full && <Comet orbit={[8 * s, 2.5 * s, 1.1]} size={0.02 * s} speed={0.02} phase={4.4} animate={animate} />}
          <MeteorShower center={[1.5 * s, 0.4 * s, -1.2 * s]} spread={1.2 * s} count={full ? 60 : 24} animate={animate} />
        </>
      )}
      <BlackHole position={at([40, 6, -55], s)} size={4 * s} animate={animate} />
      <Wormhole position={at([-60, 12, 30], s)} size={3 * s} animate={animate} />
      <Pulsar position={at([25, -14, 70], s)} size={0.6 * s} animate={animate} />
      <Supernova position={at([-90, -20, -80], s)} size={10 * s} animate={animate} />
      <Nebula position={at([120, 30, 140], s)} size={45 * s} colors={nebulaA} seed={3} />
      <Nebula position={at([-180, -40, -60], s)} size={60 * s} colors={nebulaB} seed={9} />
      {full && <Nebula position={at([60, 80, -260], s)} size={70 * s} colors={nebulaC} seed={17} />}
      <SpiralGalaxy position={at([-400, 120, 500], s)} size={120 * s} seed={5} tilt={[0.6, 0, 0.3]} count={full ? 9000 : 3000} />
      <SpiralGalaxy position={at([700, -200, -500], s)} size={180 * s} seed={11} tilt={[1.1, 0.4, 0]} count={full ? 9000 : 3000} />
      {full && <SpiralGalaxy position={at([-200, -500, -900], s)} size={220 * s} seed={23} tilt={[0.2, 0.8, 0.5]} count={7000} />}
      <Quasar position={at([900, 300, 400], s)} size={8 * s} />
      {full && <BlackHole position={at([-650, 60, -300], s)} size={30 * s} animate={animate} />}
    </group>
  );
};

export default CosmicAnomalies;

/**
 * Wraps the realistic deep-space images around the whole sky so some are
 * always in view from the site background, wherever the camera looks.
 */
export const SkyPhotos = ({ radius }: { radius: number }) => {
  const items = useMemo(() => {
    const urls = [nebulaUrl, galaxyUrl, supernovaUrl, blackholeUrl, wormholeUrl, pulsarUrl, quasarUrl, nebulaUrl, galaxyUrl, nebulaUrl, supernovaUrl, galaxyUrl];
    const rnd = seeded(2027);
    const n = urls.length;
    return urls.map((url, i) => {
      // even spread over the sphere (Fibonacci), kept away from the poles
      const y = 0.75 - (i / (n - 1)) * 1.5;
      const r = Math.sqrt(1 - y * y);
      const phi = i * 2.399963 + rnd() * 0.3;
      const d = radius * (0.7 + rnd() * 0.25);
      return {
        url,
        pos: [Math.cos(phi) * r * d, y * d, Math.sin(phi) * r * d] as V3,
        size: radius * (0.18 + rnd() * 0.16),
        rot: rnd() * Math.PI * 2,
        opacity: 0.55 + rnd() * 0.25,
      };
    });
  }, [radius]);
  return (
    <group>
      {items.map((it, i) => (
        <PhotoSprite key={i} url={it.url} position={it.pos} size={it.size} rotation={it.rot} opacity={it.opacity} />
      ))}
    </group>
  );
};
