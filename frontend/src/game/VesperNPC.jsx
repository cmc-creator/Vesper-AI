import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles, Text, Html } from '@react-three/drei';
import * as THREE from 'three';

export default function VesperNPC({ position = [0, 0, 0], onInteract, crystalsCollected = 0 }) {
  const npcRef = useRef();
  const floatOffset = useRef(0);
  const [isPlayerNear, setIsPlayerNear] = useState(false);
  const [showSpeechBubble, setShowSpeechBubble] = useState(false);
  const [currentDialogue, setCurrentDialogue] = useState(0);
  
  // Dialogue system based on progress
  const dialogues = [
    {
      text: "Greetings, traveler! I am Vesper, guardian of this realm.",
      condition: () => true
    },
    {
      text: "Collect the 8 mystical crystals to unlock the unicorn's power!",
      condition: () => crystalsCollected < 8
    },
    {
      text: "You've found " + crystalsCollected + " crystals so far. Keep searching!",
      condition: () => crystalsCollected > 0 && crystalsCollected < 8
    },
    {
      text: "Amazing! You've collected all 8 crystals! The unicorn awaits you!",
      condition: () => crystalsCollected >= 8
    },
    {
      text: "Try finding the treasure chests scattered across the land!",
      condition: () => crystalsCollected < 4
    },
    {
      text: "Use the teleportation portals to travel quickly!",
      condition: () => true
    }
  ];
  
  const getRandomDialogue = () => {
    const availableDialogues = dialogues.filter(d => d.condition());
    if (availableDialogues.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableDialogues.length);
      return availableDialogues[randomIndex].text;
    }
    return "Welcome to the magical realm!";
  };

  // Float animation
  useFrame((state) => {
    if (!npcRef.current) return;
    
    floatOffset.current += 0.02;
    npcRef.current.position.y = position[1] + Math.sin(floatOffset.current) * 0.3;
    
    // Rotate slowly
    npcRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.3;
  });
  
  const handleClick = () => {
    setShowSpeechBubble(!showSpeechBubble);
    setCurrentDialogue(Date.now()); // Trigger new dialogue
    
    // Play voice sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.type = 'sine';
    osc.frequency.value = 300;
    osc.frequency.linearRampToValueAtTime(400, audioContext.currentTime + 0.1);
    
    gain.gain.value = 0.1;
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + 0.2);
    
    if (onInteract) onInteract();
  };

  return (
    <group ref={npcRef} position={position} onClick={handleClick}>
      {/* Main body - ethereal form with enhanced glow */}
      <mesh castShadow>
        <sphereGeometry args={[0.6, 32, 32]} />
        <meshStandardMaterial
          color="#a78bfa"
          emissive="#8b5cf6"
          emissiveIntensity={2.0}
          transparent
          opacity={0.9}
          roughness={0.1}
          metalness={0.9}
          toneMapped={false}
        />
      </mesh>

      {/* Outer glow with bloom */}
      <mesh>
        <sphereGeometry args={[0.85, 32, 32]} />
        <meshBasicMaterial
          color="#a78bfa"
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Floating ring with glow */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.3, 0]}>
        <torusGeometry args={[0.7, 0.05, 16, 32]} />
        <meshStandardMaterial
          color="#00ffff"
          emissive="#00ffff"
          emissiveIntensity={2.5}
          transparent
          opacity={0.8}
          toneMapped={false}
        />
      </mesh>

      {/* Name indicator - intensely glowing orb */}
      <mesh position={[0, 2, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial 
          color="#00ffff"
          emissive="#00ffff"
          emissiveIntensity={3.0}
          toneMapped={false}
        />
      </mesh>

      {/* Magical sparkles around NPC */}
      <Sparkles
        count={80}
        scale={3}
        size={1.5}
        speed={0.3}
        opacity={0.8}
        color="#a78bfa"
      />

      {/* Floating particles around NPC */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const radius = 1;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        return (
          <mesh key={`particle-${i}`} position={[x, 0, z]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? "#00ffff" : "#a78bfa"}
              emissive={i % 2 === 0 ? "#00ffff" : "#a78bfa"}
              emissiveIntensity={2.0}
              transparent
              opacity={0.9}
              toneMapped={false}
            />
          </mesh>
        );
      })}

      {/* Enhanced point lights */}
      <pointLight
        color="#a78bfa"
        intensity={6}
        distance={15}
        decay={2}
      />

      {/* Ambient cyan glow */}
      <pointLight
        color="#00ffff"
        intensity={3}
        distance={20}
        decay={2}
      />
      
      {/* Quest indicator */}
      <Text
        position={[0, 3, 0]}
        fontSize={0.8}
        color={crystalsCollected >= 8 ? "#00ff00" : "#ffff00"}
        anchorX="center"
        anchorY="middle"
      >
        {crystalsCollected >= 8 ? "!" : "?"}
      </Text>
      
      {/* Speech bubble */}
      {showSpeechBubble && (
        <Html position={[0, 3.5, 0]} center>
          <div style={{
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(10px)',
            color: '#a78bfa',
            padding: '15px 20px',
            borderRadius: '15px',
            border: '2px solid #a78bfa',
            maxWidth: '300px',
            fontSize: '14px',
            fontFamily: 'Arial, sans-serif',
            boxShadow: '0 0 20px rgba(167, 139, 250, 0.5)',
            animation: 'fadeIn 0.3s ease-in',
            position: 'relative'
          }}>
            <div style={{
              content: '""',
              position: 'absolute',
              bottom: '-10px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '0',
              height: '0',
              borderLeft: '10px solid transparent',
              borderRight: '10px solid transparent',
              borderTop: '10px solid rgba(0, 0, 0, 0.8)'
            }} />
            {getRandomDialogue()}
          </div>
        </Html>
      )}
      
      {/* Interaction hint */}
      {isPlayerNear && !showSpeechBubble && (
        <Text
          position={[0, 2.5, 0]}
          fontSize={0.3}
          color="#00ffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.05}
          outlineColor="#000000"
        >
          Click to Talk
        </Text>
      )}
    </group>
  );
}
