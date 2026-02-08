import React from 'react';
import * as THREE from 'three';

export default function Castle({ position = [0, 0, -20] }) {
  return (
    <group position={position}>
      {/* Main castle base */}
      <mesh castShadow position={[0, 5, 0]}>
        <boxGeometry args={[12, 10, 12]} />
        <meshStandardMaterial color="#424242" roughness={0.9} />
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
            <meshStandardMaterial color="#616161" />
          </mesh>
          {/* Tower roof */}
          <mesh castShadow position={[0, 5, 0]}>
            <coneGeometry args={[2.2, 3, 8]} />
            <meshStandardMaterial color="#1a237e" />
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

      {/* Door glow (magical entrance) */}
      <mesh position={[0, 3, 8]}>
        <planeGeometry args={[2.5, 4.5]} />
        <meshBasicMaterial 
          color="#a78bfa" 
          transparent 
          opacity={0.3}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <pointLight position={[0, 3, 8]} color="#a78bfa" intensity={5} distance={15} />

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

      {/* Mystical floating orbs around castle */}
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
              <meshBasicMaterial color="#00ffff" />
            </mesh>
            <pointLight color="#00ffff" intensity={2} distance={8} />
          </group>
        );
      })}

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
