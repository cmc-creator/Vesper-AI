import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';

function Projectile({ position, direction, type, onHit }) {
  const projectileRef = useRef();
  const [active, setActive] = useState(true);
  const speed = 0.5;
  const lifetime = useRef(0);
  
  useFrame((state, delta) => {
    if (!projectileRef.current || !active) return;
    
    // Move projectile
    projectileRef.current.position.x += direction[0] * speed;
    projectileRef.current.position.y += direction[1] * speed;
    projectileRef.current.position.z += direction[2] * speed;
    
    // Rotation for effect
    projectileRef.current.rotation.x += delta * 5;
    projectileRef.current.rotation.y += delta * 3;
    
    // Lifetime check
    lifetime.current += delta;
    if (lifetime.current > 3) {
      setActive(false);
      if (onHit) onHit();
    }
  });
  
  if (!active) return null;
  
  const colors = {
    fireball: '#ff6600',
    ice: '#00ffff',
    light: '#ffd700',
    nature: '#00ff00'
  };
  
  return (
    <group ref={projectileRef} position={position}>
      <mesh>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial 
          color={colors[type]}
          emissive={colors[type]}
          emissiveIntensity={3}
          transparent
          opacity={0.9}
          toneMapped={false}
        />
      </mesh>
      <pointLight 
        color={colors[type]} 
        intensity={5} 
        distance={10} 
      />
      <Sparkles
        count={20}
        scale={1}
        size={1.5}
        speed={0.5}
        opacity={0.8}
        color={colors[type]}
      />
    </group>
  );
}

export default function MagicAbilities({ playerPosition, playerRotation, keyboard }) {
  const [projectiles, setProjectiles] = useState([]);
  const [activeAbility, setActiveAbility] = useState(null);
  const [speedBoostActive, setSpeedBoostActive] = useState(false);
  const [levitationActive, setLevitationActive] = useState(false);
  const [lightOrbActive, setLightOrbActive] = useState(false);
  const lastCastTime = useRef({});
  
  // Ability cooldowns (in milliseconds)
  const cooldowns = {
    fireball: 1000,
    speed: 5000,
    levitation: 3000,
    light: 10000
  };
  
  // Cast ability
  const castAbility = (abilityType) => {
    const now = Date.now();
    const lastCast = lastCastTime.current[abilityType] || 0;
    
    if (now - lastCast < cooldowns[abilityType]) {
      return; // On cooldown
    }
    
    lastCastTime.current[abilityType] = now;
    
    switch (abilityType) {
      case 'fireball':
        castFireball();
        break;
      case 'speed':
        activateSpeedBoost();
        break;
      case 'levitation':
        activateLevitation();
        break;
      case 'light':
        activateLightOrb();
        break;
    }
    
    // Play cast sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.type = 'sine';
    osc.frequency.value = 600;
    osc.frequency.exponentialRampToValueAtTime(1000, audioContext.currentTime + 0.2);
    
    gain.gain.value = 0.15;
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + 0.2);
  };
  
  const castFireball = () => {
    const direction = [
      Math.sin(playerRotation || 0),
      0,
      Math.cos(playerRotation || 0)
    ];
    
    const newProjectile = {
      id: Date.now(),
      position: [playerPosition[0], playerPosition[1] + 1, playerPosition[2]],
      direction,
      type: 'fireball'
    };
    
    setProjectiles(prev => [...prev, newProjectile]);
    
    // Remove after 3 seconds
    setTimeout(() => {
      setProjectiles(prev => prev.filter(p => p.id !== newProjectile.id));
    }, 3000);
  };
  
  const activateSpeedBoost = () => {
    setSpeedBoostActive(true);
    setActiveAbility('speed');
    
    setTimeout(() => {
      setSpeedBoostActive(false);
      setActiveAbility(null);
    }, 5000);
  };
  
  const activateLevitation = () => {
    setLevitationActive(true);
    setActiveAbility('levitation');
    
    setTimeout(() => {
      setLevitationActive(false);
      setActiveAbility(null);
    }, 8000);
  };
  
  const activateLightOrb = () => {
    setLightOrbActive(true);
    setActiveAbility('light');
    
    setTimeout(() => {
      setLightOrbActive(false);
      setActiveAbility(null);
    }, 15000);
  };
  
  // Keyboard shortcuts: 1=Fireball, 2=Speed, 3=Levitation, 4=Light
  useFrame(() => {
    if (keyboard['1']) castAbility('fireball');
    if (keyboard['2']) castAbility('speed');
    if (keyboard['3']) castAbility('levitation');
    if (keyboard['4']) castAbility('light');
  });
  
  return (
    <group>
      {/* Render all active projectiles */}
      {projectiles.map(projectile => (
        <Projectile
          key={projectile.id}
          position={projectile.position}
          direction={projectile.direction}
          type={projectile.type}
          onHit={() => {
            setProjectiles(prev => prev.filter(p => p.id !== projectile.id));
          }}
        />
      ))}
      
      {/* Speed boost aura */}
      {speedBoostActive && (
        <group position={playerPosition}>
          <mesh>
            <sphereGeometry args={[2, 32, 32]} />
            <meshBasicMaterial 
              color="#ffff00"
              transparent
              opacity={0.2}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          <Sparkles
            count={50}
            scale={3}
            size={2}
            speed={1}
            opacity={0.8}
            color="#ffff00"
          />
        </group>
      )}
      
      {/* Levitation aura */}
      {levitationActive && (
        <group position={[playerPosition[0], playerPosition[1] - 1, playerPosition[2]]}>
          <mesh>
            <torusGeometry args={[1.5, 0.2, 16, 32]} />
            <meshStandardMaterial 
              color="#00ffff"
              emissive="#00ffff"
              emissiveIntensity={2}
              transparent
              opacity={0.7}
              toneMapped={false}
            />
          </mesh>
          <Sparkles
            count={40}
            scale={[3, 0.5, 3]}
            size={1.5}
            speed={0.5}
            opacity={0.9}
            color="#00ffff"
          />
        </group>
      )}
      
      {/* Light orb */}
      {lightOrbActive && (
        <group position={[playerPosition[0], playerPosition[1] + 3, playerPosition[2]]}>
          <mesh>
            <sphereGeometry args={[0.5, 32, 32]} />
            <meshStandardMaterial 
              color="#ffffff"
              emissive="#ffffff"
              emissiveIntensity={5}
              toneMapped={false}
            />
          </mesh>
          <pointLight 
            color="#ffffff" 
            intensity={15} 
            distance={30} 
          />
          <Sparkles
            count={60}
            scale={2}
            size={1}
            speed={0.3}
            opacity={0.9}
            color="#ffffff"
          />
        </group>
      )}
    </group>
  );
}
