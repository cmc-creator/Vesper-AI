import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles, Text } from '@react-three/drei';
import * as THREE from 'three';

const PET_TYPES = {
  wolf: {
    name: 'Spirit Wolf',
    emoji: '🐺',
    color: '#708090',
    size: 0.6,
    speed: 0.15,
    ability: 'Finds hidden treasures',
  },
  fox: {
    name: 'Fire Fox',
    emoji: '🦊',
    color: '#ff6b35',
    size: 0.4,
    speed: 0.2,
    ability: 'Lights up dark areas',
  },
  owl: {
    name: 'Wise Owl',
    emoji: '🦉',
    color: '#8b7355',
    size: 0.5,
    speed: 0.1,
    ability: 'Reveals quest locations',
  },
  dragon: {
    name: 'Baby Dragon',
    emoji: '🐉',
    color: '#a855f7',
    size: 0.8,
    speed: 0.12,
    ability: 'Breathes fire in combat',
  },
};

function Pet({ type, playerPosition, isActive }) {
  const petRef = useRef();
  const [targetPosition, setTargetPosition] = useState([0, 0, 0]);
  const [isIdle, setIsIdle] = useState(false);
  const idleTimer = useRef(0);
  
  const petData = PET_TYPES[type] || PET_TYPES.wolf;
  
  useFrame((state, delta) => {
    if (!petRef.current || !isActive) return;
    
    const time = state.clock.elapsedTime;
    
    // Calculate distance from player
    const dx = playerPosition[0] - petRef.current.position.x;
    const dz = playerPosition[2] - petRef.current.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    // Follow player if too far
    if (distance > 5) {
      // Position slightly behind and to the side of player
      const offsetAngle = Math.sin(time * 2) * 0.5;
      const offsetDistance = 3;
      
      const targetX = playerPosition[0] - dx / distance * offsetDistance * Math.cos(offsetAngle);
      const targetZ = playerPosition[2] - dz / distance * offsetDistance * Math.sin(offsetAngle);
      
      petRef.current.position.x += (targetX - petRef.current.position.x) * petData.speed;
      petRef.current.position.z += (targetZ - petRef.current.position.z) * petData.speed;
      
      // Look at player
      petRef.current.rotation.y = Math.atan2(dx, dz);
      
      setIsIdle(false);
      idleTimer.current = 0;
    } else {
      // Idle behavior - circle around player
      idleTimer.current += delta;
      if (idleTimer.current > 2) {
        setIsIdle(true);
        const angle = time * 0.5;
        const radius = 2;
        petRef.current.position.x = playerPosition[0] + Math.sin(angle) * radius;
        petRef.current.position.z = playerPosition[2] + Math.cos(angle) * radius;
        petRef.current.rotation.y = angle + Math.PI / 2;
      }
    }
    
    // Bobbing animation
    petRef.current.position.y = playerPosition[1] - 0.5 + Math.sin(time * 3) * 0.2;
  });
  
  if (!isActive) return null;
  
  return (
    <group ref={petRef} position={[playerPosition[0] - 3, playerPosition[1], playerPosition[2]]}>
      {/* Pet body */}
      <mesh castShadow>
        <sphereGeometry args={[petData.size, 16, 16]} />
        <meshStandardMaterial 
          color={petData.color} 
          roughness={0.7} 
          metalness={0.3}
          emissive={petData.color}
          emissiveIntensity={0.2}
        />
      </mesh>
      
      {/* Pet face features */}
      <mesh position={[0, 0.1, petData.size * 0.7]}>
        <sphereGeometry args={[petData.size * 0.15, 8, 8]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
      
      {/* Eyes */}
      <mesh position={[petData.size * 0.3, petData.size * 0.2, petData.size * 0.6]}>
        <sphereGeometry args={[petData.size * 0.1, 8, 8]} />
        <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={1} />
      </mesh>
      <mesh position={[-petData.size * 0.3, petData.size * 0.2, petData.size * 0.6]}>
        <sphereGeometry args={[petData.size * 0.1, 8, 8]} />
        <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={1} />
      </mesh>
      
      {/* Sparkle effect */}
      <Sparkles
        count={20}
        scale={petData.size * 2}
        size={1}
        speed={0.3}
        opacity={0.6}
        color={petData.color}
      />
      
      {/* Ability indicator light */}
      {type === 'fox' && (
        <pointLight 
          position={[0, 0, 0]} 
          color="#ff6b35" 
          intensity={3} 
          distance={10} 
        />
      )}
      
      {/* Name tag */}
      {isIdle && (
        <Text
          position={[0, petData.size + 0.5, 0]}
          fontSize={0.3}
          color={petData.color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {petData.emoji}
        </Text>
      )}
    </group>
  );
}

export function PetSelector({ onSelect, currentPet }) {
  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'linear-gradient(135deg, rgba(20, 20, 30, 0.98), rgba(40, 40, 60, 0.98))',
      backdropFilter: 'blur(20px)',
      borderRadius: '20px',
      border: '2px solid rgba(100, 100, 255, 0.3)',
      padding: '30px',
      zIndex: 10000,
      boxShadow: '0 0 60px rgba(100, 100, 255, 0.4)',
    }}>
      <h2 style={{ color: '#fff', textAlign: 'center', marginBottom: '20px' }}>
        🐾 Choose Your Pet Companion
      </h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
        {Object.entries(PET_TYPES).map(([key, pet]) => (
          <div
            key={key}
            onClick={() => onSelect(key)}
            style={{
              background: currentPet === key 
                ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.4), rgba(139, 92, 246, 0.4))'
                : 'rgba(0, 0, 0, 0.3)',
              border: currentPet === key ? '2px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '15px',
              cursor: 'pointer',
              transition: 'all 0.3s',
              textAlign: 'center',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>{pet.emoji}</div>
            <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '16px', marginBottom: '5px' }}>
              {pet.name}
            </div>
            <div style={{ color: pet.color, fontSize: '12px', marginBottom: '8px' }}>
              {pet.ability}
            </div>
            <div style={{ 
              display: 'inline-block',
              background: `${pet.color}33`,
              color: pet.color,
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '11px',
              border: `1px solid ${pet.color}`,
            }}>
              Speed: {Math.round(pet.speed * 100)}
            </div>
          </div>
        ))}
      </div>
      
      <p style={{ 
        color: 'rgba(255, 255, 255, 0.6)', 
        textAlign: 'center', 
        marginTop: '20px',
        fontSize: '12px' 
      }}>
        💡 Your pet will follow you everywhere and help with special abilities!
      </p>
    </div>
  );
}

export default Pet;
export { PET_TYPES };
