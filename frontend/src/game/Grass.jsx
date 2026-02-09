import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function Grass({ count = 50000, spread = 80 }) {
  const meshRef = useRef();

  // Create instanced grass blades
  const { positions, scales, rotations } = useMemo(() => {
    const positions = [];
    const scales = [];
    const rotations = [];

    for (let i = 0; i < count; i++) {
      // Random position within spread area
      const x = (Math.random() - 0.5) * spread;
      const z = (Math.random() - 0.5) * spread;
      
      // Calculate terrain height (matching Terrain.jsx logic)
      const height = 
        Math.sin(x * 0.1) * Math.cos(z * 0.1) * 2 +
        Math.sin(x * 0.05) * Math.cos(z * 0.05) * 1.5 +
        Math.sin(x * 0.2) * Math.cos(z * 0.2) * 0.5;
      
      positions.push(x, height + 0.1, z);
      
      // Random scale and rotation for variety
      const scale = 0.4 + Math.random() * 0.6;
      scales.push(scale, scale * (0.8 + Math.random() * 0.4), scale);
      
      const rotation = Math.random() * Math.PI * 2;
      rotations.push(0, rotation, 0);
    }

    return { 
      positions: new Float32Array(positions), 
      scales: new Float32Array(scales),
      rotations: new Float32Array(rotations)
    };
  }, [count, spread]);

  // Wind animation
  useFrame((state) => {
    if (!meshRef.current) return;
    
    const time = state.clock.elapsedTime;
    const tempObject = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
      const x = positions[i * 3];
      const y = positions[i * 3 + 1];
      const z = positions[i * 3 + 2];
      
      // Gentle wind sway
      const windX = Math.sin(time * 0.5 + x * 0.1) * 0.05;
      const windZ = Math.cos(time * 0.5 + z * 0.1) * 0.05;
      
      tempObject.position.set(x + windX, y, z + windZ);
      tempObject.rotation.set(
        rotations[i * 3],
        rotations[i * 3 + 1],
        rotations[i * 3 + 2]
      );
      tempObject.scale.set(
        scales[i * 3],
        scales[i * 3 + 1],
        scales[i * 3 + 2]
      );
      
      tempObject.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObject.matrix);
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]} castShadow receiveShadow>
      {/* Grass blade geometry - thin triangle */}
      <coneGeometry args={[0.05, 0.8, 3, 1]} />
      
      {/* Grass material */}
      <meshStandardMaterial
        color="#3a5a1a"
        roughness={0.95}
        metalness={0.0}
        flatShading={false}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
}
