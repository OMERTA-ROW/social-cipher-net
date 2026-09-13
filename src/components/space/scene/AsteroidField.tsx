import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { asteroidRegistry } from "./asteroidRegistry";

/**
 * Real rocks drifting through the scene, replacing the old pale streak
 * billboards. Three irregular cratered shapes are drawn as three instanced
 * meshes (one draw call each) and pooled: rocks that leave the travelling box
 * around the camera are recycled to the far side on a fresh trajectory, so
 * nothing pops into view close up.
 */

const FIELD = 520; // half-size of the box that follows the camera

/** Deform an icosahedron into a pitted, cratered, irregular rock. */
const makeRockGeometry = (seed: number, detail: number) => {
  const geo = new THREE.IcosahedronGeometry(1, detail);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  // deterministic per-shape noise so the three shapes stay distinct
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  // a handful of crater centres gouged into the surface
  const craters: { dir: THREE.Vector3; r: number; d: number }[] = [];
  for (let i = 0; i < 9; i++) {
    craters.push({
      dir: new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize(),
      r: 0.22 + rand() * 0.4,
      d: 0.07 + rand() * 0.16,
    });
  }
  const lumpA = new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize();
  const lumpB = new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    // large-scale irregularity: never a sphere or an obvious repeat
    let r = 1 + 0.22 * v.dot(lumpA) + 0.16 * v.dot(lumpB);
    r += 0.09 * Math.sin(v.x * 5.3 + seed) * Math.cos(v.y * 4.1 - seed);
    r += 0.05 * Math.sin(v.z * 9.7 + v.x * 6.1);
    // craters
    for (const c of craters) {
      const d = v.angleTo(c.dir);
      if (d < c.r) {
        const f = 1 - d / c.r;
        r -= c.d * f * f * (1.15 - 0.5 * f);
      }
    }
    // fine pitting
    r += 0.018 * Math.sin(v.x * 31.1) * Math.sin(v.y * 27.7) * Math.sin(v.z * 23.3);
    pos.setXYZ(i, v.x * r, v.y * r, v.z * r);
  }
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
};

interface Rock {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  spin: THREE.Vector3;
  rot: THREE.Euler;
  scale: number;
  shape: number;
}

const AsteroidField = ({ count, animate, full }: { count: number; animate: boolean; full: boolean }) => {
  const { camera } = useThree();
  const meshes = [
    useRef<THREE.InstancedMesh>(null),
    useRef<THREE.InstancedMesh>(null),
    useRef<THREE.InstancedMesh>(null),
  ];

  const geometries = useMemo(
    () => [makeRockGeometry(9137, full ? 2 : 1), makeRockGeometry(48211, full ? 2 : 1), makeRockGeometry(70513, full ? 2 : 1)],
    [full],
  );

  const rocks = useMemo<Rock[]>(() => {
    const list: Rock[] = [];
    for (let i = 0; i < count; i++) {
      // several depth bands: near rocks are small and fast in screen terms,
      // far ones are large and slow, which is what reads as parallax
      const band = Math.random();
      const depth = band < 0.35 ? 0.35 : band < 0.75 ? 1 : 2.1;
      list.push({
        pos: new THREE.Vector3(
          (Math.random() * 2 - 1) * FIELD,
          (Math.random() * 2 - 1) * FIELD * 0.7,
          (Math.random() * 2 - 1) * FIELD,
        ),
        vel: new THREE.Vector3(Math.random() * 2 - 1, (Math.random() * 2 - 1) * 0.35, Math.random() * 2 - 1)
          .normalize()
          .multiplyScalar((2.5 + Math.random() * 7) / depth),
        spin: new THREE.Vector3(
          (Math.random() * 2 - 1) * 0.28,
          (Math.random() * 2 - 1) * 0.28,
          (Math.random() * 2 - 1) * 0.28,
        ),
        rot: new THREE.Euler(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28),
        scale: (0.5 + Math.random() * 1.5) * depth,
        shape: i % 3,
      });
    }
    return list;
  }, [count]);

  const scratch = useMemo(
    () => ({ dummy: new THREE.Object3D(), colour: new THREE.Color(), counts: [0, 0, 0] }),
    [],
  );

  // per-instance grey/brown variation
  useLayoutEffect(() => {
    for (let shape = 0; shape < 3; shape++) {
      const inst = meshes[shape].current;
      if (!inst) continue;
      let n = 0;
      for (const r of rocks) if (r.shape === shape) n++;
      const colours = new Float32Array(Math.max(n, 1) * 3);
      let k = 0;
      for (const r of rocks) {
        if (r.shape !== shape) continue;
        const warm = Math.random();
        scratch.colour.setRGB(
          0.62 + warm * 0.22,
          0.56 + warm * 0.16,
          0.50 + warm * 0.10,
        );
        colours[k * 3] = scratch.colour.r;
        colours[k * 3 + 1] = scratch.colour.g;
        colours[k * 3 + 2] = scratch.colour.b;
        k++;
      }
      inst.instanceColor = new THREE.InstancedBufferAttribute(colours, 3);
      inst.instanceColor.needsUpdate = true;
    }
  }, [rocks]);

  useFrame((_, delta) => {
    const dt = animate ? Math.min(delta, 0.05) : 0;
    scratch.counts[0] = scratch.counts[1] = scratch.counts[2] = 0;
    asteroidRegistry.count = 0;

    for (const r of rocks) {
      if (dt > 0) {
        r.pos.addScaledVector(r.vel, dt);
        r.rot.x += r.spin.x * dt;
        r.rot.y += r.spin.y * dt;
        r.rot.z += r.spin.z * dt;
      }

      // pooling: wrap around the travelling box, far from the camera so the
      // reappearance is never visible
      const p = r.pos;
      const c = camera.position;
      if (Math.abs(p.x - c.x) > FIELD) p.x += p.x > c.x ? -2 * FIELD : 2 * FIELD;
      if (Math.abs(p.y - c.y) > FIELD * 0.7) p.y += p.y > c.y ? -1.4 * FIELD : 1.4 * FIELD;
      if (Math.abs(p.z - c.z) > FIELD) p.z += p.z > c.z ? -2 * FIELD : 2 * FIELD;

      const inst = meshes[r.shape].current;
      if (!inst) continue;
      const i = scratch.counts[r.shape]++;
      scratch.dummy.position.copy(p);
      scratch.dummy.rotation.copy(r.rot);
      scratch.dummy.scale.setScalar(r.scale);
      scratch.dummy.updateMatrix();
      inst.setMatrixAt(i, scratch.dummy.matrix);

      // publish the biggest nearby rocks so the autopilot can steer around them
      if (asteroidRegistry.count < asteroidRegistry.centers.length && r.scale > 1.4) {
        asteroidRegistry.centers[asteroidRegistry.count].copy(p);
        asteroidRegistry.radii[asteroidRegistry.count] = r.scale * 1.35;
        asteroidRegistry.count++;
      }
    }

    for (let shape = 0; shape < 3; shape++) {
      const inst = meshes[shape].current;
      if (!inst) continue;
      inst.count = scratch.counts[shape];
      inst.instanceMatrix.needsUpdate = true;
    }
  });

  const perShape = Math.ceil(count / 3) + 1;

  return (
    <>
      {geometries.map((geo, i) => (
        <instancedMesh
          key={i}
          ref={meshes[i]}
          args={[geo, undefined as never, perShape]}
          frustumCulled={false}
          castShadow={false}
          receiveShadow={false}
        >
          <meshStandardMaterial
            vertexColors
            color="#9a9086"
            emissive="#2a2b30"
            emissiveIntensity={0.75}
            roughness={0.92}
            metalness={0.03}
            flatShading={!full}
          />
        </instancedMesh>
      ))}
    </>
  );
};

export default AsteroidField;
