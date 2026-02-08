import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';

export default function VesperNPC({ position = [0, 0, 0], onInteract }) {
  const npcRef = useRef();
  const floatOffset = useRef(0);

  // Float animation
  useFrame((state) => {
    if (!npcRef.current) return;
    
    floatOffset.current += 0.02;
    npcRef.current.position.y = position[1] + Math.sin(floatOffset.current) * 0.3;
    
    // Rotate slowly
    npcRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.3;
  });

  return (
    <group ref={npcRef} position={position}>
      {/* Main body - ethereal form with enhanced glow */}
      <mesh castShadow>
        <sphereGeometry args={[0.6, 32, 32]} />
        <meshStandardMaterial
          color="#a78bfa"
          emissive="#8b5cf6"
          emissiveIntensity={2.0}
          transparent
          opacity={0.9}
          roughness={0.1}
          metalness={0.9}
          toneMapped={false}
        />
      </mesh>

      {/* Outer glow with bloom */}
      <mesh>
        <sphereGeometry args={[0.85, 32, 32]} />
        <meshBasicMaterial
          color="#a78bfa"
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Floating ring with glow */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.3, 0]}>
        <torusGeometry args={[0.7, 0.05, 16, 32]} />
        <meshStandardMaterial
          color="#00ffff"
          emissive="#00ffff"
          emissiveIntensity={2.5}
          transparent
          opacity={0.8}
          toneMapped={false}
        />
      </mesh>

      {/* Name indicator - intensely glowing orb */}
      <mesh position={[0, 2, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial 
          color="#00ffff"
          emissive="#00ffff"
          emissiveIntensity={3.0}
          toneMapped={false}
        />
      </mesh>

      {/* Magical sparkles around NPC */}
      <Sparkles
        count={80}
        scale={3}
        size={1.5}
        speed={0.3}
        opacity={0.8}
        color="#a78bfa"
      />

      {/* Floating particles around NPC */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const radius = 1;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        return (
          <mesh key={`particle-${i}`} position={[x, 0, z]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? "#00ffff" : "#a78bfa"}
              emissive={i % 2 === 0 ? "#00ffff" : "#a78bfa"}
              emissiveIntensity={2.0}
              transparent
              opacity={0.9}
              toneMapped={false}
            />
          </mesh>
        );
      })}

      {/* Enhanced point lights */}
      <pointLight
        color="#a78bfa"
        intensity={6}
        distance={15}
        decay={2}
      />

      {/* Ambient cyan glow */}
      <pointLight
        color="#00ffff"
        intensity={3}
        distance={20}
        decay={2}
      />
    </group>
  );
}
