import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';

function Horse({ position, color = "#8b4513", isUnicorn = false }) {
  const horseRef = useRef();
  const bobOffset = useRef(Math.random() * Math.PI * 2);

  // Gentle head bobbing animation
  useFrame((state) => {
    if (!horseRef.current) return;
    bobOffset.current += 0.01;
    
    // Head nods gently
    const headRotation = Math.sin(bobOffset.current) * 0.1;
    horseRef.current.rotation.x = headRotation;
  });

  return (
    <group position={position}>
      <group ref={horseRef}>
        {/* Horse body */}
        <mesh castShadow position={[0, 1.2, 0]}>
          <boxGeometry args={[1, 0.8, 2]} />
          <meshStandardMaterial 
            color={color}
            roughness={0.8}
            metalness={0.1}
          />
        </mesh>

        {/* Neck */}
        <mesh castShadow position={[0, 1.8, -0.8]} rotation={[Math.PI / 6, 0, 0]}>
          <cylinderGeometry args={[0.25, 0.3, 0.8, 8]} />
          <meshStandardMaterial 
            color={color}
            roughness={0.8}
            metalness={0.1}
          />
        </mesh>

        {/* Head */}
        <mesh castShadow position={[0, 2.3, -1]} rotation={[Math.PI / 8, 0, 0]}>
          <boxGeometry args={[0.4, 0.5, 0.7]} />
          <meshStandardMaterial 
            color={color}
            roughness={0.8}
            metalness={0.1}
          />
        </mesh>

        {/* Ears */}
        <mesh castShadow position={[-0.15, 2.7, -1]}>
          <coneGeometry args={[0.1, 0.2, 4]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <mesh castShadow position={[0.15, 2.7, -1]}>
          <coneGeometry args={[0.1, 0.2, 4]} />
          <meshStandardMaterial color={color} />
        </mesh>

        {/* Mane */}
        {Array.from({ length: 5 }).map((_, i) => (
          <mesh 
            key={`mane-${i}`} 
            castShadow 
            position={[0, 2.2 - i * 0.15, -0.9 - i * 0.15]}
          >
            <boxGeometry args={[0.5, 0.15, 0.1]} />
            <meshStandardMaterial 
              color={isUnicorn ? "#ffffff" : "#3d2817"}
              roughness={0.9}
            />
          </mesh>
        ))}

        {/* Unicorn horn (only if unicorn) */}
        {isUnicorn && (
          <>
            <mesh castShadow position={[0, 2.8, -1.2]} rotation={[Math.PI / 4, 0, 0]}>
              <coneGeometry args={[0.08, 0.6, 8]} />
              <meshStandardMaterial 
                color="#ffd700"
                emissive="#ffd700"
                emissiveIntensity={2.5}
                metalness={0.9}
                roughness={0.1}
                toneMapped={false}
              />
            </mesh>
            
            {/* Horn glow */}
            <pointLight 
              position={[0, 3.2, -1.4]} 
              color="#ffd700" 
              intensity={4} 
              distance={10} 
              decay={2}
            />
            
            {/* Magical sparkles around unicorn */}
            <Sparkles
              count={60}
              scale={3}
              size={1.5}
              speed={0.3}
              opacity={0.8}
              color="#ffd700"
            />
            
            {/* Additional magical aura */}
            <mesh position={[0, 1.5, 0]}>
              <sphereGeometry args={[1.5, 16, 16]} />
              <meshBasicMaterial 
                color="#ffd700" 
                transparent 
                opacity={0.1}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          </>
        )}

        {/* Tail */}
        <mesh castShadow position={[0, 1.3, 1.2]} rotation={[Math.PI / 3, 0, 0]}>
          <coneGeometry args={[0.15, 0.8, 6]} />
          <meshStandardMaterial 
            color={isUnicorn ? "#ffffff" : "#3d2817"}
            roughness={0.9}
          />
        </mesh>

        {/* Legs */}
        {[
          [-0.35, 0.5, -0.6],  // Front left
          [0.35, 0.5, -0.6],   // Front right
          [-0.35, 0.5, 0.6],   // Back left
          [0.35, 0.5, 0.6],    // Back right
        ].map((pos, i) => (
          <mesh key={`leg-${i}`} castShadow position={pos}>
            <cylinderGeometry args={[0.15, 0.12, 1, 6]} />
            <meshStandardMaterial 
              color={color}
              roughness={0.8}
              metalness={0.1}
            />
          </mesh>
        ))}

        {/* Hooves */}
        {[
          [-0.35, 0.05, -0.6],
          [0.35, 0.05, -0.6],
          [-0.35, 0.05, 0.6],
          [0.35, 0.05, 0.6],
        ].map((pos, i) => (
          <mesh key={`hoof-${i}`} castShadow position={pos}>
            <cylinderGeometry args={[0.13, 0.13, 0.1, 6]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
        ))}

        {/* Eyes */}
        <mesh position={[-0.15, 2.35, -1.3]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial 
            color={isUnicorn ? "#00ffff" : "#000000"}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0.15, 2.35, -1.3]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial 
            color={isUnicorn ? "#00ffff" : "#000000"}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* Subtle ambient light for each horse */}
      <pointLight 
        position={[0, 1.5, 0]} 
        color={isUnicorn ? "#ffd700" : "#ffffff"} 
        intensity={isUnicorn ? 2 : 0.3} 
        distance={5} 
        decay={2}
      />
    </group>
  );
}

export default function Horses() {
  // Horse colors for variety
  const horseColors = [
    "#8b4513", // Brown
    "#3d2817", // Dark brown
    "#a0522d", // Sienna
    "#d2691e", // Chocolate
    "#000000", // Black
    "#f5f5f5", // White
  ];

  // Generate random positions for horses (avoiding castle area)
  const horsePositions = Array.from({ length: 12 }).map((_, i) => {
    let x, z;
    do {
      x = (Math.random() - 0.5) * 70;
      z = (Math.random() - 0.5) * 70;
      // Avoid castle area (center around [0, 0, -20])
    } while (Math.abs(x) < 15 && Math.abs(z + 20) < 15);
    
    const color = horseColors[Math.floor(Math.random() * horseColors.length)];
    const rotation = Math.random() * Math.PI * 2;
    
    return { position: [x, 0, z], color, rotation };
  });

  // Unicorn position - make it special and findable
  const unicornPosition = [35, 0, 35]; // Far corner of the map
  const unicornRotation = Math.PI / 4;

  return (
    <group>
      {/* Regular horses */}
      {horsePositions.map((horse, i) => (
        <group key={`horse-${i}`} rotation={[0, horse.rotation, 0]}>
          <Horse position={horse.position} color={horse.color} />
        </group>
      ))}

      {/* ONE RARE UNICORN! */}
      <group rotation={[0, unicornRotation, 0]}>
        <Horse 
          position={unicornPosition} 
          color="#f0f0f0" 
          isUnicorn={true} 
        />
      </group>
    </group>
  );
}
