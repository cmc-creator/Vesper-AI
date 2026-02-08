import React, { useMemo } from 'react';
import * as THREE from 'three';

export default function Terrain() {
  // Create procedural terrain with hills
  const terrain = useMemo(() => {
    const size = 100;
    const segments = 50;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    
    // Generate height map
    const positions = geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      
      // Create hills using simplex-like noise
      const height = 
        Math.sin(x * 0.1) * Math.cos(y * 0.1) * 2 +
        Math.sin(x * 0.05) * Math.cos(y * 0.05) * 1.5 +
        Math.sin(x * 0.2) * Math.cos(y * 0.2) * 0.5;
      
      positions[i + 2] = height;
    }
    
    geometry.computeVertexNormals();
    return geometry;
  }, []);

  return (
    <group>
      {/* Main terrain */}
      <mesh 
        geometry={terrain} 
        rotation={[-Math.PI / 2, 0, 0]} 
        receiveShadow
      >
        <meshStandardMaterial 
          color="#2d5016"
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

      {/* Water plane */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -0.5, 0]}
        receiveShadow
      >
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial 
          color="#0ea5e9"
          transparent
          opacity={0.6}
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>

      {/* Trees scattered around */}
      {Array.from({ length: 30 }).map((_, i) => {
        const x = (Math.random() - 0.5) * 80;
        const z = (Math.random() - 0.5) * 80;
        const scale = 0.8 + Math.random() * 0.4;
        
        return (
          <group key={i} position={[x, 0, z]}>
            {/* Tree trunk */}
            <mesh castShadow position={[0, 1.5, 0]}>
              <cylinderGeometry args={[0.3, 0.4, 3, 8]} />
              <meshStandardMaterial color="#3e2723" />
            </mesh>
            
            {/* Tree foliage */}
            <mesh castShadow position={[0, 4, 0]} scale={scale}>
              <coneGeometry args={[2, 4, 8]} />
              <meshStandardMaterial color="#1b5e20" />
            </mesh>
          </group>
        );
      })}

      {/* Rock formations */}
      {Array.from({ length: 15 }).map((_, i) => {
        const x = (Math.random() - 0.5) * 70;
        const z = (Math.random() - 0.5) * 70;
        const scale = 0.5 + Math.random() * 1;
        
        return (
          <mesh 
            key={`rock-${i}`} 
            position={[x, scale * 0.5, z]} 
            castShadow
            scale={scale}
          >
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color="#787878" roughness={1} />
          </mesh>
        );
      })}

      {/* Glowing crystals (quest items) */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const radius = 20 + Math.random() * 15;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        return (
          <group key={`crystal-${i}`} position={[x, 1, z]}>
            <mesh castShadow>
              <octahedronGeometry args={[0.5, 0]} />
              <meshStandardMaterial 
                color="#00ffff"
                emissive="#00ffff"
                emissiveIntensity={0.5}
                metalness={0.9}
                roughness={0.1}
              />
            </mesh>
            <pointLight color="#00ffff" intensity={3} distance={10} />
          </group>
        );
      })}
    </group>
  );
}
