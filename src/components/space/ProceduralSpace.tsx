import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Fully procedural (code-generated) deep-space background.
 * Everything below — starfield, nebula clouds, black hole with gravitational
 * lensing — is generated in a fragment shader. No image files, no seams,
 * and it fades continuously into pure black at every viewport edge.
 */

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uQuality;   // 1.0 = full, 0.0 = reduced detail (mobile)
  uniform float uMotion;    // 1.0 = animated, 0.0 = frozen (reduced motion)

  // ---------- hashing / noise ----------
  float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
  }

  float hash21(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p, int octaves) {
    float v = 0.0;
    float amp = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 6; i++) {
      if (i >= octaves) break;
      v += amp * noise(p);
      p = rot * p * 2.02;
      amp *= 0.5;
    }
    return v;
  }

  // ---------- starfield ----------
  // One depth layer of sharp point stars on a jittered grid.
  vec3 starLayer(vec2 uv, float density, float seed, float brightness, float twinkleSpeed) {
    vec2 gv = uv * density;
    vec2 cell = floor(gv);
    vec2 f = fract(gv) - 0.5;
    vec3 acc = vec3(0.0);

    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 off = vec2(float(x), float(y));
        vec2 id = cell + off;
        vec2 rnd = hash22(id + seed);
        float present = hash21(id * 1.37 + seed);
        if (present > 0.42) continue; // sparse: only some cells hold a star

        vec2 pos = off + (rnd - 0.5) * 0.86;
        float d = length(f - pos);

        float mag = hash11(present * 91.7 + seed);
        // small + sharp: tight core, almost no halo
        float size = mix(0.0022, 0.0075, mag * mag);
        float core = smoothstep(size, size * 0.25, d);
        float halo = smoothstep(size * 2.2, 0.0, d) * 0.05;

        // subtle colour temperature: pale blue -> white -> warm amber
        float temp = hash11(present * 27.3 + seed * 3.1);
        vec3 tint = mix(vec3(0.72, 0.83, 1.0), vec3(1.0, 0.86, 0.68), smoothstep(0.35, 0.9, temp));
        tint = mix(vec3(1.0), tint, 0.75);

        float tw = 1.0;
        if (uMotion > 0.5) {
          tw = 0.82 + 0.18 * sin(uTime * twinkleSpeed * (0.5 + mag) + rnd.x * 40.0);
        }

        acc += tint * (core + halo) * brightness * mix(0.6, 1.5, mag) * tw;
      }
    }
    return acc;
  }

  // ---------- nebula ----------
  vec3 nebula(vec2 p, float t) {
    vec2 q = p * 1.15;
    float warp = fbm(q * 0.9 + vec2(t * 0.006, -t * 0.004), 4);
    float n1 = fbm(q * 1.6 + warp * 1.4 + vec2(0.0, t * 0.003), 5);
    float n2 = fbm(q * 2.9 - warp * 1.1 + vec2(t * 0.004, 0.0), 4);

    float cloudA = smoothstep(0.42, 0.95, n1);
    float cloudB = smoothstep(0.52, 1.0, n2);

    vec3 deepPurple = vec3(0.26, 0.10, 0.44);
    vec3 deepBlue = vec3(0.06, 0.16, 0.42);
    vec3 magenta = vec3(0.42, 0.08, 0.32);

    vec3 col = deepPurple * cloudA * 0.85;
    col += deepBlue * cloudB * 0.9;
    col += magenta * cloudA * cloudB * 0.9;

    // large-scale falloff so clouds dissolve rather than tile
    float mask = smoothstep(1.9, 0.15, length(p * vec2(0.72, 1.0)));
    return col * mask * 0.42;
  }

  // ---------- celestial bodies ----------
  // Sun sits off to the right; every body is lit from it.
  const vec2 SUN = vec2(0.95, 0.42);

  // Elliptical orbit position. a = semi-major, ecc = eccentricity,
  // tiltY squashes the ellipse (viewing inclination), speed from Kepler's 3rd law.
  vec2 orbitPos(vec2 focus, float a, float ecc, float tiltY, float phase, float t) {
    float period = pow(a, 1.5);            // closer planets move faster
    float ang = phase + t * 0.055 / max(period, 0.02);
    float b = a * sqrt(max(1.0 - ecc * ecc, 0.01));
    vec2 p = vec2(a * cos(ang) - a * ecc, b * sin(ang) * tiltY);
    return focus + p;
  }

  // depth factor: > 1 when the body swings toward the viewer
  float orbitDepth(float a, float ecc, float phase, float t) {
    float period = pow(a, 1.5);
    float ang = phase + t * 0.055 / max(period, 0.02);
    return 1.0 + 0.16 * sin(ang);
  }

  // Shaded sphere with sun lighting, terminator, surface detail and rim light.
  // Returns lit colour; writes disc coverage into cover.
  vec3 body(vec2 uv, vec2 c, float rad, vec3 base, vec3 base2, float bands, float seed, float rough, out float cover) {
    vec2 d = uv - c;
    float rr = length(d) / rad;
    cover = 1.0 - smoothstep(0.985, 1.0, rr);
    if (rr > 1.0) { cover = 0.0; return vec3(0.0); }

    float z = sqrt(max(1.0 - rr * rr, 0.0));
    vec3 n = normalize(vec3(d / rad, z));

    // surface: latitude bands + fractal terrain, sampled on the sphere normal
    vec2 sp = vec2(atan(n.x, n.z) * 1.4, asin(clamp(n.y, -1.0, 1.0)) * 1.6) * 2.4 + seed;
    float terrain = fbm(sp * 2.6, 4);
    float band = 0.5 + 0.5 * sin(n.y * bands + terrain * 1.6);
    vec3 surf = mix(base, base2, clamp(band * 0.7 + terrain * 0.6 * rough, 0.0, 1.0));

    // single sun light source, hard terminator
    vec3 L = normalize(vec3(SUN - c, 0.30));
    float diff = max(dot(n, L), 0.0);
    float lit = smoothstep(0.0, 0.16, diff) * diff;

    vec3 col = surf * (lit * 1.35 + 0.02);

    // atmospheric rim on the sunlit limb
    float rim = pow(1.0 - z, 3.0) * smoothstep(-0.15, 0.45, diff);
    col += mix(base, vec3(0.6, 0.8, 1.0), 0.35) * rim * 0.55;

    return col;
  }

  void main() {
    vec2 res = uResolution;
    float m = min(res.x, res.y);
    vec2 uv = (gl_FragCoord.xy - 0.5 * res) / m; // aspect-correct, centred
    float t = uTime;

    // Slow drift of the whole field (parallax speeds differ per layer below).
    float drift = uMotion > 0.5 ? t * 0.0055 : 0.0;
    float ot = uMotion > 0.5 ? t : 0.0;

    // ----- black hole: small and far off to one side, clear of every planet -----
    vec2 hole = vec2(-0.86, 0.40);
    if (uMotion > 0.5) {
      hole += vec2(sin(t * 0.013) * 0.008, cos(t * 0.011) * 0.006);
    }
    vec2 rel = uv - hole;
    float r = length(rel);
    float rs = 0.020;                 // event horizon radius (distant object)

    // Gravitational lensing: pull background samples inward near the horizon.
    float defl = rs * rs * 1.9 / max(r * r, 1e-4);
    defl = min(defl, r * 0.96);
    vec2 dir = rel / max(r, 1e-5);
    vec2 lensUv = hole + dir * (r - defl);

    // Tangential smear of the lensed field around the horizon.
    float smear = smoothstep(rs * 4.5, rs * 1.02, r);
    vec2 tang = vec2(-dir.y, dir.x);
    lensUv += tang * smear * 0.02 * sin(r * 30.0);

    // ----- background layers sampled through the lens -----
    vec3 col = vec3(0.0);

    col += nebula(lensUv * 1.0 + vec2(drift * 0.35, drift * 0.18), t);

    col += starLayer(lensUv + vec2(drift * 0.25, drift * 0.10), 9.0, 1.0, 0.70, 1.7);
    col += starLayer(lensUv + vec2(drift * 0.55, -drift * 0.22), 16.0, 7.0, 0.55, 2.4);
    if (uQuality > 0.5) {
      col += starLayer(lensUv + vec2(drift * 1.05, drift * 0.42), 26.0, 19.0, 0.40, 3.2);
      col += starLayer(lensUv + vec2(drift * 1.75, -drift * 0.70), 40.0, 41.0, 0.26, 4.1);
    }

    // ----- accretion disk (small, distant) -----
    vec2 dp = rel;
    float squash = 4.4;
    float er = length(vec2(dp.x, dp.y * squash));
    float diskInner = rs * 1.35;
    float diskOuter = rs * 3.6;
    float band = smoothstep(diskInner, diskInner * 1.12, er) * (1.0 - smoothstep(diskOuter * 0.72, diskOuter, er));

    float swirl = fbm(vec2(atan(dp.y * squash, dp.x) * 2.4 + (uMotion > 0.5 ? t * 0.35 : 0.0), er * 26.0), 3);
    band *= 0.65 + 0.6 * swirl;

    vec3 hot = vec3(1.0, 0.95, 0.86);
    vec3 warm = vec3(1.0, 0.52, 0.16);
    float heat = 1.0 - smoothstep(diskInner, diskOuter, er);
    vec3 diskCol = mix(warm, hot, heat * heat);
    float beam = 0.55 + 0.75 * smoothstep(-0.4, 0.4, -dp.x / max(er, 1e-4));
    col += diskCol * band * 1.25 * beam;

    // infalling dust drawn into the hole — subtle visible pull
    float dustR = smoothstep(rs * 14.0, rs * 2.0, r);
    float spiral = fbm(vec2(atan(dp.y, dp.x) * 1.6 + r * 22.0 - (uMotion > 0.5 ? t * 0.22 : 0.0), r * 9.0), 3);
    col += vec3(0.55, 0.42, 0.60) * dustR * smoothstep(0.45, 0.95, spiral) * 0.32;

    // lensed arc of the disk above/below the horizon
    float arc = smoothstep(rs * 1.06, rs * 1.14, r) * (1.0 - smoothstep(rs * 1.24, rs * 1.5, r));
    col += diskCol * arc * 0.5 * (0.4 + 0.6 * smear);

    // photon ring: thin, bright
    float ring = exp(-pow((r - rs * 1.035) / (rs * 0.035), 2.0));
    col += vec3(1.0, 0.88, 0.72) * ring * 0.95;

    // true black core
    float horizon = smoothstep(rs * 1.02, rs * 0.94, r);
    col *= (1.0 - horizon);

    // ----- solar system: elliptical orbits, inner planets faster -----
    vec2 focus = vec2(0.42, -0.02);   // orbital focus (the sun's position)
    float cover;
    vec3 bcol;

    // the sun itself
    float sr = length(uv - SUN);
    col += vec3(1.0, 0.72, 0.36) * exp(-pow(sr / 0.34, 2.0)) * 0.30;
    float sunDisc = 1.0 - smoothstep(0.085, 0.092, sr);
    vec3 sunSurf = mix(vec3(1.0, 0.93, 0.72), vec3(1.0, 0.62, 0.22),
                       fbm(uv * 26.0 + vec2(ot * 0.05, 0.0), 3));
    col = mix(col, sunSurf * 1.5, sunDisc);

    // Mercury
    vec2 p1 = orbitPos(focus, 0.20, 0.20, 0.34, 0.9, ot);
    bcol = body(uv, p1, 0.013 * orbitDepth(0.20, 0.20, 0.9, ot), vec3(0.44, 0.40, 0.37), vec3(0.62, 0.58, 0.54), 9.0, 3.1, 1.0, cover);
    col = mix(col, bcol, cover);

    // Venus
    vec2 p2 = orbitPos(focus, 0.31, 0.06, 0.34, 2.4, ot);
    bcol = body(uv, p2, 0.021 * orbitDepth(0.31, 0.06, 2.4, ot), vec3(0.78, 0.64, 0.40), vec3(0.95, 0.86, 0.66), 6.0, 8.7, 0.8, cover);
    col = mix(col, bcol, cover);

    // Earth + Moon
    vec2 p3 = orbitPos(focus, 0.46, 0.05, 0.34, 4.1, ot);
    float e3 = 0.024 * orbitDepth(0.46, 0.05, 4.1, ot);
    bcol = body(uv, p3, e3, vec3(0.07, 0.24, 0.55), vec3(0.20, 0.48, 0.26), 7.0, 12.3, 1.1, cover);
    col = mix(col, bcol, cover);
    vec2 m3 = p3 + vec2(cos(ot * 0.55 + 1.0) * e3 * 3.1, sin(ot * 0.55 + 1.0) * e3 * 1.1);
    bcol = body(uv, m3, e3 * 0.28, vec3(0.42, 0.41, 0.40), vec3(0.66, 0.65, 0.63), 8.0, 21.0, 1.2, cover);
    col = mix(col, bcol, cover);

    // Mars
    vec2 p4 = orbitPos(focus, 0.62, 0.14, 0.34, 5.6, ot);
    bcol = body(uv, p4, 0.018 * orbitDepth(0.62, 0.14, 5.6, ot), vec3(0.55, 0.24, 0.12), vec3(0.82, 0.46, 0.26), 6.0, 33.0, 1.1, cover);
    col = mix(col, bcol, cover);

    // Jupiter + a Galilean moon
    vec2 p5 = orbitPos(focus, 0.86, 0.05, 0.34, 1.7, ot);
    float e5 = 0.052 * orbitDepth(0.86, 0.05, 1.7, ot);
    bcol = body(uv, p5, e5, vec3(0.58, 0.42, 0.28), vec3(0.90, 0.80, 0.64), 22.0, 44.0, 0.5, cover);
    col = mix(col, bcol, cover);
    vec2 m5 = p5 + vec2(cos(ot * 0.42 + 2.2) * e5 * 2.3, sin(ot * 0.42 + 2.2) * e5 * 0.8);
    bcol = body(uv, m5, e5 * 0.16, vec3(0.60, 0.55, 0.42), vec3(0.82, 0.78, 0.62), 7.0, 55.0, 1.0, cover);
    col = mix(col, bcol, cover);

    // Saturn + rings
    vec2 p6 = orbitPos(focus, 1.12, 0.06, 0.34, 3.4, ot);
    float e6 = 0.044 * orbitDepth(1.12, 0.06, 3.4, ot);
    vec2 rd = uv - p6;
    float rell = length(vec2(rd.x, rd.y * 3.4));
    float rings = smoothstep(e6 * 1.35, e6 * 1.45, rell) * (1.0 - smoothstep(e6 * 2.15, e6 * 2.3, rell));
    rings *= 0.55 + 0.45 * sin(rell / e6 * 34.0);
    vec3 ringCol = vec3(0.82, 0.74, 0.58);
    col += ringCol * rings * 0.55 * step(rd.y, 0.0);   // rings behind handled below
    bcol = body(uv, p6, e6, vec3(0.72, 0.62, 0.40), vec3(0.94, 0.88, 0.70), 18.0, 66.0, 0.5, cover);
    col = mix(col, bcol, cover);
    col += ringCol * rings * 0.55 * step(0.0, rd.y);   // front half of the ring plane

    // Uranus
    vec2 p7 = orbitPos(focus, 1.42, 0.05, 0.34, 0.4, ot);
    bcol = body(uv, p7, 0.030 * orbitDepth(1.42, 0.05, 0.4, ot), vec3(0.36, 0.68, 0.72), vec3(0.62, 0.86, 0.88), 5.0, 77.0, 0.4, cover);
    col = mix(col, bcol, cover);

    // Neptune
    vec2 p8 = orbitPos(focus, 1.72, 0.01, 0.34, 2.9, ot);
    bcol = body(uv, p8, 0.029 * orbitDepth(1.72, 0.01, 2.9, ot), vec3(0.14, 0.28, 0.68), vec3(0.32, 0.52, 0.90), 6.0, 88.0, 0.5, cover);
    col = mix(col, bcol, cover);

    // ----- edge falloff: dissolve into pure black everywhere -----
    vec2 sc = (gl_FragCoord.xy / res) * 2.0 - 1.0;
    float vign = 1.0 - smoothstep(0.70, 1.45, length(sc * vec2(0.95, 1.0)));
    float edgeX = smoothstep(0.0, 0.14, min(vUv.x, 1.0 - vUv.x));
    float edgeY = smoothstep(0.0, 0.11, min(vUv.y, 1.0 - vUv.y));
    col *= mix(vign, 1.0, 0.25) * edgeX * edgeY;

    // gentle tone shaping, never lifting the black floor
    col = max(col, vec3(0.0));
    col = col / (col + 0.95) * 1.85;

    gl_FragColor = vec4(col, 1.0);
  }
`;


const SpaceQuad = ({ quality, motion, fps }: { quality: number; motion: number; fps: number }) => {
  const material = useRef<THREE.ShaderMaterial>(null);
  const { size, viewport } = useThree();
  const acc = useRef(0);
  const clock = useRef(0);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uQuality: { value: quality },
      uMotion: { value: motion },
    }),
    [],
  );

  uniforms.uQuality.value = quality;
  uniforms.uMotion.value = motion;
  uniforms.uResolution.value.set(size.width * viewport.dpr, size.height * viewport.dpr);

  const step = 1 / fps;

  useFrame((_, delta) => {
    if (motion < 0.5) return;
    acc.current += Math.min(delta, 0.1);
    if (acc.current < step) return;
    clock.current += acc.current;
    acc.current = 0;
    if (material.current) material.current.uniforms.uTime.value = clock.current;
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
};

interface Props {
  /** false = reduced detail for mobile / low-power devices */
  full: boolean;
  /** false = frozen frame (prefers-reduced-motion) */
  animate: boolean;
}

const ProceduralSpace = ({ full, animate }: Props) => (
  <Canvas
    className="absolute inset-0"
    gl={{ antialias: false, powerPreference: "low-power", alpha: false }}
    dpr={full ? [1, 1.5] : 1}
    frameloop={animate ? "always" : "demand"}
    orthographic
    camera={{ position: [0, 0, 1], zoom: 1 }}
  >
    <SpaceQuad quality={full ? 1 : 0} motion={animate ? 1 : 0} fps={full ? 45 : 24} />
  </Canvas>
);

export default ProceduralSpace;
