import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";
import {
  makeCloudTexture,
  makeGlowTexture,
  makeNebulaTexture,
  makePlanetSurface,
  makeRingTexture,
  makeRockGeometry,
  makeStarSkyTexture,
} from "./textures";

export interface SceneQuality {
  /** false on phones / low-power devices: fewer bodies, no shadows, no belt */
  full: boolean;
}

/** Each route maps to a "region of space" — flight offset + colour of the local nebula. */
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
    craters: true,
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
    clouds: { color: "255,236,190", coverage: 0.95, opacity: 0.85, speed: 0.05 },
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
    atmosphere: "#6fb4ff",
    clouds: { color: "255,255,255", coverage: 0.55, opacity: 0.5, speed: 0.03 },
    moons: [{ radius: 0.18, distance: 1.5, speed: 0.5, color: "#b9b4ad" }],
  },
  {
    name: "Mars",
    radius: 0.46,
    distance: 15.8,
    speed: 0.04,
    tilt: 0.44,
    craters: true,
    colors: ["#b4552d", "#c96a3b", "#8f4325", "#d78a5c"],
    speckle: "rgba(255,255,255,0.7)",
    seed: 44,
    atmosphere: "#e08a5c",
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
    ring: { inner: 1.9, outer: 3.2 },
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
    atmosphere: "#9fe6ef",
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
    atmosphere: "#6f95ff",
  },
] as const;

/* ------------------------------------------------------------------ Sun */

const Sun = ({ full }: SceneQuality) => {
  const core = useMemo(() => makeGlowTexture("rgba(255,255,255,1)", "rgba(255,196,102,0.55)"), []);
  const flare = useMemo(() => makeGlowTexture("rgba(255,236,196,0.9)", "rgba(255,150,60,0.2)"), []);
  const halo = useRef<THREE.Sprite>(null);
  const light = useRef<THREE.PointLight>(null);

  useEffect(() => {
    const l = light.current;
    if (l && full) {
      l.shadow.mapSize.set(1024, 1024);
      l.shadow.bias = -0.0035;
      l.shadow.camera.far = 90;
    }
  }, [full]);

  useFrame(({ clock }) => {
    if (halo.current) {
      const p = 1 + Math.sin(clock.elapsedTime * 0.4) * 0.03;
      halo.current.scale.setScalar(34 * p);
    }
  });

  return (
    <group>
      <mesh>
        <sphereGeometry args={[2.4, full ? 48 : 24, full ? 48 : 24]} />
        <meshBasicMaterial color="#fff0cf" toneMapped={false} />
      </mesh>
      <sprite ref={halo} scale={34}>
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
      <pointLight
        ref={light}
        color="#ffd9a0"
        intensity={full ? 850 : 500}
        distance={260}
        decay={2}
        castShadow={full}
      />
    </group>
  );
};

/* --------------------------------------------------------------- Planet */

type PlanetDef = (typeof PLANETS)[number];

/** ringGeometry with radial UVs so a 1D ring texture maps inner→outer. */
const makeRingGeometry = (inner: number, outer: number, segments: number) => {
  const geo = new THREE.RingGeometry(inner, outer, segments);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const t = (v.length() - inner) / (outer - inner);
    uv.setXY(i, t, 0.5);
  }
  uv.needsUpdate = true;
  return geo;
};

const Planet = ({ def, full }: { def: PlanetDef; full: boolean }) => {
  const orbit = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Mesh>(null);
  const cloudRef = useRef<THREE.Mesh>(null);
  const moonRefs = useRef<THREE.Group[]>([]);
  const phase = useMemo(() => def.seed * 0.7, [def.seed]);

  const surface = useMemo(
    () =>
      makePlanetSurface({
        colors: [...def.colors],
        banded: "banded" in def ? Boolean(def.banded) : false,
        craters: "craters" in def ? Boolean(def.craters) : false,
        speckle: "speckle" in def ? (def.speckle as string) : undefined,
        seed: def.seed,
        size: full ? 1024 : 256,
      }),
    [def, full],
  );

  const clouds = (def as { clouds?: { color: string; coverage: number; opacity: number; speed: number } }).clouds;
  const cloudTex = useMemo(
    () => (full && clouds ? makeCloudTexture(def.seed + 3, 512, clouds.color, clouds.coverage) : null),
    [full, clouds, def.seed],
  );

  const ring = (def as { ring?: { inner: number; outer: number } }).ring;
  const ringTex = useMemo(() => (ring ? makeRingTexture(def.seed) : null), [ring, def.seed]);
  const ringGeo = useMemo(
    () => (ring ? makeRingGeometry(ring.inner, ring.outer, full ? 128 : 56) : null),
    [ring, full],
  );

  useEffect(
    () => () => {
      surface.map.dispose();
      surface.bump.dispose();
      cloudTex?.dispose();
      ringTex?.dispose();
      ringGeo?.dispose();
    },
    [surface, cloudTex, ringTex, ringGeo],
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    if (orbit.current) orbit.current.rotation.y += dt * def.speed * 0.3;
    if (spin.current) spin.current.rotation.y += dt * 0.06;
    if (cloudRef.current && clouds) cloudRef.current.rotation.y += dt * (0.07 + clouds.speed * 0.3);
    moonRefs.current.forEach((g, i) => {
      const moon = (def as { moons?: readonly { speed: number }[] }).moons?.[i];
      if (g && moon) g.rotation.y += dt * moon.speed * 0.3;
    });
  });

  const moons = (def as { moons?: readonly { radius: number; distance: number; speed: number; color: string }[] })
    .moons;
  const atmosphere = (def as { atmosphere?: string }).atmosphere;

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
          <mesh ref={spin} castShadow={full} receiveShadow={full}>
            <sphereGeometry args={[def.radius, full ? 64 : 20, full ? 64 : 20]} />
            <meshStandardMaterial
              map={surface.map}
              bumpMap={surface.bump}
              bumpScale={full ? def.radius * 0.12 : 0}
              roughness={0.95}
              metalness={0}
            />
          </mesh>

          {cloudTex && clouds && (
            <mesh ref={cloudRef}>
              <sphereGeometry args={[def.radius * 1.02, 48, 48]} />
              <meshStandardMaterial
                map={cloudTex}
                transparent
                opacity={clouds.opacity}
                depthWrite={false}
                roughness={1}
              />
            </mesh>
          )}

          {/* thin rim light: sunlit limb scatter on every body */}
          <mesh scale={1.035}>
            <sphereGeometry args={[def.radius, 32, 32]} />
            <meshBasicMaterial
              color={atmosphere ?? "#cfe2ff"}
              transparent
              opacity={0.075}
              side={THREE.BackSide}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>

          {atmosphere && (
            <mesh scale={1.11}>
              <sphereGeometry args={[def.radius, 32, 32]} />
              <meshBasicMaterial
                color={atmosphere}
                transparent
                opacity={0.13}
                side={THREE.BackSide}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          )}

          {ring && ringGeo && ringTex && (
            <mesh rotation-x={-Math.PI / 2} geometry={ringGeo} receiveShadow={full}>
              <meshStandardMaterial
                map={ringTex}
                alphaMap={ringTex}
                transparent
                opacity={0.95}
                roughness={0.95}
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
                <mesh position={[m.distance, 0, 0]} castShadow receiveShadow>
                  <sphereGeometry args={[m.radius, 20, 20]} />
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

const BeltShard = ({ count, geo, seed }: { count: number; geo: THREE.BufferGeometry; seed: number }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(() => {
    let a0 = seed * 1234.567;
    const rnd = () => {
      a0 = (a0 * 16807) % 2147483647;
      return a0 / 2147483647;
    };
    return Array.from({ length: count }, (_, i) => {
      // gaussian-ish radial scatter with Kirkwood-style thinning
      const gauss = (rnd() + rnd() + rnd() - 1.5) / 1.5;
      return {
        r: 18.4 + gauss * 2.6,
        a: rnd() * Math.PI * 2,
        y: ((rnd() + rnd() + rnd() - 1.5) / 1.5) * 0.95,
        s: 0.018 + Math.pow(rnd(), 3) * 0.22,
        sx: 0.6 + rnd() * 0.9,
        sy: 0.5 + rnd() * 0.8,
        rx: rnd() * Math.PI,
        rz: rnd() * Math.PI,
        tumble: (rnd() - 0.5) * 0.25,
        speed: 0.0075 + rnd() * 0.004,
      };
    });
  }, [count, seed]);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = clock.elapsedTime;
    data.forEach((d, i) => {
      const a = d.a + t * d.speed;
      dummy.position.set(Math.cos(a) * d.r, d.y, Math.sin(a) * d.r);
      dummy.rotation.set(d.rx + t * d.tumble, a, d.rz + t * d.tumble * 0.6);
      dummy.scale.set(d.s * d.sx, d.s * d.sy, d.s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={ref}
      args={[geo, undefined as never, count]}
      frustumCulled={false}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        color={seed % 2 ? "#7a6f65" : "#94897c"}
        roughness={1}
        metalness={0.03}
        flatShading
      />
    </instancedMesh>
  );
};

/** Irregular rocks in several distinct shapes, sizes and depth scatter. */
const AsteroidBelt = ({ count }: { count: number }) => {
  const geos = useMemo(() => [1, 2, 3, 4, 5, 6].map((i) => makeRockGeometry(i * 17 + 3, 1)), []);
  useEffect(() => () => geos.forEach((g) => g.dispose()), [geos]);
  const per = Math.round(count / geos.length);
  return (
    <group>
      {geos.map((g, i) => (
        <BeltShard key={i} geo={g} count={per} seed={i + 1} />
      ))}
    </group>
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
      speed: 0.014 + seed * 0.004,
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
            opacity={0.45}
            toneMapped={false}
          />
        </sprite>
      ))}
    </group>
  );
};

/* ------------------------------------------------------------- Flight path */

/**
 * Smooth closed tour of the system: outbound past the inner worlds, a dip
 * toward Earth and Mars, a run through the asteroid belt, a pass by the gas
 * giants, then out to the wormhole gate and back.
 */
const WORMHOLE_POS = new THREE.Vector3(-56, 14, -58);

const FLIGHT_POINTS: THREE.Vector3[] = [
  new THREE.Vector3(6, 2.2, 10),
  new THREE.Vector3(10.2, 0.9, 5.4), // Venus lane
  new THREE.Vector3(13.4, 0.5, -3.2), // Earth approach (low pass)
  new THREE.Vector3(9.5, 1.6, -11.5),
  new THREE.Vector3(-2.5, 0.7, -16.4), // Mars lane
  new THREE.Vector3(-14.5, 0.4, -12.0), // into the belt
  new THREE.Vector3(-18.6, 0.2, -1.0), // through the belt
  new THREE.Vector3(-20.5, 1.8, 12.5),
  new THREE.Vector3(-9.0, 3.4, 22.5), // Jupiter lane
  new THREE.Vector3(8.0, 2.0, 28.0),
  new THREE.Vector3(24.0, 3.2, 20.0), // Saturn lane / ring plane skim
  new THREE.Vector3(33.0, 6.0, -6.0),
  new THREE.Vector3(14.0, 9.0, -34.0),
  new THREE.Vector3(-24.0, 12.0, -50.0),
  WORMHOLE_POS.clone(), // the gate
  new THREE.Vector3(-70, 9, -20),
  new THREE.Vector3(-44, 4, 18),
  new THREE.Vector3(-18, 2.6, 24),
];

const FLIGHT_CURVE = new THREE.CatmullRomCurve3(FLIGHT_POINTS, true, "catmullrom", 0.5);
const CURVE_LENGTH = FLIGHT_CURVE.getLength();
/** Normalised position of the wormhole gate along the curve. */
const GATE_U = 14 / FLIGHT_POINTS.length;

/* ------------------------------------------------------------ Alien craft */

const AlienCraft = ({ full }: SceneQuality) => {
  const glow = useMemo(() => makeGlowTexture("rgba(190,255,236,1)", "rgba(56,220,190,0.35)"), []);
  const lamps = useMemo(
    () => Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2),
    [],
  );
  const rim = useRef<THREE.Group>(null);
  const domeMat = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05);
    if (rim.current) rim.current.rotation.y += dt * 1.6;
    if (domeMat.current) {
      domeMat.current.emissiveIntensity = 0.7 + Math.sin(clock.elapsedTime * 2.1) * 0.25;
    }
  });

  return (
    <group scale={0.42}>
      {/* saucer hull */}
      <mesh scale={[1.75, 0.16, 1.75]} castShadow={full} receiveShadow={full}>
        <sphereGeometry args={[1, full ? 44 : 20, full ? 20 : 10]} />
        <meshStandardMaterial color="#8ea2b6" metalness={0.85} roughness={0.28} emissive="#16303f" emissiveIntensity={0.6} />
      </mesh>
      {/* lower hull taper */}
      <mesh position={[0, -0.14, 0]} scale={[1.05, 0.4, 1.05]} castShadow={full}>
        <sphereGeometry args={[1, 24, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshStandardMaterial color="#66788c" metalness={0.85} roughness={0.35} />
      </mesh>
      {/* cockpit dome */}
      <mesh position={[0, 0.28, 0]} scale={[0.72, 0.55, 0.72]}>
        <sphereGeometry args={[1, 28, 18, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          ref={domeMat}
          color="#0d2b33"
          emissive="#4df0d0"
          emissiveIntensity={0.8}
          metalness={0.4}
          roughness={0.1}
          transparent
          opacity={0.85}
        />
      </mesh>
      {/* rotating rim lamps */}
      <group ref={rim}>
        {lamps.map((a, i) => (
          <mesh key={i} position={[Math.cos(a) * 1.62, -0.02, Math.sin(a) * 1.62]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshBasicMaterial color={i % 2 ? "#7cf6ff" : "#c08bff"} toneMapped={false} />
          </mesh>
        ))}
      </group>
      {/* underside drive glow + engine trail */}
      <sprite position={[0, -0.35, 0]} scale={3.4}>
        <spriteMaterial
          map={glow}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.55}
          toneMapped={false}
        />
      </sprite>
      <sprite position={[0, 0, 2.4]} scale={[1.6, 1.6, 1.6]}>
        <spriteMaterial
          map={glow}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.4}
          toneMapped={false}
        />
      </sprite>
      <pointLight color="#63f5d6" intensity={full ? 12 : 6} distance={14} decay={2} />
    </group>
  );
};

/* ------------------------------------------- Chase camera + flight driver */

const FlightRig = ({ region, full }: { region: Region; full: boolean }) => {
  const { camera } = useThree();
  const craft = useRef<THREE.Group>(null);

  const state = useRef({
    u: 0,
    bank: 0,
    prevYaw: 0,
    initialised: false,
    jumpCooldown: 0,
  });

  const pos = useMemo(() => new THREE.Vector3(), []);
  const ahead = useMemo(() => new THREE.Vector3(), []);
  const tangent = useMemo(() => new THREE.Vector3(), []);
  const desired = useMemo(() => new THREE.Vector3(), []);
  const lookAt = useMemo(() => new THREE.Vector3(), []);
  const smoothLook = useMemo(() => new THREE.Vector3(), []);
  const offset = useMemo(() => new THREE.Vector3(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const quat = useMemo(() => new THREE.Quaternion(), []);
  const matrix = useMemo(() => new THREE.Matrix4(), []);
  const regionOffset = useMemo(() => new THREE.Vector3(), []);
  const regionTarget = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const s = state.current;

    // route → a gentle offset of the whole flight lane, eased in over ~2s
    regionTarget.set(region.anchor[0] * 0.16, 4 + region.anchor[1] * 0.12, region.anchor[2] * 0.08);
    regionOffset.lerp(regionTarget, 1 - Math.exp(-0.9 * dt));

    // travel at a constant world speed along the curve
    const speed = 0.85 * region.drift;
    s.u = (s.u + (speed * dt) / CURVE_LENGTH) % 1;

    FLIGHT_CURVE.getPointAt(s.u, pos).add(regionOffset);
    FLIGHT_CURVE.getPointAt((s.u + 0.012) % 1, ahead).add(regionOffset);
    FLIGHT_CURVE.getTangentAt(s.u, tangent);

    // wormhole jump: crossing the gate teleports the craft to another region
    s.jumpCooldown = Math.max(0, s.jumpCooldown - dt);
    if (s.jumpCooldown === 0 && Math.abs(s.u - GATE_U) < 0.004) {
      s.u = (s.u + 0.5) % 1;
      s.jumpCooldown = 6;
      FLIGHT_CURVE.getPointAt(s.u, pos).add(regionOffset);
      FLIGHT_CURVE.getPointAt((s.u + 0.012) % 1, ahead).add(regionOffset);
      FLIGHT_CURVE.getTangentAt(s.u, tangent);
      s.initialised = false; // snap the camera through the jump
    }

    // craft orientation, with roll banked into the turn
    const yaw = Math.atan2(tangent.x, tangent.z);
    let dYaw = yaw - s.prevYaw;
    while (dYaw > Math.PI) dYaw -= Math.PI * 2;
    while (dYaw < -Math.PI) dYaw += Math.PI * 2;
    s.prevYaw = yaw;
    const targetBank = THREE.MathUtils.clamp((-dYaw / Math.max(dt, 0.001)) * 0.4, -0.34, 0.34);
    s.bank += (targetBank - s.bank) * (1 - Math.exp(-2.4 * dt));

    const g = craft.current;
    if (g) {
      g.position.copy(pos);
      matrix.lookAt(pos, ahead, up);
      quat.setFromRotationMatrix(matrix);
      g.quaternion.slerp(quat, 1 - Math.exp(-6 * dt));
      g.rotateZ(s.bank);
    }

    // third-person chase camera: behind, above, rolled slightly with the bank
    offset.set(Math.sin(s.bank) * 1.4, 3.4, 0).addScaledVector(tangent, -8.5);
    desired.copy(pos).add(offset);
    lookAt.copy(pos).addScaledVector(tangent, 6);

    if (!s.initialised) {
      camera.position.copy(desired);
      smoothLook.copy(lookAt);
      s.initialised = true;
    } else {
      camera.position.lerp(desired, 1 - Math.exp(-(full ? 3.2 : 2.4) * dt));
      smoothLook.lerp(lookAt, 1 - Math.exp(-3.6 * dt));
    }
    camera.up.set(Math.sin(s.bank) * 0.14, 1, 0).normalize();
    camera.lookAt(smoothLook);
  });

  return (
    <group ref={craft}>
      <AlienCraft full={full} />
    </group>
  );
};

/* -------------------------------------------------------------- Wormhole */

/** Spinning vortex gate the craft flies through. */
const Wormhole = () => {
  const group = useRef<THREE.Group>(null);
  const mats = useRef<THREE.MeshBasicMaterial[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const g = group.current;
    if (!g) return;
    g.rotation.z = t * 0.14;
    const pulse = 0.55 + Math.sin(t * 0.9) * 0.2;
    mats.current.forEach((m, i) => {
      if (m) m.opacity = pulse * (0.4 - i * 0.06);
    });
  });

  return (
    <group ref={group} position={WORMHOLE_POS.toArray()} rotation={[0.5, 0.9, 0]}>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, 0, -i * 2.2]} scale={1 - i * 0.14}>
          <torusGeometry args={[7.5, 1.2 - i * 0.2, 12, 64]} />
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

/* ------------------------------------------------------------- Star sky */

/** Deep-field sky sphere: real-looking star density plus the Milky Way band. */
const StarSky = ({ full }: SceneQuality) => {
  const tex = useMemo(() => makeStarSkyTexture(full ? 4096 : 2048), [full]);
  const ref = useRef<THREE.Mesh>(null);
  useEffect(() => () => tex.dispose(), [tex]);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += Math.min(delta, 0.05) * 0.0015;
  });
  return (
    <mesh ref={ref} rotation={[0.32, 0, 0.42]} frustumCulled={false}>
      <sphereGeometry args={[820, 48, 32]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} depthWrite={false} fog={false} toneMapped={false} />
    </mesh>
  );
};

/* ----------------------------------------------------------------- Scene */

const SolarSystemScene = ({ full, region }: { full: boolean; region: Region }) => {
  return (
    <>
      <color attach="background" args={["#03040a"]} />
      <fog attach="fog" args={["#03040a", 300, 900]} />
      {/* no flat wash: one sun, plus a whisper of starlight fill */}
      <ambientLight intensity={0.06} color="#8ea6ff" />

      <StarSky full={full} />
      {/* near star layer drifts slightly against the fixed sky for parallax */}
      <Stars radius={200} depth={120} count={full ? 900 : 300} factor={1.3} saturation={0} speed={0.05} />
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
      <Wormhole />

      <FlightRig region={region} full={full} />
    </>
  );
};

export default SolarSystemScene;
