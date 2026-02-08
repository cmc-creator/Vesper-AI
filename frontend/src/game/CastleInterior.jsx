import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

function Furniture({ type, position, style, color }) {
  const furnitureRef = useRef();
  
  useFrame((state) => {
    if (furnitureRef.current && type === 'mystical') {
      furnitureRef.current.rotation.y = Math.sin(state.clock.elapsedTime) * 0.1;
    }
  });
  
  // Different furniture based on style
  const getFurniture = () => {
    switch (type) {
      case 'couch':
        return (
          <group ref={furnitureRef}>
            <mesh castShadow position={[0, 0.4, 0]}>
              <boxGeometry args={[2, 0.8, 1]} />
              <meshStandardMaterial color={color || '#8b7355'} roughness={0.8} />
            </mesh>
            <mesh castShadow position={[0, 0.8, -0.3]}>
              <boxGeometry args={[2, 0.6, 0.2]} />
              <meshStandardMaterial color={color || '#8b7355'} roughness={0.8} />
            </mesh>
          </group>
        );
      
      case 'bookshelf':
        return (
          <group ref={furnitureRef}>
            <mesh castShadow position={[0, 1, 0]}>
              <boxGeometry args={[1.5, 2, 0.4]} />
              <meshStandardMaterial color="#654321" roughness={0.9} />
            </mesh>
            {Array.from({ length: 12 }).map((_, i) => (
              <mesh key={i} position={[
                -0.6 + (i % 4) * 0.4,
                0.2 + Math.floor(i / 4) * 0.6,
                0.25
              ]}>
                <boxGeometry args={[0.3, 0.4, 0.15]} />
                <meshStandardMaterial color={['#ff0000', '#0000ff', '#00ff00', '#ff00ff'][i % 4]} />
              </mesh>
            ))}
          </group>
        );
      
      case 'table':
        return (
          <group ref={furnitureRef}>
            <mesh castShadow position={[0, 0.75, 0]}>
              <boxGeometry args={[1.5, 0.1, 1]} />
              <meshStandardMaterial color={color || '#8b6f47'} roughness={0.7} />
            </mesh>
            {[-0.6, 0.6].map((x, i) => 
              [-0.4, 0.4].map((z, j) => (
                <mesh key={`${i}-${j}`} castShadow position={[x, 0.35, z]}>
                  <cylinderGeometry args={[0.05, 0.05, 0.7]} />
                  <meshStandardMaterial color={color || '#654321'} />
                </mesh>
              ))
            )}
          </group>
        );
      
      case 'plant':
        return (
          <group ref={furnitureRef}>
            <mesh castShadow position={[0, 0.2, 0]}>
              <cylinderGeometry args={[0.2, 0.25, 0.4, 8]} />
              <meshStandardMaterial color="#8b4513" />
            </mesh>
            <mesh castShadow position={[0, 0.6, 0]}>
              <sphereGeometry args={[0.3, 8, 8]} />
              <meshStandardMaterial color="#228b22" roughness={0.9} />
            </mesh>
            {Array.from({ length: 5 }).map((_, i) => {
              const angle = (i / 5) * Math.PI * 2;
              return (
                <mesh key={i} position={[
                  Math.cos(angle) * 0.3,
                  0.6,
                  Math.sin(angle) * 0.3
                ]}>
                  <sphereGeometry args={[0.15, 6, 6]} />
                  <meshStandardMaterial color="#90ee90" />
                </mesh>
              );
            })}
          </group>
        );
      
      case 'fireplace':
        return (
          <group ref={furnitureRef}>
            <mesh castShadow position={[0, 1, 0]}>
              <boxGeometry args={[2, 2, 0.5]} />
              <meshStandardMaterial color="#333333" roughness={0.9} />
            </mesh>
            <mesh castShadow position={[0, 0.5, 0.1]}>
              <boxGeometry args={[1.2, 0.8, 0.3]} />
              <meshStandardMaterial color="#1a1a1a" />
            </mesh>
            <pointLight position={[0, 0.5, 0.3]} color="#ff6600" intensity={3} distance={8} />
            <Sparkles count={30} scale={[1, 1, 0.5]} size={2} speed={0.3} color="#ff6600" position={[0, 0.5, 0.2]} />
          </group>
        );
      
      case 'crystal':
        return (
          <group ref={furnitureRef}>
            <mesh castShadow position={[0, 0.6, 0]} rotation={[0, Math.PI / 4, 0]}>
              <octahedronGeometry args={[0.3, 0]} />
              <meshStandardMaterial 
                color="#a78bfa"
                emissive="#8b5cf6"
                emissiveIntensity={2}
                metalness={0.9}
                roughness={0.1}
                transparent
                opacity={0.9}
                toneMapped={false}
              />
            </mesh>
            <pointLight position={[0, 0.6, 0]} color="#a78bfa" intensity={2} distance={5} />
            <Sparkles count={20} scale={0.8} size={1} speed={0.2} color="#a78bfa" />
          </group>
        );
      
      case 'painting':
        return (
          <group ref={furnitureRef}>
            <mesh castShadow position={[0, 0, 0]}>
              <boxGeometry args={[1.2, 0.9, 0.05]} />
              <meshStandardMaterial color="#8b6914" />
            </mesh>
            <mesh position={[0, 0, 0.03]}>
              <planeGeometry args={[1, 0.7]} />
              <meshStandardMaterial color={color || '#4169e1'} />
            </mesh>
          </group>
        );
      
      default:
        return null;
    }
  };
  
  return <group position={position}>{getFurniture()}</group>;
}

export default function CastleInterior({ isInside, homeConfig, onExit }) {
  const [vesperPosition, setVesperPosition] = useState([-3, 1.5, -2]);
  
  if (!isInside) return null;
  
  const wallColor = homeConfig?.wallColor || '#e6d5f5';
  const floorColor = homeConfig?.floorColor || '#8b7355';
  const lightIntensity = homeConfig?.lightingIntensity || 1.0;
  const furnitureStyle = homeConfig?.furnitureStyle || 'cozy';
  const decorations = homeConfig?.decorations || ['fireplace', 'bookshelf', 'plants'];
  
  return (
    <group position={[0, 0, -25]}>
      {/* Floor */}
      <mesh receiveShadow position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color={floorColor} roughness={0.8} />
      </mesh>
      
      {/* Walls */}
      <mesh receiveShadow position={[0, 3, -6]}>
        <boxGeometry args={[12, 6, 0.2]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
      <mesh receiveShadow position={[-6, 3, 0]}>
        <boxGeometry args={[0.2, 6, 12]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
      <mesh receiveShadow position={[6, 3, 0]}>
        <boxGeometry args={[0.2, 6, 12]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
      <mesh receiveShadow position={[0, 3, 6]}>
        <boxGeometry args={[12, 6, 0.2]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
      
      {/* Ceiling */}
      <mesh receiveShadow position={[0, 6, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
      
      {/* Magical chandelier */}
      <group position={[0, 5, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial 
            color="#ffd700"
            emissive="#ffd700"
            emissiveIntensity={3}
            toneMapped={false}
          />
        </mesh>
        <pointLight color="#ffd700" intensity={lightIntensity * 5} distance={15} />
        <Sparkles count={40} scale={2} size={1.5} speed={0.2} color="#ffd700" />
      </group>
      
      {/* Furniture based on decorations */}
      {decorations.includes('fireplace') && (
        <Furniture type="fireplace" position={[-5, 0, -5.5]} style={furnitureStyle} />
      )}
      
      {decorations.includes('bookshelf') && (
        <>
          <Furniture type="bookshelf" position={[5, 0, -5.7]} style={furnitureStyle} />
          <Furniture type="bookshelf" position={[3.5, 0, -5.7]} style={furnitureStyle} />
        </>
      )}
      
      {decorations.includes('plants') && (
        <>
          <Furniture type="plant" position={[-4, 0, 5]} style={furnitureStyle} />
          <Furniture type="plant" position={[4, 0, 5]} style={furnitureStyle} />
          <Furniture type="plant" position={[-5, 0, 2]} style={furnitureStyle} />
        </>
      )}
      
      {decorations.includes('crystals') && (
        <>
          <Furniture type="crystal" position={[4, 0, 2]} style={furnitureStyle} />
          <Furniture type="crystal" position={[-3, 0, 3]} style={furnitureStyle} />
        </>
      )}
      
      {decorations.includes('paintings') && (
        <>
          <Furniture type="painting" position={[-5.9, 2, -2]} style={furnitureStyle} color="#ff69b4" />
          <Furniture type="painting" position={[-5.9, 2, 2]} style={furnitureStyle} color="#00ffff" />
        </>
      )}
      
      {/* Always include some basic furniture */}
      <Furniture type="couch" position={[0, 0, -3]} style={furnitureStyle} color={furnitureStyle === 'elegant' ? '#8b008b' : '#8b7355'} />
      <Furniture type="table" position={[0, 0, 1]} style={furnitureStyle} />
      
      {/* Vesper floating in her home */}
      <group position={vesperPosition}>
        <mesh castShadow>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial
            color="#a78bfa"
            emissive="#8b5cf6"
            emissiveIntensity={2}
            transparent
            opacity={0.9}
            toneMapped={false}
          />
        </mesh>
        <Sparkles count={60} scale={2} size={1.5} speed={0.3} color="#a78bfa" />
        <pointLight color="#a78bfa" intensity={4} distance={10} />
        
        <Text
          position={[0, 1.5, 0]}
          fontSize={0.3}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          💜 Welcome to MY home!
        </Text>
      </group>
      
      {/* Exit portal */}
      <group position={[0, 1, 5.5]} onClick={onExit}>
        <mesh>
          <ringGeometry args={[0.8, 1.2, 32]} />
          <meshStandardMaterial 
            color="#00ffff"
            emissive="#00ffff"
            emissiveIntensity={2}
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
        <pointLight color="#00ffff" intensity={3} distance={8} />
        <Sparkles count={30} scale={2} size={1} speed={0.4} color="#00ffff" />
        
        <Text
          position={[0, 1.5, 0]}
          fontSize={0.25}
          color="#00ffff"
          anchorX="center"
          anchorY="middle"
        >
          Click to Exit
        </Text>
      </group>
      
      {/* Ambient lighting */}
      <ambientLight intensity={lightIntensity * 0.4} />
      <pointLight position={[-4, 3, -4]} color="#ffd700" intensity={lightIntensity * 2} distance={8} />
      <pointLight position={[4, 3, 4]} color="#a78bfa" intensity={lightIntensity * 2} distance={8} />
    </group>
  );
}
