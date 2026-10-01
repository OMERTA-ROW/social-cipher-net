import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { asteroidMaps } from "../scene/procTextures";

const BELT_RADIUS = 38;
const VARIANTS = 4;

const seeded = (seed: number) => {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
};

const makeRockGeometry = (seed: number) => {
  const random = seeded(seed);
  const geometry = new THREE.IcosahedronGeometry(1, 3);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const axis = new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize();
  const craterDirections = Array.from({ length: 7 }, () =>
    new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize(),
  );
  const point = new THREE.Vector3();
  for (let index = 0; index < position.count; index += 1) {
    point.fromBufferAttribute(position, index).normalize();
    const ridges = Math.sin(point.x * 9 + seed) * Math.sin(point.y * 11 - seed) * 0.045;
    const elongation = 1 + Math.abs(point.dot(axis)) * (0.18 + random() * 0.08);
    let craterDepth = 0;
    for (const crater of craterDirections) {
      const proximity = Math.max(0, point.dot(crater) - 0.91) / 0.09;
      craterDepth += Math.sin(Math.min(1, proximity) * Math.PI) * 0.12;
    }
    const radius = elongation + ridges + (random() - 0.5) * 0.08 - craterDepth;
    point.multiplyScalar(radius);
    position.setXYZ(index, point.x, point.y, point.z);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
};

interface AsteroidBatchProps {
  count: number;
  offset: number;
}

const AsteroidBatch = ({ count, offset }: AsteroidBatchProps) => {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => makeRockGeometry(811 + offset * 97), [offset]);
  const maps = useMemo(() => asteroidMaps(offset), [offset]);

  useEffect(() => {
    const instanced = mesh.current;
    if (!instanced) return;
    const random = seeded(1709 + offset * 173);
    const transform = new THREE.Object3D();
    const color = new THREE.Color();
    for (let index = 0; index < count; index += 1) {
      const angle = random() * Math.PI * 2;
      const radius = BELT_RADIUS + (random() - 0.5) * 3.8;
      transform.position.set(
        Math.cos(angle) * radius,
        (random() - 0.5) * 1.1,
        Math.sin(angle) * radius,
      );
      transform.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
      const scale = 0.12 + Math.pow(random(), 2) * 0.48;
      transform.scale.set(scale * (0.72 + random() * 0.7), scale * (0.68 + random() * 0.55), scale);
      transform.updateMatrix();
      instanced.setMatrixAt(index, transform.matrix);
      const value = 0.7 + random() * 0.3;
      color.setRGB(value * 1.04, value, value * 0.94);
      instanced.setColorAt(index, color);
    }
    instanced.instanceMatrix.needsUpdate = true;
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
  }, [count, offset]);

  useEffect(() => () => {
    geometry.dispose();
  }, [geometry]);

  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, count]} castShadow receiveShadow>
      <meshStandardMaterial
        map={maps.map}
        normalMap={maps.normalMap}
        normalScale={new THREE.Vector2(1.4, 1.4)}
        roughnessMap={maps.roughnessMap}
        color="#ffffff"
        vertexColors
        roughness={1}
        metalness={0.02}
      />
    </instancedMesh>
  );
};

interface VoyageAsteroidFieldProps {
  count?: number;
  animate: boolean;
}

const VoyageAsteroidField = ({ count = 80, animate }: VoyageAsteroidFieldProps) => {
  const group = useRef<THREE.Group>(null);
  const batches = Array.from({ length: VARIANTS }, (_, index) =>
    Math.floor(count / VARIANTS) + (index < count % VARIANTS ? 1 : 0),
  );
  useFrame((_, delta) => {
    if (animate && group.current) group.current.rotation.y += Math.min(delta, 0.05) * 0.018;
  });
  return (
    <group ref={group}>
      {batches.map((batchCount, index) => (
        <AsteroidBatch key={index} count={batchCount} offset={index} />
      ))}
    </group>
  );
};

export default VoyageAsteroidField;