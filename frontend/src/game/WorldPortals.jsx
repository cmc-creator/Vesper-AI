import React, { useRef, useState, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Sparkles, Billboard } from '@react-three/drei';
import * as THREE from 'three';

/** Color palette for environment portals */
const PORTAL_COLORS = {
  'forest-loner': '#22cc66',
  'grandmas-house': '#ffaa44',
  'after-the-rain': '#4488ff',
  'sea-keep': '#00bbdd',
  'haunted-castle': '#aa44ff',
  'hohenzollern': '#ff44aa',
  'castle-byers': '#88ff44',
  '__default__': '#00ffff',
};

/**
 * WorldPortal — A single swirling portal that transports to another world
 */
function WorldPortal({ position, color, label, envId, onTeleport }) {
  const groupRef = useRef();
  const ring1 = useRef();
  const ring2 = useRef();
  const ring3 = useRef();
  const coreRef = useRef();
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ring1.current) ring1.current.rotation.z = t * 0.5;
    if (ring2.current) ring2.current.rotation.z = -t * 0.7;
    if (ring3.current) ring3.current.rotation.y = t * 0.4;
    if (coreRef.current) {
      coreRef.current.scale.setScalar(0.8 + Math.sin(t * 2) * 0.15);
    }
    if (groupRef.current) {
      const s = hovered ? 1.08 + Math.sin(t * 5) * 0.03 : 1;
      groupRef.current.scale.setScalar(s);
    }
  });

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    if (onTeleport) onTeleport(envId);
  }, [envId, onTeleport]);

  return (
    <group ref={groupRef} position={position}>
      {/* Base platform */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <cylinderGeometry args={[2.8, 3, 0.12, 32]} />
        <meshStandardMaterial
          color="#0a0a1e"
          emissive={color}
          emissiveIntensity={0.4}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Rune circle on base */}
      <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.2, 2.5, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.5}
          metalness={0.9}
          roughness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Invisible clickable area */}
      <mesh
        position={[0, 2, 0]}
        onClick={handleClick}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <sphereGeometry args={[2.5, 8, 8]} />
        <meshStandardMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Spinning rings */}
      <group position={[0, 2.2, 0]}>
        <mesh ref={ring1}>
          <torusGeometry args={[2, 0.04, 8, 48]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} metalness={0.9} roughness={0.1} />
        </mesh>
        <mesh ref={ring2} rotation={[Math.PI / 3, 0, 0]}>
          <torusGeometry args={[1.6, 0.035, 8, 48]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} metalness={0.9} roughness={0.1} />
        </mesh>
        <mesh ref={ring3} rotation={[0, Math.PI / 4, Math.PI / 3]}>
          <torusGeometry args={[1.2, 0.025, 8, 48]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      {/* Portal core (glowing orb) */}
      <mesh ref={coreRef} position={[0, 2.2, 0]}>
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 4 : 2}
          transparent
          opacity={0.5}
          metalness={1}
          roughness={0}
        />
      </mesh>

      {/* Energy beam upward */}
      <mesh position={[0, 3.5, 0]}>
        <cylinderGeometry args={[0.02, 0.15, 3, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={2}
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* Sparkle particles */}
      <Sparkles
        count={40}
        scale={4}
        size={hovered ? 4 : 2}
        speed={0.8}
        opacity={0.7}
        color={color}
        position={[0, 2, 0]}
      />

      {/* Portal light */}
      <pointLight
        position={[0, 2, 0]}
        color={color}
        intensity={hovered ? 10 : 5}
        distance={18}
        decay={2}
      />

      {/* Labels */}
      <Billboard position={[0, 5.5, 0]}>
        <Text
          fontSize={0.45}
          color={color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.04}
          outlineColor="#000000"
        >
          {label}
        </Text>
        {hovered && (
          <Text
            position={[0, -0.55, 0]}
            fontSize={0.28}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            Click to Travel
          </Text>
        )}
      </Billboard>
    </group>
  );
}

/**
 * Get positions arranged in a circle around the nexus
 */
function getCirclePositions(count, radius = 50) {
  const positions = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    positions.push([
      Math.cos(angle) * radius,
      0,
      Math.sin(angle) * radius,
    ]);
  }
  return positions;
}

/**
 * WorldPortals — All portals in the classic world linking to environments
 * Arranged in a circle around the nexus center
 */
export default function WorldPortals({ environments = [], onTeleportToWorld }) {
  const positions = useMemo(
    () => getCirclePositions(environments.length, 50),
    [environments.length]
  );

  return (
    <group>
      {environments.map((env, i) => (
        <WorldPortal
          key={env.id}
          position={positions[i]}
          color={PORTAL_COLORS[env.id] || PORTAL_COLORS['__default__']}
          label={env.name}
          envId={env.id}
          onTeleport={onTeleportToWorld}
        />
      ))}
    </group>
  );
}

/**
 * ReturnPortal — Placed in every environment to return to the nexus
 */
export function ReturnPortal({ position = [0, 0, -15], onReturn }) {
  return (
    <WorldPortal
      position={position}
      color="#ffffff"
      label="✦ Return to Nexus ✦"
      envId="__nexus__"
      onTeleport={() => onReturn && onReturn()}
    />
  );
}
