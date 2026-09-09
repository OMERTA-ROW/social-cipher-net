import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Foreground streaks: a small field of near stars that stretch into short
 * motion-blur trails along the camera's direction of travel, so the drift
 * reads as speed. One instanced draw call.
 */

const FIELD = 130; // half-size of the box that follows the camera

const StarTrails = ({ count, animate }: { count: number; animate: boolean }) => {
  const { camera } = useThree();
  const mesh = useRef<THREE.InstancedMesh>(null);

  const state = useMemo(() => {
    const pos: THREE.Vector3[] = [];
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos.push(
        new THREE.Vector3(
          (Math.random() * 2 - 1) * FIELD,
          (Math.random() * 2 - 1) * FIELD,
          (Math.random() * 2 - 1) * FIELD,
        ),
      );
      seeds[i] = 0.4 + Math.random() * 1.6;
    }
    return {
      pos,
      seeds,
      prevCam: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      dummy: new THREE.Object3D(),
      m: new THREE.Matrix4(),
      x: new THREE.Vector3(),
      y: new THREE.Vector3(),
      z: new THREE.Vector3(),
      q: new THREE.Quaternion(),
      scale: new THREE.Vector3(),
      init: false,
    };
  }, [count]);

  useLayoutEffect(() => {
    state.prevCam.copy(camera.position);
  }, [camera, state]);

  useFrame(() => {
    const inst = mesh.current;
    if (!inst) return;

    state.vel.subVectors(camera.position, state.prevCam);
    state.prevCam.copy(camera.position);
    const speed = state.vel.length();
    const dir = speed > 1e-5 ? state.z.copy(state.vel).multiplyScalar(1 / speed) : state.z.set(0, 1, 0);

    const stretch = THREE.MathUtils.clamp(speed * 18, 0.3, 4.5);
    const visible = animate && speed > 1e-4;

    for (let i = 0; i < count; i++) {
      const p = state.pos[i];

      // recycle stars once they fall outside the travelling box
      if (Math.abs(p.x - camera.position.x) > FIELD) p.x += p.x > camera.position.x ? -2 * FIELD : 2 * FIELD;
      if (Math.abs(p.y - camera.position.y) > FIELD) p.y += p.y > camera.position.y ? -2 * FIELD : 2 * FIELD;
      if (Math.abs(p.z - camera.position.z) > FIELD) p.z += p.z > camera.position.z ? -2 * FIELD : 2 * FIELD;

      // billboard: face the camera, long axis along the travel direction
      state.y.copy(dir);
      state.x.copy(p).sub(camera.position).normalize().cross(state.y);
      if (state.x.lengthSq() < 1e-6) state.x.set(1, 0, 0);
      state.x.normalize();
      const zAxis = state.dummy.position.copy(state.x).cross(state.y).normalize();
      state.m.makeBasis(state.x, state.y, zAxis);
      state.q.setFromRotationMatrix(state.m);

      const s = state.seeds[i];
      state.scale.set(0.09 * s, visible ? stretch * s * 0.35 : 0.09 * s, 1);

      state.dummy.position.copy(p);
      state.dummy.quaternion.copy(state.q);
      state.dummy.scale.copy(state.scale);
      state.dummy.updateMatrix();
      inst.setMatrixAt(i, state.dummy.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined as never, undefined as never, count]} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        color="#cfe4ff"
        transparent
        opacity={0.32}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </instancedMesh>
  );
};

export default StarTrails;
