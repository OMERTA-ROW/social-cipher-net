import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { marketPulse } from "./useMarketPulse";

/**
 * Slow continuous orbital travel. The camera rides a wide, gently precessing
 * path through the system, easing its look direction and banking into turns.
 * Speed lifts slightly with market volatility.
 */
const CameraRig = ({ animate }: { animate: boolean }) => {
  const { camera } = useThree();
  const t = useRef(0);
  const look = useRef(new THREE.Vector3(0, 0, 0));
  const prev = useRef(new THREE.Vector3());
  const vel = useRef(new THREE.Vector3());
  const tmp = useRef(new THREE.Vector3());
  const up = useRef(new THREE.Vector3(0, 1, 0));

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const speed = 1 + marketPulse.volatility * 0.8;
    if (animate) t.current += dt * 0.02 * speed;
    const a = t.current;

    // wide precessing orbit around the star, well outside the inner bodies
    const r = 210 + Math.sin(a * 0.37) * 55;
    const pos = tmp.current.set(
      Math.cos(a) * r,
      Math.sin(a * 0.53) * 46 + 18,
      Math.sin(a) * r * 0.86,
    );

    prev.current.copy(camera.position);
    camera.position.lerp(pos, animate ? 1 - Math.exp(-2.4 * dt) : 1);
    vel.current.subVectors(camera.position, prev.current);

    // ease the aim point ahead of the travel direction, biased at the star
    const ahead = 0.9;
    const target = new THREE.Vector3(
      Math.cos(a + ahead) * r * 0.12,
      Math.sin(a * 0.53 + ahead) * 10,
      Math.sin(a + ahead) * r * 0.1,
    );
    look.current.lerp(target, 1 - Math.exp(-1.2 * dt));

    // bank into the turn instead of snapping
    const bank = THREE.MathUtils.clamp(vel.current.x * 0.6, -0.22, 0.22);
    up.current.lerp(new THREE.Vector3(Math.sin(bank), Math.cos(bank), 0), 1 - Math.exp(-1.5 * dt));
    camera.up.copy(up.current);
    camera.lookAt(look.current);
  });

  return null;
};

export default CameraRig;
