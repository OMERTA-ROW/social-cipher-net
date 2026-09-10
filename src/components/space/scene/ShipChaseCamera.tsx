import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { shipTelemetry } from "./shipTelemetry";

/**
 * Cinematic chase camera for the alien-world view. It trails the vessel from
 * behind and above, easing into position, banking with the ship and drifting
 * to a wider framing while the ship is stationary and mining.
 */
const OFFSETS: Record<string, THREE.Vector3> = {
  travel: new THREE.Vector3(0, 3.6, -16),
  approach: new THREE.Vector3(5, 4.5, -14),
  landing: new THREE.Vector3(7, 5, -11),
  docked: new THREE.Vector3(9, 4, -9),
  mining: new THREE.Vector3(11, 6.5, -10),
  conquest: new THREE.Vector3(-10, 7, -12),
  combat: new THREE.Vector3(8, 5.5, -15),
  departure: new THREE.Vector3(-4, 4.5, -17),
};

const ShipChaseCamera = ({ animate }: { animate: boolean }) => {
  const { camera } = useThree();
  const desired = useRef(new THREE.Vector3());
  const look = useRef(new THREE.Vector3());
  const target = useRef(new THREE.Vector3());
  const shake = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const off = OFFSETS[shipTelemetry.phase] ?? OFFSETS.travel;

    desired.current.copy(off).applyQuaternion(shipTelemetry.quaternion).add(shipTelemetry.position);

    // light engine shake, scaled by throttle, never enough to feel jittery
    const t = state.clock.elapsedTime;
    const amp = animate ? shipTelemetry.throttle * 0.09 : 0;
    shake.current.set(Math.sin(t * 21.3) * amp, Math.sin(t * 17.1) * amp, Math.sin(t * 13.7) * amp);
    desired.current.add(shake.current);

    camera.position.lerp(desired.current, 1 - Math.exp(-2.1 * dt));

    target.current.copy(shipTelemetry.position).addScaledVector(shipTelemetry.velocity, 12);
    look.current.lerp(target.current, 1 - Math.exp(-2.6 * dt));

    camera.up.set(0, 1, 0);
    camera.lookAt(look.current);
  });

  return null;
};

export default ShipChaseCamera;
