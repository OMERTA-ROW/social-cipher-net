import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

// Matrix Rain Overlay Component
const MatrixRain = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useFrame(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const matrixChars = "01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";
    const fontSize = 14;
    const columns = canvas.width / fontSize;

    // Semi-transparent black for trail effect
    ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#0f0";
    ctx.font = `${fontSize}px monospace`;

    for (let i = 0; i < columns; i++) {
      const text = matrixChars[Math.floor(Math.random() * matrixChars.length)];
      const x = i * fontSize;
      const y = Math.random() * canvas.height;

      ctx.fillText(text, x, y);
    }
  });

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-20"
      width={window.innerWidth}
      height={window.innerHeight}
      style={{ opacity: 0.3 }}
    />
  );
};

// Planet Component
const Planet = ({ position, size, color, speed }: { position: [number, number, number]; size: number; color: string; speed: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const time = clock.getElapsedTime() * speed;
      meshRef.current.position.x = position[0] * Math.cos(time);
      meshRef.current.position.z = position[2] * Math.sin(time);
      meshRef.current.rotation.y += 0.001;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[size, 32, 32]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.2}
        roughness={0.7}
        metalness={0.3}
      />
    </mesh>
  );
};

// Sun Component
const Sun = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.001;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <sphereGeometry args={[3, 32, 32]} />
      <meshStandardMaterial
        color="#FDB813"
        emissive="#FDB813"
        emissiveIntensity={2}
      />
      <pointLight intensity={2} distance={100} color="#FDB813" />
    </mesh>
  );
};

// Orion's Belt Stars
const OrionsBelt = () => {
  const positions: [number, number, number][] = [
    [-80, 30, -100],
    [-75, 32, -100],
    [-70, 30, -100],
  ];

  return (
    <>
      {positions.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshStandardMaterial
            color="#4A90E2"
            emissive="#4A90E2"
            emissiveIntensity={3}
          />
          <pointLight intensity={0.5} distance={20} color="#4A90E2" />
        </mesh>
      ))}
    </>
  );
};

// Milky Way Disk
const MilkyWayDisk = () => {
  const pointsRef = useRef<THREE.Points>(null);

  const particles = useMemo(() => {
    const positions = new Float32Array(5000 * 3);
    const colors = new Float32Array(5000 * 3);

    for (let i = 0; i < 5000; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 50 + Math.random() * 100;
      const height = (Math.random() - 0.5) * 5;

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = Math.sin(angle) * radius;

      colors[i * 3] = 0.8 + Math.random() * 0.2;
      colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
      colors[i * 3 + 2] = 1;
    }

    return { positions, colors };
  }, []);

  useFrame(() => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += 0.0001;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.positions.length / 3}
          array={particles.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particles.colors.length / 3}
          array={particles.colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  );
};

// Main Scene
const SpaceScene = () => {
  return (
    <>
      <color attach="background" args={["#000000"]} />
      <fog attach="fog" args={["#000000", 50, 200]} />

      {/* Ambient and directional lighting */}
      <ambientLight intensity={0.1} />
      <directionalLight position={[10, 10, 10]} intensity={0.3} />

      {/* Stars background */}
      <Stars
        radius={300}
        depth={100}
        count={10000}
        factor={6}
        saturation={0}
        fade
        speed={0.5}
      />

      {/* Milky Way */}
      <MilkyWayDisk />

      {/* Sun */}
      <Sun />

      {/* Planets of the Solar System */}
      <Planet position={[5, 0, 0]} size={0.4} color="#8C7853" speed={0.4} /> {/* Mercury */}
      <Planet position={[8, 0, 0]} size={0.9} color="#FFC649" speed={0.3} /> {/* Venus */}
      <Planet position={[12, 0, 0]} size={1} color="#4A90E2" speed={0.2} /> {/* Earth */}
      <Planet position={[16, 0, 0]} size={0.5} color="#E27B58" speed={0.15} /> {/* Mars */}
      <Planet position={[25, 0, 0]} size={2.5} color="#C88B3A" speed={0.08} /> {/* Jupiter */}
      <Planet position={[35, 0, 0]} size={2.2} color="#FAD5A5" speed={0.06} /> {/* Saturn */}
      <Planet position={[45, 0, 0]} size={1.5} color="#4FD0E7" speed={0.04} /> {/* Uranus */}
      <Planet position={[55, 0, 0]} size={1.4} color="#4166F5" speed={0.03} /> {/* Neptune */}

      {/* Orion's Belt */}
      <OrionsBelt />

      {/* Camera controls */}
      <OrbitControls
        enableZoom={true}
        enablePan={true}
        enableRotate={true}
        minDistance={10}
        maxDistance={150}
        autoRotate
        autoRotateSpeed={0.5}
      />
    </>
  );
};

const RealisticSpaceBackground = () => {
  return (
    <>
      <div className="fixed inset-0 z-0">
        <Canvas
          camera={{ position: [0, 20, 50], fov: 75 }}
          style={{ background: "black" }}
        >
          <SpaceScene />
        </Canvas>
      </div>
      <MatrixRain />
    </>
  );
};

export default RealisticSpaceBackground;
