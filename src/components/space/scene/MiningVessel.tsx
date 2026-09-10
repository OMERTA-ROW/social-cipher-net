import { forwardRef, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { hullMaps, plateMaps } from "./procTextures";
import { CockpitCrew } from "./AlienCrew";

/**
 * The mining vessel: a heavy industrial hauler built from real geometry with
 * procedurally generated worn-hull PBR maps, glowing engines, a glass canopy
 * with a visible alien crew, deployable landing gear and a mining beam rig.
 */

interface Props {
  animate?: boolean;
  /** 0 = gear stowed, 1 = fully deployed */
  gear?: number;
  /** 0 = engines idle, 1 = full burn */
  throttle?: number;
  /** 0 = beam off, 1 = full extraction beam */
  beam?: number;
  /** show the crew behind the canopy (skipped in lite mode for cost) */
  crew?: boolean;
  scale?: number;
}

const useHullMaterials = () => {
  const hull = useMemo(() => hullMaps(), []);
  const plate = useMemo(() => plateMaps(), []);

  return useMemo(() => {
    const primary = new THREE.MeshStandardMaterial({
      ...hull,
      color: new THREE.Color("#9aa3ad"),
      metalness: 0.92,
      roughness: 0.52,
      normalScale: new THREE.Vector2(1.4, 1.4),
      envMapIntensity: 0.9,
    });
    const secondary = new THREE.MeshStandardMaterial({
      ...plate,
      color: new THREE.Color("#5d646d"),
      metalness: 0.88,
      roughness: 0.66,
      normalScale: new THREE.Vector2(1.1, 1.1),
    });
    const accent = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#c2762a"),
      metalness: 0.7,
      roughness: 0.45,
    });
    const glass = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#0b1a20"),
      metalness: 0,
      roughness: 0.06,
      transmission: 0.72,
      thickness: 0.35,
      transparent: true,
      opacity: 0.65,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      side: THREE.DoubleSide,
    });
    const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color("#39e6ff"), toneMapped: false });
    const engineGlow = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#63d9ff"),
      toneMapped: false,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    return { primary, secondary, accent, glass, glow, engineGlow };
  }, [hull, plate]);
};

const MiningVessel = forwardRef<THREE.Group, Props>(
  ({ animate = true, gear = 0, throttle = 0.5, beam = 0, crew = true, scale = 1 }, ref) => {
    const mats = useHullMaterials();
    const gearL = useRef<THREE.Group>(null);
    const gearR = useRef<THREE.Group>(null);
    const gearN = useRef<THREE.Group>(null);
    const plumeA = useRef<THREE.Mesh>(null);
    const plumeB = useRef<THREE.Mesh>(null);
    const beamRef = useRef<THREE.Mesh>(null);
    const beacon = useRef<THREE.PointLight>(null);
    const drill = useRef<THREE.Group>(null);

    useFrame((state, delta) => {
      const t = state.clock.elapsedTime;
      const flicker = 0.88 + Math.sin(t * 24) * 0.06 + Math.sin(t * 7.3) * 0.06;
      const len = 0.6 + throttle * 3.4;
      [plumeA, plumeB].forEach((p) => {
        if (!p.current) return;
        p.current.scale.set(1, animate ? len * flicker : len, 1);
        p.current.position.z = -2.45 - (len * (animate ? flicker : 1)) * 0.5;
        (p.current.material as THREE.Material).opacity = 0.35 + throttle * 0.55;
      });

      const angle = -gear * 1.35;
      [gearL, gearR, gearN].forEach((g) => {
        if (g.current) g.current.rotation.x = THREE.MathUtils.lerp(g.current.rotation.x, angle, 1 - Math.exp(-6 * delta));
      });

      if (beamRef.current) {
        beamRef.current.visible = beam > 0.01;
        const wobble = animate ? 0.9 + Math.sin(t * 9) * 0.1 : 1;
        beamRef.current.scale.set(beam * wobble, 1, beam * wobble);
        (beamRef.current.material as THREE.Material).opacity = 0.28 * beam * wobble;
      }
      if (drill.current && animate) drill.current.rotation.z = t * (2 + beam * 12);
      if (beacon.current) beacon.current.intensity = 2 + Math.sin(t * 3.4) * 1.6;
    });

    return (
      <group ref={ref} scale={scale}>
        {/* ---- main fuselage ---- */}
        <mesh material={mats.primary} rotation={[Math.PI / 2, 0, 0]}>
          <capsuleGeometry args={[0.72, 3.1, 10, 28]} />
        </mesh>
        {/* spine / dorsal ridge */}
        <mesh material={mats.secondary} position={[0, 0.62, -0.3]}>
          <boxGeometry args={[0.7, 0.34, 2.4]} />
        </mesh>
        {/* nose */}
        <mesh material={mats.primary} position={[0, 0.02, 2.2]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.72, 1.0, 26]} />
        </mesh>

        {/* ---- cockpit ---- */}
        <group position={[0, 0.36, 1.42]}>
          <mesh material={mats.secondary} position={[0, -0.16, 0]}>
            <boxGeometry args={[1.14, 0.36, 1.1]} />
          </mesh>
          <mesh material={mats.glass} position={[0, 0.1, 0.06]} scale={[1, 0.62, 1.05]}>
            <sphereGeometry args={[0.56, 26, 20]} />
          </mesh>
          {crew && (
            <group position={[0, -0.06, -0.06]} scale={0.42}>
              <CockpitCrew animate={animate} />
              <pointLight color="#2ad4ff" intensity={1.4} distance={3} position={[0, 0.8, 0.6]} />
            </group>
          )}
        </group>

        {/* ---- cargo ore pods ---- */}
        {[-1.28, 1.28].map((x) => (
          <group key={x} position={[x, -0.12, -0.5]}>
            <mesh material={mats.secondary} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.36, 0.36, 2.1, 20]} />
            </mesh>
            <mesh material={mats.accent} position={[0, 0, 0.85]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.38, 0.38, 0.18, 20]} />
            </mesh>
            <mesh material={mats.primary} position={[x > 0 ? -0.5 : 0.5, 0.1, 0.2]}>
              <boxGeometry args={[0.62, 0.16, 0.9]} />
            </mesh>
          </group>
        ))}

        {/* ---- engines ---- */}
        {[-0.82, 0.82].map((x, i) => (
          <group key={x} position={[x, -0.05, -1.72]}>
            <mesh material={mats.primary} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.42, 0.5, 1.3, 22]} />
            </mesh>
            <mesh material={mats.accent} position={[0, 0, -0.68]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.5, 0.4, 0.16, 22]} />
            </mesh>
            <mesh material={mats.glow} position={[0, 0, -0.76]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.36, 0.36, 0.06, 20]} />
            </mesh>
            {/* exhaust plume */}
            <mesh
              ref={i === 0 ? plumeA : plumeB}
              material={mats.engineGlow}
              position={[0, 0, -2.45]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <coneGeometry args={[0.3, 1, 18, 1, true]} />
            </mesh>
            <pointLight color="#4fd8ff" intensity={2.2 + throttle * 4} distance={9} position={[0, 0, -1]} />
          </group>
        ))}

        {/* ---- landing gear ---- */}
        {[
          { ref: gearL, pos: [-0.86, -0.55, -0.9] as [number, number, number] },
          { ref: gearR, pos: [0.86, -0.55, -0.9] as [number, number, number] },
          { ref: gearN, pos: [0, -0.6, 1.35] as [number, number, number] },
        ].map((g, i) => (
          <group key={i} ref={g.ref} position={g.pos}>
            <mesh material={mats.secondary} position={[0, -0.3, 0]}>
              <cylinderGeometry args={[0.07, 0.07, 0.6, 10]} />
            </mesh>
            <mesh material={mats.accent} position={[0, -0.62, 0.02]}>
              <boxGeometry args={[0.3, 0.1, 0.4]} />
            </mesh>
          </group>
        ))}

        {/* ---- mining rig under the belly ---- */}
        <group position={[0, -0.66, 0.55]}>
          <mesh material={mats.secondary}>
            <boxGeometry args={[0.7, 0.3, 0.9]} />
          </mesh>
          <group ref={drill} position={[0, -0.24, 0]}>
            <mesh material={mats.accent} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.2, 0.1, 0.42, 12]} />
            </mesh>
          </group>
          {/* extraction beam */}
          <mesh ref={beamRef} position={[0, -6.2, 0]} material-transparent>
            <cylinderGeometry args={[0.22, 1.5, 12, 24, 1, true]} />
            <meshBasicMaterial
              color="#37f0d8"
              transparent
              opacity={0.25}
              side={THREE.DoubleSide}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
        </group>

        {/* running lights */}
        <mesh material={mats.glow} position={[-1.66, -0.12, -0.5]}>
          <sphereGeometry args={[0.055, 10, 10]} />
        </mesh>
        <mesh position={[1.66, -0.12, -0.5]}>
          <sphereGeometry args={[0.055, 10, 10]} />
          <meshBasicMaterial color="#ff4d5e" toneMapped={false} />
        </mesh>
        <pointLight ref={beacon} color="#39e6ff" intensity={2} distance={7} position={[0, 0.9, 0.2]} />
      </group>
    );
  },
);

MiningVessel.displayName = "MiningVessel";

export default MiningVessel;
