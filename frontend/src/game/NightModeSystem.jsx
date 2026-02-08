import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Chip, Typography } from '@mui/material';
import * as THREE from 'three';

export default function NightModeSystem({
  dayTime,
  isNightActive,
  onSpawnEnemy,
  playerPosition,
  safeZones = [], // Array of {position: [x, y, z], radius: number}
}) {
  const spawnTimer = useRef(0);
  const ambientSound = useRef(null);
  
  const isInSafeZone = () => {
    return safeZones.some(zone => {
      const dx = playerPosition[0] - zone.position[0];
      const dz = playerPosition[2] - zone.position[2];
      const distance = Math.sqrt(dx * dx + dz * dz);
      return distance < zone.radius;
    });
  };
  
  useFrame((state, delta) => {
    if (!isNightActive) return;
    
    // Don't spawn if in safe zone
    if (isInSafeZone()) return;
    
    spawnTimer.current += delta;
    
    // Spawn enemies more frequently at night (every 8 seconds)
    if (spawnTimer.current > 8) {
      spawnTimer.current = 0;
      spawnNightCreature();
    }
  });
  
  const spawnNightCreature = () => {
    // Random position around player
    const angle = Math.random() * Math.PI * 2;
    const distance = 12 + Math.random() * 8;
    const spawnX = playerPosition[0] + Math.cos(angle) * distance;
    const spawnZ = playerPosition[2] + Math.sin(angle) * distance;
    
    // Prefer shadow enemies at night
    const enemyTypes = ['shadow', 'shadow', 'ghoul', 'guardian'];
    const randomType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
    
    if (onSpawnEnemy) {
      onSpawnEnemy(randomType, [spawnX, 1, spawnZ]);
    }
  };
  
  // Play ominous ambient sound at night
  useEffect(() => {
    if (isNightActive) {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const filter = audioContext.createBiquadFilter();
      
      osc.type = 'sine';
      osc.frequency.value = 55; // Low A note
      filter.type = 'lowpass';
      filter.frequency.value = 200;
      gain.gain.value = 0.05;
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioContext.destination);
      osc.start();
      
      ambientSound.current = { osc, gain, audioContext };
    } else if (ambientSound.current) {
      ambientSound.current.osc.stop();
      ambientSound.current.audioContext.close();
      ambientSound.current = null;
    }
    
    return () => {
      if (ambientSound.current) {
        try {
          ambientSound.current.osc.stop();
          ambientSound.current.audioContext.close();
        } catch (e) {
          // Already stopped
        }
      }
    };
  }, [isNightActive]);
  
  return (
    <>
      {/* Night atmosphere */}
      {isNightActive && (
        <>
          {/* Moon */}
          <mesh position={[50, 40, -30]}>
            <sphereGeometry args={[5, 32, 32]} />
            <meshStandardMaterial
              color="#e0e7ff"
              emissive="#e0e7ff"
              emissiveIntensity={1.5}
            />
            <pointLight intensity={15} distance={100} color="#c7d2fe" />
          </mesh>
          
          {/* Fog */}
          <mesh position={[playerPosition[0], 0.1, playerPosition[2]]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[50, 64]} />
            <meshBasicMaterial
              color="#1e1b4b"
              transparent
              opacity={0.3}
              side={THREE.DoubleSide}
            />
          </mesh>
          
          {/* Glowing particles */}
          {[...Array(50)].map((_, i) => {
            const angle = (i / 50) * Math.PI * 2;
            const radius = 20 + (i % 3) * 10;
            const x = playerPosition[0] + Math.cos(angle) * radius;
            const z = playerPosition[2] + Math.sin(angle) * radius;
            const y = 2 + Math.sin(i * 0.5) * 3;
            
            return (
              <mesh key={i} position={[x, y, z]}>
                <sphereGeometry args={[0.1, 8, 8]} />
                <meshBasicMaterial
                  color={i % 3 === 0 ? "#4ade80" : i % 3 === 1 ? "#60a5fa" : "#c084fc"}
                  transparent
                  opacity={0.6}
                />
              </mesh>
            );
          })}
        </>
      )}
      
      {/* Safe Zone Indicators */}
      {isNightActive && safeZones.map((zone, i) => (
        <group key={i} position={zone.position}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
            <ringGeometry args={[zone.radius - 0.5, zone.radius, 32]} />
            <meshBasicMaterial
              color="#10b981"
              transparent
              opacity={0.4}
              side={THREE.DoubleSide}
            />
          </mesh>
          
          {/* Safe zone light */}
          <pointLight
            color="#10b981"
            intensity={5}
            distance={zone.radius * 2}
          />
        </group>
      ))}
      
      {/* Night Warning UI */}
      {isNightActive && (
        <Box
          sx={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 9999,
          }}
        >
          <Chip
            icon={<span>🌙</span>}
            label="DANGEROUS NIGHT"
            sx={{
              background: 'linear-gradient(135deg, #4c1d95, #1e1b4b)',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '14px',
              padding: '8px 12px',
              animation: 'pulse 2s infinite',
              border: '2px solid #8b5cf6',
              boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)',
            }}
          />
          
          {!isInSafeZone() && (
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                color: '#ef4444',
                fontWeight: 'bold',
                textAlign: 'center',
                mt: 1,
                textShadow: '0 0 10px rgba(239, 68, 68, 0.8)',
              }}
            >
              ⚠️ Seek shelter!
            </Typography>
          )}
          
          {isInSafeZone() && (
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                color: '#10b981',
                fontWeight: 'bold',
                textAlign: 'center',
                mt: 1,
                textShadow: '0 0 10px rgba(16, 185, 129, 0.8)',
              }}
            >
              ✓ Safe Zone
            </Typography>
          )}
        </Box>
      )}
      
      {/* XP Bonus Indicator */}
      {isNightActive && (
        <Box
          sx={{
            position: 'fixed',
            top: 70,
            right: 20,
            zIndex: 9999,
          }}
        >
          <Chip
            label="2X XP BONUS"
            sx={{
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              color: '#000',
              fontWeight: 'bold',
              fontSize: '12px',
              animation: 'glow 1.5s infinite',
            }}
          />
        </Box>
      )}
      
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
          
          @keyframes glow {
            0%, 100% { box-shadow: 0 0 10px rgba(251, 191, 36, 0.6); }
            50% { box-shadow: 0 0 25px rgba(251, 191, 36, 1); }
          }
        `}
      </style>
    </>
  );
}

// Torch item component for player inventory
export function Torch({ position, isActive }) {
  const torchRef = useRef();
  
  useFrame((state) => {
    if (!torchRef.current) return;
    
    // Flicker effect
    const flicker = 1 + Math.sin(state.clock.elapsedTime * 8) * 0.1;
    torchRef.current.intensity = isActive ? 8 * flicker : 0;
  });
  
  if (!isActive) return null;
  
  return (
    <group position={position}>
      {/* Torch handle */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.8, 8]} />
        <meshStandardMaterial color="#8b4513" />
      </mesh>
      
      {/* Flame */}
      <mesh position={[0, 0.5, 0]}>
        <coneGeometry args={[0.15, 0.4, 8]} />
        <meshStandardMaterial
          color="#ff6b35"
          emissive="#ff6b35"
          emissiveIntensity={2}
        />
      </mesh>
      
      {/* Light */}
      <pointLight
        ref={torchRef}
        color="#ffa500"
        intensity={8}
        distance={15}
        castShadow
      />
      
      {/* Particles */}
      {[...Array(15)].map((_, i) => {
        const angle = (i / 15) * Math.PI * 2;
        const radius = 0.2 + Math.random() * 0.1;
        return (
          <mesh
            key={i}
            position={[
              Math.cos(angle) * radius,
              0.5 + Math.random() * 0.3,
              Math.sin(angle) * radius,
            ]}
          >
            <sphereGeometry args={[0.02, 4, 4]} />
            <meshBasicMaterial color="#ff6b35" transparent opacity={0.8} />
          </mesh>
        );
      })}
    </group>
  );
}

// Rare night treasure marker
export function NightTreasure({ position, onCollect, isActive }) {
  const treasureRef = useRef();
  
  useFrame((state) => {
    if (!treasureRef.current) return;
    treasureRef.current.rotation.y += 0.02;
    treasureRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.3;
  });
  
  if (!isActive) return null;
  
  return (
    <group ref={treasureRef} position={position} onClick={onCollect}>
      {/* Treasure chest */}
      <mesh>
        <boxGeometry args={[0.5, 0.4, 0.4]} />
        <meshStandardMaterial
          color="#6366f1"
          metalness={0.8}
          roughness={0.2}
          emissive="#6366f1"
          emissiveIntensity={0.5}
        />
      </mesh>
      
      {/* Glow */}
      <mesh>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshBasicMaterial
          color="#818cf8"
          transparent
          opacity={0.2}
        />
      </mesh>
      
      {/* Light */}
      <pointLight color="#818cf8" intensity={5} distance={10} />
      
      {/* Sparkles */}
      {[...Array(20)].map((_, i) => {
        const angle = (i / 20) * Math.PI * 2;
        const radius = 1 + Math.random() * 0.5;
        return (
          <mesh
            key={i}
            position={[
              Math.cos(angle) * radius,
              Math.random() * 2 - 1,
              Math.sin(angle) * radius,
            ]}
          >
            <sphereGeometry args={[0.05, 4, 4]} />
            <meshBasicMaterial color="#c7d2fe" transparent opacity={0.8} />
          </mesh>
        );
      })}
    </group>
  );
}
