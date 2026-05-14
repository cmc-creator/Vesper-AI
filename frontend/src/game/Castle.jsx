import React from 'react';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';

export default function Castle({ position = [0, 0, -20] }) {
  return (
    <group position={position}>
      {/* Main castle base - PBR stone */}
      <mesh castShadow position={[0, 5, 0]}>
        <boxGeometry args={[12, 10, 12]} />
        <meshPhysicalMaterial 
          color="#424242" 
          roughness={0.95} 
          metalness={0.0}
          clearcoat={0.05}
          clearcoatRoughness={0.9}
        />
      </mesh>

      {/* Corner towers */}
      {[
        [-5, 8, -5],
        [5, 8, -5],
        [-5, 8, 5],
        [5, 8, 5],
      ].map((pos, i) => (
        <group key={`tower-${i}`} position={pos}>
          <mesh castShadow>
            <cylinderGeometry args={[1.5, 1.8, 8, 8]} />
            <meshPhysicalMaterial 
              color="#616161" 
              roughness={0.92}
              metalness={0.0}
              clearcoat={0.05}
            />
          </mesh>
          {/* Tower roof */}
          <mesh castShadow position={[0, 5, 0]}>
            <coneGeometry args={[2.2, 3, 8]} />
            <meshPhysicalMaterial 
              color="#1a237e" 
              roughness={0.8}
              metalness={0.1}
              clearcoat={0.2}
              clearcoatRoughness={0.3}
            />
          </mesh>
          {/* Tower windows */}
          <mesh position={[0, 2, 2]}>
            <boxGeometry args={[0.6, 0.8, 0.1]} />
            <meshBasicMaterial color="#ffd700" />
          </mesh>
        </group>
      ))}

      {/* Main entrance tower */}
      <mesh castShadow position={[0, 8, 7]}>
        <cylinderGeometry args={[2, 2.5, 10, 8]} />
        <meshStandardMaterial color="#546e7a" />
      </mesh>
      <mesh castShadow position={[0, 14, 7]}>
        <coneGeometry args={[3, 4, 8]} />
        <meshStandardMaterial color="#1a237e" />
      </mesh>

      {/* Castle door */}
      <mesh position={[0, 3, 7.6]}>
        <boxGeometry args={[2, 4, 0.3]} />
        <meshStandardMaterial color="#3e2723" />
      </mesh>

      {/* Door glow (magical entrance with bloom) */}
      <mesh position={[0, 3, 8]}>
        <planeGeometry args={[2.5, 4.5]} />
        <meshStandardMaterial 
          color="#a78bfa" 
          emissive="#a78bfa"
          emissiveIntensity={2.0}
          transparent 
          opacity={0.5}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <pointLight position={[0, 3, 9]} color="#a78bfa" intensity={8} distance={20} decay={2} />

      {/* Castle walls */}
      {[
        { pos: [-8, 3, 0], size: [2, 6, 12] },
        { pos: [8, 3, 0], size: [2, 6, 12] },
        { pos: [0, 3, -8], size: [12, 6, 2] },
      ].map((wall, i) => (
        <mesh key={`wall-${i}`} castShadow position={wall.pos}>
          <boxGeometry args={wall.size} />
          <meshStandardMaterial color="#424242" roughness={0.9} />
        </mesh>
      ))}

      {/* Battlements */}
      {Array.from({ length: 20 }).map((_, i) => {
        const angle = (i / 20) * Math.PI * 2;
        const radius = 7;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        return (
          <mesh key={`battlement-${i}`} castShadow position={[x, 6.5, z]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#616161" />
          </mesh>
        );
      })}

      {/* Mystical floating orbs around castle with bloom */}
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i / 6) * Math.PI * 2 + Date.now() * 0.0001;
        const radius = 10;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = 8 + Math.sin(Date.now() * 0.001 + i) * 2;
        
        return (
          <group key={`orb-${i}`} position={[x, y, z]}>
            <mesh>
              <sphereGeometry args={[0.3, 16, 16]} />
              <meshStandardMaterial 
                color="#00ffff"
                emissive="#00ffff"
                emissiveIntensity={3.0}
                toneMapped={false}
              />
            </mesh>
            <pointLight color="#00ffff" intensity={4} distance={12} decay={2} />
          </group>
        );
      })}
      
      {/* Magical sparkles around castle */}
      <Sparkles
        count={150}
        scale={[25, 15, 25]}
        position={[0, 8, 0]}
        size={1.8}
        speed={0.2}
        opacity={0.7}
        color="#00ffff"
      />

      {/* Ground foundation */}
      <mesh receiveShadow position={[0, 0.1, 0]}>
        <cylinderGeometry args={[15, 15, 0.5, 32]} />
        <meshStandardMaterial color="#1c1c1c" />
      </mesh>

      {/* Castle nameplate (floating text would go here) */}
      <mesh position={[0, 1, 10]}>
        <planeGeometry args={[4, 1]} />
        <meshBasicMaterial 
          color="#000000" 
          transparent 
          opacity={0.7}
        />
      </mesh>
    </group>
  );
}
