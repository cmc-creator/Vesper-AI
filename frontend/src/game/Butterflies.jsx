import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function Butterfly({ position, color, offset }) {
  const butterflyRef = useRef();
  const wingsRef = useRef([]);

  useFrame((state) => {
    if (!butterflyRef.current) return;
    
    const time = state.clock.elapsedTime + offset;
    
    // Flutter path - figure-8 pattern
    const x = position[0] + Math.sin(time * 0.5) * 3 + Math.cos(time * 0.3) * 2;
    const y = position[1] + Math.sin(time * 0.8) * 1.5 + 1;
    const z = position[2] + Math.cos(time * 0.5) * 3 + Math.sin(time * 0.3) * 2;
    
    butterflyRef.current.position.set(x, y, z);
    
    // Face direction of movement
    const velocity = new THREE.Vector3(
      Math.cos(time * 0.5) * 0.5,
      Math.cos(time * 0.8) * 0.8,
      -Math.sin(time * 0.5) * 0.5
    );
    butterflyRef.current.lookAt(
      butterflyRef.current.position.clone().add(velocity)
    );
    
    // Wing flapping
    const flapSpeed = 10;
    const flapAngle = Math.sin(time * flapSpeed) * 0.6;
    
    if (wingsRef.current[0]) wingsRef.current[0].rotation.y = flapAngle;
    if (wingsRef.current[1]) wingsRef.current[1].rotation.y = -flapAngle;
  });

  return (
    <group ref={butterflyRef}>
      {/* Body */}
      <mesh>
        <capsuleGeometry args={[0.02, 0.08, 4, 8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      
      {/* Left wing */}
      <mesh ref={(el) => (wingsRef.current[0] = el)} position={[-0.05, 0, 0]}>
        <planeGeometry args={[0.1, 0.15]} />
        <meshStandardMaterial 
          color={color}
          side={THREE.DoubleSide}
          transparent
          opacity={0.9}
          emissive={color}
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* Right wing */}
      <mesh ref={(el) => (wingsRef.current[1] = el)} position={[0.05, 0, 0]}>
        <planeGeometry args={[0.1, 0.15]} />
        <meshStandardMaterial 
          color={color}
          side={THREE.DoubleSide}
          transparent
          opacity={0.9}
          emissive={color}
          emissiveIntensity={0.3}
        />
      </mesh>
    </group>
  );
}

function Bird({ position, offset }) {
  const birdRef = useRef();

  useFrame((state) => {
    if (!birdRef.current) return;
    
    const time = state.clock.elapsedTime + offset;
    
    // Circular flight pattern around castle
    const radius = 20 + offset * 5;
    const height = 15 + Math.sin(time * 0.3) * 3;
    const x = Math.cos(time * 0.4) * radius;
    const z = Math.sin(time * 0.4) * radius;
    
    birdRef.current.position.set(x, height, z - 25);
    
    // Point in direction of flight
    const nextX = Math.cos(time * 0.4 + 0.1) * radius;
    const nextZ = Math.sin(time * 0.4 + 0.1) * radius;
    birdRef.current.lookAt(nextX, height, nextZ - 25);
    
    // Wing flapping
    birdRef.current.rotation.z = Math.sin(time * 8) * 0.3;
  });

  return (
    <group ref={birdRef}>
      {/* Bird body */}
      <mesh>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshStandardMaterial color="#2d2d2d" />
      </mesh>
      
      {/* Wings */}
      <mesh position={[-0.2, 0, 0]} rotation={[0, 0, -Math.PI / 6]}>
        <boxGeometry args={[0.3, 0.02, 0.15]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0.2, 0, 0]} rotation={[0, 0, Math.PI / 6]}>
        <boxGeometry args={[0.3, 0.02, 0.15]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    </group>
  );
}

function Fish({ position, offset }) {
  const fishRef = useRef();

  useFrame((state) => {
    if (!fishRef.current) return;
    
    const time = state.clock.elapsedTime + offset;
    
    // Swimming pattern near water surface
    const x = position[0] + Math.sin(time * 0.8) * 5;
    const y = -0.3 + Math.abs(Math.sin(time * 2)) * 0.5; // Jump out of water
    const z = position[2] + Math.cos(time * 0.8) * 5;
    
    fishRef.current.position.set(x, y, z);
    
    // Face swimming direction
    const angle = Math.atan2(Math.cos(time * 0.8), Math.sin(time * 0.8));
    fishRef.current.rotation.y = angle;
    
    // Tail swish
    fishRef.current.rotation.z = Math.sin(time * 5) * 0.2;
  });

  return (
    <group ref={fishRef}>
      {/* Fish body */}
      <mesh>
        <capsuleGeometry args={[0.08, 0.15, 4, 8]} />
        <meshStandardMaterial 
          color="#ff8c00"
          emissive="#ff8c00"
          emissiveIntensity={0.5}
          metalness={0.8}
        />
      </mesh>
      
      {/* Tail fin */}
      <mesh position={[0, 0, -0.15]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.08, 0.1, 3]} />
        <meshStandardMaterial color="#ff6b35" />
      </mesh>
    </group>
  );
}

export default function Wildlife() {
  const butterflyColors = ['#ffd700', '#ff69b4', '#00ffff', '#ff8c00', '#a78bfa', '#00ff00'];
  
  // Generate random positions for butterflies (near flowers/grass)
  const butterflyPositions = useMemo(() => 
    Array.from({ length: 25 }).map(() => ({
      position: [
        (Math.random() - 0.5) * 60,
        Math.random() * 2 + 1,
        (Math.random() - 0.5) * 60
      ],
      color: butterflyColors[Math.floor(Math.random() * butterflyColors.length)],
      offset: Math.random() * 10
    })), []);

  // Bird positions (circling castle)
  const birdPositions = useMemo(() => 
    Array.from({ length: 8 }).map((_, i) => ({
      offset: i * 2
    })), []);

  // Fish positions (in water areas)
  const fishPositions = useMemo(() => 
    Array.from({ length: 12 }).map(() => ({
      position: [
        (Math.random() - 0.5) * 80,
        -0.3,
        (Math.random() - 0.5) * 80
      ],
      offset: Math.random() * 5
    })), []);

  return (
    <group>
      {/* Butterflies */}
      {butterflyPositions.map((props, i) => (
        <Butterfly key={`butterfly-${i}`} {...props} />
      ))}
      
      {/* Birds */}
      {birdPositions.map((props, i) => (
        <Bird key={`bird-${i}`} {...props} />
      ))}
      
      {/* Fish */}
      {fishPositions.map((props, i) => (
        <Fish key={`fish-${i}`} {...props} />
      ))}
    </group>
  );
}
