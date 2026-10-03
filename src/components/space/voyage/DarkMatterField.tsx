import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createAnomalies, scanOpacity } from "@/lib/space/darkMatterSensors";

type Props = { enabled: boolean; scanStartedAt: number | null; reducedMotion: boolean; paused: boolean; outerEnvelope: number };

export default function DarkMatterField({ enabled, scanStartedAt, reducedMotion, paused, outerEnvelope }: Props) {
  const zones = useMemo(() => createAnomalies(outerEnvelope), [outerEnvelope]);
  const group = useRef<THREE.Group>(null);
  const materials = useMemo(() => zones.map(() => new THREE.MeshBasicMaterial({ color: "#62b8d8", wireframe: true, transparent: true, opacity: 0, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, toneMapped: false })), [zones]);
  useEffect(() => () => materials.forEach(material => material.dispose()), [materials]);
  useFrame(() => {
    const opacity = scanOpacity(enabled, scanStartedAt, performance.now(), reducedMotion || paused);
    materials.forEach(material => { material.opacity = opacity; });
    if (group.current) group.current.visible = opacity > 0;
  });
  if (!enabled) return null;
  return <group ref={group} name="fictional-dark-matter-scan" renderOrder={-900}>
    {zones.map((zone, index) => <mesh key={zone.id} position={[zone.center.x, zone.center.y, zone.center.z]} material={materials[index]}>
      <sphereGeometry args={[zone.radius, 32, 20]} />
    </mesh>)}
  </group>;
}