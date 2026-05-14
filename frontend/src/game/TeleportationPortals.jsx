import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles, Text } from '@react-three/drei';
import * as THREE from 'three';

function Portal({ position, color, targetId, onTeleport, label }) {
  const portalRef = useRef();
  const ringRef = useRef();
  const particlesRef = useRef();
  const [isPlayerNear, setIsPlayerNear] = useState(false);
  
  useFrame((state) => {
    if (!portalRef.current) return;
    
    const time = state.clock.elapsedTime;
    
    // Rotate portal
    portalRef.current.rotation.y = time * 0.5;
    
    // Pulsing effect
    const scale = 1 + Math.sin(time * 2) * 0.1;
    portalRef.current.scale.setScalar(scale);
    
    // Spinning rings
    if (ringRef.current) {
      ringRef.current.rotation.x = time;
      ringRef.current.rotation.z = time * 0.7;
    }
  });
  
  const handleClick = () => {
    if (isPlayerNear) {
      // Teleport sound
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = 800;
      osc.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.3);
      
      gain.gain.value = 0.2;
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start();
      osc.stop(audioContext.currentTime + 0.3);
      
      onTeleport(targetId);
    }
  };
  
  return (
    <group position={position} onClick={handleClick}>
      {/* Portal base */}
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2, 32]} />
        <meshStandardMaterial 
          color="#1a1a2e"
          emissive="#1a1a2e"
          emissiveIntensity={0.5}
        />
      </mesh>
      
      {/* Portal center - swirling effect */}
      <group ref={portalRef}>
        <mesh position={[0, 1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 1.5, 32]} />
          <meshStandardMaterial 
            color={color}
            emissive={color}
            emissiveIntensity={2}
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
        
        {/* Inner ring */}
        <mesh position={[0, 1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.2, 0.5, 32]} />
          <meshStandardMaterial 
            color={color}
            emissive={color}
            emissiveIntensity={3}
            transparent
            opacity={0.9}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      </group>
      
      {/* Spinning rings */}
      <group ref={ringRef}>
        <mesh position={[0, 1, 0]}>
          <torusGeometry args={[1.2, 0.05, 16, 32]} />
          <meshStandardMaterial 
            color={color}
            emissive={color}
            emissiveIntensity={1.5}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
        
        <mesh position={[0, 1, 0]}>
          <torusGeometry args={[1.5, 0.03, 16, 32]} />
          <meshStandardMaterial 
            color={color}
            emissive={color}
            emissiveIntensity={1}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      </group>
      
      {/* Point light */}
      <pointLight 
        position={[0, 1, 0]}
        color={color}
        intensity={5}
        distance={15}
        decay={2}
      />
      
      {/* Particles */}
      <Sparkles
        count={50}
        scale={3}
        size={2}
        speed={0.4}
        opacity={0.8}
        color={color}
      />
      
      {/* Label */}
      <Text
        position={[0, 3, 0]}
        fontSize={0.5}
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        {label}
      </Text>
      
      {/* Interaction hint */}
      {isPlayerNear && (
        <Text
          position={[0, 2, 0]}
          fontSize={0.3}
          color="#00ffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.03}
          outlineColor="#000000"
        >
          Click to Teleport
        </Text>
      )}
    </group>
  );
}

export default function TeleportationPortals({ onPlayerMove }) {
  // Portal network - each portal connects to another
  const portals = [
    { 
      id: 1, 
      position: [-30, 0, 30], 
      color: '#00ffff', 
      label: 'North Portal',
      targetId: 2,
      targetPosition: [30, 0, 30]
    },
    { 
      id: 2, 
      position: [30, 0, 30], 
      color: '#ff00ff', 
      label: 'East Portal',
      targetId: 3,
      targetPosition: [30, 0, -30]
    },
    { 
      id: 3, 
      position: [30, 0, -30], 
      color: '#ffff00', 
      label: 'South Portal',
      targetId: 4,
      targetPosition: [-30, 0, -30]
    },
    { 
      id: 4, 
      position: [-30, 0, -30], 
      color: '#ff6600', 
      label: 'West Portal',
      targetId: 5,
      targetPosition: [0, 0, 5]
    },
    {
      id: 5,
      position: [0, 0, 5],
      color: '#00ff00',
      label: 'Castle Portal',
      targetId: 1,
      targetPosition: [-30, 0, 30]
    }
  ];
  
  const handleTeleport = (targetId) => {
    const targetPortal = portals.find(p => p.id === targetId);
    if (targetPortal && onPlayerMove) {
      // Add slight offset so player doesn't immediately trigger the target portal
      const offset = [
        targetPortal.targetPosition[0] + (Math.random() - 0.5) * 2,
        2,
        targetPortal.targetPosition[2] + (Math.random() - 0.5) * 2
      ];
      onPlayerMove(offset);
      
      console.log(`✨ Teleported to ${targetPortal.label}!`);
    }
  };
  
  return (
    <group>
      {portals.map((portal) => (
        <Portal
          key={portal.id}
          position={portal.position}
          color={portal.color}
          targetId={portal.targetId}
          label={portal.label}
          onTeleport={handleTeleport}
        />
      ))}
    </group>
  );
}
