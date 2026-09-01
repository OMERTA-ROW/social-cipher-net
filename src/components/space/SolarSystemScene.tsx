import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";
import { makeGlowTexture, makeNebulaTexture, makePlanetTexture } from "./textures";

export interface SceneQuality {
  /** false on phones / low-power devices: fewer bodies, no shadows, no belt */
  full: boolean;
}

/** Each route maps to a "region of space" — camera anchor + colour of the local nebula. */
export interface Region {
  anchor: [number, number, number];
  nebulaHue: number;
  drift: number;
}

const PLANETS = [
  {
    name: "Mercury",
    radius: 0.34,
    distance: 7,
    speed: 0.085,
    tilt: 0.001,
    colors: ["#8d8073", "#6d6259", "#a3968a", "#5a514a"],
    seed: 11,
  },
  {
    name: "Venus",
    radius: 0.62,
    distance: 9.6,
    speed: 0.062,
    tilt: 3.09,
    colors: ["#e6c88f", "#d9ab63", "#f0dcae", "#c99a55"],
    seed: 22,
  },
  {
    name: "Earth",
    radius: 0.66,
    distance: 12.6,
    speed: 0.05,
    tilt: 0.41,
    colors: ["#1d4f8c", "#2f6fa8", "#3a7d4a", "#1b3f6d"],
    speckle: "rgba(255,255,255,0.85)",
    seed: 33,
    moons: [{ radius: 0.18, distance: 1.5, speed: 0.5, color: "#b9b4ad" }],
  },
  {
    name: "Mars",
    radius: 0.46,
    distance: 15.8,
    speed: 0.04,
    tilt: 0.44,
    colors: ["#b4552d", "#c96a3b", "#8f4325", "#d78a5c"],
    speckle: "rgba(255,255,255,0.7)",
    seed: 44,
  },
  {
    name: "Jupiter",
    radius: 1.72,
    distance: 22,
    speed: 0.022,
    tilt: 0.05,
    banded: true,
    colors: ["#c8a887", "#e3cdae", "#a9825d", "#dcc09b"],
    seed: 55,
    moons: [
      { radius: 0.16, distance: 2.6, speed: 0.42, color: "#e8dfc4" },
      { radius: 0.13, distance: 3.3, speed: 0.31, color: "#a8927a" },
    ],
  },
  {
    name: "Saturn",
    radius: 1.45,
    distance: 29,
    speed: 0.016,
    tilt: 0.47,
    banded: true,
    colors: ["#d8c295", "#efe0bd", "#b99f74", "#e5d3aa"],
    seed: 66,
    ring: { inner: 1.9, outer: 3.1, color: "#d9c6a0" },
  },
  {
    name: "Uranus",
    radius: 0.95,
    distance: 36,
    speed: 0.011,
    tilt: 1.71,
    banded: true,
    colors: ["#9fd8de", "#c3e9ec", "#7fbcc4", "#aadfe4"],
    seed: 77,
  },
  {
    name: "Neptune",
    radius: 0.92,
    distance: 42,
    speed: 0.008,
    tilt: 0.49,
    banded: true,
    colors: ["#2f52a8", "#4a74c9", "#20407f", "#6a91da"],
    seed: 88,
  },
] as const;

/* ------------------------------------------------------------------ Sun */

const Sun = ({ full }: SceneQuality) => {
  const core = useMemo(() => makeGlowTexture("rgba(255,255,255,1)", "rgba(255,196,102,0.55)"), []);
  const flare = useMemo(() => makeGlowTexture("rgba(255,236,196,0.9)", "rgba(255,150,60,0.2)"), []);
  const halo = useRef<THREE.Sprite>(null);

  useFrame(({ clock }) => {
    if (halo.current) {
      const p = 1 + Math.sin(clock.elapsedTime * 0.4) * 0.03;
      halo.current.scale.setScalar(26 * p);
    }
  });

  return (
    <group>
      <mesh>
        <sphereGeometry args={[2.4, full ? 48 : 24, full ? 48 : 24]} />
        <meshBasicMaterial color="#fff0cf" toneMapped={false} />
      </mesh>
      <sprite ref={halo} scale={26}>
        <spriteMaterial
          map={core}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.85}
          toneMapped={false}
        />
      </sprite>
      {/* cheap anamorphic lens-flare ghosts along the sun axis */}
      {full &&
        [4, 7.5, 11, 15].map((d, i) => (
          <sprite key={d} position={[d * 0.9, d * 0.35, d * 0.2]} scale={2.4 + i * 0.9}>
            <spriteMaterial
              map={flare}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              opacity={0.12 - i * 0.02}
              toneMapped={false}
            />
          </sprite>
        ))}
      <pointLight color="#ffd9a0" intensity={full ? 850 : 500} distance={260} decay={2} />
    </group>
  );
};

/* --------------------------------------------------------------- Planet */

type PlanetDef = (typeof PLANETS)[number];

const Planet = ({ def, full }: { def: PlanetDef; full: boolean }) => {
  const orbit = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Mesh>(null);
  const moonRefs = useRef<THREE.Group[]>([]);
  const phase = useMemo(() => def.seed * 0.7, [def.seed]);

  const map = useMemo(
    () =>
      makePlanetTexture({
        colors: [...def.colors],
        banded: "banded" in def ? Boolean(def.banded) : false,
        speckle: "speckle" in def ? (def.speckle as string) : undefined,
        seed: def.seed,
        size: full ? 512 : 256,
      }),
    [def, full],
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    if (orbit.current) orbit.current.rotation.y += dt * def.speed;
    if (spin.current) spin.current.rotation.y += dt * 0.25;
    moonRefs.current.forEach((g, i) => {
      const moon = (def as { moons?: readonly { speed: number }[] }).moons?.[i];
      if (g && moon) g.rotation.y += dt * moon.speed;
    });
  });

  const moons = (def as { moons?: readonly { radius: number; distance: number; speed: number; color: string }[] })
    .moons;
  const ring = (def as { ring?: { inner: number; outer: number; color: string } }).ring;

  return (
    <>
      {/* orbital path */}
      <mesh rotation-x={-Math.PI / 2}>
        <ringGeometry args={[def.distance - 0.015, def.distance + 0.015, full ? 160 : 72]} />
        <meshBasicMaterial
          color="#6fd8ff"
          transparent
          opacity={0.09}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      <group ref={orbit} rotation-y={phase}>
        <group position={[def.distance, 0, 0]} rotation-z={def.tilt}>
          <mesh ref={spin} castShadow={false} receiveShadow={false}>
            <sphereGeometry args={[def.radius, full ? 40 : 20, full ? 40 : 20]} />
            <meshStandardMaterial map={map} roughness={0.92} metalness={0.02} />
          </mesh>

          {ring && (
            <mesh rotation-x={-Math.PI / 2}>
              <ringGeometry args={[ring.inner, ring.outer, full ? 96 : 48]} />
              <meshBasicMaterial
                color={ring.color}
                transparent
                opacity={0.42}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
          )}

          {full &&
            moons?.map((m, i) => (
              <group
                key={i}
                ref={(el) => {
                  if (el) moonRefs.current[i] = el;
                }}
              >
                <mesh position={[m.distance, 0, 0]}>
                  <sphereGeometry args={[m.radius, 16, 16]} />
                  <meshStandardMaterial color={m.color} roughness={1} />
                </mesh>
              </group>
            ))}
        </group>
      </group>
    </>
  );
};

/* ---------------------------------------------------------- Asteroid belt */

const AsteroidBelt = ({ count }: { count: number }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        r: 17.5 + Math.random() * 2.8,
        a: (i / count) * Math.PI * 2 + Math.random(),
        y: (Math.random() - 0.5) * 0.9,
        s: 0.03 + Math.random() * 0.09,
        speed: 0.03 + Math.random() * 0.012,
      })),
    [count],
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = clock.elapsedTime;
    data.forEach((d, i) => {
      const a = d.a + t * d.speed;
      dummy.position.set(Math.cos(a) * d.r, d.y, Math.sin(a) * d.r);
      dummy.rotation.set(a, a * 1.7, 0);
      dummy.scale.setScalar(d.s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined as never, undefined as never, count]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#8b8177" roughness={1} />
    </instancedMesh>
  );
};

/* ----------------------------------------------------------------- Comet */

const Comet = ({ seed }: { seed: number }) => {
  const group = useRef<THREE.Group>(null);
  const head = useMemo(() => makeGlowTexture("rgba(255,255,255,1)", "rgba(150,220,255,0.4)"), []);
  const cfg = useMemo(
    () => ({
      rx: 34 + seed * 6,
      rz: 22 + seed * 4,
      y: 4 + seed * 3,
      speed: 0.045 + seed * 0.012,
      phase: seed * 2.1,
    }),
    [seed],
  );

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const a = clock.elapsedTime * cfg.speed + cfg.phase;
    const x = Math.cos(a) * cfg.rx;
    const z = Math.sin(a) * cfg.rz;
    g.position.set(x, Math.sin(a * 0.6) * cfg.y, z);
    g.lookAt(0, 0, 0);
  });

  return (
    <group ref={group}>
      <sprite scale={1.5}>
        <spriteMaterial
          map={head}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.9}
          toneMapped={false}
        />
      </sprite>
      {/* tail points away from the sun because the group looks at origin */}
      <mesh position={[0, 0, -3.2]} rotation-x={Math.PI / 2}>
        <coneGeometry args={[0.35, 6.4, 12, 1, true]} />
        <meshBasicMaterial
          color="#9fe4ff"
          transparent
          opacity={0.16}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
};

/* ----------------------------------------------- Distant nebulae/galaxies */

const DeepField = ({ hue, count }: { hue: number; count: number }) => {
  const tex = useMemo(() => makeNebulaTexture(hue, 7), [hue]);
  const tex2 = useMemo(() => makeNebulaTexture((hue + 150) % 360, 13), [hue]);
  const items = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + i;
        const r = 150 + ((i * 37) % 90);
        return {
          pos: [Math.cos(a) * r, ((i % 5) - 2) * 34, Math.sin(a) * r] as [number, number, number],
          scale: 70 + ((i * 23) % 70),
          alt: i % 2 === 0,
        };
      }),
    [count],
  );

  return (
    <group>
      {items.map((it, i) => (
        <sprite key={i} position={it.pos} scale={it.scale}>
          <spriteMaterial
            map={it.alt ? tex : tex2}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            opacity={0.5}
            toneMapped={false}
          />
        </sprite>
      ))}
    </group>
  );
};

/* -------------------------------------------------------------- Wormhole */

/** Fades a slowly spinning vortex in and out every ~70s. */
const Wormhole = () => {
  const group = useRef<THREE.Group>(null);
  const mats = useRef<THREE.MeshBasicMaterial[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const cycle = (t % 70) / 70;
    // visible for ~18% of the cycle with a smooth ramp
    const v = cycle < 0.18 ? Math.sin((cycle / 0.18) * Math.PI) : 0;
    const g = group.current;
    if (!g) return;
    g.visible = v > 0.01;
    g.rotation.z = t * 0.35;
    g.rotation.x = 0.6 + Math.sin(t * 0.1) * 0.15;
    mats.current.forEach((m, i) => {
      if (m) m.opacity = v * (0.35 - i * 0.06);
    });
  });

  return (
    <group ref={group} position={[-62, 16, -70]}>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, 0, -i * 2.2]} scale={1 - i * 0.14}>
          <torusGeometry args={[9, 1.4 - i * 0.22, 12, 64]} />
          <meshBasicMaterial
            ref={(m) => {
              if (m) mats.current[i] = m as THREE.MeshBasicMaterial;
            }}
            color={i % 2 ? "#7c5cff" : "#22d3ee"}
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
};

/* ------------------------------------------------------- Camera drift rig */

const CameraRig = ({ region }: { region: Region }) => {
  const { camera } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = clock.elapsedTime * region.drift;
    target.set(
      region.anchor[0] + Math.sin(t * 0.11) * 8,
      region.anchor[1] + Math.sin(t * 0.07) * 3.5,
      region.anchor[2] + Math.cos(t * 0.09) * 8,
    );
    // exponential smoothing → frame-rate independent, no jump on route change
    const k = 1 - Math.exp(-0.7 * dt);
    camera.position.lerp(target, k);
    look.set(Math.sin(t * 0.05) * 3, Math.cos(t * 0.04) * 1.5, 0);
    camera.lookAt(look);
  });

  return null;
};

/* ----------------------------------------------------------------- Scene */

const SolarSystemScene = ({ full, region }: { full: boolean; region: Region }) => {
  return (
    <>
      <color attach="background" args={["#05060f"]} />
      <fog attach="fog" args={["#05060f", 120, 340]} />
      <ambientLight intensity={0.32} color="#9db4ff" />
      <hemisphereLight args={["#4a5fb0", "#050510", 0.35]} />

      <Stars
        radius={220}
        depth={110}
        count={full ? 5200 : 1600}
        factor={4}
        saturation={0}
        fade
        speed={0.35}
      />
      <DeepField hue={region.nebulaHue} count={full ? 7 : 3} />

      <Sun full={full} />
      {(full ? PLANETS : PLANETS.filter((p) => ["Earth", "Jupiter", "Saturn", "Mars"].includes(p.name))).map(
        (p) => (
          <Planet key={p.name} def={p} full={full} />
        ),
      )}

      {full && <AsteroidBelt count={340} />}
      {full && <Comet seed={0} />}
      {full && <Comet seed={1} />}
      {full && <Wormhole />}

      <CameraRig region={region} />
    </>
  );
};

export default SolarSystemScene;
