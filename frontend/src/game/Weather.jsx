import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Cloud, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

export default function Weather({ type = 'clear' }) {
  const rainRef = useRef();
  const fogRef = useRef();

  // Create rain particles
  const rainParticles = useMemo(() => {
    if (type !== 'rain') return null;

    const count = 1000;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = Math.random() * 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
      velocities[i] = 0.5 + Math.random() * 0.5;
    }

    return { positions, velocities };
  }, [type]);

  // Animate rain
  useFrame(() => {
    if (rainRef.current && rainParticles) {
      const positions = rainRef.current.geometry.attributes.position.array;
      
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] -= rainParticles.velocities[i / 3];
        
        // Reset raindrop if it hits ground
        if (positions[i + 1] < 0) {
          positions[i + 1] = 50;
        }
      }
      
      rainRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Rain */}
      {type === 'rain' && rainParticles && (
        <points ref={rainRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={rainParticles.positions.length / 3}
              array={rainParticles.positions}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.1}
            color="#87ceeb"
            transparent
            opacity={0.6}
            sizeAttenuation
          />
        </points>
      )}

      {/* Fog effect */}
      {(type === 'fog' || type === 'rain') && (
        <>
          <fog attach="fog" args={['#c0c0d0', 10, 60]} />
          <color attach="background" args={['#808090']} />
        </>
      )}

      {/* Clear sunny sky with clouds */}
      {type === 'clear' && (
        <>
          <fog attach="fog" args={['#87ceeb', 50, 150]} />
          <color attach="background" args={['#87ceeb']} />
          
          {/* Volumetric clouds */}
          {Array.from({ length: 8 }).map((_, i) => {
            const x = (Math.random() - 0.5) * 100;
            const y = 20 + Math.random() * 15;
            const z = (Math.random() - 0.5) * 100;
            
            return (
              <Cloud
                key={`cloud-${i}`}
                position={[x, y, z]}
                speed={0.1}
                opacity={0.5}
                segments={20}
                bounds={[6, 2, 4]}
                volume={6}
                color="#ffffff"
              />
            );
          })}
        </>
      )}

      {/* Night time */}
      {type === 'night' && (
        <>
          <fog attach="fog" args={['#0a0a2e', 20, 80]} />
          <color attach="background" args={['#0a0a2e']} />
          
          {/* Stars */}
          {Array.from({ length: 100 }).map((_, i) => {
            const x = (Math.random() - 0.5) * 200;
            const y = Math.random() * 50 + 30;
            const z = (Math.random() - 0.5) * 200;
            
            return (
              <mesh key={`star-${i}`} position={[x, y, z]}>
                <sphereGeometry args={[0.1, 4, 4]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            );
          })}
          
          {/* Moon */}
          <mesh position={[50, 40, -50]}>
            <sphereGeometry args={[3, 32, 32]} />
            <meshBasicMaterial color="#f0f0f0" />
          </mesh>
          <pointLight position={[50, 40, -50]} color="#a0a0d0" intensity={0.5} distance={200} />
        </>
      )}

      {/* Sunset/Sunrise */}
      {type === 'sunset' && (
        <>
          <fog attach="fog" args={['#ff8c42', 30, 100]} />
          <color attach="background" args={['#ff6b35']} />
          
          {/* Sun */}
          <mesh position={[-60, 15, -60]}>
            <sphereGeometry args={[5, 32, 32]} />
            <meshBasicMaterial color="#ff6b35" />
          </mesh>
          <pointLight position={[-60, 15, -60]} color="#ff6b35" intensity={2} distance={150} />
        </>
      )}

      {/* Magical atmosphere sparkles (always present) */}
      <Sparkles
        count={100}
        scale={[60, 15, 60]}
        position={[0, 8, 0]}
        size={1.5}
        speed={0.2}
        opacity={0.6}
        color="#ffd700"
      />
      
      <Sparkles
        count={80}
        scale={[50, 12, 50]}
        position={[0, 6, 0]}
        size={1.2}
        speed={0.25}
        opacity={0.5}
        color="#a78bfa"
      />
    </group>
  );
}
