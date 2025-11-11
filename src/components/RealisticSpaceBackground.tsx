import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

// Matrix Rain Overlay Component (standard React, not R3F)
const MatrixRain = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dropsRef = useRef<number[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const matrixChars = "0123456789";
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);

    // Initialize drops
    if (dropsRef.current.length === 0) {
      for (let i = 0; i < columns; i++) {
        dropsRef.current[i] = Math.random() * -100;
      }
    }

    let animationId: number;
    let lastTime = 0;
    const frameDelay = 100; // Milliseconds between frames (slower = higher number)

    const animate = (currentTime: number) => {
      // Throttle animation speed
      if (currentTime - lastTime < frameDelay) {
        animationId = requestAnimationFrame(animate);
        return;
      }
      lastTime = currentTime;

      // Semi-transparent black for trail effect
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#0f0";
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < dropsRef.current.length; i++) {
        const text = matrixChars[Math.floor(Math.random() * matrixChars.length)];
        const x = i * fontSize;
        const y = dropsRef.current[i] * fontSize;

        ctx.fillText(text, x, y);

        if (y > canvas.height && Math.random() > 0.975) {
          dropsRef.current[i] = 0;
        }
        dropsRef.current[i]++;
      }

      animationId = requestAnimationFrame(animate);
    };

    animate(0);

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-20"
      style={{ opacity: 0.3 }}
    />
  );
};

// Planet Component with optional rings and atmosphere
const Planet = ({ 
  position, 
  size, 
  color, 
  speed, 
  hasRings = false,
  hasAtmosphere = false,
  atmosphereColor,
  roughness = 0.9,
  metalness = 0.1
}: { 
  position: [number, number, number]; 
  size: number; 
  color: string; 
  speed: number;
  hasRings?: boolean;
  hasAtmosphere?: boolean;
  atmosphereColor?: string;
  roughness?: number;
  metalness?: number;
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringsRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const time = clock.getElapsedTime() * speed;
      meshRef.current.position.x = position[0] * Math.cos(time);
      meshRef.current.position.z = position[2] * Math.sin(time);
      meshRef.current.rotation.y += 0.002;
      
      if (ringsRef.current) {
        ringsRef.current.position.x = meshRef.current.position.x;
        ringsRef.current.position.z = meshRef.current.position.z;
        ringsRef.current.rotation.x = Math.PI / 2;
      }
      
      if (atmosphereRef.current) {
        atmosphereRef.current.position.x = meshRef.current.position.x;
        atmosphereRef.current.position.z = meshRef.current.position.z;
        atmosphereRef.current.rotation.y += 0.001;
      }
    }
  });

  return (
    <group>
      <mesh ref={meshRef} position={position}>
        <sphereGeometry args={[size, 64, 64]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.1}
          roughness={roughness}
          metalness={metalness}
        />
      </mesh>
      
      {hasAtmosphere && atmosphereColor && (
        <mesh ref={atmosphereRef} position={position}>
          <sphereGeometry args={[size * 1.08, 64, 64]} />
          <meshStandardMaterial
            color={atmosphereColor}
            emissive={atmosphereColor}
            emissiveIntensity={0.3}
            transparent
            opacity={0.15}
            side={THREE.BackSide}
          />
        </mesh>
      )}
      
      {hasRings && (
        <mesh ref={ringsRef} position={position}>
          <ringGeometry args={[size * 1.5, size * 2.5, 128]} />
          <meshStandardMaterial
            color="#C9A86A"
            emissive="#8B7355"
            emissiveIntensity={0.05}
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
            roughness={0.8}
          />
        </mesh>
      )}
    </group>
  );
};

// Sun Component with corona
const Sun = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const coronaRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.001;
    }
    if (coronaRef.current) {
      coronaRef.current.rotation.y -= 0.0005;
    }
  });

  return (
    <group>
      <mesh ref={meshRef} position={[0, 0, 0]}>
        <sphereGeometry args={[3, 32, 32]} />
        <meshStandardMaterial
          color="#FDB813"
          emissive="#FDB813"
          emissiveIntensity={2}
        />
        <pointLight intensity={3} distance={150} color="#FDB813" />
      </mesh>
      {/* Corona */}
      <mesh ref={coronaRef} position={[0, 0, 0]}>
        <sphereGeometry args={[3.5, 32, 32]} />
        <meshStandardMaterial
          color="#FFA500"
          emissive="#FFA500"
          emissiveIntensity={1}
          transparent
          opacity={0.3}
        />
      </mesh>
    </group>
  );
};

// Northern Star (Polaris) - Bright and prominent
const NorthernStar = () => {
  return (
    <mesh position={[0, 100, -150]}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial
        color="#FFFACD"
        emissive="#FFFACD"
        emissiveIntensity={5}
      />
      <pointLight intensity={2} distance={80} color="#FFFACD" />
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

// Shooting Stars
const ShootingStar = ({ delay }: { delay: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const trailRef = useRef<THREE.Line>(null);

  useFrame(({ clock }) => {
    if (meshRef.current && trailRef.current) {
      const time = (clock.getElapsedTime() + delay) * 2;
      const progress = (time % 10) / 10;
      
      if (progress < 0.3) {
        const startX = -100 + Math.sin(delay) * 50;
        const startY = 50 + Math.cos(delay) * 30;
        const startZ = -100;
        
        meshRef.current.position.x = startX + progress * 200;
        meshRef.current.position.y = startY - progress * 100;
        meshRef.current.position.z = startZ + progress * 150;
        
        meshRef.current.visible = true;
        trailRef.current.visible = true;
        
        // Update trail
        const trailLength = 20;
        const positions = new Float32Array(trailLength * 3);
        for (let i = 0; i < trailLength; i++) {
          const trailProgress = progress - (i * 0.01);
          positions[i * 3] = startX + trailProgress * 200;
          positions[i * 3 + 1] = startY - trailProgress * 100;
          positions[i * 3 + 2] = startZ + trailProgress * 150;
        }
        trailRef.current.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      } else {
        meshRef.current.visible = false;
        trailRef.current.visible = false;
      }
    }
  });

  const trailGeometry = useMemo(() => {
    const positions = new Float32Array(20 * 3);
    return new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(positions, 3));
  }, []);

  const trailMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.5 });
  }, []);

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshStandardMaterial
          color="#FFFFFF"
          emissive="#FFFFFF"
          emissiveIntensity={3}
        />
        <pointLight intensity={1} distance={10} color="#FFFFFF" />
      </mesh>
      <primitive
        ref={trailRef}
        object={new THREE.Line(trailGeometry, trailMaterial)}
      />
    </group>
  );
};

// Asteroid Belt
const AsteroidBelt = () => {
  const asteroids = useMemo(() => {
    return Array.from({ length: 200 }, (_, i) => {
      const angle = (i / 200) * Math.PI * 2;
      const radius = 20 + Math.random() * 5;
      const height = (Math.random() - 0.5) * 2;
      const size = 0.1 + Math.random() * 0.3;
      
      return {
        position: [
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius
        ] as [number, number, number],
        size,
        rotationSpeed: Math.random() * 0.02
      };
    });
  }, []);

  return (
    <>
      {asteroids.map((asteroid, i) => (
        <mesh key={i} position={asteroid.position}>
          <dodecahedronGeometry args={[asteroid.size, 0]} />
          <meshStandardMaterial
            color="#8B7355"
            roughness={0.9}
            metalness={0.1}
          />
        </mesh>
      ))}
    </>
  );
};

// Black Hole with Accretion Disk
const BlackHole = () => {
  const accretionRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (accretionRef.current) {
      accretionRef.current.rotation.z += 0.01;
    }
  });

  return (
    <group position={[-60, -20, -80]}>
      {/* Event Horizon */}
      <mesh>
        <sphereGeometry args={[2, 32, 32]} />
        <meshStandardMaterial
          color="#000000"
          emissive="#000000"
          emissiveIntensity={0}
        />
      </mesh>
      {/* Accretion Disk */}
      <mesh ref={accretionRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[4, 1, 16, 100]} />
        <meshStandardMaterial
          color="#FF4500"
          emissive="#FF4500"
          emissiveIntensity={2}
          transparent
          opacity={0.8}
        />
      </mesh>
      <pointLight intensity={2} distance={30} color="#FF4500" />
    </group>
  );
};

// Distant Galaxies
const DistantGalaxies = () => {
  const galaxies = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => ({
      position: [
        -150 + i * 70,
        (Math.random() - 0.5) * 80,
        -200 - Math.random() * 50
      ] as [number, number, number],
      size: 5 + Math.random() * 10,
      color: ['#8A2BE2', '#4169E1', '#FF69B4', '#20B2AA', '#DDA0DD'][i]
    }));
  }, []);

  return (
    <>
      {galaxies.map((galaxy, i) => (
        <group key={i} position={galaxy.position}>
          <mesh>
            <sphereGeometry args={[galaxy.size, 16, 16]} />
            <meshStandardMaterial
              color={galaxy.color}
              emissive={galaxy.color}
              emissiveIntensity={0.5}
              transparent
              opacity={0.3}
            />
          </mesh>
          <pointLight intensity={0.5} distance={40} color={galaxy.color} />
        </group>
      ))}
    </>
  );
};

// Milky Way Disk - Enhanced
const MilkyWayDisk = () => {
  const pointsRef = useRef<THREE.Points>(null);

  const particles = useMemo(() => {
    const positions = new Float32Array(8000 * 3);
    const colors = new Float32Array(8000 * 3);

    for (let i = 0; i < 8000; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 50 + Math.random() * 100;
      const height = (Math.random() - 0.5) * 5;

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = Math.sin(angle) * radius;

      // Varied star colors
      const colorChoice = Math.random();
      if (colorChoice < 0.7) {
        colors[i * 3] = 0.8 + Math.random() * 0.2;
        colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
        colors[i * 3 + 2] = 1;
      } else if (colorChoice < 0.9) {
        colors[i * 3] = 1;
        colors[i * 3 + 1] = 0.7 + Math.random() * 0.3;
        colors[i * 3 + 2] = 0.5 + Math.random() * 0.3;
      } else {
        colors[i * 3] = 1;
        colors[i * 3 + 1] = 0.3 + Math.random() * 0.2;
        colors[i * 3 + 2] = 0.3 + Math.random() * 0.2;
      }
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
        size={0.15}
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
      <fog attach="fog" args={["#000000", 80, 250]} />

      {/* Ambient and directional lighting */}
      <ambientLight intensity={0.15} />
      <directionalLight position={[10, 10, 10]} intensity={0.4} />

      {/* Stars background */}
      <Stars
        radius={300}
        depth={100}
        count={15000}
        factor={6}
        saturation={0}
        fade
        speed={0.5}
      />

      {/* Milky Way */}
      <MilkyWayDisk />

      {/* Distant Galaxies */}
      <DistantGalaxies />

      {/* Black Hole */}
      <BlackHole />

      {/* Sun */}
      <Sun />

      {/* Planets of the Solar System - Realistic */}
      {/* Mercury - Rocky, cratered surface */}
      <Planet position={[5, 0, 0]} size={0.4} color="#8B7D6B" speed={0.4} roughness={0.95} metalness={0.05} />
      
      {/* Venus - Thick atmosphere, yellowish clouds */}
      <Planet position={[8, 0, 0]} size={0.9} color="#E8CDA2" speed={0.3} hasAtmosphere atmosphereColor="#FFF4D6" roughness={0.6} metalness={0.1} />
      
      {/* Earth - Blue oceans, green continents, white clouds */}
      <Planet position={[12, 0, 0]} size={1} color="#1E88E5" speed={0.2} hasAtmosphere atmosphereColor="#87CEEB" roughness={0.5} metalness={0.3} />
      
      {/* Mars - Red planet with polar ice caps */}
      <Planet position={[16, 0, 0]} size={0.5} color="#CD5C5C" speed={0.15} hasAtmosphere atmosphereColor="#FFB6C1" roughness={0.9} metalness={0.05} />
      
      {/* Jupiter - Gas giant with bands and Great Red Spot */}
      <Planet position={[25, 0, 0]} size={2.5} color="#C88B3A" speed={0.08} hasAtmosphere atmosphereColor="#E8C99A" roughness={0.3} metalness={0.05} />
      
      {/* Saturn - Pale gold with prominent rings */}
      <Planet position={[35, 0, 0]} size={2.2} color="#FAD5A5" speed={0.06} hasRings hasAtmosphere atmosphereColor="#FFF8DC" roughness={0.4} metalness={0.05} />
      
      {/* Uranus - Blue-green ice giant */}
      <Planet position={[45, 0, 0]} size={1.5} color="#4FD0E7" speed={0.04} hasAtmosphere atmosphereColor="#B0E0E6" roughness={0.5} metalness={0.2} />
      
      {/* Neptune - Deep blue ice giant */}
      <Planet position={[55, 0, 0]} size={1.4} color="#4169E1" speed={0.03} hasAtmosphere atmosphereColor="#87CEEB" roughness={0.5} metalness={0.2} />

      {/* Asteroid Belt */}
      <AsteroidBelt />

      {/* Northern Star (Polaris) */}
      <NorthernStar />

      {/* Orion's Belt */}
      <OrionsBelt />

      {/* Shooting Stars */}
      {[0, 2, 4, 6, 8].map((delay) => (
        <ShootingStar key={delay} delay={delay} />
      ))}

      {/* Camera controls */}
      <OrbitControls
        enableZoom={true}
        enablePan={true}
        enableRotate={true}
        minDistance={10}
        maxDistance={200}
        autoRotate
        autoRotateSpeed={0.3}
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
