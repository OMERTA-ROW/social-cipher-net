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
  const projected = useRef(new THREE.Vector3());
  const lastPublished = useRef(0);

  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        [
          new THREE.Vector3(-1180, 190, 880),
          new THREE.Vector3(-620, 60, 430),
          new THREE.Vector3(-140, -240, 240),
          new THREE.Vector3(320, -120, 700),
          new THREE.Vector3(880, 60, 350),
          new THREE.Vector3(1340, 260, -120),
          new THREE.Vector3(1060, 420, -640),
          new THREE.Vector3(420, 140, -1020),
          new THREE.Vector3(-260, -180, -880),
          new THREE.Vector3(-880, -60, -1180),
          new THREE.Vector3(-1420, 180, -420),
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
    if (animate) t.current += dt * 0.0048;
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
