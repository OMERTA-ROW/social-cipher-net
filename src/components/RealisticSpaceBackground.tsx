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

// Planet Component with realistic details
const Planet = ({ 
  position, 
  size, 
  color, 
  speed, 
  hasRings = false,
  hasAtmosphere = false,
  atmosphereColor,
  hasClouds = false,
  cloudColor,
  roughness = 0.9,
  metalness = 0.1,
  emissiveIntensity = 0.05
}: { 
  position: [number, number, number]; 
  size: number; 
  color: string; 
  speed: number;
  hasRings?: boolean;
  hasAtmosphere?: boolean;
  atmosphereColor?: string;
  hasClouds?: boolean;
  cloudColor?: string;
  roughness?: number;
  metalness?: number;
  emissiveIntensity?: number;
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringsRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const time = clock.getElapsedTime() * speed;
      meshRef.current.position.x = position[0] * Math.cos(time);
      meshRef.current.position.z = position[2] * Math.sin(time);
      meshRef.current.rotation.y += 0.003;
      
      if (ringsRef.current) {
        ringsRef.current.position.x = meshRef.current.position.x;
        ringsRef.current.position.z = meshRef.current.position.z;
        ringsRef.current.rotation.x = Math.PI / 2;
        ringsRef.current.rotation.y += 0.0005;
      }
      
      if (atmosphereRef.current) {
        atmosphereRef.current.position.x = meshRef.current.position.x;
        atmosphereRef.current.position.z = meshRef.current.position.z;
        atmosphereRef.current.rotation.y += 0.0015;
      }
      
      if (cloudsRef.current) {
        cloudsRef.current.position.x = meshRef.current.position.x;
        cloudsRef.current.position.z = meshRef.current.position.z;
        cloudsRef.current.rotation.y += 0.004;
      }
    }
  });

  return (
    <group>
      {/* Main planet surface */}
      <mesh ref={meshRef} position={position} castShadow receiveShadow>
        <sphereGeometry args={[size, 128, 128]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          roughness={roughness}
          metalness={metalness}
        />
      </mesh>
      
      {/* Cloud layer for Earth and gas giants */}
      {hasClouds && cloudColor && (
        <mesh ref={cloudsRef} position={position}>
          <sphereGeometry args={[size * 1.02, 128, 128]} />
          <meshStandardMaterial
            color={cloudColor}
            emissive={cloudColor}
            emissiveIntensity={0.1}
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      
      {/* Atmospheric glow */}
      {hasAtmosphere && atmosphereColor && (
        <mesh ref={atmosphereRef} position={position}>
          <sphereGeometry args={[size * 1.1, 64, 64]} />
          <meshStandardMaterial
            color={atmosphereColor}
            emissive={atmosphereColor}
            emissiveIntensity={0.4}
            transparent
            opacity={0.2}
            side={THREE.BackSide}
          />
        </mesh>
      )}
      
      {/* Saturn's rings */}
      {hasRings && (
        <>
          <mesh ref={ringsRef} position={position} receiveShadow>
            <ringGeometry args={[size * 1.6, size * 2.8, 256]} />
            <meshStandardMaterial
              color="#D4C5A9"
              emissive="#B8A888"
              emissiveIntensity={0.02}
              transparent
              opacity={0.85}
              side={THREE.DoubleSide}
              roughness={0.85}
              metalness={0.05}
            />
          </mesh>
          {/* Ring shadow bands */}
          <mesh position={position}>
            <ringGeometry args={[size * 2.0, size * 2.3, 256]} />
            <meshStandardMaterial
              color="#8B7355"
              transparent
              opacity={0.5}
              side={THREE.DoubleSide}
            />
          </mesh>
        </>
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

// Comets - Realistic space debris with NASA-accurate behavior
const Comet = ({ delay }: { delay: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const dustTrailRef = useRef<THREE.Points>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (meshRef.current && dustTrailRef.current && glowRef.current) {
      // Much slower speed - comets take 30 seconds to cross (was 5 seconds)
      const time = (clock.getElapsedTime() + delay) * 0.33;
      const progress = (time % 30) / 30;
      
      if (progress < 0.9) {
        // Varied comet paths based on delay for diversity
        const startX = -120 + Math.sin(delay * 2) * 60;
        const startY = 60 + Math.cos(delay * 3) * 40;
        const startZ = -120;
        
        // Slower, more gradual movement
        meshRef.current.position.x = startX + progress * 240;
        meshRef.current.position.y = startY - progress * 120;
        meshRef.current.position.z = startZ + progress * 180;
        
        meshRef.current.visible = true;
        dustTrailRef.current.visible = true;
        glowRef.current.visible = true;
        
        // Update comet glow position
        glowRef.current.position.copy(meshRef.current.position);
        
        // Create dispersing dust trail particles
        const particleCount = 200;
        const positions = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        const alphas = new Float32Array(particleCount);
        
        for (let i = 0; i < particleCount; i++) {
          const trailProgress = progress - (i * 0.0045);
          const dispersion = (i / particleCount) * 8; // Particles spread out over distance
          const randomX = (Math.random() - 0.5) * dispersion;
          const randomY = (Math.random() - 0.5) * dispersion;
          const randomZ = (Math.random() - 0.5) * dispersion;
          
          positions[i * 3] = startX + trailProgress * 240 + randomX;
          positions[i * 3 + 1] = startY - trailProgress * 120 + randomY;
          positions[i * 3 + 2] = startZ + trailProgress * 180 + randomZ;
          
          // Particle size decreases along trail
          sizes[i] = Math.max(0.1, 0.8 - (i / particleCount) * 0.7);
          
          // Fade effect along trail
          alphas[i] = Math.max(0, 0.9 - (i / particleCount));
        }
        
        dustTrailRef.current.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        dustTrailRef.current.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        dustTrailRef.current.geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
        dustTrailRef.current.geometry.attributes.position.needsUpdate = true;
        dustTrailRef.current.geometry.attributes.size.needsUpdate = true;
        dustTrailRef.current.geometry.attributes.alpha.needsUpdate = true;
      } else {
        meshRef.current.visible = false;
        dustTrailRef.current.visible = false;
        glowRef.current.visible = false;
      }
    }
  });

  const dustTrailGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const particleCount = 200;
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const alphas = new Float32Array(particleCount);
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
    
    return geometry;
  }, []);

  const dustTrailMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      color: '#D0E8FF',
      size: 0.5,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }, []);

  return (
    <group>
      {/* Comet nucleus - icy rock */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial
          color="#D0E8FF"
          emissive="#B8DCFF"
          emissiveIntensity={2}
          roughness={0.8}
        />
        <pointLight intensity={1.5} distance={15} color="#D0E8FF" />
      </mesh>
      
      {/* Coma - glowing cloud around nucleus */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[1.2, 16, 16]} />
        <meshStandardMaterial
          color="#C5E3FF"
          emissive="#C5E3FF"
          emissiveIntensity={1}
          transparent
          opacity={0.3}
        />
      </mesh>
      
      {/* Dispersing dust trail particles */}
      <points ref={dustTrailRef} geometry={dustTrailGeometry} material={dustTrailMaterial} />
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

      {/* Solar System Planets - NASA-accurate visualization */}
      
      {/* Mercury - Gray, heavily cratered surface */}
      <Planet 
        position={[5, 0, 0]} 
        size={0.38} 
        color="#9D9D9D" 
        speed={0.4} 
        roughness={0.98} 
        metalness={0.02}
        emissiveIntensity={0.02}
      />
      
      {/* Venus - Thick sulfuric acid clouds, hot greenhouse atmosphere */}
      <Planet 
        position={[8, 0, 0]} 
        size={0.95} 
        color="#FFC649" 
        speed={0.3} 
        hasAtmosphere 
        atmosphereColor="#FFDB80"
        hasClouds
        cloudColor="#E8C89F"
        roughness={0.4} 
        metalness={0.1}
        emissiveIntensity={0.08}
      />
      
      {/* Earth - Blue marble with white clouds, 71% ocean coverage */}
      <Planet 
        position={[12, 0, 0]} 
        size={1} 
        color="#1A5FB4" 
        speed={0.2} 
        hasAtmosphere 
        atmosphereColor="#4A90D9"
        hasClouds
        cloudColor="#FFFFFF"
        roughness={0.6} 
        metalness={0.4}
        emissiveIntensity={0.03}
      />
      
      {/* Mars - Rusty red iron oxide surface with polar ice caps */}
      <Planet 
        position={[16, 0, 0]} 
        size={0.53} 
        color="#C1440E" 
        speed={0.15} 
        hasAtmosphere 
        atmosphereColor="#E89C7E"
        roughness={0.92} 
        metalness={0.05}
        emissiveIntensity={0.02}
      />
      
      {/* Jupiter - Gas giant with swirling cloud bands and Great Red Spot */}
      <Planet 
        position={[25, 0, 0]} 
        size={2.5} 
        color="#D8AC6B" 
        speed={0.08} 
        hasAtmosphere 
        atmosphereColor="#E8C99A"
        hasClouds
        cloudColor="#C88B3A"
        roughness={0.2} 
        metalness={0.05}
        emissiveIntensity={0.06}
      />
      
      {/* Saturn - Pale gold with magnificent ring system */}
      <Planet 
        position={[35, 0, 0]} 
        size={2.2} 
        color="#F4E4C1" 
        speed={0.06} 
        hasRings 
        hasAtmosphere 
        atmosphereColor="#FFF8DC"
        hasClouds
        cloudColor="#E8D5B7"
        roughness={0.3} 
        metalness={0.05}
        emissiveIntensity={0.04}
      />
      
      {/* Uranus - Pale cyan ice giant tilted on its side */}
      <Planet 
        position={[45, 0, 0]} 
        size={1.5} 
        color="#4FD0E7" 
        speed={0.04} 
        hasAtmosphere 
        atmosphereColor="#7FE3F0"
        hasClouds
        cloudColor="#6BC8D9"
        roughness={0.4} 
        metalness={0.25}
        emissiveIntensity={0.05}
      />
      
      {/* Neptune - Deep blue with dynamic storms and winds */}
      <Planet 
        position={[55, 0, 0]} 
        size={1.45} 
        color="#2E5090" 
        speed={0.03} 
        hasAtmosphere 
        atmosphereColor="#4169E1"
        hasClouds
        cloudColor="#3A5BA0"
        roughness={0.4} 
        metalness={0.25}
        emissiveIntensity={0.06}
      />

      {/* Asteroid Belt */}
      <AsteroidBelt />

      {/* Northern Star (Polaris) */}
      <NorthernStar />

      {/* Orion's Belt */}
      <OrionsBelt />

      {/* Comets - NASA-accurate with slow, realistic movement */}
      {[0, 5, 10, 15, 20, 25].map((delay) => (
        <Comet key={delay} delay={delay} />
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
