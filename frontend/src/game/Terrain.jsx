import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { MeshReflectorMaterial, Sparkles, Float } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

// Floating emissive orbs for atmosphere
function FloatingOrbs({ count = 60, spread = 400, color = '#8040ff' }) {
  const orbs = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      pos: [
        (Math.random() - 0.5) * spread,
        2 + Math.random() * 12,
        (Math.random() - 0.5) * spread,
      ],
      scale: 0.1 + Math.random() * 0.3,
      speed: 0.3 + Math.random() * 0.6,
      color: ['#8040ff', '#00ffff', '#ff40ff', '#4080ff', '#00ff88'][i % 5],
    }));
  }, [count, spread]);

  return (
    <group>
      {orbs.map((orb, i) => (
        <Float key={i} speed={orb.speed} rotationIntensity={0} floatIntensity={2} floatingRange={[-1, 1]}>
          <mesh position={orb.pos}>
            <sphereGeometry args={[orb.scale, 8, 8]} />
            <meshStandardMaterial
              color={orb.color}
              emissive={orb.color}
              emissiveIntensity={3}
              toneMapped={false}
            />
          </mesh>
          <pointLight position={orb.pos} color={orb.color} intensity={0.5} distance={8} decay={2} />
        </Float>
      ))}
    </group>
  );
}

// Ruined pillars scattered in the world
function RuinedPillars() {
  const pillars = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => {
      const angle = (i / 20) * Math.PI * 2 + Math.random() * 0.3;
      const radius = 80 + Math.random() * 120;
      return {
        pos: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius],
        height: 4 + Math.random() * 8,
        radius: 0.6 + Math.random() * 0.4,
        tilt: (Math.random() - 0.5) * 0.15,
        broken: Math.random() > 0.5,
      };
    });
  }, []);

  return (
    <group>
      {pillars.map((p, i) => (
        <group key={i} position={p.pos} rotation={[p.tilt, Math.random() * Math.PI, 0]}>
          <mesh castShadow position={[0, p.height / 2, 0]}>
            <cylinderGeometry args={[p.radius * 0.85, p.radius, p.broken ? p.height * 0.6 : p.height, 8]} />
            <meshStandardMaterial color="#1a1a2e" roughness={0.9} metalness={0.1} />
          </mesh>
          {/* Glowing rune ring at base */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
            <ringGeometry args={[p.radius + 0.1, p.radius + 0.4, 16]} />
            <meshStandardMaterial
              color="#6020a0"
              emissive="#6020a0"
              emissiveIntensity={1.5}
              transparent
              opacity={0.6}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// Dead/twisted trees for dark atmosphere
function TwistedTrees() {
  const trees = useMemo(() => {
    return Array.from({ length: 45 }, (_, i) => {
      const x = (Math.random() - 0.5) * 350;
      const z = (Math.random() - 0.5) * 350;
      const dist = Math.sqrt(x * x + z * z);
      if (dist < 40) return null; // Keep plaza clear
      return {
        pos: [x, 0, z],
        scale: 0.8 + Math.random() * 0.6,
        rotation: Math.random() * Math.PI * 2,
        tilt: (Math.random() - 0.5) * 0.2,
      };
    }).filter(Boolean);
  }, []);

  return (
    <group>
      {trees.map((t, i) => (
        <group key={i} position={t.pos} rotation={[t.tilt, t.rotation, 0]} scale={t.scale}>
          {/* Twisted trunk */}
          <mesh castShadow position={[0, 3, 0]}>
            <cylinderGeometry args={[0.15, 0.5, 6, 6]} />
            <meshStandardMaterial color="#1a0a20" roughness={1} />
          </mesh>
          {/* Bare branches */}
          <mesh castShadow position={[0.8, 5.5, 0]} rotation={[0, 0, 0.6]}>
            <cylinderGeometry args={[0.05, 0.15, 3, 4]} />
            <meshStandardMaterial color="#1a0a20" roughness={1} />
          </mesh>
          <mesh castShadow position={[-0.5, 5, 0.3]} rotation={[0.3, 0, -0.5]}>
            <cylinderGeometry args={[0.03, 0.12, 2.5, 4]} />
            <meshStandardMaterial color="#1a0a20" roughness={1} />
          </mesh>
          {/* Faint glow at roots */}
          <pointLight position={[0, 0.3, 0]} color="#4010a0" intensity={0.3} distance={5} decay={2} />
        </group>
      ))}
    </group>
  );
}

export default function Terrain() {
  const meshRef = useRef();

  // Create procedural terrain with dark hills
  const terrain = useMemo(() => {
    const size = 600;
    const segments = 120;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    
    const positions = geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const dist = Math.sqrt(x * x + y * y);
      
      // Flatten center (plaza area), rolling dark hills elsewhere
      const flattenFactor = Math.min(1, Math.max(0, (dist - 35) / 20));
      const height = (
        Math.sin(x * 0.08) * Math.cos(y * 0.08) * 3 +
        Math.sin(x * 0.04) * Math.cos(y * 0.04) * 2 +
        Math.sin(x * 0.15 + 1) * Math.cos(y * 0.15 + 2) * 0.8
      ) * flattenFactor;
      
      positions[i + 2] = height;
    }
    
    geometry.computeVertexNormals();
    return geometry;
  }, []);

  return (
    <group>
      {/* Main dark terrain */}
      <mesh 
        ref={meshRef}
        geometry={terrain} 
        rotation={[-Math.PI / 2, 0, 0]} 
        receiveShadow
      >
        <meshPhysicalMaterial 
          color="#151530"
          roughness={0.85}
          metalness={0.2}
          envMapIntensity={0.5}
          clearcoat={0.15}
          clearcoatRoughness={0.6}
        />
      </mesh>

      {/* Dark reflective void plane (extends to horizon) */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -0.3, 0]}
        receiveShadow
      >
        <planeGeometry args={[1200, 1200]} />
        <MeshReflectorMaterial
          blur={[600, 200]}
          resolution={512}
          mixBlur={1.5}
          mixStrength={40}
          roughness={0.7}
          depthScale={1.5}
          minDepthThreshold={0.3}
          maxDepthThreshold={1.5}
          color="#0a0a20"
          metalness={0.9}
          mirror={0.6}
        />
      </mesh>

      {/* Ethereal mist sparkles */}
      <Sparkles
        count={300}
        scale={[600, 20, 600]}
        position={[0, 3, 0]}
        size={1.5}
        speed={0.15}
        opacity={0.4}
        color="#8040ff"
      />
      
      {/* Low-lying cyan sparkles */}
      <Sparkles
        count={120}
        scale={[450, 4, 450]}
        position={[0, 0.5, 0]}
        size={2}
        speed={0.1}
        opacity={0.5}
        color="#00ffff"
      />

      {/* Floating orbs of light */}
      <FloatingOrbs />

      {/* Ruined stone pillars */}
      <RuinedPillars />

      {/* Twisted dead trees */}
      <TwistedTrees />

      {/* Glowing energy crystals */}
      {Array.from({ length: 18 }).map((_, i) => {
        const angle = (i / 18) * Math.PI * 2;
        const radius = 60 + Math.random() * 120;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const crystalColor = ['#00ffff', '#8040ff', '#ff40ff', '#00ff88'][i % 4];
        
        return (
          <Float key={`crystal-${i}`} speed={0.4} floatIntensity={1} floatingRange={[-0.3, 0.3]}>
            <group position={[x, 1.5, z]}>
              <mesh castShadow>
                <octahedronGeometry args={[0.6 + Math.random() * 0.4, 0]} />
                <meshStandardMaterial 
                  color={crystalColor}
                  emissive={crystalColor}
                  emissiveIntensity={3}
                  metalness={0.95}
                  roughness={0.05}
                  toneMapped={false}
                />
              </mesh>
              <pointLight color={crystalColor} intensity={2} distance={15} decay={2} />
              <Sparkles count={15} scale={3} size={1} speed={0.15} opacity={0.7} color={crystalColor} />
            </group>
          </Float>
        );
      })}

      {/* Mystic fog rings on the ground */}
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        const r = 80 + i * 25;
        return (
          <mesh key={`fog-ring-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[Math.cos(angle) * r * 0.3, 0.02, Math.sin(angle) * r * 0.3]}>
            <ringGeometry args={[r - 2, r, 64]} />
            <meshStandardMaterial
              color="#4020a0"
              emissive="#4020a0"
              emissiveIntensity={0.5}
              transparent
              opacity={0.12}
              toneMapped={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
    </group>
  );
}
