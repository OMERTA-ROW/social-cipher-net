import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import {
  CLOUD_TEXTURE_URLS,
  RING_TEXTURE_URL,
  SPACE_TEXTURE_URLS,
  useLazyTexture,
} from "@/components/space/realTextures";

export interface VoyagePlanetDef {
  name: keyof typeof SPACE_TEXTURE_URLS;
  radius: number;
  distance: number;
  speed: number;
  tilt: number;
  atmosphere: [number, number, number];
  atmosphereStrength: number;
  roughness: number;
  bump: number;
}

const atmosphereVertex = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  varying vec3 vNormalWorld;
  varying vec3 vPositionWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vPositionWorld = world.xyz;
    vNormalWorld = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
    #include <logdepthbuf_vertex>
  }
`;

const atmosphereFragment = /* glsl */ `
  precision highp float;
  #include <common>
  #include <logdepthbuf_pars_fragment>
  varying vec3 vNormalWorld;
  varying vec3 vPositionWorld;
  uniform vec3 uColor;
  uniform float uStrength;
  void main() {
    #include <logdepthbuf_fragment>
    vec3 normal = normalize(vNormalWorld);
    vec3 viewDirection = normalize(cameraPosition - vPositionWorld);
    vec3 lightDirection = normalize(-vPositionWorld);
    float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), 3.1);
    float daylight = smoothstep(-0.35, 0.7, dot(normal, lightDirection));
    float twilight = smoothstep(-0.22, 0.22, dot(normal, lightDirection));
    float alpha = fresnel * daylight * twilight * uStrength * 0.68;
    gl_FragColor = vec4(uColor * 0.82, clamp(alpha, 0.0, 0.62));
  }
`;

const SaturnRing = ({ radius, full }: { radius: number; full: boolean }) => {
  const map = useLazyTexture(full ? RING_TEXTURE_URL : undefined, { delay: 900, anisotropy: 4 });
  const geometry = useMemo(() => {
    const inner = radius * 1.35;
    const outer = radius * 2.2;
    const ring = new THREE.RingGeometry(inner, outer, full ? 96 : 48, 1);
    const positions = ring.attributes.position as THREE.BufferAttribute;
    const uvs = ring.attributes.uv as THREE.BufferAttribute;
    const point = new THREE.Vector3();
    for (let index = 0; index < positions.count; index += 1) {
      point.fromBufferAttribute(positions, index);
      uvs.setXY(index, (point.length() - inner) / (outer - inner), 0.5);
    }
    uvs.needsUpdate = true;
    return ring;
  }, [full, radius]);

  return (
    <mesh geometry={geometry} rotation={[Math.PI / 2.2, 0, 0]}>
      <meshStandardMaterial
        map={map ?? undefined}
        alphaMap={map ?? undefined}
        color={map ? "#ffffff" : "#d9c8a0"}
        transparent
        opacity={map ? 0.92 : 0.42}
        side={THREE.DoubleSide}
        depthWrite={false}
        roughness={0.9}
      />
    </mesh>
  );
};

interface VoyageCelestialBodyProps {
  definition: VoyagePlanetDef;
  full: boolean;
  focused: boolean;
  animate: boolean;
  registerRef: (mesh: THREE.Mesh | null) => void;
  onSelect: () => void;
}

const VoyageCelestialBody = ({
  definition,
  full,
  focused,
  animate,
  registerRef,
  onSelect,
}: VoyageCelestialBodyProps) => {
  const group = useRef<THREE.Group>(null);
  const surface = useRef<THREE.Mesh>(null);
  const clouds = useRef<THREE.Mesh>(null);
  const angle = useRef((definition.distance * 0.731) % (Math.PI * 2));
  const map = useLazyTexture(SPACE_TEXTURE_URLS[definition.name], { delay: 180 + definition.distance * 18 });
  const bump = useLazyTexture(full && ["Mercury", "Venus", "Earth", "Mars"].includes(definition.name) ? SPACE_TEXTURE_URLS[definition.name] : undefined, {
    srgb: false,
    delay: 520 + definition.distance * 18,
  });
  const cloudMap = useLazyTexture(full ? CLOUD_TEXTURE_URLS[definition.name] : undefined, {
    delay: 720 + definition.distance * 18,
  });
  const atmosphereUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(...definition.atmosphere) },
      uStrength: { value: definition.atmosphereStrength },
    }),
    [definition.atmosphere, definition.atmosphereStrength],
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    if (animate) angle.current += dt * definition.speed * 0.15;
    if (group.current) {
      group.current.position.set(
        Math.cos(angle.current) * definition.distance,
        Math.sin(angle.current * 0.7) * definition.distance * 0.018,
        Math.sin(angle.current) * definition.distance,
      );
    }
    if (surface.current && animate) surface.current.rotation.y += dt * 0.18;
    if (clouds.current && animate) clouds.current.rotation.y += dt * 0.22;
  });

  const segments = full ? 96 : 48;

  return (
    <group ref={group}>
      <group rotation={[definition.tilt, 0, 0]}>
        <mesh
          ref={(mesh) => {
            surface.current = mesh;
            registerRef(mesh);
          }}
          castShadow
          receiveShadow
          onClick={(event) => {
            event.stopPropagation();
            onSelect();
          }}
        >
          <sphereGeometry args={[definition.radius, segments, segments / 2]} />
          <meshStandardMaterial
            map={map ?? undefined}
            color={map ? "#ffffff" : "#4b4a47"}
            bumpMap={bump ?? undefined}
            bumpScale={bump ? definition.bump * definition.radius : 0}
            roughness={definition.roughness}
            metalness={0}
          />
        </mesh>

        {cloudMap && (
          <mesh ref={clouds}>
            <sphereGeometry args={[definition.radius * 1.018, segments, segments / 2]} />
            <meshStandardMaterial
              map={cloudMap}
              alphaMap={cloudMap}
              transparent
              opacity={definition.name === "Venus" ? 0.92 : 0.78}
              roughness={1}
              alphaTest={0.015}
              depthWrite={false}
            />
          </mesh>
        )}

        <mesh scale={1.07}>
          <sphereGeometry args={[definition.radius, full ? 48 : 28, full ? 24 : 14]} />
          <shaderMaterial
            vertexShader={atmosphereVertex}
            fragmentShader={atmosphereFragment}
            uniforms={atmosphereUniforms}
            transparent
            depthWrite={false}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {definition.name === "Saturn" && <SaturnRing radius={definition.radius} full={full} />}
      </group>

      {focused && (
        <Html center position={[0, definition.radius * 1.7, 0]} distanceFactor={12}>
          <div className="whitespace-nowrap rounded border border-primary/70 bg-background/75 px-2 py-0.5 text-xs text-primary shadow-[0_0_18px_hsl(var(--primary)/0.28)] backdrop-blur-md">
            {definition.name}
          </div>
        </Html>
      )}
    </group>
  );
};

export default VoyageCelestialBody;