import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Procedural starfield built from several concentric depth shells.
 * Each shell is a single THREE.Points draw call; parallax comes for free
 * from perspective because the camera physically travels between them.
 */

const vert = /* glsl */ `
  attribute float aSize;
  attribute float aSeed;
  attribute vec3 aColor;

  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uBoost;

  varying vec3 vColor;
  varying float vBright;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;

    float tw = 0.82 + 0.18 * sin(uTime * (0.6 + aSeed * 1.7) + aSeed * 40.0);
    float dist = max(-mv.z, 1.0);
    gl_PointSize = aSize * uPixelRatio * (300.0 / dist) * tw * uBoost;
    gl_PointSize = clamp(gl_PointSize, 0.6, 26.0);

    vColor = aColor;
    vBright = tw;
  }
`;

const frag = /* glsl */ `
  varying vec3 vColor;
  varying float vBright;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    // tight sharp core + faint halo so bright stars glow into the bloom pass
    float core = smoothstep(0.5, 0.02, d);
    float halo = smoothstep(0.5, 0.0, d) * 0.35;
    float a = core * core + halo;
    if (a < 0.004) discard;
    gl_FragColor = vec4(vColor * vBright * (1.0 + halo * 1.6), a);
  }
`;

// Stellar temperature ramp: O/B blue-white -> A/F white -> G yellow -> K amber -> M red
const TEMP_COLORS: [number, number, number][] = [
  [0.62, 0.74, 1.0],
  [0.78, 0.86, 1.0],
  [1.0, 1.0, 1.0],
  [1.0, 0.96, 0.84],
  [1.0, 0.84, 0.62],
  [1.0, 0.66, 0.46],
];

const buildShell = (count: number, inner: number, outer: number, sizeScale: number, seedBase: number) => {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const seed = new Float32Array(count);
  const v = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    // uniform direction on the sphere, random radius inside the shell
    const u = Math.random() * 2 - 1;
    const theta = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    v.set(s * Math.cos(theta), u, s * Math.sin(theta));
    const r = inner + Math.random() * (outer - inner);
    pos[i * 3] = v.x * r;
    pos[i * 3 + 1] = v.y * r;
    pos[i * 3 + 2] = v.z * r;

    // luminosity function: most stars faint, a few very bright
    const lum = Math.pow(Math.random(), 3.2);
    const t = Math.min(TEMP_COLORS.length - 1, Math.floor(Math.pow(Math.random(), 1.6) * TEMP_COLORS.length));
    const c = TEMP_COLORS[t];
    const b = 0.35 + lum * 0.9;
    col[i * 3] = c[0] * b;
    col[i * 3 + 1] = c[1] * b;
    col[i * 3 + 2] = c[2] * b;

    size[i] = (0.5 + lum * 2.6) * sizeScale;
    seed[i] = seedBase + Math.random();
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
  geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), outer * 1.2);
  return geo;
};

const Shell = ({
  count,
  inner,
  outer,
  sizeScale,
  spin,
  dpr,
  boost,
}: {
  count: number;
  inner: number;
  outer: number;
  sizeScale: number;
  spin: number;
  dpr: number;
  boost: number;
}) => {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const group = useRef<THREE.Points>(null);

  const geometry = useMemo(() => buildShell(count, inner, outer, sizeScale, inner), [count, inner, outer, sizeScale]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: dpr },
      uBoost: { value: boost },
    }),
    [],
  );
  uniforms.uPixelRatio.value = dpr;

  useFrame((state, delta) => {
    if (mat.current) {
      mat.current.uniforms.uTime.value = state.clock.elapsedTime;
      mat.current.uniforms.uBoost.value = boost;
    }
    if (group.current) group.current.rotation.y += delta * spin;
  });

  return (
    <points ref={group} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={mat}
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

const Starfield = ({ full, dpr, boost }: { full: boolean; dpr: number; boost: number }) => {
  const scale = full ? 1 : 0.2;
  return (
    <group>
      <Shell count={Math.round(9000 * scale)} inner={90} outer={190} sizeScale={1.25} spin={0.0026} dpr={dpr} boost={boost} />
      <Shell count={Math.round(12000 * scale)} inner={260} outer={520} sizeScale={0.95} spin={0.0013} dpr={dpr} boost={boost} />
      <Shell count={Math.round(12000 * scale)} inner={700} outer={1200} sizeScale={0.8} spin={0.0006} dpr={dpr} boost={boost} />
      <Shell count={Math.round(12000 * scale)} inner={1600} outer={2400} sizeScale={0.7} spin={0.0002} dpr={dpr} boost={boost} />
    </group>
  );
};

export default Starfield;
