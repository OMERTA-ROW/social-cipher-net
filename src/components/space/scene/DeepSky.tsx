import { useMemo } from "react";
import * as THREE from "three";
import { NEBULA_URLS, STARFIELD_LITE_URL, STARFIELD_URL, useLazyTexture } from "../realTextures";
import { SKY_RADIUS } from "../worldScale";

/**
 * Real astronomy imagery layered over the procedural galaxy.
 *
 *  - an equirectangular all-sky survey mosaic (ESO / NASA derived, public
 *    domain) mapped to the inside of the backdrop sphere, which supplies the
 *    fine star field and Milky Way structure no shader can fake;
 *  - four wide-field Hubble / JWST deep-sky frames placed as very large,
 *    very distant billboards so there is real nebular dust at mid depth.
 *
 * Everything is additively blended on a black sky, so there are no visible
 * quad edges, and everything streams in lazily after first paint.
 * See src/components/space/ATTRIBUTION.md for sources.
 */

const SKY_SHELL = SKY_RADIUS * 0.94;

const NEBULA_PLACEMENT: { dir: [number, number, number]; size: number; tint: string; opacity: number }[] = [
  { dir: [-0.72, 0.18, 0.67], size: 0.46, tint: "#9fb6ff", opacity: 0.3 },
  { dir: [0.58, -0.32, 0.75], size: 0.52, tint: "#ffd7b0", opacity: 0.26 },
  { dir: [0.12, 0.52, -0.85], size: 0.4, tint: "#c9b7ff", opacity: 0.22 },
  { dir: [-0.46, -0.55, -0.7], size: 0.44, tint: "#ffb9c4", opacity: 0.18 },
];

const NebulaPanel = ({
  url,
  dir,
  size,
  tint,
  opacity,
  delay,
}: {
  url: string;
  dir: [number, number, number];
  size: number;
  tint: string;
  opacity: number;
  delay: number;
}) => {
  const map = useLazyTexture(url, { delay, anisotropy: 4 });
  const { position, quaternion, span } = useMemo(() => {
    const d = new THREE.Vector3(...dir).normalize();
    const radius = SKY_RADIUS * 0.62;
    const pos = d.clone().multiplyScalar(radius);
    const q = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().lookAt(new THREE.Vector3(), d.clone().negate(), new THREE.Vector3(0, 1, 0)),
    );
    return { position: pos, quaternion: q, span: radius * size };
  }, [dir, size]);

  if (!map) return null;

  return (
    <mesh position={position} quaternion={quaternion} frustumCulled={false} renderOrder={-8}>
      <planeGeometry args={[span, span * 0.62]} />
      <meshBasicMaterial
        map={map}
        color={tint}
        transparent
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
      />
    </mesh>
  );
};

const DeepSky = ({ full }: { full: boolean }) => {
  const sky = useLazyTexture(full ? STARFIELD_URL : STARFIELD_LITE_URL, { delay: 420, anisotropy: 4 });

  return (
    <group>
      {sky && (
        <mesh frustumCulled={false} renderOrder={-9} scale={[-1, 1, 1]}>
          <sphereGeometry args={[SKY_SHELL, 64, 40]} />
          <meshBasicMaterial
            map={sky}
            color="#ffffff"
            transparent
            opacity={full ? 0.85 : 0.7}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            depthTest={false}
            toneMapped={false}
          />
        </mesh>
      )}

      {full &&
        NEBULA_URLS.map((n, i) => (
          <NebulaPanel
            key={n.name}
            url={n.url}
            dir={NEBULA_PLACEMENT[i].dir}
            size={NEBULA_PLACEMENT[i].size}
            tint={NEBULA_PLACEMENT[i].tint}
            opacity={NEBULA_PLACEMENT[i].opacity}
            delay={900 + i * 260}
          />
        ))}
    </group>
  );
};

export default DeepSky;
