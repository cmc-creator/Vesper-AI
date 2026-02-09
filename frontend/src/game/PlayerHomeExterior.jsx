import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles, Text } from '@react-three/drei';
import * as THREE from 'three';

function Cabin({ position, exteriorColor, onEnter }) {
  return (
    <group position={position}>
      {/* Main cabin body */}
      <mesh castShadow receiveShadow position={[0, 2, 0]}>
        <boxGeometry args={[6, 4, 6]} />
        <meshStandardMaterial color={exteriorColor} roughness={0.9} />
      </mesh>
      
      {/* Roof */}
      <mesh castShadow position={[0, 4.5, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[5, 2, 4]} />
        <meshStandardMaterial color="#654321" roughness={0.8} />
      </mesh>
      
      {/* Door */}
      <mesh position={[0, 1.5, 3.01]}>
        <boxGeometry args={[1.2, 2.5, 0.1]} />
        <meshStandardMaterial color="#3d2817" />
      </mesh>
      
      {/* Windows */}
      <mesh position={[-2, 2.5, 3.01]}>
        <boxGeometry args={[0.8, 0.8, 0.05]} />
        <meshStandardMaterial color="#87ceeb" emissive="#ffff99" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[2, 2.5, 3.01]}>
        <boxGeometry args={[0.8, 0.8, 0.05]} />
        <meshStandardMaterial color="#87ceeb" emissive="#ffff99" emissiveIntensity={0.5} />
      </mesh>
      
      {/* Chimney */}
      <mesh castShadow position={[2, 5.5, 0]}>
        <boxGeometry args={[0.6, 2, 0.6]} />
        <meshStandardMaterial color="#8b4513" roughness={0.9} />
      </mesh>
      
      {/* Entrance portal */}
      <mesh 
        position={[0, 1.5, 3.5]}
        onClick={onEnter}
      >
        <planeGeometry args={[1.5, 2.8]} />
        <meshStandardMaterial 
          color="#a78bfa" 
          transparent 
          opacity={0.5} 
          emissive="#a78bfa"
          emissiveIntensity={1.5}
        />
      </mesh>
      
      <Sparkles
        count={25}
        scale={[3, 3, 3]}
        position={[0, 2, 3.5]}
        size={1}
        speed={0.3}
        opacity={0.6}
        color="#a78bfa"
      />
      
      <Text
        position={[0, -1, 4]}
        fontSize={0.4}
        color="#ffd700"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        🏠 Your Cozy Cabin
      </Text>
      
      <pointLight position={[0, 2, 3.5]} color="#a78bfa" intensity={3} distance={10} />
    </group>
  );
}

function CastleHome({ position, exteriorColor, onEnter }) {
  return (
    <group position={position}>
      {/* Main castle body */}
      <mesh castShadow receiveShadow position={[0, 3, 0]}>
        <boxGeometry args={[8, 6, 8]} />
        <meshStandardMaterial color={exteriorColor} roughness={0.8} metalness={0.2} />
      </mesh>
      
      {/* Towers */}
      {[-4, 4].map((x, i) => (
        <React.Fragment key={i}>
          {[-4, 4].map((z, j) => (
            <group key={`tower-${i}-${j}`}>
              <mesh castShadow position={[x, 4.5, z]}>
                <cylinderGeometry args={[0.8, 0.8, 9, 12]} />
                <meshStandardMaterial color={exteriorColor} roughness={0.8} />
              </mesh>
              <mesh castShadow position={[x, 9.5, z]}>
                <coneGeometry args={[1.2, 2.5, 12]} />
                <meshStandardMaterial color="#4a0e4e" roughness={0.7} />
              </mesh>
            </group>
          ))}
        </React.Fragment>
      ))}
      
      {/* Gate */}
      <mesh position={[0, 2, 4.01]}>
        <boxGeometry args={[2, 3.5, 0.2]} />
        <meshStandardMaterial color="#3d2817" roughness={0.9} />
      </mesh>
      
      {/* Entrance portal */}
      <mesh 
        position={[0, 2, 4.5]}
        onClick={onEnter}
      >
        <planeGeometry args={[2.5, 4]} />
        <meshStandardMaterial 
          color="#a78bfa" 
          transparent 
          opacity={0.6} 
          emissive="#a78bfa"
          emissiveIntensity={2}
        />
      </mesh>
      
      <Sparkles
        count={40}
        scale={[4, 4, 4]}
        position={[0, 3, 4.5]}
        size={1.2}
        speed={0.3}
        opacity={0.7}
        color="#a78bfa"
      />
      
      <Text
        position={[0, 7, 0]}
        fontSize={0.6}
        color="#ffd700"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.08}
        outlineColor="#000000"
      >
        👑 Your Grand Castle
      </Text>
      
      <pointLight position={[0, 3, 4.5]} color="#a78bfa" intensity={5} distance={15} />
    </group>
  );
}

function TreeHouse({ position, exteriorColor, onEnter }) {
  const leavesRef = useRef();
  
  useFrame((state) => {
    if (leavesRef.current) {
      leavesRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });
  
  return (
    <group position={position}>
      {/* Tree trunk */}
      <mesh castShadow receiveShadow position={[0, 4, 0]}>
        <cylinderGeometry args={[1.2, 1.5, 8, 12]} />
        <meshStandardMaterial color="#654321" roughness={0.9} />
      </mesh>
      
      {/* Tree leaves */}
      <mesh ref={leavesRef} castShadow position={[0, 9, 0]}>
        <sphereGeometry args={[4, 16, 16]} />
        <meshStandardMaterial color="#228b22" roughness={0.8} />
      </mesh>
      
      {/* House platform */}
      <mesh castShadow receiveShadow position={[0, 7, 0]}>
        <cylinderGeometry args={[3, 3, 0.3, 12]} />
        <meshStandardMaterial color={exteriorColor} roughness={0.9} />
      </mesh>
      
      {/* House walls */}
      <mesh castShadow receiveShadow position={[0, 8.5, 0]}>
        <cylinderGeometry args={[2.5, 2.5, 3, 8]} />
        <meshStandardMaterial color={exteriorColor} roughness={0.9} />
      </mesh>
      
      {/* Roof */}
      <mesh castShadow position={[0, 10.5, 0]}>
        <coneGeometry args={[3, 2, 8]} />
        <meshStandardMaterial color="#8b4513" roughness={0.8} />
      </mesh>
      
      {/* Windows */}
      {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((angle, i) => (
        <mesh key={i} position={[Math.sin(angle) * 2.51, 8.5, Math.cos(angle) * 2.51]} rotation={[0, angle, 0]}>
          <boxGeometry args={[0.6, 0.6, 0.05]} />
          <meshStandardMaterial color="#87ceeb" emissive="#ffff99" emissiveIntensity={0.5} />
        </mesh>
      ))}
      
      {/* Ladder */}
      <mesh position={[0, 3.5, 2.5]}>
        <boxGeometry args={[0.1, 7, 0.1]} />
        <meshStandardMaterial color="#3d2817" />
      </mesh>
      <mesh position={[0, 3.5, 2.7]}>
        <boxGeometry args={[0.1, 7, 0.1]} />
        <meshStandardMaterial color="#3d2817" />
      </mesh>
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh key={i} position={[0, i * 0.7, 2.6]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.5, 6]} />
          <meshStandardMaterial color="#3d2817" />
        </mesh>
      ))}
      
      {/* Entrance portal */}
      <mesh 
        position={[0, 7, 3]}
        onClick={onEnter}
      >
        <planeGeometry args={[1.5, 2]} />
        <meshStandardMaterial 
          color="#a78bfa" 
          transparent 
          opacity={0.5} 
          emissive="#a78bfa"
          emissiveIntensity={1.5}
        />
      </mesh>
      
      <Sparkles
        count={30}
        scale={[3, 3, 3]}
        position={[0, 7, 3]}
        size={1}
        speed={0.3}
        opacity={0.6}
        color="#a78bfa"
      />
      
      <Text
        position={[0, 11.5, 0]}
        fontSize={0.5}
        color="#ffd700"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.06}
        outlineColor="#000000"
      >
        🌳 Your Magical Treehouse
      </Text>
      
      <pointLight position={[0, 7, 3]} color="#a78bfa" intensity={3} distance={12} />
    </group>
  );
}

export default function PlayerHomeExterior({ position, homeType, exteriorColor, onEnter }) {
  switch (homeType) {
    case 'cabin':
      return <Cabin position={position} exteriorColor={exteriorColor} onEnter={onEnter} />;
    case 'castle':
      return <CastleHome position={position} exteriorColor={exteriorColor} onEnter={onEnter} />;
    case 'treehouse':
      return <TreeHouse position={position} exteriorColor={exteriorColor} onEnter={onEnter} />;
    default:
      return <Cabin position={position} exteriorColor={exteriorColor} onEnter={onEnter} />;
  }
}
