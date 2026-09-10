import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { NOISE_GLSL } from "./noise.glsl";

/**
 * Procedural bodies on inclined elliptical orbits around a single local star.
 * Surfaces, clouds, terminator and rim glow are all shader-generated —
 * there are no texture maps in this scene.
 */

const planetVert = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vPosW;
  varying vec3 vObj;

  void main() {
    vObj = normalize(position);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vPosW = world.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const planetFrag = /* glsl */ `
  precision highp float;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  varying vec3 vObj;

  uniform vec3 uLightPos;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uAtmo;
  uniform float uBands;     // >0 = gas giant banding
  uniform float uClouds;    // cloud layer strength
  uniform float uRough;
  uniform float uSeed;
  uniform float uTime;
  uniform float uDetail;

  ${NOISE_GLSL}

  void main() {
    vec3 n = normalize(vNormalW);
    vec3 p = vObj * 2.2 + uSeed;
    int oct = uDetail > 0.5 ? 5 : 3;

    float continents = fbm3(p * 1.35, oct);
    float terrain = continents * 0.68 + fbm3(p * 3.8 + 7.0, oct) * 0.22
      + fbm3(p * 11.0 - 5.0, oct) * 0.10;
    float detail = ridge3(p * 6.5, oct) * uRough;
    float micro = fbm3(p * 24.0 + uSeed * 2.0, oct);

    float bandy = 0.5 + 0.5 * sin(vObj.y * uBands + terrain * 2.4);
    float mixv = uBands > 0.5
      ? clamp(bandy * 0.72 + terrain * 0.34 + micro * 0.08, 0.0, 1.0)
      : clamp(terrain * 0.78 + detail * 0.28 + micro * 0.10, 0.0, 1.0);

    vec3 surf = mix(uColorA, uColorB, smoothstep(0.18, 0.86, mixv));
    surf *= 0.86 + micro * 0.24;

    // polar caps for rocky worlds
    if (uBands < 0.5) {
      float cap = smoothstep(0.80, 0.95, abs(vObj.y)) * smoothstep(0.35, 0.7, terrain + 0.25);
      surf = mix(surf, vec3(0.94, 0.96, 1.0), cap * 0.8);
    }

    // drifting cloud deck
    if (uClouds > 0.01) {
      float c = fbm3(vObj * 3.4 + vec3(uTime * 0.003, 0.0, uTime * 0.0015) + uSeed * 3.0, oct);
      float wisps = ridge3(vObj * 9.5 - vec3(uTime * 0.001, 0.0, 0.0) + uSeed, oct);
      float cover = smoothstep(0.54, 0.80, c + wisps * 0.12) * uClouds;
      surf = mix(surf, vec3(0.92, 0.95, 1.0), cover * 0.82);
    }

    vec3 L = normalize(uLightPos - vPosW);
    float ndl = dot(n, L);
    // real terminator: narrow soft edge, night side almost black
    float lit = smoothstep(-0.08, 0.12, ndl) * max(ndl, 0.0);
    float irradiance = lit * (1.18 + 0.22 * max(ndl, 0.0));
    vec3 col = surf * (irradiance + 0.004);

    // specular sheen on the lit hemisphere
    vec3 V = normalize(cameraPosition - vPosW);
    vec3 H = normalize(L + V);
    float localRough = clamp(uRough * (0.72 + micro * 0.38), 0.08, 1.0);
    float specPower = mix(110.0, 18.0, localRough);
    col += vec3(1.0, 0.96, 0.88) * pow(max(dot(n, H), 0.0), specPower)
      * lit * 0.22 * (1.0 - localRough);

    // atmospheric rim, strongest where the limb faces the star
    float fres = pow(1.0 - max(dot(n, V), 0.0), 4.2);
    float forwardScatter = pow(max(dot(V, -L), 0.0), 3.0);
    col += uAtmo * fres * smoothstep(-0.42, 0.72, ndl) * (0.72 + forwardScatter * 0.38);

    col = col / (col + 1.0) * 1.6;
    gl_FragColor = vec4(col, 1.0);
  }
`;

interface Body {
  name: string;
  radius: number;
  a: number;      // semi-major axis
  ecc: number;
  incl: number;   // radians
  phase: number;
  tilt: number;
  spin: number;
  colorA: [number, number, number];
  colorB: [number, number, number];
  atmo: [number, number, number];
  bands: number;
  clouds: number;
  rough: number;
  ring?: { inner: number; outer: number; color: [number, number, number] };
}

const BODIES: Body[] = [
  { name: "inner", radius: 3.2, a: 46, ecc: 0.19, incl: 0.12, phase: 0.7, tilt: 0.03, spin: 0.10,
    colorA: [0.34, 0.31, 0.29], colorB: [0.62, 0.58, 0.53], atmo: [0.25, 0.22, 0.20], bands: 0, clouds: 0, rough: 1.0 },
  { name: "terra", radius: 5.0, a: 74, ecc: 0.05, incl: 0.05, phase: 2.3, tilt: 0.41, spin: 0.07,
    colorA: [0.04, 0.16, 0.42], colorB: [0.16, 0.42, 0.20], atmo: [0.30, 0.55, 1.0], bands: 0, clouds: 0.55, rough: 0.7 },
  { name: "rust", radius: 4.0, a: 108, ecc: 0.13, incl: 0.09, phase: 4.4, tilt: 0.44, spin: 0.065,
    colorA: [0.45, 0.19, 0.10], colorB: [0.80, 0.46, 0.26], atmo: [0.75, 0.40, 0.28], bands: 0, clouds: 0.08, rough: 0.9 },
  { name: "giant", radius: 11.0, a: 168, ecc: 0.06, incl: 0.03, phase: 1.1, tilt: 0.05, spin: 0.16,
    colorA: [0.46, 0.33, 0.22], colorB: [0.92, 0.83, 0.66], atmo: [0.80, 0.66, 0.45], bands: 20, clouds: 0.12, rough: 0.35 },
  { name: "ringed", radius: 9.0, a: 240, ecc: 0.05, incl: 0.16, phase: 3.6, tilt: 0.47, spin: 0.14,
    colorA: [0.62, 0.53, 0.34], colorB: [0.95, 0.90, 0.72], atmo: [0.85, 0.78, 0.55], bands: 16, clouds: 0.08, rough: 0.35,
    ring: { inner: 1.5, outer: 2.5, color: [0.85, 0.78, 0.62] } },
  { name: "ice", radius: 6.4, a: 320, ecc: 0.04, incl: 0.2, phase: 5.2, tilt: 1.6, spin: 0.09,
    colorA: [0.24, 0.55, 0.62], colorB: [0.58, 0.85, 0.90], atmo: [0.45, 0.80, 0.95], bands: 8, clouds: 0.1, rough: 0.4 },
];

const ORBIT_SPEED = 0.24;

const orbitPoint = (b: Body, t: number, out: THREE.Vector3) => {
  const period = Math.pow(b.a / 46, 1.5) * 120;
  const ang = b.phase + (t * ORBIT_SPEED) / period * Math.PI * 2;
  const bMin = b.a * Math.sqrt(Math.max(1 - b.ecc * b.ecc, 0.01));
  const x = b.a * Math.cos(ang) - b.a * b.ecc;
  const z = bMin * Math.sin(ang);
  out.set(x, z * Math.sin(b.incl), z * Math.cos(b.incl));
  return out;
};

const PlanetMesh = ({ body, detail, segments }: { body: Body; detail: number; segments: number }) => {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  const uniforms = useMemo(
    () => ({
      uLightPos: { value: new THREE.Vector3(0, 0, 0) },
      uColorA: { value: new THREE.Color(...body.colorA) },
      uColorB: { value: new THREE.Color(...body.colorB) },
      uAtmo: { value: new THREE.Color(...body.atmo) },
      uBands: { value: body.bands },
      uClouds: { value: body.clouds },
      uRough: { value: body.rough },
      uSeed: { value: body.a * 0.37 },
      uTime: { value: 0 },
      uDetail: { value: detail },
    }),
    [],
  );
  uniforms.uDetail.value = detail;

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (group.current) group.current.position.copy(orbitPoint(body, t, tmp));
    if (mesh.current) mesh.current.rotation.y += Math.min(delta, 0.05) * body.spin * 0.28;
    if (mat.current) mat.current.uniforms.uTime.value = t;
  });

  return (
    <group ref={group}>
      <group rotation={[body.tilt, 0, 0]}>
        <mesh ref={mesh}>
          <sphereGeometry args={[body.radius, segments, segments / 2]} />
          <shaderMaterial ref={mat} vertexShader={planetVert} fragmentShader={planetFrag} uniforms={uniforms} toneMapped={false} />
        </mesh>
        {body.ring && (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[body.radius * body.ring.inner, body.radius * body.ring.outer, 96]} />
            <meshBasicMaterial
              color={new THREE.Color(...body.ring.color)}
              side={THREE.DoubleSide}
              transparent
              opacity={0.32}
              depthWrite={false}
            />
          </mesh>
        )}
      </group>
    </group>
  );
};

const Planets = ({ full }: { full: boolean }) => {
  const detail = full ? 1 : 0;
  const segments = full ? 64 : 32;
  const bodies = full ? BODIES : BODIES.slice(0, 4);

  return (
    <group>
      {/* local star: the single light source for every body */}
      <pointLight position={[0, 0, 0]} intensity={3} distance={0} decay={0} color="#fff3d8" />
      <mesh>
        <sphereGeometry args={[16, 48, 32]} />
        <meshBasicMaterial color="#fff0cf" toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[22, 32, 16]} />
        <meshBasicMaterial color="#ffb460" transparent opacity={0.16} depthWrite={false} toneMapped={false} />
      </mesh>

      {bodies.map((b) => (
        <PlanetMesh key={b.name} body={b} detail={detail} segments={segments} />
      ))}
    </group>
  );
};

export default Planets;
