import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";
import RealisticSpaceBackground from "./RealisticSpaceBackground";

const PLANETS = [
  { name: "Mercury", radius: 0.35, distance: 6,  color: "#a9a29b", speed: 0.9 },
  { name: "Venus",   radius: 0.55, distance: 8,  color: "#e8c07d", speed: 0.75 },
  { name: "Earth",   radius: 0.6,  distance: 11, color: "#3a7bd5", speed: 0.6 },
  { name: "Mars",    radius: 0.45, distance: 14, color: "#c1440e", speed: 0.5 },
  { name: "Jupiter", radius: 1.4,  distance: 19, color: "#d1a066", speed: 0.35 },
  { name: "Saturn",  radius: 1.15, distance: 24, color: "#e6d3a3", speed: 0.28 },
  { name: "Uranus",  radius: 0.85, distance: 29, color: "#7fd4e0", speed: 0.22 },
  { name: "Neptune", radius: 0.85, distance: 33, color: "#3d5afe", speed: 0.18 },
];

const Sun = () => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.1; });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[2.2, 32, 32]} />
      <meshBasicMaterial color="#ffb347" />
      <pointLight intensity={2} distance={200} decay={0.5} color="#ffd280" />
    </mesh>
  );
};

const Planet = ({ p, t0 }: { p: typeof PLANETS[number]; t0: number }) => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const a = clock.getElapsedTime() * p.speed * 0.15 + t0;
    ref.current.position.set(Math.cos(a) * p.distance, 0, Math.sin(a) * p.distance);
    ref.current.rotation.y += 0.005;
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[p.radius, 24, 24]} />
      <meshStandardMaterial color={p.color} roughness={0.85} />
    </mesh>
  );
};

const OrbitRing = ({ d }: { d: number }) => {
  const geom = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [d]);
  return (
    <line>
      <primitive object={geom} attach="geometry" />
      <lineBasicMaterial color="#4a5b7a" transparent opacity={0.25} />
    </line>
  );
};

const TravelingCamera = () => {
  useFrame(({ camera, clock }) => {
    const t = clock.getElapsedTime() * 0.05;
    const r = 38 + Math.sin(t * 0.6) * 6;
    camera.position.set(Math.cos(t) * r, 12 + Math.sin(t * 0.4) * 4, Math.sin(t) * r);
    camera.lookAt(0, 0, 0);
  });
  return null;
};

const SolarSystemBackground = () => {
  const offsets = useMemo(() => PLANETS.map(() => Math.random() * Math.PI * 2), []);
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <RealisticSpaceBackground palette="solar" intensity="calm" starDensity={0.6} interactive={false} parallax={false} />
      <div className="absolute inset-0">
        <Canvas camera={{ position: [0, 15, 40], fov: 55 }} dpr={[1, 1.5]}>
          <Suspense fallback={null}>
            <ambientLight intensity={0.25} />
            <Stars radius={200} depth={60} count={2000} factor={4} fade speed={0.5} />
            <Sun />
            {PLANETS.map((p, i) => (
              <group key={p.name}>
                <OrbitRing d={p.distance} />
                <Planet p={p} t0={offsets[i]} />
              </group>
            ))}
            <TravelingCamera />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
};

export default SolarSystemBackground;
