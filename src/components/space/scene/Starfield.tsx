import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Procedural starfield built from several concentric depth shells.
 * Each shell is a single THREE.Points draw call; parallax comes for free
 * from perspective because the camera physically travels between them.
 */

const vert = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>

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
    #include <logdepthbuf_vertex>

    float tw = 0.90 + 0.10 * sin(uTime * (0.25 + aSeed * 0.65) + aSeed * 40.0);
    float dist = max(-mv.z, 1.0);
    gl_PointSize = aSize * uPixelRatio * (300.0 / dist) * tw * uBoost;
    gl_PointSize = clamp(gl_PointSize, 0.55, 18.0);

    vColor = aColor;
    vBright = tw;
  }
`;

const frag = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>

  varying vec3 vColor;
  varying float vBright;

  void main() {
    #include <logdepthbuf_fragment>
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    // diffraction-like pin core with a restrained halo on bright stars
    float core = 1.0 - smoothstep(0.055, 0.20, d);
    float halo = exp(-d * d * 18.0) * 0.20;
    float spike = exp(-abs(uv.x) * 85.0) * exp(-abs(uv.y) * 8.0)
      + exp(-abs(uv.y) * 85.0) * exp(-abs(uv.x) * 8.0);
    float a = core + halo + spike * 0.08;
    if (a < 0.004) discard;
    gl_FragColor = vec4(vColor * vBright * (1.0 + core * 1.8), a);
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

const seeded = (seed: number) => {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
};

const buildShell = (count: number, inner: number, outer: number, sizeScale: number, seedBase: number) => {
  const random = seeded(Math.round(seedBase * 97 + count * 13));
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const seed = new Float32Array(count);
  const v = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    // uniform direction on the sphere, random radius inside the shell
    const u = random() * 2 - 1;
    const theta = random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    v.set(s * Math.cos(theta), u, s * Math.sin(theta));
    const r = inner + random() * (outer - inner);
    pos[i * 3] = v.x * r;
    pos[i * 3 + 1] = v.y * r;
    pos[i * 3 + 2] = v.z * r;

    // luminosity function: most stars faint, a few very bright
    const lum = Math.pow(random(), 3.2);
    const t = Math.min(TEMP_COLORS.length - 1, Math.floor(Math.pow(random(), 1.6) * TEMP_COLORS.length));
    const c = TEMP_COLORS[t];
    const b = 0.35 + lum * 0.9;
    col[i * 3] = c[0] * b;
    col[i * 3 + 1] = c[1] * b;
    col[i * 3 + 2] = c[2] * b;

    size[i] = (0.5 + lum * 2.6) * sizeScale;
    seed[i] = seedBase + random();
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
  animate,
}: {
  count: number;
  inner: number;
  outer: number;
  sizeScale: number;
  spin: number;
  dpr: number;
  boost: number;
  animate: boolean;
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

  const time = useRef(0);
  useFrame((_, delta) => {
    if (animate) time.current += Math.min(delta, 0.05);
    if (mat.current) {
      mat.current.uniforms.uTime.value = time.current;
      mat.current.uniforms.uBoost.value = boost;
    }
    if (animate && group.current) group.current.rotation.y += Math.min(delta, 0.05) * spin;
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

const Starfield = ({ full, dpr, boost, animate = true }: { full: boolean; dpr: number; boost: number; animate?: boolean }) => {
  const scale = full ? 1 : 0.2;
  return (
    <group>
      {/* near field: physically inside the flight volume, so travel gives real parallax */}
      <Shell count={Math.round(7000 * scale)} inner={260} outer={620} sizeScale={1.32} spin={0.00065} dpr={dpr} boost={boost} animate={animate} />
      <Shell count={Math.round(11000 * scale)} inner={900} outer={1900} sizeScale={1.02} spin={0.0003} dpr={dpr} boost={boost} animate={animate} />
      <Shell count={Math.round(13000 * scale)} inner={2500} outer={4400} sizeScale={0.82} spin={0.00013} dpr={dpr} boost={boost} animate={animate} />
      <Shell count={Math.round(13000 * scale)} inner={5800} outer={9000} sizeScale={0.7} spin={0.00005} dpr={dpr} boost={boost} animate={animate} />
      <Shell count={Math.round(11000 * scale)} inner={12000} outer={18000} sizeScale={0.62} spin={0.00002} dpr={dpr} boost={boost} animate={animate} />
    </group>
  );
};

export default Starfield;
