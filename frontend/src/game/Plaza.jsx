import React from 'react';
import { useTexture, Decal } from '@react-three/drei';
import * as THREE from 'three';

export default function Plaza() {
  // Placeholder for when we have real textures
  // const textures = useTexture({ ... });
  
  return (
    <group>
        {/* === MAIN GROUND (GRASS + PAVEMENT) === */}
        {/* The large base grass area */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial color="#5c9e42" roughness={1} />
        </mesh>

        {/* The Central Paved Circle (Town Square) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
            <circleGeometry args={[15, 64]} />
            <meshStandardMaterial color="#e0ded8"  roughness={0.8} />
        </mesh>

        {/* === CENTRAL FOUNTAIN PLACEHOLDER === */}
        <group position={[0, 0.5, 0]}>
            <mesh castShadow receiveShadow position={[0, 0.5, 0]}>
                <cylinderGeometry args={[4, 4, 1, 32]} />
                <meshStandardMaterial color="#a0aec0" />
            </mesh>
            <mesh castShadow receiveShadow position={[0, 2, 0]}>
                <cylinderGeometry args={[2, 2, 3, 32]} />
                <meshStandardMaterial color="#a0aec0" />
            </mesh>
            <mesh castShadow receiveShadow position={[0, 4, 0]}>
                <sphereGeometry args={[1.5, 32, 32]} />
                <meshStandardMaterial color="#63b3ed" emissive="#4299e1" emissiveIntensity={0.5} opacity={0.8} transparent />
            </mesh>
        </group>

        {/* === ZONES FOR BUILDINGS (GRAY BOXING) === */}
        {/* Player Home Plot */}
        <group position={[20, 0.1, -10]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[12, 12]} />
                <meshStandardMaterial color="#cbd5e0" transparent opacity={0.5} />
            </mesh>
            <mesh position={[0, 2, 0]}>
                <boxGeometry args={[10, 4, 10]} />
                <meshStandardMaterial color="#ed8936" wireframe />
            </mesh>
        </group>

        {/* Shop Plot */}
        <group position={[-20, 0.1, -5]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[12, 8]} />
                <meshStandardMaterial color="#cbd5e0" transparent opacity={0.5} />
            </mesh>
            <mesh position={[0, 2, 0]}>
                <boxGeometry args={[10, 4, 6]} />
                <meshStandardMaterial color="#4299e1" wireframe />
            </mesh>
        </group>

        {/* Garden Plot */}
        <group position={[0, 0.1, 20]}>
             <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[8, 32]} />
                <meshStandardMaterial color="#f6ad55" transparent opacity={0.5} />
            </mesh>
        </group>

    </group>
  );
}