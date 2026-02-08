import React from 'react';
import { Sparkles, Text } from '@react-three/drei';
import * as THREE from 'three';

function Furniture({ type, position, style }) {
  const styleColors = {
    cozy: { primary: '#d2691e', secondary: '#8b4513' },
    elegant: { primary: '#daa520', secondary: '#b8860b' },
    modern: { primary: '#708090', secondary: '#2f4f4f' },
    rustic: { primary: '#8b4513', secondary: '#654321' },
    mystical: { primary: '#9370db', secondary: '#8a2be2' },
  };
  
  const colors = styleColors[style] || styleColors.cozy;
  
  switch (type) {
    case 'fireplace':
      return (
        <group position={position}>
          <mesh castShadow>
            <boxGeometry args={[2, 2, 0.5]} />
            <meshStandardMaterial color="#696969" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.3, 0.1]}>
            <boxGeometry args={[1.2, 1, 0.3]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
          <Sparkles count={30} scale={[1, 1, 0.5]} size={1.5} speed={0.4} color="#ff6600" />
          <pointLight color="#ff6600" intensity={5} distance={10} />
        </group>
      );
      
    case 'bookshelf':
      return (
        <group position={position}>
          <mesh castShadow>
            <boxGeometry args={[1.5, 2, 0.4]} />
            <meshStandardMaterial color={colors.primary} />
          </mesh>
          {Array.from({ length: 12 }).map((_, i) => (
            <mesh 
              key={i}
              castShadow
              position={[
                (i % 4 - 1.5) * 0.3,
                Math.floor(i / 4) * 0.6 - 0.5,
                0.25
              ]}
            >
              <boxGeometry args={[0.25, 0.5, 0.1]} />
              <meshStandardMaterial color={['#8b0000', '#006400', '#00008b', '#8b008b'][i % 4]} />
            </mesh>
          ))}
        </group>
      );
      
    case 'plants':
      return (
        <group position={position}>
          <mesh castShadow>
            <cylinderGeometry args={[0.3, 0.25, 0.4, 12]} />
            <meshStandardMaterial color="#8b4513" />
          </mesh>
          <mesh castShadow position={[0, 0.5, 0]}>
            <sphereGeometry args={[0.4, 12, 12]} />
            <meshStandardMaterial color="#228b22" />
          </mesh>
          {Array.from({ length: 5 }).map((_, i) => (
            <mesh 
              key={i}
              castShadow
              position={[
                Math.sin(i * Math.PI * 0.4) * 0.5,
                0.5 + Math.cos(i * 0.5) * 0.3,
                Math.cos(i * Math.PI * 0.4) * 0.5
              ]}
            >
              <sphereGeometry args={[0.2, 8, 8]} />
              <meshStandardMaterial color="#32cd32" />
            </mesh>
          ))}
        </group>
      );
      
    case 'crystals':
      return (
        <group position={position}>
          <mesh castShadow>
            <octahedronGeometry args={[0.3]} />
            <meshStandardMaterial 
              color="#9370db" 
              metalness={0.8} 
              roughness={0.2}
              emissive="#9370db"
              emissiveIntensity={0.5}
            />
          </mesh>
          <Sparkles count={20} scale={1} size={1} speed={0.3} color="#9370db" />
          <pointLight color="#9370db" intensity={3} distance={5} />
        </group>
      );
      
    case 'armor_stand':
      return (
        <group position={position}>
          <mesh castShadow>
            <boxGeometry args={[0.1, 1.5, 0.1]} />
            <meshStandardMaterial color="#3d2817" />
          </mesh>
          <mesh castShadow position={[0, 0.5, 0]}>
            <sphereGeometry args={[0.2, 12, 12]} />
            <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.1} />
          </mesh>
          <mesh castShadow position={[0, 0, 0]}>
            <boxGeometry args={[0.6, 0.8, 0.3]} />
            <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.1} />
          </mesh>
        </group>
      );
      
    case 'telescope':
      return (
        <group position={position}>
          <mesh castShadow>
            <cylinderGeometry args={[0.05, 0.05, 1, 12]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh castShadow position={[0, 0.3, 0]} rotation={[Math.PI / 4, 0, 0]}>
            <cylinderGeometry args={[0.08, 0.1, 0.8, 12]} />
            <meshStandardMaterial color="#2f4f4f" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      );
      
    case 'music_box':
      return (
        <group position={position}>
          <mesh castShadow>
            <boxGeometry args={[0.5, 0.3, 0.4]} />
            <meshStandardMaterial color={colors.primary} roughness={0.7} />
          </mesh>
          <mesh castShadow position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.3, 8]} />
            <meshStandardMaterial color="#ffd700" metalness={0.9} roughness={0.1} />
          </mesh>
          <Sparkles count={10} scale={0.5} size={0.5} speed={0.5} color="#ffd700" />
        </group>
      );
      
    case 'paintings':
      return (
        <group position={position}>
          <mesh castShadow>
            <boxGeometry args={[1.2, 0.9, 0.05]} />
            <meshStandardMaterial color={colors.primary} />
          </mesh>
          <mesh position={[0, 0, 0.03]}>
            <planeGeometry args={[1, 0.7]} />
            <meshStandardMaterial color={['#ff6b9d', '#4ecdc4', '#95e1d3', '#ffe66d'][Math.floor(Math.random() * 4)]} />
          </mesh>
        </group>
      );
      
    default:
      return null;
  }
}

export default function PlayerHomeInterior({ isInside, homeConfig, onExit }) {
  if (!isInside) return null;
  
  const { interiorColor, furnitureStyle, lightingIntensity, decorations } = homeConfig;
  
  return (
    <group>
      {/* Floor */}
      <mesh receiveShadow position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color={interiorColor} roughness={0.8} />
      </mesh>
      
      {/* Walls */}
      <mesh castShadow receiveShadow position={[0, 3, -6]}>
        <boxGeometry args={[12, 6, 0.2]} />
        <meshStandardMaterial color={interiorColor} roughness={0.9} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 3, 6]}>
        <boxGeometry args={[12, 6, 0.2]} />
        <meshStandardMaterial color={interiorColor} roughness={0.9} />
      </mesh>
      <mesh castShadow receiveShadow position={[-6, 3, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[12, 6, 0.2]} />
        <meshStandardMaterial color={interiorColor} roughness={0.9} />
      </mesh>
      <mesh castShadow receiveShadow position={[6, 3, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[12, 6, 0.2]} />
        <meshStandardMaterial color={interiorColor} roughness={0.9} />
      </mesh>
      
      {/* Ceiling */}
      <mesh receiveShadow position={[0, 6, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color={interiorColor} roughness={0.9} />
      </mesh>
      
      {/* Chandelier */}
      <mesh castShadow position={[0, 5, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#ffd700" metalness={0.9} roughness={0.1} emissive="#ffd700" emissiveIntensity={0.5} />
      </mesh>
      <Sparkles
        count={40}
        scale={2}
        position={[0, 5, 0]}
        size={1}
        speed={0.2}
        opacity={0.6}
        color="#ffd700"
      />
      <pointLight position={[0, 5, 0]} color="#ffd700" intensity={lightingIntensity * 5} distance={15} />
      
      {/* Render Decorations */}
      {decorations.includes('fireplace') && (
        <Furniture type="fireplace" position={[-5, 1, -5.5]} style={furnitureStyle} />
      )}
      {decorations.includes('bookshelf') && (
        <Furniture type="bookshelf" position={[4, 1, -5.5]} style={furnitureStyle} />
      )}
      {decorations.includes('plants') && (
        <>
          <Furniture type="plants" position={[-4, 0.2, 4]} style={furnitureStyle} />
          <Furniture type="plants" position={[4, 0.2, 4]} style={furnitureStyle} />
        </>
      )}
      {decorations.includes('crystals') && (
        <>
          <Furniture type="crystals" position={[-3, 1, 3]} style={furnitureStyle} />
          <Furniture type="crystals" position={[3, 1, -3]} style={furnitureStyle} />
        </>
      )}
      {decorations.includes('paintings') && (
        <>
          <Furniture type="paintings" position={[-5.8, 3, 0]} style={furnitureStyle} />
          <Furniture type="paintings" position={[5.8, 3, 0]} style={furnitureStyle} />
        </>
      )}
      {decorations.includes('telescope') && (
        <Furniture type="telescope" position={[4.5, 0.5, -4.5]} style={furnitureStyle} />
      )}
      {decorations.includes('armor_stand') && (
        <Furniture type="armor_stand" position={[-4.5, 0.75, -4.5]} style={furnitureStyle} />
      )}
      {decorations.includes('music_box') && (
        <Furniture type="music_box" position={[0, 1, -3]} style={furnitureStyle} />
      )}
      
      {/* Exit Portal */}
      <mesh 
        position={[0, 1, 5.5]} 
        onClick={onExit}
      >
        <ringGeometry args={[0.8, 1.2, 32]} />
        <meshStandardMaterial 
          color="#00ffff" 
          transparent 
          opacity={0.7} 
          emissive="#00ffff"
          emissiveIntensity={2}
          side={THREE.DoubleSide}
        />
      </mesh>
      <Sparkles
        count={40}
        scale={2}
        position={[0, 1, 5.5]}
        size={1.5}
        speed={0.4}
        opacity={0.8}
        color="#00ffff"
      />
      <pointLight position={[0, 1, 5.5]} color="#00ffff" intensity={5} distance={10} />
      
      <Text
        position={[0, -0.5, 5.3]}
        fontSize={0.3}
        color="#00ffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.03}
        outlineColor="#000000"
      >
        Click to Exit
      </Text>
      
      {/* Welcome message */}
      <Text
        position={[0, 4, -5.5]}
        fontSize={0.5}
        color="#ffd700"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        💜 Welcome to YOUR Home!
      </Text>
      
      {/* Ambient lighting */}
      <ambientLight intensity={lightingIntensity * 0.4} />
      <pointLight position={[-4, 3, -4]} color="#ff9966" intensity={lightingIntensity * 2} distance={8} />
      <pointLight position={[4, 3, 4]} color="#66ccff" intensity={lightingIntensity * 2} distance={8} />
    </group>
  );
}
