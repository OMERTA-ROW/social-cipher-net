import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import MiningVessel from "./MiningVessel";
import { shipTelemetry } from "./shipTelemetry";
import { ShipAutopilot } from "./shipAutopilot";
import { asteroidRegistry } from "./asteroidRegistry";
import { asteroidDebugStats } from "./asteroidDebug";

/**
 * Solar-system view: the vessel explores the system on its own.
 * There is no fixed route — an autopilot picks fresh destinations, avoids the
 * star and the planets, banks through its turns and stays inside the world.
 */
const VesselFlight = ({ animate, full }: { animate: boolean; full: boolean }) => {
  const group = useRef<THREE.Group>(null);
  const prev = useRef(new THREE.Vector3());
  const look = useRef(new THREE.Vector3());
  const m = useRef(new THREE.Matrix4());
  const up = useRef(new THREE.Vector3(0, 1, 0));
  const projected = useRef(new THREE.Vector3());
  const lastPublished = useRef(0);
  const rollQuat = useRef(new THREE.Quaternion());
  const targetQuat = useRef(new THREE.Quaternion());

  const pilot = useMemo(() => new ShipAutopilot(), []);

  useFrame((state, delta) => {
    if (!group.current) return;
    const dt = Math.min(delta, 0.05);
    if (animate) pilot.step(dt, state.clock.elapsedTime);

    const pos = pilot.state.position;
    prev.current.copy(group.current.position);
    group.current.position.copy(pos);

    look.current.copy(pos).add(pilot.state.forward);
    m.current.lookAt(pos, look.current, up.current);
    targetQuat.current.setFromRotationMatrix(m.current);
    // bank into the turn around the ship's own forward axis
    rollQuat.current.setFromAxisAngle(new THREE.Vector3(0, 0, 1), pilot.state.roll);
    targetQuat.current.multiply(rollQuat.current);
    group.current.quaternion.slerp(targetQuat.current, animate ? Math.min(1, dt * 3) : 1);
    group.current.rotateY(Math.PI); // model noses along +Z

    shipTelemetry.position.copy(pos);
    shipTelemetry.quaternion.copy(group.current.quaternion);
    shipTelemetry.velocity.subVectors(pos, prev.current);
    shipTelemetry.throttle = pilot.state.throttle;

    if (state.clock.elapsedTime - lastPublished.current > 0.08) {
      lastPublished.current = state.clock.elapsedTime;
      projected.current.copy(pos).project(state.camera);
      const visible = projected.current.z > -1 && projected.current.z < 1
        && Math.abs(projected.current.x) < 1.08
        && Math.abs(projected.current.y) < 1.08;
      window.dispatchEvent(new CustomEvent("cyberlink:ship-position", {
        detail: {
          x: (projected.current.x * 0.5 + 0.5) * window.innerWidth,
          y: (-projected.current.y * 0.5 + 0.5) * window.innerHeight,
          visible,
        },
      }));
    }
  });


  return (
    <group ref={group}>
      <MiningVessel animate={animate} throttle={0.62} beam={0} crew={full} scale={7.5} />
    </group>
  );
};

export default VesselFlight;
