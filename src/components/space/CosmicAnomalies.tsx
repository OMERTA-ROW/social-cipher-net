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

const cloudTexture = (seed: number) => {
  const rnd = seeded(seed);
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  for (let i = 0; i < 90; i++) {
    const x = 128 + (rnd() - 0.5) * 150;
    const y = 128 + (rnd() - 0.5) * 150;
    const r = 20 + rnd() * 70;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    const a = 0.05 + rnd() * 0.08;
    grad.addColorStop(0, `rgba(255,255,255,${a})`);
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
  }
  // soft circular falloff so no square edges show
  g.globalCompositeOperation = "destination-in";
  const mask = g.createRadialGradient(128, 128, 40, 128, 128, 128);
  mask.addColorStop(0, "rgba(0,0,0,1)");
  mask.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = mask;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
};

type V3 = [number, number, number];
const at = (p: V3, s: number): V3 => [p[0] * s, p[1] * s, p[2] * s];

/* ---------------- Black hole with lensed accretion disk ---------------- */
const diskShader = {
  uniforms: { uTime: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
  fragmentShader: `
    uniform float uTime; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
    float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
      return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
    void main(){
      vec2 p = vUv*2.-1.; float r = length(p); if(r>1.||r<0.32) discard;
      float a = atan(p.y,p.x);
      float swirl = n(vec2(a*4.0 + uTime*0.6 - r*9.0, r*14.0));
      float t = smoothstep(1.0,0.32,r);
      vec3 hot = mix(vec3(1.0,0.35,0.08), vec3(1.0,0.92,0.75), t*t);
      float beam = 0.75 + 0.5*cos(a - 0.6); // doppler brightening on one side
      float alpha = t * (0.45 + 0.75*swirl) * smoothstep(0.32,0.38,r);
      gl_FragColor = vec4(hot * beam * (0.8+swirl), alpha);
    }`,
};

const BlackHole = ({ position, size, animate }: { position: V3; size: number; animate: boolean }) => {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => THREE.UniformsUtils.clone(diskShader.uniforms), []);
  useFrame((_, d) => { if (animate && mat.current) mat.current.uniforms.uTime.value += Math.min(d, 0.05); });
  return (
    <group position={position} rotation={[0.35, 0.4, 0.15]}>
      <mesh>
        <sphereGeometry args={[size * 0.3, 48, 48]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      {/* photon ring */}
      <mesh>
        <torusGeometry args={[size * 0.33, size * 0.012, 8, 96]} />
        <meshBasicMaterial color="#ffd9a8" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {[0, Math.PI / 2].map((rx) => (
        <mesh key={rx} rotation={[rx === 0 ? -Math.PI / 2 : 0, 0, 0]} scale={rx === 0 ? 1 : [0.75, 0.75, 0.75]}>
          <planeGeometry args={[size * 2, size * 2]} />
          <shaderMaterial
            ref={rx === 0 ? mat : undefined}
            args={[{ ...diskShader, uniforms }]}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
};

/* ---------------- Wormhole: swirling tunnel mouth ---------------- */
const wormShader = {
  vertexShader: diskShader.vertexShader,
  fragmentShader: `
    uniform float uTime; varying vec2 vUv;
    void main(){
      vec2 p = vUv*2.-1.; float r = length(p); if(r>1.) discard;
      float a = atan(p.y,p.x);
      float spiral = 0.5+0.5*sin(a*5.0 + log(r+0.02)*10.0 - uTime*1.5);
      vec3 col = mix(vec3(0.15,0.55,1.0), vec3(0.55,0.35,1.0), spiral);
      float core = smoothstep(0.25,0.0,r);
      float alpha = smoothstep(1.0,0.4,r) * (0.35+0.65*spiral) ;
      gl_FragColor = vec4(col*(1.0+core*3.0) + core, alpha);
    }`,
};
const Wormhole = ({ position, size, animate }: { position: V3; size: number; animate: boolean }) => {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  useFrame((_, d) => { if (animate && mat.current) mat.current.uniforms.uTime.value += Math.min(d, 0.05); });
  return (
    <group position={position}>
      <mesh rotation={[0.2, -0.6, 0]}>
        <circleGeometry args={[size, 64]} />
        <shaderMaterial ref={mat} args={[{ ...wormShader, uniforms }]} transparent depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[0.2, -0.6, 0]}>
        <torusGeometry args={[size, size * 0.03, 8, 96]} />
        <meshBasicMaterial color="#7cc4ff" transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
};

/* ---------------- Nebula: layered gas sprites ---------------- */
const Nebula = ({ position, size, colors, seed }: { position: V3; size: number; colors: string[]; seed: number }) => {
  const layers = useMemo(() => {
    const rnd = seeded(seed);
    return Array.from({ length: 9 }, (_, i) => ({
      tex: cloudTexture(seed * 13 + i),
      pos: [(rnd() - 0.5) * size, (rnd() - 0.5) * size * 0.6, (rnd() - 0.5) * size] as V3,
      scale: size * (0.8 + rnd() * 1.2),
      color: colors[i % colors.length],
      rot: rnd() * Math.PI * 2,
    }));
  }, [seed, size, colors]);
  return (
    <group position={position}>
      {layers.map((l, i) => (
        <sprite key={i} position={l.pos} scale={[l.scale, l.scale, 1]}>
          <spriteMaterial map={l.tex} color={l.color} rotation={l.rot} transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      ))}
    </group>
  );
};

/* ---------------- Spiral galaxy point cloud ---------------- */
const SpiralGalaxy = ({ position, size, seed, tilt, count }: { position: V3; size: number; seed: number; tilt: V3; count: number }) => {
  const geo = useMemo(() => {
    const rnd = seeded(seed);
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const inner = new THREE.Color("#ffe2b0");
    const outer = new THREE.Color("#7fb6ff");
    const c = new THREE.Color();
    const arms = 2 + Math.floor(rnd() * 3);
    for (let i = 0; i < count; i++) {
      const r = Math.pow(rnd(), 1.6);
      const arm = (Math.floor(rnd() * arms) / arms) * Math.PI * 2;
      const a = arm + r * 6.5 + (rnd() - 0.5) * 0.6 * (1 - r * 0.5);
      const spread = (rnd() - 0.5) * 0.12 * size;
      pos[i * 3] = Math.cos(a) * r * size + spread;
      pos[i * 3 + 1] = (rnd() - 0.5) * size * 0.05 * (1 - r);
      pos[i * 3 + 2] = Math.sin(a) * r * size + spread;
      c.copy(inner).lerp(outer, r);
      col.set([c.r, c.g, c.b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, [seed, size, count]);
  return (
    <group position={position} rotation={tilt}>
      <points geometry={geo}>
        <pointsMaterial size={size * 0.012} map={glowTexture()} vertexColors transparent opacity={0.85} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation />
      </points>
      <sprite scale={[size * 0.5, size * 0.5, 1]}>
        <spriteMaterial map={glowTexture()} color="#ffd9a0" transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </group>
  );
};

/* ---------------- Comet: nucleus, coma and sun-facing-away tail ---------------- */
const Comet = ({ orbit, size, speed, phase, animate }: { orbit: [number, number, number]; size: number; speed: number; phase: number; animate: boolean }) => {
  const g = useRef<THREE.Group>(null);
  const t = useRef(phase);
  useFrame((_, d) => {
    if (animate) t.current += Math.min(d, 0.05) * speed;
    const [a, b, tilt] = orbit;
    const x = Math.cos(t.current) * a;
    const z = Math.sin(t.current) * b;
    const p = new THREE.Vector3(x, z * Math.sin(tilt), z * Math.cos(tilt));
    if (!g.current) return;
    g.current.position.copy(p);
    // tail always points away from the sun (origin)
    g.current.lookAt(p.clone().multiplyScalar(2));
  });
  return (
    <group ref={g}>
      <mesh>
        <icosahedronGeometry args={[size, 1]} />
        <meshStandardMaterial color="#8a8580" roughness={1} />
      </mesh>
      <sprite scale={[size * 10, size * 10, 1]}>
        <spriteMaterial map={glowTexture()} color="#bfe6ff" transparent opacity={0.7} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      {/* dust + ion tails */}
      <mesh position={[0, 0, size * 30]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[size * 5, size * 60, 24, 1, true]} />
        <meshBasicMaterial color="#d8ecff" transparent opacity={0.16} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[size * 2, 0, size * 45]} rotation={[-Math.PI / 2, 0, 0.08]}>
        <coneGeometry args={[size * 1.6, size * 90, 16, 1, true]} />
        <meshBasicMaterial color="#6fb8ff" transparent opacity={0.22} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
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
  const g = useRef<THREE.Group>(null);
  useFrame((_, d) => { if (animate && g.current) g.current.rotation.y += Math.min(d, 0.05) * 4; });
  return (
    <group position={position}>
      <sprite scale={[size * 3, size * 3, 1]}>
        <spriteMaterial map={glowTexture()} color="#bfe0ff" transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <group ref={g} rotation={[0, 0, 0.5]}>
        {[1, -1].map((s) => (
          <mesh key={s} position={[0, s * size * 6, 0]} rotation={[s > 0 ? Math.PI : 0, 0, 0]}>
            <coneGeometry args={[size * 1.2, size * 12, 20, 1, true]} />
            <meshBasicMaterial color="#8fc8ff" transparent opacity={0.28} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

/* ---------------- Supernova remnant: expanding filament shell ---------------- */
const Supernova = ({ position, size, animate }: { position: V3; size: number; animate: boolean }) => {
  const pts = useRef<THREE.Points>(null);
  const t = useRef(0.4);
  const geo = useMemo(() => {
    const rnd = seeded(4421);
    const n = 2600;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const r = 0.85 + rnd() * 0.25;
      pos.set([s * Math.cos(th) * r, u * r, s * Math.sin(th) * r], i * 3);
      c.set(rnd() > 0.5 ? "#ff7a45" : "#5fb2ff");
      col.set([c.r, c.g, c.b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, []);
  useFrame((_, d) => {
    if (animate) t.current = t.current > 1.6 ? 0.4 : t.current + Math.min(d, 0.05) * 0.03;
    pts.current?.scale.setScalar(size * t.current);
  });
  return (
    <group position={position}>
      <points ref={pts} geometry={geo}>
        <pointsMaterial size={size * 0.025} map={glowTexture()} vertexColors transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      <sprite scale={[size * 0.4, size * 0.4, 1]}>
        <spriteMaterial map={glowTexture()} color="#ffffff" transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </group>
  );
};

/* ---------------- Quasar: blazing core with relativistic jets ---------------- */
const Quasar = ({ position, size }: { position: V3; size: number }) => (
  <group position={position} rotation={[0.3, 0, -0.4]}>
    <sprite scale={[size * 2, size * 2, 1]}>
      <spriteMaterial map={glowTexture()} color="#e6f2ff" transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </sprite>
    {[1, -1].map((s) => (
      <mesh key={s} position={[0, s * size * 5, 0]} rotation={[s > 0 ? Math.PI : 0, 0, 0]}>
        <coneGeometry args={[size * 0.35, size * 10, 12, 1, true]} />
        <meshBasicMaterial color="#9fd0ff" transparent opacity={0.35} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
    ))}
  </group>
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
