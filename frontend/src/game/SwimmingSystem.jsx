import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles, Text } from '@react-three/drei';
import * as THREE from 'three';

function Fish({ index, waterLevel }) {
  const fishRef = useRef();
  const speed = 0.5 + Math.random() * 0.5;
  const amplitude = 2 + Math.random() * 3;
  const offset = Math.random() * Math.PI * 2;
  
  useFrame((state) => {
    if (!fishRef.current) return;
    
    const time = state.clock.elapsedTime * speed + offset;
    
    // Swimming pattern
    fishRef.current.position.x = Math.sin(time * 0.5) * 20;
    fishRef.current.position.y = waterLevel - 1 - Math.abs(Math.sin(time)) * amplitude;
    fishRef.current.position.z = Math.cos(time * 0.5) * 20;
    
    // Face direction of movement
    fishRef.current.rotation.y = Math.atan2(
      Math.cos(time * 0.5),
      Math.sin(time * 0.5)
    );
    
    // Tail wag
    fishRef.current.rotation.z = Math.sin(time * 5) * 0.2;
  });
  
  const colors = ['#ff6b9d', '#4ecdc4', '#ffe66d', '#ff6b35', '#95e1d3'];
  const color = colors[index % colors.length];
  
  return (
    <group ref={fishRef}>
      {/* Fish body */}
      <mesh castShadow>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.4} />
      </mesh>
      
      {/* Tail */}
      <mesh position={[-0.3, 0, 0]}>
        <coneGeometry args={[0.2, 0.3, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      
      {/* Fins */}
      <mesh position={[0, 0.15, 0.1]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.1, 0.2, 0.05]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.15, -0.1]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.1, 0.2, 0.05]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

function Bubble({ position, speed }) {
  const bubbleRef = useRef();
  
  useFrame(() => {
    if (!bubbleRef.current) return;
    
    bubbleRef.current.position.y += speed;
    
    if (bubbleRef.current.position.y > 0.5) {
      bubbleRef.current.position.y = -5;
    }
  });
  
  return (
    <mesh ref={bubbleRef} position={position}>
      <sphereGeometry args={[0.1 + Math.random() * 0.1, 8, 8]} />
      <meshStandardMaterial 
        color="#ffffff"
        transparent
        opacity={0.3}
        metalness={0.1}
        roughness={0.1}
      />
    </mesh>
  );
}

export default function SwimmingSystem({ playerPosition, isSwimming, onSwimmingChange }) {
  const waterLevel = 0.5;
  const divingSpeed = 0.1;
  
  // Check if player is in water
  useFrame(() => {
    const isInWater = playerPosition[1] < waterLevel;
    if (isInWater !== isSwimming) {
      onSwimmingChange(isInWater);
      
      if (isInWater) {
        // Play splash sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.value = 200;
        osc.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.3);
        
        gain.gain.value = 0.2;
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.start();
        osc.stop(audioContext.currentTime + 0.3);
      }
    }
  });
  
  return (
    <group>
      {/* Water surface */}
      <mesh 
        receiveShadow 
        position={[0, waterLevel, 0]} 
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[150, 150]} />
        <meshPhysicalMaterial 
          color="#0077be"
          transparent
          opacity={0.6}
          metalness={0.1}
          roughness={0.1}
          transmission={0.9}
          thickness={0.5}
          envMapIntensity={1.5}
        />
      </mesh>
      
      {/* Underwater floor */}
      <mesh 
        receiveShadow 
        position={[0, waterLevel - 10, 0]} 
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[150, 150]} />
        <meshStandardMaterial color="#1a4d2e" roughness={0.9} />
      </mesh>
      
      {/* Underwater plants */}
      {Array.from({ length: 30 }).map((_, i) => {
        const x = (Math.random() - 0.5) * 100;
        const z = (Math.random() - 0.5) * 100;
        const height = 2 + Math.random() * 3;
        
        return (
          <mesh 
            key={`plant-${i}`}
            castShadow
            position={[x, waterLevel - 10 + height / 2, z]}
          >
            <cylinderGeometry args={[0.1, 0.05, height, 6]} />
            <meshStandardMaterial color="#2d5016" roughness={0.9} />
          </mesh>
        );
      })}
      
      {/* Coral */}
      {Array.from({ length: 20 }).map((_, i) => {
        const x = (Math.random() - 0.5) * 100;
        const z = (Math.random() - 0.5) * 100;
        const colors = ['#ff6b9d', '#ff9a56', '#feca57', '#48dbfb'];
        
        return (
          <mesh 
            key={`coral-${i}`}
            castShadow
            position={[x, waterLevel - 9.5, z]}
          >
            <sphereGeometry args={[0.3 + Math.random() * 0.3, 8, 8]} />
            <meshStandardMaterial 
              color={colors[Math.floor(Math.random() * colors.length)]}
              roughness={0.8}
            />
          </mesh>
        );
      })}
      
      {/* Swimming fish */}
      {Array.from({ length: 15 }).map((_, i) => (
        <Fish key={`fish-${i}`} index={i} waterLevel={waterLevel} />
      ))}
      
      {/* Bubbles when swimming */}
      {isSwimming && Array.from({ length: 10 }).map((_, i) => (
        <Bubble 
          key={`bubble-${i}`}
          position={[
            playerPosition[0] + (Math.random() - 0.5) * 2,
            playerPosition[1],
            playerPosition[2] + (Math.random() - 0.5) * 2
          ]}
          speed={0.02 + Math.random() * 0.03}
        />
      ))}
      
      {/* Underwater light rays */}
      <pointLight 
        position={[0, waterLevel + 5, 0]} 
        color="#00d4ff" 
        intensity={2} 
        distance={20} 
      />
      
      {/* Underwater particles */}
      <Sparkles
        count={100}
        scale={[150, 10, 150]}
        position={[0, waterLevel - 5, 0]}
        size={0.5}
        speed={0.1}
        opacity={0.2}
        color="#ffffff"
      />
      
      {/* Swimming indicator */}
      {isSwimming && (
        <Text
          position={[playerPosition[0], playerPosition[1] + 2, playerPosition[2]]}
          fontSize={0.5}
          color="#00ffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.05}
          outlineColor="#000000"
        >
          🏊 SWIMMING
        </Text>
      )}
      
      {/* Treasure chest underwater */}
      <group position={[-30, waterLevel - 9, -30]}>
        <mesh castShadow>
          <boxGeometry args={[1, 0.7, 0.8]} />
          <meshStandardMaterial color="#8b6914" />
        </mesh>
        <pointLight color="#ffd700" intensity={3} distance={10} />
        <Sparkles
          count={30}
          scale={2}
          size={1.5}
          speed={0.2}
          opacity={0.8}
          color="#ffd700"
        />
      </group>
    </group>
  );
}
