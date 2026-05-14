import React, { useMemo } from 'react';
import * as THREE from 'three';
import { MeshReflectorMaterial, Sparkles } from '@react-three/drei';

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
      {/* Main terrain with enhanced PBR materials */}
      <mesh 
        geometry={terrain} 
        rotation={[-Math.PI / 2, 0, 0]} 
        receiveShadow
      >
        <meshPhysicalMaterial 
          color="#2d5016"
          roughness={0.98}
          metalness={0.0}
          envMapIntensity={0.3}
          clearcoat={0.1}
          clearcoatRoughness={0.8}
          reflectivity={0.2}
          flatShading={false}
        />
      </mesh>

      {/* Reflective water plane with sparkles */}
      <group>
        <mesh 
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[0, -0.5, 0]}
          receiveShadow
        >
          <planeGeometry args={[200, 200]} />
          <MeshReflectorMaterial
            blur={[400, 100]}
            resolution={1024}
            mixBlur={1}
            mixStrength={50}
            roughness={0.8}
            depthScale={1.2}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.4}
            color="#0369a1"
            metalness={0.8}
            mirror={0.5}
          />
        </mesh>
        
        {/* Magical sparkles over water */}
        <Sparkles
          count={100}
          scale={[200, 5, 200]}
          position={[0, 0.5, 0]}
          size={2}
          speed={0.3}
          opacity={0.6}
          color="#60a5fa"
        />
      </group>

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

      {/* Glowing crystals (quest items) with enhanced bloom */}
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
                emissiveIntensity={2.0}
                metalness={0.9}
                roughness={0.1}
                toneMapped={false}
              />
            </mesh>
            <pointLight color="#00ffff" intensity={5} distance={15} decay={2} />
            
            {/* Crystal sparkles */}
            <Sparkles
              count={20}
              scale={2}
              size={1.5}
              speed={0.2}
              opacity={0.8}
              color="#00ffff"
            />
          </group>
        );
      })}
    </group>
  );
}
