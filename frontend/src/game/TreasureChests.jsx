import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';

function TreasureChest({ position, onOpen, isOpened = false }) {
  const chestRef = useRef();
  const lidRef = useRef();
  const [isPlayerNear, setIsPlayerNear] = useState(false);
  const [lidAngle, setLidAngle] = useState(0);
  
  useFrame((state) => {
    if (!chestRef.current || !lidRef.current) return;
    
    // Gentle bobbing animation
    const time = state.clock.elapsedTime;
    chestRef.current.position.y = position[1] + Math.sin(time * 2) * 0.05;
    
    // Rotate slowly
    if (!isOpened) {
      chestRef.current.rotation.y = Math.sin(time) * 0.1;
    }
    
    // Animate lid opening
    if (isOpened && lidAngle < Math.PI / 2) {
      setLidAngle(prev => Math.min(prev + 0.05, Math.PI / 2));
    }
    
    lidRef.current.rotation.x = -lidAngle;
  });
  
  const handleClick = () => {
    if (!isOpened && isPlayerNear) {
      onOpen?.();
      setLidAngle(Math.PI / 2);
      
      // Play sound (procedural)
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      
      osc.frequency.value = 400;
      gain.gain.value = 0.1;
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start();
      osc.stop(audioContext.currentTime + 0.5);
    }
  };

  return (
    <group ref={chestRef} position={position} onClick={handleClick}>
      {/* Chest base */}
      <mesh castShadow>
        <boxGeometry args={[0.8, 0.5, 0.6]} />
        <meshPhysicalMaterial 
          color="#8b4513"
          roughness={0.8}
          metalness={0.1}
          clearcoat={0.2}
        />
      </mesh>
      
      {/* Chest lid */}
      <group ref={lidRef} position={[0, 0.25, 0]}>
        <mesh castShadow position={[0, 0.15, 0]}>
          <boxGeometry args={[0.82, 0.3, 0.62]} />
          <meshPhysicalMaterial 
            color="#654321"
            roughness={0.8}
            metalness={0.1}
            clearcoat={0.2}
          />
        </mesh>
        
        {/* Gold trim on lid */}
        <mesh position={[0, 0.15, 0.31]}>
          <boxGeometry args={[0.85, 0.05, 0.05]} />
          <meshStandardMaterial 
            color="#ffd700"
            metalness={0.9}
            roughness={0.2}
            emissive="#ffd700"
            emissiveIntensity={isOpened ? 0 : 0.5}
          />
        </mesh>
      </group>
      
      {/* Lock */}
      {!isOpened && (
        <mesh position={[0, 0.15, 0.3]}>
          <boxGeometry args={[0.15, 0.2, 0.1]} />
          <meshStandardMaterial 
            color="#c0c0c0"
            metalness={0.9}
            roughness={0.3}
          />
        </mesh>
      )}
      
      {/* Gold trim (base) */}
      <mesh position={[0, 0, 0.3]}>
        <boxGeometry args={[0.82, 0.08, 0.08]} />
        <meshStandardMaterial 
          color="#ffd700"
          metalness={0.9}
          roughness={0.2}
          emissive="#ffd700"
          emissiveIntensity={isOpened ? 0 : 0.5}
        />
      </mesh>
      
      {/* Glow effect when closed */}
      {!isOpened && (
        <>
          <pointLight 
            position={[0, 0.5, 0]} 
            color="#ffd700" 
            intensity={2} 
            distance={5} 
            decay={2}
          />
          
          <Sparkles
            count={20}
            scale={1.5}
            size={1}
            speed={0.2}
            opacity={0.6}
            color="#ffd700"
          />
        </>
      )}
      
      {/* Treasure inside when opened */}
      {isOpened && (
        <>
          <mesh position={[0, 0.3, 0]}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial 
              color="#ffd700"
              emissive="#ffd700"
              emissiveIntensity={2}
              metalness={1}
              roughness={0}
              toneMapped={false}
            />
          </mesh>
          
          <pointLight 
            position={[0, 0.5, 0]} 
            color="#ffd700" 
            intensity={4} 
            distance={10} 
            decay={2}
          />
          
          <Sparkles
            count={40}
            scale={2}
            size={2}
            speed={0.5}
            opacity={0.9}
            color="#ffd700"
          />
        </>
      )}
      
      {/* Interaction hint */}
      {isPlayerNear && !isOpened && (
        <mesh position={[0, 1, 0]}>
          <planeGeometry args={[1, 0.3]} />
          <meshBasicMaterial 
            color="#00ffff"
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

export default function TreasureChests() {
  const [openedChests, setOpenedChests] = useState({});
  
  // Chest positions scattered around the world
  const chestPositions = [
    { id: 1, pos: [15, 0, 20] },
    { id: 2, pos: [-20, 0, 15] },
    { id: 3, pos: [25, 0, -10] },
    { id: 4, pos: [-15, 0, -30] },
    { id: 5, pos: [30, 0, 30] },
    { id: 6, pos: [-25, 0, -15] },
    { id: 7, pos: [10, 0, -25] },
    { id: 8, pos: [-30, 0, 25] },
  ];
  
  const handleOpen = (id) => {
    setOpenedChests(prev => ({ ...prev, [id]: true }));
    
    // Could add rewards logic here
    console.log(`🎁 Treasure chest ${id} opened!`);
  };
  
  return (
    <group>
      {chestPositions.map(({ id, pos }) => (
        <TreasureChest 
          key={id}
          position={pos}
          onOpen={() => handleOpen(id)}
          isOpened={openedChests[id]}
        />
      ))}
    </group>
  );
}
