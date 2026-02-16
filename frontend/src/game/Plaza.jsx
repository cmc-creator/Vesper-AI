import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Float, Sparkles } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

// Rotating rune ring
function RuneRing({ radius, height = 0.03, color = '#6020a0', speed = 0.1 }) {
  const ref = useRef();
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.z += delta * speed;
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, height, 0]}>
      <ringGeometry args={[radius - 0.3, radius, 64]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={1.5}
        transparent
        opacity={0.5}
        toneMapped={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// Central energy pillar
function EnergyPillar() {
  const ref = useRef();
  useFrame((state) => {
    if (ref.current) {
      ref.current.material.emissiveIntensity = 2 + Math.sin(state.clock.elapsedTime * 2) * 0.8;
      ref.current.rotation.y += 0.005;
    }
  });
  return (
    <group position={[0, 0, 0]}>
      {/* Pillar beam */}
      <mesh ref={ref} position={[0, 8, 0]}>
        <cylinderGeometry args={[0.3, 0.8, 16, 8, 1, true]} />
        <meshStandardMaterial
          color="#8040ff"
          emissive="#8040ff"
          emissiveIntensity={2.5}
          transparent
          opacity={0.25}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Bright core */}
      <Float speed={0.5} floatIntensity={1}>
        <mesh position={[0, 5, 0]}>
          <octahedronGeometry args={[0.8, 2]} />
          <meshStandardMaterial
            color="#00ffff"
            emissive="#00ffff"
            emissiveIntensity={5}
            toneMapped={false}
          />
        </mesh>
      </Float>
      {/* Core light */}
      <pointLight position={[0, 5, 0]} color="#8040ff" intensity={8} distance={40} decay={2} />
      <pointLight position={[0, 5, 0]} color="#00ffff" intensity={3} distance={25} decay={2} />
    </group>
  );
}

export default function Plaza() {
  return (
    <group>
      {/* === DARK GROUND PLANE === */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[500, 500]} />
        <meshStandardMaterial color="#06060e" roughness={0.95} />
      </mesh>

      {/* === THE NEXUS CIRCLE === */}
      {/* Dark stone platform */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <circleGeometry args={[25, 64]} />
        <meshPhysicalMaterial 
          color="#0c0c1a"
          roughness={0.6}
          metalness={0.4}
          clearcoat={0.3}
          clearcoatRoughness={0.4}
        />
      </mesh>

      {/* Glowing rune rings (concentric, rotating at different speeds) */}
      <RuneRing radius={5} color="#8040ff" speed={0.15} height={0.04} />
      <RuneRing radius={10} color="#4020a0" speed={-0.08} height={0.04} />
      <RuneRing radius={15} color="#00ffff" speed={0.05} height={0.04} />
      <RuneRing radius={20} color="#6020a0" speed={-0.12} height={0.04} />
      <RuneRing radius={24} color="#ff40ff" speed={0.03} height={0.04} />

      {/* Central energy pillar / nexus core */}
      <EnergyPillar />

      {/* Inner sparkle aura */}
      <Sparkles
        count={60}
        scale={[25, 10, 25]}
        position={[0, 3, 0]}
        size={2}
        speed={0.2}
        opacity={0.6}
        color="#8040ff"
      />

      {/* Edge monoliths (Standing stones around the circle) */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const radius = 22;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const height = 5 + (i % 3) * 2;
        const monolithColor = i % 2 === 0 ? '#8040ff' : '#00ffff';
        
        return (
          <group key={`monolith-${i}`} position={[x, 0, z]} rotation={[0, -angle + Math.PI, 0]}>
            {/* Dark stone slab */}
            <mesh castShadow position={[0, height / 2, 0]}>
              <boxGeometry args={[1.5, height, 0.6]} />
              <meshStandardMaterial color="#0a0a18" roughness={0.8} metalness={0.2} />
            </mesh>
            {/* Glowing symbol etched on front */}
            <mesh position={[0, height * 0.6, 0.31]}>
              <planeGeometry args={[0.8, 1.2]} />
              <meshStandardMaterial
                color={monolithColor}
                emissive={monolithColor}
                emissiveIntensity={2}
                transparent
                opacity={0.7}
                toneMapped={false}
              />
            </mesh>
            {/* Base light */}
            <pointLight position={[0, 1, 1]} color={monolithColor} intensity={1} distance={8} decay={2} />
          </group>
        );
      })}

      {/* === ZONE MARKERS (subtle glow instead of wireframe) === */}
      {/* Player Home Zone */}
      <group position={[40, 0.02, -20]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[8, 32]} />
          <meshStandardMaterial color="#ff8800" emissive="#ff8800" emissiveIntensity={0.3} transparent opacity={0.1} toneMapped={false} />
        </mesh>
        <pointLight position={[0, 2, 0]} color="#ff8800" intensity={0.5} distance={12} decay={2} />
      </group>

      {/* Shop Zone */}
      <group position={[-40, 0.02, -15]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[7, 32]} />
          <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={0.3} transparent opacity={0.1} toneMapped={false} />
        </mesh>
        <pointLight position={[0, 2, 0]} color="#00ff88" intensity={0.5} distance={12} decay={2} />
      </group>

      {/* Garden / Ritual Zone */}
      <group position={[0, 0.02, 40]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[10, 32]} />
          <meshStandardMaterial color="#ff40ff" emissive="#ff40ff" emissiveIntensity={0.2} transparent opacity={0.08} toneMapped={false} />
        </mesh>
        <Sparkles count={30} scale={[20, 5, 20]} position={[0, 2, 0]} size={1.5} speed={0.1} opacity={0.4} color="#ff40ff" />
      </group>
    </group>
  );
}