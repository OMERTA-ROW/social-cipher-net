import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import nebulaUrl from "@/assets/space/nebula.jpg";
import galaxyUrl from "@/assets/space/galaxy.jpg";
import supernovaUrl from "@/assets/space/supernova.jpg";
import blackholeUrl from "@/assets/space/blackhole.jpg";
import wormholeUrl from "@/assets/space/wormhole.jpg";
import cometUrl from "@/assets/space/comet.jpg";
import pulsarUrl from "@/assets/space/pulsar.jpg";
import quasarUrl from "@/assets/space/quasar.jpg";

type V3 = [number, number, number];

interface EventTextures {
  nebula: THREE.Texture;
  galaxy: THREE.Texture;
  supernova: THREE.Texture;
  blackhole: THREE.Texture;
  wormhole: THREE.Texture;
  comet: THREE.Texture;
  pulsar: THREE.Texture;
  quasar: THREE.Texture;
}

const seeded = (seed: number) => {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
};

const at = (point: V3, scale: number): V3 => [point[0] * scale, point[1] * scale, point[2] * scale];

const EVENT_URLS = {
  nebula: nebulaUrl,
  galaxy: galaxyUrl,
  supernova: supernovaUrl,
  blackhole: blackholeUrl,
  wormhole: wormholeUrl,
  comet: cometUrl,
  pulsar: pulsarUrl,
  quasar: quasarUrl,
} as const;

let sharedTextures: EventTextures | null = null;

/**
 * Non-throwing texture load: each texture starts as a dim 1×1 fallback and
 * swaps in the image when it arrives. A failed or stale asset request never
 * suspends or crashes the scene (useLoader would throw and blank the page).
 */
const getEventTextures = (): EventTextures => {
  if (sharedTextures) return sharedTextures;
  const loader = new THREE.TextureLoader();
  const result = {} as EventTextures;
  (Object.keys(EVENT_URLS) as (keyof EventTextures)[]).forEach((key) => {
    const fallback = document.createElement("canvas");
    fallback.width = fallback.height = 1;
    const ctx = fallback.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#181820";
      ctx.fillRect(0, 0, 1, 1);
    }
    const texture = new THREE.Texture(fallback as unknown as HTMLImageElement);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    loader.load(
      EVENT_URLS[key],
      (loaded) => {
        texture.image = loaded.image as HTMLImageElement;
        texture.anisotropy = 2;
        texture.needsUpdate = true;
      },
      undefined,
      () => {
        /* keep fallback; scene stays up */
      },
    );
    result[key] = texture;
  });
  sharedTextures = result;
  return result;
};

const useEventTextures = (): EventTextures => useMemo(getEventTextures, []);

const makePointGeometry = (
  count: number,
  seed: number,
  point: (random: () => number, index: number) => [number, number, number],
) => {
  const random = seeded(seed);
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    positions.set(point(random, index), index * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.computeBoundingSphere();
  return geometry;
};

const useDisposableGeometry = (geometry: THREE.BufferGeometry) => {
  useEffect(() => () => geometry.dispose(), [geometry]);
};

const SOFT_POINT_VERTEX_SHADER = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  uniform float uSize;

  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = max(1.0, uSize * (300.0 / max(1.0, -viewPosition.z)));
    gl_Position = projectionMatrix * viewPosition;
    #include <logdepthbuf_vertex>
  }
`;

const SOFT_POINT_FRAGMENT_SHADER = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform vec3 uColor;
  uniform float uOpacity;

  void main() {
    #include <logdepthbuf_fragment>
    float radius = length(gl_PointCoord - vec2(0.5));
    float alpha = 1.0 - smoothstep(0.12, 0.5, radius);
    if (alpha < 0.015) discard;

    float luminousCore = 1.0 - smoothstep(0.0, 0.24, radius);
    vec3 color = uColor * (0.82 + luminousCore * 0.38);
    gl_FragColor = vec4(color, alpha * uOpacity);
  }
`;

const AnimatedPoints = ({
  geometry,
  color,
  size,
  opacity,
  animate,
  spin = 0,
  rotation = [0, 0, 0],
}: {
  geometry: THREE.BufferGeometry;
  color: string;
  size: number;
  opacity: number;
  animate: boolean;
  spin?: number;
  rotation?: V3;
}) => {
  const points = useRef<THREE.Points>(null);
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(color) },
      uSize: { value: size },
      uOpacity: { value: opacity },
    }),
    [color, opacity, size],
  );
  useFrame((_, delta) => {
    if (!animate || !points.current) return;
    points.current.rotation.y += Math.min(delta, 0.05) * spin;
  });
  return (
    <points ref={points} geometry={geometry} rotation={rotation} frustumCulled={false}>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={SOFT_POINT_VERTEX_SHADER}
        fragmentShader={SOFT_POINT_FRAGMENT_SHADER}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
};

const BlackHole = ({ position, size, animate, detail }: { position: V3; size: number; animate: boolean; detail: THREE.Texture }) => {
  const disk = useRef<THREE.Group>(null);
  const infall = useMemo(
    () => makePointGeometry(150, 17, (random) => {
      const radius = size * (0.48 + random() * 1.55);
      const angle = random() * Math.PI * 2;
      return [Math.cos(angle) * radius, (random() - 0.5) * size * 0.11, Math.sin(angle) * radius];
    }),
    [size],
  );
  useDisposableGeometry(infall);
  useFrame((_, delta) => {
    if (!animate || !disk.current) return;
    const dt = Math.min(delta, 0.05);
    disk.current.rotation.y += dt * 0.17;
    if (disk.current.children[1]) disk.current.children[1].rotation.z -= dt * 0.09;
  });
  return (
    <group position={position} rotation={[0.34, 0.2, -0.12]}>
      <mesh renderOrder={4}>
        <sphereGeometry args={[size * 0.38, 32, 24]} />
        <meshBasicMaterial color="#000000" depthWrite />
      </mesh>
      <group ref={disk}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[size * 0.78, size * 0.31, 12, 96]} />
          <meshBasicMaterial map={detail} color="#ffb56b" transparent opacity={0.54} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[size * 1.03, size * 0.055, 8, 96]} />
          <meshBasicMaterial color="#8ecbff" transparent opacity={0.68} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
        <AnimatedPoints geometry={infall} color="#ffd2a1" size={size * 0.055} opacity={0.72} animate={animate} spin={0.11} />
      </group>
    </group>
  );
};

const Wormhole = ({ position, size, animate, detail }: { position: V3; size: number; animate: boolean; detail: THREE.Texture }) => {
  const group = useRef<THREE.Group>(null);
  const stream = useMemo(
    () => makePointGeometry(220, 29, (random) => {
      const z = (random() - 0.5) * size * 3.4;
      const radius = size * (0.2 + (z / (size * 3.4) + 0.5) * 0.8);
      const angle = z * 0.08 + random() * Math.PI * 2;
      return [Math.cos(angle) * radius, Math.sin(angle) * radius, z];
    }),
    [size],
  );
  useDisposableGeometry(stream);
  useFrame((_, delta) => {
    if (!animate || !group.current) return;
    const dt = Math.min(delta, 0.05);
    group.current.rotation.z += dt * 0.12;
    group.current.children.forEach((child, index) => {
      if (child instanceof THREE.Mesh) child.rotation.z += dt * (0.08 + index * 0.015);
    });
  });
  return (
    <group ref={group} position={position} rotation={[0.1, -0.55, 0.2]}>
      {[0, 1, 2, 3].map((index) => (
        <mesh key={index} position={[0, 0, -index * size * 0.38]} scale={1 - index * 0.13}>
          <torusGeometry args={[size, size * (0.12 + index * 0.015), 12, 64]} />
          <meshBasicMaterial map={detail} color={index % 2 ? "#9b8cff" : "#5fd8ff"} transparent opacity={0.54 - index * 0.07} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
      ))}
      <AnimatedPoints geometry={stream} color="#c8edff" size={size * 0.055} opacity={0.6} animate={animate} spin={0.3} />
    </group>
  );
};

const Nebula = ({ position, size, colors, seed, animate, full, detail }: { position: V3; size: number; colors: string[]; seed: number; animate: boolean; full: boolean; detail: THREE.Texture }) => {
  const group = useRef<THREE.Group>(null);
  const geometry = useMemo(
    () => makePointGeometry(full ? 1100 : 360, seed, (random) => {
      const radius = Math.pow(random(), 0.62) * size;
      const theta = random() * Math.PI * 2;
      const y = (random() - 0.5) * size * 0.55;
      return [Math.cos(theta) * radius, y, Math.sin(theta) * radius * 0.72];
    }),
    [full, seed, size],
  );
  useDisposableGeometry(geometry);
  useFrame(({ clock }, delta) => {
    if (!animate || !group.current) return;
    const dt = Math.min(delta, 0.05);
    group.current.rotation.y += dt * 0.003;
    group.current.rotation.z = Math.sin(clock.elapsedTime * 0.035 + seed) * 0.025;
  });
  return (
    <group ref={group} position={position} rotation={[seed * 0.13, seed * 0.07, seed * 0.11]}>
      <AnimatedPoints geometry={geometry} color={colors[0]} size={size * 0.034} opacity={0.38} animate={animate} spin={0.002} />
      <mesh scale={[1, 0.42, 0.72]}>
        <sphereGeometry args={[size * 0.78, 24, 16]} />
        <meshBasicMaterial map={detail} color={colors[1]} side={THREE.DoubleSide} transparent opacity={0.1} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <pointLight color={colors[2]} intensity={size * 0.035} distance={size * 2.6} decay={2} />
    </group>
  );
};

const SpiralGalaxy = ({ position, size, tilt, seed, count, animate, detail }: { position: V3; size: number; tilt: V3; seed: number; count: number; animate: boolean; detail: THREE.Texture }) => {
  const group = useRef<THREE.Group>(null);
  const geometry = useMemo(
    () => makePointGeometry(count, seed, (random, index) => {
      const arm = index % 4;
      const radius = Math.pow(random(), 0.58) * size;
      const angle = arm * Math.PI * 0.5 + radius / size * Math.PI * 4.8 + (random() - 0.5) * 0.34;
      const spread = (1 - radius / size) * size * 0.03 + size * 0.008;
      return [Math.cos(angle) * radius + (random() - 0.5) * spread, (random() - 0.5) * spread, Math.sin(angle) * radius + (random() - 0.5) * spread];
    }),
    [count, seed, size],
  );
  useDisposableGeometry(geometry);
  useFrame((_, delta) => {
    if (animate && group.current) group.current.rotation.y += Math.min(delta, 0.05) * 0.006;
  });
  return (
    <group ref={group} position={position} rotation={tilt}>
      <AnimatedPoints geometry={geometry} color="#d9e6ff" size={size * 0.0065} opacity={0.72} animate={animate} spin={0.003} />
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[size * 0.2, size * 0.34, size * 0.025, 40, 1, true]} />
        <meshBasicMaterial map={detail} color="#ffd4a3" transparent opacity={0.19} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
      <pointLight color="#fff0cf" intensity={size * 0.025} distance={size * 0.7} decay={2} />
    </group>
  );
};

const Comet = ({ orbit, size, speed, phase, animate, detail }: { orbit: [number, number, number]; size: number; speed: number; phase: number; animate: boolean; detail: THREE.Texture }) => {
  const group = useRef<THREE.Group>(null);
  const time = useRef(phase);
  const position = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const tail = useMemo(
    () => makePointGeometry(90, Math.round(phase * 100), (random) => {
      const distance = Math.pow(random(), 0.55) * size * 115;
      const spread = (distance / (size * 115)) * size * 7;
      return [(random() - 0.5) * spread, (random() - 0.5) * spread, distance];
    }),
    [phase, size],
  );
  useDisposableGeometry(tail);
  useFrame((_, delta) => {
    if (animate) time.current += Math.min(delta, 0.05) * speed;
    const [a, b, tilt] = orbit;
    const z = Math.sin(time.current) * b;
    position.set(Math.cos(time.current) * a, z * Math.sin(tilt), z * Math.cos(tilt));
    if (!group.current) return;
    group.current.position.copy(position);
    group.current.lookAt(look.copy(position).multiplyScalar(1.9));
  });
  return (
    <group ref={group}>
      <mesh castShadow>
        <icosahedronGeometry args={[size * 1.2, 2]} />
        <meshStandardMaterial map={detail} color="#b9a99a" roughness={0.9} />
      </mesh>
      <mesh>
        <sphereGeometry args={[size * 3.4, 16, 12]} />
        <meshBasicMaterial color="#dff7ff" transparent opacity={0.22} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <AnimatedPoints geometry={tail} color="#bdeaff" size={size * 1.4} opacity={0.52} animate={animate} spin={0.006} />
    </group>
  );
};

const MeteorShower = ({ center, spread, count, animate }: { center: V3; spread: number; count: number; animate: boolean }) => {
  const state = useMemo(() => {
    const random = seeded(907);
    const meteors = Array.from({ length: count }, () => ({
      point: new THREE.Vector3((random() - 0.5) * spread, (random() - 0.5) * spread, (random() - 0.5) * spread),
      speed: 0.4 + random() * 0.8,
    }));
    const direction = new THREE.Vector3(-1, -0.45, 0.3).normalize();
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 6), 3));
    return { meteors, direction, geometry, random };
  }, [count, spread]);
  useDisposableGeometry(state.geometry);
  useFrame((_, delta) => {
    const dt = animate ? Math.min(delta, 0.05) : 0;
    const attribute = state.geometry.getAttribute("position");
    const positions = attribute.array as Float32Array;
    const length = spread * 0.04;
    state.meteors.forEach((meteor, index) => {
      meteor.point.addScaledVector(state.direction, meteor.speed * spread * 0.25 * dt);
      if (meteor.point.length() > spread * 0.6) meteor.point.set((state.random() - 0.2) * spread * 0.5, (state.random() + 0.1) * spread * 0.3, (state.random() - 0.5) * spread);
      positions.set([meteor.point.x, meteor.point.y, meteor.point.z, meteor.point.x - state.direction.x * length, meteor.point.y - state.direction.y * length, meteor.point.z - state.direction.z * length], index * 6);
    });
    attribute.needsUpdate = true;
  });
  return (
    <lineSegments geometry={state.geometry} position={center} frustumCulled={false}>
      <lineBasicMaterial color="#cfe8ff" transparent opacity={0.62} blending={THREE.AdditiveBlending} depthWrite={false} />
    </lineSegments>
  );
};

const Pulsar = ({ position, size, animate, detail }: { position: V3; size: number; animate: boolean; detail: THREE.Texture }) => {
  const beams = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!animate || !beams.current) return;
    const dt = Math.min(delta, 0.05);
    beams.current.rotation.z += dt * 0.74;
    beams.current.rotation.y += dt * 0.17;
  });
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[size, 24, 18]} />
        <meshBasicMaterial map={detail} color="#eaf8ff" toneMapped={false} />
      </mesh>
      <group ref={beams} rotation={[0.35, 0, 0.5]}>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[0, side * size * 6, 0]} rotation={[side < 0 ? Math.PI : 0, 0, 0]}>
            <coneGeometry args={[size * 1.8, size * 12, 24, 1, true]} />
            <meshBasicMaterial color="#8fdcff" transparent opacity={0.16} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </mesh>
        ))}
      </group>
      <pointLight color="#a9e8ff" intensity={size * 2.5} distance={size * 25} decay={2} />
    </group>
  );
};

const Supernova = ({ position, size, animate, detail }: { position: V3; size: number; animate: boolean; detail: THREE.Texture }) => {
  const shell = useRef<THREE.Mesh>(null);
  const phase = useRef(0.18);
  const ejecta = useMemo(
    () => makePointGeometry(420, 73, (random) => {
      const radius = size * (0.55 + random() * 0.45);
      const y = random() * 2 - 1;
      const angle = random() * Math.PI * 2;
      const radial = Math.sqrt(1 - y * y);
      return [Math.cos(angle) * radial * radius, y * radius, Math.sin(angle) * radial * radius];
    }),
    [size],
  );
  useDisposableGeometry(ejecta);
  useFrame((_, delta) => {
    if (!animate || !shell.current) return;
    phase.current = (phase.current + Math.min(delta, 0.05) * 0.035) % 1;
    const eased = 0.82 + (0.5 - Math.cos(phase.current * Math.PI * 2) * 0.5) * 0.32;
    shell.current.scale.setScalar(eased);
    const material = shell.current.material;
    if (material instanceof THREE.MeshBasicMaterial) material.opacity = 0.1 + Math.pow(Math.sin(phase.current * Math.PI), 2) * 0.2;
  });
  return (
    <group position={position}>
      <mesh ref={shell}>
        <sphereGeometry args={[size, 36, 24]} />
        <meshBasicMaterial map={detail} color="#ffcab0" transparent opacity={0.22} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <AnimatedPoints geometry={ejecta} color="#ffc29a" size={size * 0.022} opacity={0.64} animate={animate} spin={0.012} />
      <pointLight color="#ff9e73" intensity={size * 0.1} distance={size * 2.4} decay={2} />
    </group>
  );
};

const Quasar = ({ position, size, animate, detail }: { position: V3; size: number; animate: boolean; detail: THREE.Texture }) => {
  const group = useRef<THREE.Group>(null);
  const jets = useMemo(
    () => makePointGeometry(300, 101, (random, index) => {
      const side = index % 2 === 0 ? -1 : 1;
      const distance = Math.pow(random(), 0.7) * size * 9 * side;
      const width = (Math.abs(distance) / (size * 9)) * size * 0.4;
      return [(random() - 0.5) * width, distance, (random() - 0.5) * width];
    }),
    [size],
  );
  useDisposableGeometry(jets);
  useFrame((_, delta) => {
    if (animate && group.current) group.current.rotation.y += Math.min(delta, 0.05) * 0.13;
  });
  return (
    <group ref={group} position={position} rotation={[0.3, 0.4, -0.45]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[size * 0.65, size * 0.2, 12, 72]} />
        <meshBasicMaterial map={detail} color="#fff1c7" transparent opacity={0.58} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[size * 0.22, 20, 16]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      <AnimatedPoints geometry={jets} color="#9fdcff" size={size * 0.065} opacity={0.72} animate={animate} spin={0.01} />
    </group>
  );
};

export const SolarFlares = ({ radius, animate, full = true, steady = false }: { radius: number; animate: boolean; full?: boolean; steady?: boolean }) => {
  const group = useRef<THREE.Group>(null);
  const corona = useRef<THREE.ShaderMaterial>(null);
  const cme = useRef<THREE.Points>(null);
  const cmeMaterial = useRef<THREE.ShaderMaterial>(null);
  const loops = useMemo(() => {
    const random = seeded(77);
    return Array.from({ length: full ? 7 : 4 }, () => ({
      rotation: [random() * Math.PI * 2, random() * Math.PI * 2, random() * Math.PI * 2] as V3,
      radius: radius * (0.18 + random() * 0.25),
      phase: random() * Math.PI * 2,
    }));
  }, [full, radius]);
  const cmeGeometry = useMemo(
    () => makePointGeometry(full ? 96 : 48, 7721, (random) => {
      const cone = Math.pow(random(), 0.55);
      const angle = random() * Math.PI * 2;
      const spread = cone * radius * 0.42;
      return [radius * (1.02 + cone * 1.8), Math.cos(angle) * spread, Math.sin(angle) * spread];
    }),
    [full, radius],
  );
  useDisposableGeometry(cmeGeometry);
  const cmeUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color("#ff9b4f") },
      uSize: { value: radius * 0.12 },
      uOpacity: { value: 0 },
    }),
    [radius],
  );
  const coronaUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: 0.16 },
    }),
    [],
  );
  const time = useRef(0);
  useFrame((_, delta) => {
    if (!group.current) return;
    if (animate && !steady) time.current += Math.min(delta, 0.05);
    const effectTime = steady ? 5.142 : time.current;
    if (corona.current) corona.current.uniforms.uTime.value = effectTime;
    group.current.children.forEach((child, index) => {
      const loop = loops[index - 1];
      if (!loop) return;
      child.scale.setScalar(0.85 + 0.25 * Math.sin(effectTime * 0.6 + loop.phase));
    });
    const cycle = steady ? 0.18 : (time.current * 0.035) % 1;
    const active = steady ? 0.4 : smoothPulse(cycle, 0.08, 0.72);
    if (cme.current) {
      cme.current.scale.setScalar(0.72 + cycle * 0.85);
      cme.current.rotation.x = Math.sin(effectTime * 0.025) * 0.18;
    }
    if (cmeMaterial.current) cmeMaterial.current.uniforms.uOpacity.value = active * 0.3;
  });
  return (
    <group ref={group}>
      <mesh scale={1.13} renderOrder={-1}>
        <sphereGeometry args={[radius, 48, 24]} />
        <shaderMaterial
          ref={corona}
          uniforms={coronaUniforms}
          vertexShader={/* glsl */ `
            #include <common>
            #include <logdepthbuf_pars_vertex>
            varying vec3 vNormalW;
            varying vec3 vPositionW;
            void main() {
              vec4 world = modelMatrix * vec4(position, 1.0);
              vPositionW = world.xyz;
              vNormalW = normalize(mat3(modelMatrix) * normal);
              gl_Position = projectionMatrix * viewMatrix * world;
              #include <logdepthbuf_vertex>
            }
          `}
          fragmentShader={/* glsl */ `
            #include <common>
            #include <logdepthbuf_pars_fragment>
            uniform float uTime;
            uniform float uOpacity;
            varying vec3 vNormalW;
            varying vec3 vPositionW;
            void main() {
              #include <logdepthbuf_fragment>
              vec3 viewDir = normalize(cameraPosition - vPositionW);
              float rim = pow(1.0 - max(dot(normalize(vNormalW), viewDir), 0.0), 4.2);
              float filament = 0.82 + 0.18 * sin(vPositionW.y * 0.23 + vPositionW.x * 0.11 + uTime * 0.08);
              float alpha = rim * filament * uOpacity;
              if (alpha < 0.004) discard;
              gl_FragColor = vec4(vec3(1.0, 0.48, 0.16), alpha);
            }
          `}
          transparent
          depthWrite={false}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      {loops.map((loop, index) => (
        <group key={index} rotation={loop.rotation}>
          <mesh position={[0, radius * 0.98, 0]}>
            <torusGeometry args={[loop.radius, loop.radius * 0.08, 8, 48, Math.PI]} />
            <meshBasicMaterial color="#ff8a3a" transparent opacity={0.42} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </mesh>
        </group>
      ))}
      <points ref={cme} geometry={cmeGeometry} rotation={[0.35, -0.5, 0.2]} frustumCulled={false}>
        <shaderMaterial
          ref={cmeMaterial}
          uniforms={cmeUniforms}
          vertexShader={SOFT_POINT_VERTEX_SHADER}
          fragmentShader={SOFT_POINT_FRAGMENT_SHADER}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>
    </group>
  );
};

const smoothPulse = (phase: number, rise: number, fall: number) => {
  if (phase <= rise) return THREE.MathUtils.smoothstep(phase, 0, rise);
  if (phase >= fall) return 0;
  return 1 - THREE.MathUtils.smoothstep(phase, rise, fall);
};

export interface CosmicAnomaliesProps {
  scale: number;
  animate: boolean;
  full: boolean;
  local?: boolean;
}

/** Decorative cosmic event art was intentionally retired; physical comets and asteroids live in their own systems. */
const CosmicAnomalies = (_props: CosmicAnomaliesProps) => null;

export default CosmicAnomalies;