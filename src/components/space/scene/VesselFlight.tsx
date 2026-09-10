import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import MiningVessel from "./MiningVessel";
import { shipTelemetry } from "./shipTelemetry";

/**
 * Solar-system view: the vessel runs a long hauling route through the system.
 * It stays off to one side of the star so the solar system remains the hero —
 * the ship is traffic passing through, never the subject.
 */
const VesselFlight = ({ animate, full }: { animate: boolean; full: boolean }) => {
  const group = useRef<THREE.Group>(null);
  const t = useRef(0);
  const prev = useRef(new THREE.Vector3());
  const look = useRef(new THREE.Vector3());
  const m = useRef(new THREE.Matrix4());
  const up = useRef(new THREE.Vector3(0, 1, 0));

  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        [
          new THREE.Vector3(-160, 26, 120),
          new THREE.Vector3(-70, 12, 62),
          new THREE.Vector3(18, -18, 96),
          new THREE.Vector3(120, 8, 48),
          new THREE.Vector3(150, 34, -80),
          new THREE.Vector3(30, 18, -140),
          new THREE.Vector3(-90, -14, -96),
        ],
        true,
        "catmullrom",
        0.4,
      ),
    [],
  );

  useFrame((state, delta) => {
    if (!group.current) return;
    const dt = Math.min(delta, 0.05);
    if (animate) t.current += dt * 0.0075;
    const u = t.current % 1;

    const pos = curve.getPointAt(u);
    const ahead = curve.getPointAt((u + 0.004) % 1);

    prev.current.copy(group.current.position);
    group.current.position.copy(pos);
    look.current.copy(ahead);
    m.current.lookAt(pos, look.current, up.current);
    group.current.quaternion.setFromRotationMatrix(m.current);
    group.current.rotateY(Math.PI); // model noses along +Z

    shipTelemetry.position.copy(pos);
    shipTelemetry.quaternion.copy(group.current.quaternion);
    shipTelemetry.velocity.subVectors(pos, prev.current);
    shipTelemetry.throttle = 0.62;
  });

  return (
    <group ref={group}>
      <MiningVessel animate={animate} throttle={0.62} gear={0} beam={0} crew={full} scale={2.6} />
    </group>
  );
};

export default VesselFlight;
