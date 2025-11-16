import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { ChevronLeft, ChevronRight, Star, Heart, X, Sparkles, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MultiverseViewpointAI } from "./MultiverseViewpointAI";
import { Badge } from "@/components/ui/badge";

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
    const frameDelay = 180; // Milliseconds between frames (slower = higher number)

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
      meshRef.current.rotation.y += 0.0012;
      
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
      meshRef.current.rotation.y += 0.0004;
    }
    if (coronaRef.current) {
      coronaRef.current.rotation.y -= 0.0002;
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
      // Much slower speed - comets take 50 seconds to cross
      const time = (clock.getElapsedTime() + delay) * 0.2;
      const progress = (time % 50) / 50;
      
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
      accretionRef.current.rotation.z += 0.004;
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
      pointsRef.current.rotation.y += 0.00004;
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

// Mega Hybrid Spaceship - Combines Draco and Zozo designs
const MegaSpaceship = ({ position }: { position: [number, number, number] }) => {
  const meshRef = useRef<THREE.Group>(null);
  
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const time = clock.getElapsedTime();
      // Orbital movement
      meshRef.current.position.x = position[0] + Math.cos(time * 0.08) * 40;
      meshRef.current.position.z = position[2] + Math.sin(time * 0.08) * 40;
      meshRef.current.position.y = position[1] + Math.sin(time * 0.2) * 3;
      meshRef.current.rotation.y = time * 0.08;
    }
  });

  return (
    <group ref={meshRef} position={position}>
      {/* Central Core - Angular red structure from Draco */}
      <mesh>
        <boxGeometry args={[4, 2, 8]} />
        <meshStandardMaterial 
          color="#CC0033" 
          metalness={0.9} 
          roughness={0.15}
          emissive="#330000"
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* Cylindrical Overlay - Sleek cyan from Zozo */}
      <mesh position={[0, 0, -1]}>
        <cylinderGeometry args={[1.5, 2, 6, 12]} />
        <meshStandardMaterial 
          color="#00CED1" 
          metalness={0.95} 
          roughness={0.05}
          transparent
          opacity={0.7}
        />
      </mesh>
      
      {/* Large Angular Wings - Red */}
      <mesh position={[4, 0, -1]}>
        <boxGeometry args={[3, 0.4, 4]} />
        <meshStandardMaterial color="#8B0000" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[-4, 0, -1]}>
        <boxGeometry args={[3, 0.4, 4]} />
        <meshStandardMaterial color="#8B0000" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Cyan Stabilizer Fins */}
      <mesh position={[2.5, 1.5, 0]} rotation={[0, 0, Math.PI / 6]}>
        <boxGeometry args={[0.3, 4, 2]} />
        <meshStandardMaterial color="#008B8B" metalness={0.85} roughness={0.15} />
      </mesh>
      <mesh position={[-2.5, 1.5, 0]} rotation={[0, 0, -Math.PI / 6]}>
        <boxGeometry args={[0.3, 4, 2]} />
        <meshStandardMaterial color="#008B8B" metalness={0.85} roughness={0.15} />
      </mesh>
      
      {/* Dual-Toned Cockpit - Gold and Cyan */}
      <mesh position={[0, 1.5, 3]}>
        <sphereGeometry args={[1.2, 20, 20]} />
        <meshStandardMaterial 
          color="#FFD700" 
          metalness={0.9} 
          roughness={0.1} 
          transparent 
          opacity={0.8}
          emissive="#FFAA00"
          emissiveIntensity={0.5}
        />
      </mesh>
      <mesh position={[0, 1.5, 3]}>
        <sphereGeometry args={[1.1, 20, 20]} />
        <meshStandardMaterial 
          color="#00FFFF" 
          metalness={0.95} 
          roughness={0.05} 
          transparent 
          opacity={0.4}
        />
      </mesh>
      
      {/* Dual Engine System - Red and Cyan */}
      {/* Red Engine Left */}
      <pointLight position={[-1, 0, -4]} intensity={5} distance={15} color="#FF4500" />
      <mesh position={[-1, 0, -4]}>
        <sphereGeometry args={[0.7, 16, 16]} />
        <meshStandardMaterial 
          color="#FF4500" 
          emissive="#FF4500" 
          emissiveIntensity={3}
        />
      </mesh>
      <mesh position={[-1, 0, -4.5]}>
        <coneGeometry args={[0.9, 2, 8]} />
        <meshStandardMaterial 
          color="#FF6600" 
          emissive="#FF4500" 
          emissiveIntensity={2}
          transparent
          opacity={0.8}
        />
      </mesh>
      
      {/* Cyan Engine Right */}
      <pointLight position={[1, 0, -4]} intensity={5} distance={15} color="#00FFFF" />
      <mesh position={[1, 0, -4]}>
        <sphereGeometry args={[0.7, 16, 16]} />
        <meshStandardMaterial 
          color="#00FFFF" 
          emissive="#00FFFF" 
          emissiveIntensity={3}
        />
      </mesh>
      <mesh position={[1, 0, -4.5]}>
        <coneGeometry args={[0.9, 2, 8]} />
        <meshStandardMaterial 
          color="#00CCFF" 
          emissive="#00FFFF" 
          emissiveIntensity={2}
          transparent
          opacity={0.8}
        />
      </mesh>
      
      {/* Additional Hull Details */}
      <mesh position={[0, 0, 1]}>
        <boxGeometry args={[2.5, 1.5, 3]} />
        <meshStandardMaterial 
          color="#660033" 
          metalness={0.85} 
          roughness={0.25}
        />
      </mesh>
    </group>
  );
};

// Mega Hybrid Cockpit Interior - Combines both designs
const MegaCockpitInterior = () => {
  return (
    <group position={[0, 0, 0]}>
      {/* Central control console */}
      <mesh position={[0, -0.55, -2.1]} rotation={[-Math.PI / 5.5, 0, 0]}>
        <boxGeometry args={[2.5, 0.1, 1.2]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.9} />
      </mesh>
      
      {/* Red holographic displays (Draco style) */}
      <mesh position={[-1.2, -0.35, -2]}>
        <boxGeometry args={[0.6, 0.45, 0.05]} />
        <meshStandardMaterial color="#FF0000" emissive="#FF0000" emissiveIntensity={1.8} />
      </mesh>
      <mesh position={[-0.4, -0.25, -1.9]}>
        <boxGeometry args={[0.6, 0.5, 0.05]} />
        <meshStandardMaterial color="#FF4500" emissive="#FF4500" emissiveIntensity={1.6} />
      </mesh>
      
      {/* Cyan holographic displays (Zozo style) */}
      <mesh position={[0.4, -0.25, -1.9]}>
        <boxGeometry args={[0.6, 0.5, 0.05]} />
        <meshStandardMaterial color="#00FFFF" emissive="#00FFFF" emissiveIntensity={2} />
      </mesh>
      <mesh position={[1.2, -0.35, -2]}>
        <boxGeometry args={[0.6, 0.45, 0.05]} />
        <meshStandardMaterial color="#00CED1" emissive="#00CED1" emissiveIntensity={1.8} />
      </mesh>
      
      {/* Center main display - dual color */}
      <mesh position={[0, -0.1, -1.85]}>
        <boxGeometry args={[0.8, 0.6, 0.05]} />
        <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={1.5} />
      </mesh>
      
      {/* Side panels - Red theme */}
      <mesh position={[-1.5, 0, -1]} rotation={[0, Math.PI / 6, 0]}>
        <boxGeometry args={[0.05, 1.5, 1.5]} />
        <meshStandardMaterial color="#8B0000" emissive="#FF0000" emissiveIntensity={0.3} />
      </mesh>
      
      {/* Side panels - Cyan theme */}
      <mesh position={[1.5, 0, -1]} rotation={[0, -Math.PI / 6, 0]}>
        <boxGeometry args={[0.05, 1.5, 1.5]} />
        <meshStandardMaterial color="#008B8B" emissive="#00CED1" emissiveIntensity={0.3} />
      </mesh>
      
      {/* Dual ambient cockpit lighting */}
      <pointLight position={[-0.5, 1, 0]} intensity={0.5} color="#FF0000" />
      <pointLight position={[0.5, 1, 0]} intensity={0.5} color="#00FFFF" />
      <pointLight position={[-1, 0, -1]} intensity={0.35} color="#FFD700" />
      <pointLight position={[1, 0, -1]} intensity={0.35} color="#00CED1" />
      <pointLight position={[0, 0.5, -1.5]} intensity={0.4} color="#FFFFFF" />
    </group>
  );
};

// Camera Controller for POV switching with 360-degree orbital viewing
const CameraController = ({ povIndex, orbitControlsRef, zoomLevel, isStationaryMode }: { 
  povIndex: number; 
  orbitControlsRef: any; 
  zoomLevel: number;
  isStationaryMode: boolean;
}) => {
  const { camera } = useThree();
  const [isTransitioning, setIsTransitioning] = useState(true);
  const prevPovIndex = useRef(povIndex);
  const stationaryCameraPos = useRef<THREE.Vector3 | null>(null);
  
  const povPositions = useMemo(() => [
    { pos: [0, 80, 120], lookAt: [0, 0, 0] }, // God's eye view
    { pos: [25, 5, 25], lookAt: [22, 0, 0] }, // Planet view (Earth)
    { pos: [-35, 15, -35], lookAt: [-40, 12, -40] }, // Comet view
    { pos: [0, 0, 200], lookAt: [0, 0, 0] }, // Void/Space view
    { pos: [0, 0, 0], lookAt: [0, 0, -2] }, // Mega Cockpit Interior
    { pos: [0, 0, 0], lookAt: [0, 0, 0] }, // Follow Mega (calculated dynamically)
    { pos: [120, 40, 120], lookAt: [125, 35, 125] }, // Star constellation
    { pos: [-150, 100, -150], lookAt: [0, 0, 0] }, // Multiverse view
    { pos: [0, 150, 80], lookAt: [0, 0, 0] }, // Heaven view
    { pos: [135, 35, 135], lookAt: [130, 35, 130] }, // Orion's belt
    { pos: [0, 2, 0], lookAt: [100, 0, 0] }, // Milky Way inside view
    { pos: [155, 155, 155], lookAt: [150, 150, 150] }, // Northern Star
    { pos: [0, 200, 0], lookAt: [0, 0, 0] }, // Heaven avenue
  ], []);

  // Detect POV change and start transition
  useEffect(() => {
    if (prevPovIndex.current !== povIndex) {
      setIsTransitioning(true);
      prevPovIndex.current = povIndex;
    }
  }, [povIndex]);

  // Initialize stationary camera position when entering stationary mode
  useEffect(() => {
    if (povIndex === 5 && isStationaryMode && !stationaryCameraPos.current) {
      const zoomDistances = [12, 20, 35];
      const offsetDistance = zoomDistances[zoomLevel];
      // Set initial stationary position - slightly offset from center
      stationaryCameraPos.current = new THREE.Vector3(
        offsetDistance * 0.7,
        offsetDistance * 0.4,
        offsetDistance * 0.7
      );
    }
    
    // Reset stationary position when leaving follow mode or stationary mode
    if (povIndex !== 5 || !isStationaryMode) {
      stationaryCameraPos.current = null;
    }
  }, [povIndex, isStationaryMode, zoomLevel]);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    const target = povPositions[povIndex];
    let targetPos = new THREE.Vector3(...target.pos);
    let lookAtTarget = new THREE.Vector3(...target.lookAt);
    
    // Calculate dynamic positions for Follow Mega (POV 5)
    if (povIndex === 5) {
      const megaAngle = time * 0.08;
      const megaRadius = 40;
      const megaX = Math.cos(megaAngle) * megaRadius;
      const megaZ = Math.sin(megaAngle) * megaRadius;
      const megaY = 5 + Math.sin(time * 0.2) * 3;
      
      lookAtTarget = new THREE.Vector3(megaX, megaY, megaZ);
      
      if (isStationaryMode && stationaryCameraPos.current) {
        // STATIONARY MODE: Camera stays in fixed position, can rotate 360°
        targetPos = stationaryCameraPos.current;
        
        // Keep camera at stationary position
        camera.position.lerp(targetPos, 0.05);
        
        // Enable full OrbitControls for 360° rotation around the fixed point
        if (orbitControlsRef.current) {
          orbitControlsRef.current.enabled = true;
          orbitControlsRef.current.enableRotate = true;
          orbitControlsRef.current.enableZoom = true;
          orbitControlsRef.current.enablePan = false;
          // Set target to ship position so user can rotate around to track it
          orbitControlsRef.current.target.lerp(lookAtTarget, 0.03);
          orbitControlsRef.current.update();
        }
      } else {
        // TRAILING MODE: Camera follows behind ship
        const zoomDistances = [12, 20, 35];
        const offsetDistance = zoomDistances[zoomLevel];
        
        // Camera trailing behind - follows ship's direction
        const cameraX = megaX - Math.cos(megaAngle) * offsetDistance;
        const cameraZ = megaZ - Math.sin(megaAngle) * offsetDistance;
        const cameraY = megaY + (offsetDistance * 0.35);
        
        targetPos = new THREE.Vector3(cameraX, cameraY, cameraZ);
        
        // Apply camera position smoothly
        camera.position.lerp(targetPos, 0.05);
        
        // Enable OrbitControls for 360° view while trailing
        if (orbitControlsRef.current) {
          orbitControlsRef.current.enabled = true;
          orbitControlsRef.current.enableRotate = true;
          orbitControlsRef.current.enableZoom = true;
          orbitControlsRef.current.enablePan = false;
          orbitControlsRef.current.target.lerp(lookAtTarget, 0.05);
          orbitControlsRef.current.update();
        }
      }
      
      return; // Skip rest of the frame logic for follow mode
    }
    
    if (isTransitioning) {
      // Disable OrbitControls during transition
      if (orbitControlsRef.current) {
        orbitControlsRef.current.enabled = false;
      }
      
      // Smooth camera transition
      camera.position.lerp(targetPos, 0.02);
      
      // Smooth lookAt transition
      const currentLookAt = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      const targetLookDir = lookAtTarget.clone().sub(camera.position).normalize();
      currentLookAt.lerp(targetLookDir, 0.02);
      
      camera.lookAt(camera.position.clone().add(currentLookAt.multiplyScalar(100)));
      
      // Check if transition is complete (camera close enough to target)
      const distanceToTarget = camera.position.distanceTo(targetPos);
      if (distanceToTarget < 0.5) {
        setIsTransitioning(false);
        
        // Enable OrbitControls and set target
        if (orbitControlsRef.current) {
          orbitControlsRef.current.enabled = true;
          orbitControlsRef.current.target.copy(lookAtTarget);
          orbitControlsRef.current.update();
        }
      }
    } else {
      // Update OrbitControls target when at viewpoint
      if (orbitControlsRef.current) {
        orbitControlsRef.current.target.copy(lookAtTarget);
      }
    }
  });

  return null;
};

// Main Scene
const SpaceScene = ({ povIndex, zoomLevel, isStationaryMode }: { 
  povIndex: number; 
  zoomLevel: number;
  isStationaryMode: boolean;
}) => {
  const orbitControlsRef = useRef<any>(null);
  
  return (
    <>
      <CameraController 
        povIndex={povIndex} 
        orbitControlsRef={orbitControlsRef} 
        zoomLevel={zoomLevel}
        isStationaryMode={isStationaryMode}
      />
      <OrbitControls
        ref={orbitControlsRef}
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.5}
        autoRotate={true}
        autoRotateSpeed={1.0}
        enableZoom={true}
        enablePan={false}
        minDistance={1}
        maxDistance={500}
      />
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
        speed={0.2}
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
        position={[8, 0, 0]} 
        size={0.38} 
        color="#9D9D9D" 
        speed={0.008}
        roughness={0.98} 
        metalness={0.02}
        emissiveIntensity={0.02}
      />
      
      {/* Venus - Thick sulfuric acid clouds, hot greenhouse atmosphere */}
      <Planet 
        position={[14, 0, 0]} 
        size={0.95} 
        color="#FFC649" 
        speed={0.006}
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
        position={[22, 0, 0]} 
        size={1} 
        color="#1A5FB4" 
        speed={0.005}
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
        position={[30, 0, 0]} 
        size={0.53} 
        color="#C1440E" 
        speed={0.004}
        hasAtmosphere 
        atmosphereColor="#E89C7E"
        roughness={0.92} 
        metalness={0.05}
        emissiveIntensity={0.02}
      />
      
      {/* Jupiter - Gas giant with swirling cloud bands and Great Red Spot */}
      <Planet 
        position={[45, 0, 0]} 
        size={2.5} 
        color="#D8AC6B" 
        speed={0.0025}
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
        position={[60, 0, 0]} 
        size={2.2} 
        color="#F4E4C1" 
        speed={0.002}
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
        position={[75, 0, 0]} 
        size={1.5} 
        color="#4FD0E7" 
        speed={0.0016}
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
        position={[90, 0, 0]} 
        size={1.45} 
        color="#2E5090" 
        speed={0.0012}
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

      {/* Mega Hybrid Spaceship */}
      <MegaSpaceship position={[0, 5, 0]} />

      {/* Mega Cockpit Interior - Only shown when in cockpit POV */}
      {povIndex === 4 && <MegaCockpitInterior />}

      {/* Camera controls - disabled for POV mode */}
      <OrbitControls
        enabled={false}
        enableZoom={false}
        enablePan={false}
        enableRotate={false}
      />
    </>
  );
};

const RealisticSpaceBackground = () => {
  const [hasWebGLError, setHasWebGLError] = useState(false);
  const [povIndex, setPovIndex] = useState(0);
  const totalPOVs = 13;
  const [zoomLevel, setZoomLevel] = useState(1); // 0: close, 1: medium, 2: far
  const [isStationaryMode, setIsStationaryMode] = useState(false); // Fixed camera position
  const [favorites, setFavorites] = useState<any[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [customName, setCustomName] = useState("");
  const [showCameraControls, setShowCameraControls] = useState(true); // Dropdown for camera controls
  const [tapCount, setTapCount] = useState(0);
  const [tapTimer, setTapTimer] = useState<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Triple-tap handler for rocket button
  const handleRocketTap = () => {
    setTapCount(prev => prev + 1);
    
    if (tapTimer) {
      clearTimeout(tapTimer);
    }
    
    const timer = setTimeout(() => {
      if (tapCount + 1 === 3) {
        setPovIndex(0); // Exit to default view
        toast({ title: "🚀 Exited spaceship view", description: "Returned to God's Eye view" });
      }
      setTapCount(0);
    }, 500);
    
    setTapTimer(timer);
  };

  useEffect(() => {
    // Check if WebGL is available
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      setHasWebGLError(true);
    }
    
    // Load favorites
    loadFavorites();
    
    // Cleanup tap timer on unmount
    return () => {
      if (tapTimer) {
        clearTimeout(tapTimer);
      }
    };
  }, [tapTimer]);

  const loadFavorites = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from('favorite_pov_views')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setFavorites(data);
    }
  };

  const saveFavorite = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({ title: "Sign in to save favorites", variant: "destructive" });
      return;
    }

    const povNames = ["God's Eye", "Planet View", "Comet View", "Void View", "Mega Cockpit", "Follow Mega", "Constellation View", "Multiverse View", "Heaven View", "Orion's Belt", "Milky Way", "Northern Star", "Heaven Avenue"];
    const povName = povNames[povIndex];

    const { error } = await supabase
      .from('favorite_pov_views')
      .insert({
        user_id: session.user.id,
        pov_index: povIndex,
        pov_name: povName,
        custom_name: customName || povName
      });

    if (error) {
      toast({ title: "Failed to save favorite", variant: "destructive" });
    } else {
      toast({ title: "✨ Favorite saved!", description: `${customName || povName} added to your collection` });
      setShowSaveDialog(false);
      setCustomName("");
      loadFavorites();
    }
  };

  const deleteFavorite = async (id: string) => {
    const { error } = await supabase
      .from('favorite_pov_views')
      .delete()
      .eq('id', id);

    if (!error) {
      toast({ title: "Favorite removed" });
      loadFavorites();
    }
  };

  const cyclePOV = (direction: 'left' | 'right') => {
    setPovIndex(prev => {
      if (direction === 'left') {
        return prev === 0 ? totalPOVs - 1 : prev - 1;
      } else {
        return prev === totalPOVs - 1 ? 0 : prev + 1;
      }
    });
  };

  if (hasWebGLError) {
    // Fallback to a simple gradient background if WebGL fails
    return (
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-black via-slate-900 to-black" />
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-0">
        <Canvas
          camera={{ position: [0, 20, 50], fov: 75 }}
          style={{ background: "black" }}
          onCreated={(state) => {
            // Additional error handling
            if (!state.gl) {
              setHasWebGLError(true);
            }
          }}
          onError={(error) => {
            console.warn('WebGL Error:', error);
            setHasWebGLError(true);
          }}
        >
          <SpaceScene povIndex={povIndex} zoomLevel={zoomLevel} isStationaryMode={isStationaryMode} />
        </Canvas>
      </div>
      
      {/* POV Controls - All Seeing Eye */}
      <div className="fixed top-4 left-4 z-30 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => cyclePOV('left')}
            className="w-10 h-10 rounded-full bg-background/20 backdrop-blur-xl border border-primary/30 flex items-center justify-center hover:bg-primary/20 hover:border-primary/50 transition-all group"
            aria-label="Previous view"
          >
            <ChevronLeft className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
          </button>
          
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/30 via-blue-500/30 to-cyan-500/30 backdrop-blur-xl border-2 border-primary/40 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 via-blue-400/20 to-cyan-400/20 animate-pulse" />
            <div className="relative w-8 h-8 rounded-full border-2 border-primary/60 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-primary/80 animate-pulse" />
              <div className="absolute inset-0 rounded-full border border-primary/40 animate-ping" />
            </div>
          </div>
          
          <button
            onClick={() => cyclePOV('right')}
            className="w-10 h-10 rounded-full bg-background/20 backdrop-blur-xl border border-primary/30 flex items-center justify-center hover:bg-primary/20 hover:border-primary/50 transition-all group"
            aria-label="Next view"
          >
            <ChevronRight className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
          </button>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowSaveDialog(true)}
            className="p-2.5 rounded-full bg-accent/20 backdrop-blur-xl border border-accent/30 hover:bg-accent/30 transition-all"
            title="Save Favorite"
          >
            <Star className="w-5 h-5 text-accent" />
          </button>
          <button
            onClick={() => setShowFavorites(!showFavorites)}
            className="p-2.5 rounded-full bg-secondary/20 backdrop-blur-xl border border-secondary/30 hover:bg-secondary/30 transition-all"
            title="View Favorites"
          >
            <Heart className="w-5 h-5 text-secondary" fill={showFavorites ? "currentColor" : "none"} />
          </button>
          <button
            onClick={() => setShowAIGenerator(!showAIGenerator)}
            className="p-2.5 rounded-full bg-primary/20 backdrop-blur-xl border border-primary/30 hover:bg-primary/30 transition-all"
            title="AI Viewpoint Generator"
          >
            <Sparkles className="w-5 h-5 text-primary" fill={showAIGenerator ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      {/* Mega Spaceship Quick Access - Top Right */}
      <div className="fixed top-4 right-4 z-30 flex flex-col gap-2">
        <button
          onClick={() => {
            handleRocketTap();
            setPovIndex(4);
          }}
          className={`p-3 rounded-full backdrop-blur-xl border transition-all shadow-xl hover:scale-110 relative overflow-hidden ${
            povIndex === 4 
              ? 'bg-gradient-to-br from-red-500/40 to-cyan-500/40 border-purple-500/50' 
              : 'bg-background/20 border-purple-500/30 hover:from-red-500/20 hover:to-cyan-500/20'
          }`}
          title="Mega Ship Cockpit View (Triple-tap to exit)"
        >
          <Rocket className="w-6 h-6 text-purple-300" />
        </button>
        <button
          onClick={() => setPovIndex(5)}
          className={`p-2.5 rounded-full backdrop-blur-xl border transition-all shadow-xl hover:scale-110 ${
            povIndex === 5 
              ? 'bg-gradient-to-br from-red-500/30 to-cyan-500/30 border-purple-400/50' 
              : 'bg-background/20 border-purple-400/30 hover:from-red-500/15 hover:to-cyan-500/15'
          }`}
          title="Follow Mega Ship"
        >
          <Rocket className="w-5 h-5 text-purple-400" />
        </button>
        {povIndex === 4 && (
          <Badge className="bg-gradient-to-r from-red-500/20 to-cyan-500/20 text-purple-300 border-purple-500/50 text-xs animate-pulse">
            Mega Cockpit
          </Badge>
        )}
        {povIndex === 5 && (
          <Badge className="bg-gradient-to-r from-red-500/20 to-cyan-500/20 text-purple-300 border-purple-400/50 text-xs animate-pulse">
            Following
          </Badge>
        )}
        
        {/* Camera Controls Toggle - Only show when following */}
        {povIndex === 5 && (
          <div className="mt-4 border-t border-purple-500/30 pt-2">
            <button
              onClick={() => setShowCameraControls(!showCameraControls)}
              className="w-full px-3 py-2 rounded-lg backdrop-blur-xl border border-purple-500/30 bg-background/20 hover:bg-purple-500/20 transition-all text-xs font-medium text-purple-300 flex items-center justify-between"
              title="Toggle Camera Controls"
            >
              <span>Camera Controls</span>
              <ChevronRight className={`w-4 h-4 transition-transform ${showCameraControls ? 'rotate-90' : ''}`} />
            </button>
            
            {/* Collapsible Camera Controls */}
            {showCameraControls && (
              <div className="mt-2 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="text-xs text-purple-300 text-center font-semibold">Zoom</div>
                <button
                  onClick={() => setZoomLevel(0)}
                  className={`px-3 py-2 rounded-lg backdrop-blur-xl border transition-all text-xs font-medium ${
                    zoomLevel === 0
                      ? 'bg-purple-500/40 border-purple-400/60 text-white'
                      : 'bg-background/20 border-purple-500/30 text-purple-300 hover:bg-purple-500/20'
                  }`}
                  title="Close Follow"
                >
                  Close
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className={`px-3 py-2 rounded-lg backdrop-blur-xl border transition-all text-xs font-medium ${
                    zoomLevel === 1
                      ? 'bg-purple-500/40 border-purple-400/60 text-white'
                      : 'bg-background/20 border-purple-500/30 text-purple-300 hover:bg-purple-500/20'
                  }`}
                  title="Medium Follow"
                >
                  Medium
                </button>
                <button
                  onClick={() => setZoomLevel(2)}
                  className={`px-3 py-2 rounded-lg backdrop-blur-xl border transition-all text-xs font-medium ${
                    zoomLevel === 2
                      ? 'bg-purple-500/40 border-purple-400/60 text-white'
                      : 'bg-background/20 border-purple-500/30 text-purple-300 hover:bg-purple-500/20'
                  }`}
                  title="Far Follow"
                >
                  Far
                </button>
                
                {/* Camera Mode Toggle */}
                <div className="mt-2 border-t border-purple-500/30 pt-2">
                  <div className="text-xs text-purple-300 text-center font-semibold mb-2">Camera</div>
                  <button
                    onClick={() => setIsStationaryMode(!isStationaryMode)}
                    className={`w-full px-3 py-2 rounded-lg backdrop-blur-xl border transition-all text-xs font-medium ${
                      isStationaryMode
                        ? 'bg-cyan-500/40 border-cyan-400/60 text-white'
                        : 'bg-background/20 border-purple-500/30 text-purple-300 hover:bg-cyan-500/20'
                    }`}
                    title={isStationaryMode ? "Fixed Position - 360° View" : "Trailing Behind Ship"}
                  >
                    {isStationaryMode ? '📍 Fixed' : '🚀 Trail'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Save Favorite Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Star className="w-5 h-5 text-accent" />
                Save Favorite View
              </h3>
              <button onClick={() => setShowSaveDialog(false)} className="p-1 hover:bg-muted rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <Input
              placeholder="Custom name (optional)"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="w-full"
            />
            <Button onClick={saveFavorite} className="w-full">
              <Star className="w-4 h-4 mr-2" />
              Save to Favorites
            </Button>
          </div>
        </div>
      )}

      {/* Favorites Panel */}
      {showFavorites && (
        <div className="fixed top-32 left-4 z-40 w-80 max-h-96 bg-card/95 backdrop-blur-md border border-border rounded-lg overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-border flex items-center justify-between bg-card">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <Heart className="w-5 h-5 text-secondary" />
              Favorite Views
            </h3>
            <button onClick={() => setShowFavorites(false)} className="p-1 hover:bg-muted rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
          <ScrollArea className="h-80">
            <div className="p-4 space-y-2">
              {favorites.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  No favorites saved yet
                </p>
              ) : (
                favorites.map((fav) => (
                  <div
                    key={fav.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                  >
                    <button
                      onClick={() => {
                        setPovIndex(fav.pov_index);
                        setShowFavorites(false);
                        toast({ title: `Viewing ${fav.custom_name || fav.pov_name}` });
                      }}
                      className="flex-1 text-left"
                    >
                      <div className="font-medium text-foreground">{fav.custom_name || fav.pov_name}</div>
                      <div className="text-xs text-muted-foreground">{fav.pov_name}</div>
                    </button>
                    <button
                      onClick={() => deleteFavorite(fav.id)}
                      className="p-1 hover:bg-destructive/20 rounded text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* AI Viewpoint Generator Panel */}
      {showAIGenerator && (
        <div className="fixed top-32 left-4 z-40 w-96 bg-card/95 backdrop-blur-md border border-border rounded-lg overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-border flex items-center justify-between bg-card">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
              AI Viewpoint Generator
            </h3>
            <button onClick={() => setShowAIGenerator(false)} className="p-1 hover:bg-muted rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4">
            <MultiverseViewpointAI 
              onViewpointGenerated={(viewpoint) => {
                toast({ 
                  title: "✨ AI Viewpoint Ready!", 
                  description: viewpoint.name 
                });
                loadFavorites();
                setShowAIGenerator(false);
              }} 
            />
          </div>
        </div>
      )}
      
      <MatrixRain />
    </>
  );
};

export default RealisticSpaceBackground;
