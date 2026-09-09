import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { NOISE_GLSL } from "./noise.glsl";

/**
 * Far-field galactic environment: the Milky Way band plus nebula clouds,
 * generated entirely from fractal noise inside a very large inward-facing
 * sphere. No image textures anywhere.
 */

const vert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const frag = /* glsl */ `
  precision highp float;
  varying vec3 vDir;
  uniform float uTime;
  uniform float uDetail;   // 1.0 full, 0.0 reduced
  uniform float uBoost;

  ${NOISE_GLSL}

  void main() {
    vec3 d = normalize(vDir);

    // galactic plane, tilted off the scene's horizontal
    vec3 galNormal = normalize(vec3(0.32, 0.86, -0.39));
    float lat = dot(d, galNormal);                 // -1..1, 0 = on the band
    float bandCore = exp(-pow(lat / 0.085, 2.0));
    float bandWide = exp(-pow(lat / 0.24, 2.0));

    int oct = uDetail > 0.5 ? 5 : 3;
    float t = uTime * 0.006;

    // clumpy dust / star clouds along the band
    float clouds = fbm3(d * 5.5 + vec3(t, 0.0, -t), oct);
    float fine = fbm3(d * 13.0 - vec3(0.0, t, 0.0), oct);
    float dust = ridge3(d * 8.0 + 4.0, oct);

    vec3 bandWarm = vec3(1.0, 0.90, 0.74);
    vec3 bandCool = vec3(0.58, 0.70, 1.0);
    vec3 band = mix(bandCool, bandWarm, clamp(clouds * 1.3, 0.0, 1.0));

    float bandAmt = bandWide * (0.35 + 0.65 * clouds) + bandCore * (0.5 + 0.5 * fine);
    // dark dust lanes cutting through the core of the band
    bandAmt *= 1.0 - smoothstep(0.45, 0.85, dust) * bandCore * 0.85;

    vec3 col = band * bandAmt * 0.16;

    // nebula complexes at a few fixed directions
    vec3 nebA = normalize(vec3(-0.7, 0.15, 0.62));
    vec3 nebB = normalize(vec3(0.55, -0.35, 0.72));
    vec3 nebC = normalize(vec3(0.1, 0.5, -0.85));

    float wa = fbm3(d * 4.0 + 11.0 + vec3(0.0, t * 0.6, 0.0), oct);
    float nA = smoothstep(0.86, 1.0, dot(d, nebA)) * smoothstep(0.35, 0.9, wa);
    float nB = smoothstep(0.90, 1.0, dot(d, nebB)) * smoothstep(0.40, 0.95, fbm3(d * 6.0 - 5.0, oct));
    float nC = smoothstep(0.92, 1.0, dot(d, nebC)) * smoothstep(0.45, 1.0, fbm3(d * 7.5 + 21.0, oct));

    col += vec3(0.42, 0.13, 0.52) * nA * 0.5;   // violet complex
    col += vec3(0.10, 0.30, 0.72) * nB * 0.45;  // deep blue
    col += vec3(0.55, 0.14, 0.28) * nC * 0.4;   // faint magenta

    // very faint ambient wash so the sphere never shows an edge
    col += vec3(0.012, 0.016, 0.030) * (0.4 + 0.6 * clouds);

    col *= uBoost;
    col = max(col, vec3(0.0));
    col = col / (col + 0.85) * 1.35;

    gl_FragColor = vec4(col, 1.0);
  }
`;

const Galaxy = ({ full, boost }: { full: boolean; boost: number }) => {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uDetail: { value: full ? 1 : 0 }, uBoost: { value: boost } }),
    [],
  );
  uniforms.uDetail.value = full ? 1 : 0;

  useFrame((state) => {
    if (!mat.current) return;
    mat.current.uniforms.uTime.value = state.clock.elapsedTime;
    mat.current.uniforms.uBoost.value = boost;
  });

  return (
    <mesh frustumCulled={false} renderOrder={-10}>
      <sphereGeometry args={[4200, 48, 32]} />
      <shaderMaterial
        ref={mat}
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
      />
    </mesh>
  );
};

export default Galaxy;
