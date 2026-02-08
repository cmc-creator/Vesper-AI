import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
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
      {/* Main body - ethereal form */}
      <mesh castShadow>
        <sphereGeometry args={[0.6, 32, 32]} />
        <meshStandardMaterial
          color="#a78bfa"
          emissive="#8b5cf6"
          emissiveIntensity={0.5}
          transparent
          opacity={0.8}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Outer glow */}
      <mesh>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshBasicMaterial
          color="#a78bfa"
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Floating ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.3, 0]}>
        <torusGeometry args={[0.7, 0.05, 16, 32]} />
        <meshBasicMaterial
          color="#00ffff"
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Name tag */}
      <Text
        position={[0, 1.5, 0]}
        fontSize={0.3}
        color="#00ffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        Vesper
      </Text>

      {/* Interaction prompt */}
      <Text
        position={[0, -0.8, 0]}
        fontSize={0.15}
        color="#ffd700"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.01}
        outlineColor="#000000"
      >
        Press C to chat
      </Text>

      {/* Floating particles around NPC */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const radius = 1;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        return (
          <mesh key={`particle-${i}`} position={[x, 0, z]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshBasicMaterial
              color={i % 2 === 0 ? "#00ffff" : "#a78bfa"}
              transparent
              opacity={0.8}
            />
          </mesh>
        );
      })}

      {/* Point light */}
      <pointLight
        color="#a78bfa"
        intensity={3}
        distance={10}
        decay={2}
      />

      {/* Ambient glow */}
      <pointLight
        color="#00ffff"
        intensity={1}
        distance={15}
        decay={2}
      />
    </group>
  );
}
