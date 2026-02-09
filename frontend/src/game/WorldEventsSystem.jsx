import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Sparkles } from '@react-three/drei';
import { Box, Chip, Typography, Paper } from '@mui/material';
import * as THREE from 'three';

const WORLD_EVENTS = {
  meteorShower: {
    name: 'Meteor Shower',
    emoji: '☄️',
    duration: 300, // 5 minutes
    chance: 0.05,
    description: 'Stars fall from the sky! Collect Stardust!',
    color: '#fbbf24',
  },
  travelingMerchant: {
    name: 'Traveling Merchant',
    emoji: '🧳',
    duration: 300,
    chance: 0.08,
    description: 'A mysterious merchant has arrived with rare goods!',
    color: '#8b5cf6',
  },
  festival: {
    name: 'Festival Day',
    emoji: '🎉',
    duration: 600, // 10 minutes
    chance: 0.03,
    description: 'The village celebrates! Fireworks and special quests!',
    color: '#ec4899',
  },
  aurora: {
    name: 'Aurora Borealis',
    emoji: '🌌',
    duration: 240,
    chance: 0.06,
    description: 'Northern lights dance! Magic power increased!',
    color: '#10b981',
  },
  rareCreature: {
    name: 'Rare Creature',
    emoji: '🦄',
    duration: 180,
    chance: 0.04,
    description: 'A legendary creature appears!',
    color: '#f59e0b',
  },
  treasureMap: {
    name: 'Treasure Map Found',
    emoji: '🗺️',
    duration: 0, // Instant
    chance: 0.07,
    description: 'You found a treasure map! X marks the spot!',
    color: '#3b82f6',
  },
};

function MeteorShower({ playerPosition, onCollect }) {
  const [meteors, setMeteors] = useState([]);
  const spawnTimer = useRef(0);
  const nextMeteorId = useRef(0);
  
  useFrame((state, delta) => {
    spawnTimer.current += delta;
    
    // Spawn meteors every 2 seconds
    if (spawnTimer.current > 2) {
      spawnTimer.current = 0;
      
      const newMeteor = {
        id: nextMeteorId.current++,
        position: [
          playerPosition[0] + (Math.random() - 0.5) * 40,
          20,
          playerPosition[2] + (Math.random() - 0.5) * 40,
        ],
        velocity: [
          (Math.random() - 0.5) * 0.2,
          -0.5,
          (Math.random() - 0.5) * 0.2,
        ],
      };
      
      setMeteors(prev => [...prev, newMeteor]);
    }
    
    // Update meteor positions
    setMeteors(prev => 
      prev.map(meteor => {
        const newPos = [
          meteor.position[0] + meteor.velocity[0],
          meteor.position[1] + meteor.velocity[1],
          meteor.position[2] + meteor.velocity[2],
        ];
        
        // Hit ground
        if (newPos[1] <= 0) {
          onCollect({ Stardust: 1 });
          return null;
        }
        
        return { ...meteor, position: newPos };
      }).filter(Boolean)
    );
  });
  
  return (
    <>
      {meteors.map(meteor => (
        <group key={meteor.id} position={meteor.position}>
          <mesh>
            <sphereGeometry args={[0.3, 8, 8]} />
            <meshStandardMaterial
              color="#fbbf24"
              emissive="#fbbf24"
              emissiveIntensity={2}
            />
          </mesh>
          <pointLight color="#fbbf24" intensity={8} distance={10} />
          <Sparkles count={15} scale={2} size={2} speed={1} color="#ffd700" />
          
          {/* Trail */}
          {[...Array(5)].map((_, i) => (
            <mesh
              key={i}
              position={[
                -meteor.velocity[0] * i * 0.5,
                -meteor.velocity[1] * i * 0.5,
                -meteor.velocity[2] * i * 0.5,
              ]}
            >
              <sphereGeometry args={[0.2 - i * 0.03, 4, 4]} />
              <meshBasicMaterial
                color="#ff6b35"
                transparent
                opacity={0.6 - i * 0.1}
              />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
}

function TravelingMerchant({ playerPosition, onInteract }) {
  const merchantRef = useRef();
  const merchantPosition = [playerPosition[0] + 10, 0, playerPosition[2] + 10];
  
  useFrame((state) => {
    if (!merchantRef.current) return;
    merchantRef.current.position.y = merchantPosition[1] + Math.sin(state.clock.elapsedTime * 2) * 0.2;
  });
  
  return (
    <group
      ref={merchantRef}
      position={merchantPosition}
      onClick={onInteract}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      {/* Merchant cart */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[2, 1, 1.5]} />
        <meshStandardMaterial color="#8b4513" />
      </mesh>
      
      {/* Canopy */}
      <mesh position={[0, 1.5, 0]}>
        <coneGeometry args={[1.5, 0.5, 4]} />
        <meshStandardMaterial color="#8b5cf6" />
      </mesh>
      
      {/* Merchant */}
      <mesh position={[-1, 1.5, 0]}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial color="#f4a460" />
      </mesh>
      
      <Text
        position={[0, 2.5, 0]}
        fontSize={0.4}
        color="#fff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000"
      >
        🧳 Mysterious Merchant
      </Text>
      
      <Sparkles count={50} scale={4} size={2} speed={0.3} color="#8b5cf6" />
      <pointLight color="#8b5cf6" intensity={5} distance={15} />
    </group>
  );
}

function Festival({ playerPosition }) {
  const fireworksRef = useRef([]);
  const spawnTimer = useRef(0);
  const [fireworks, setFireworks] = useState([]);
  const nextId = useRef(0);
  
  useFrame((state, delta) => {
    spawnTimer.current += delta;
    
    // Spawn fireworks every 3 seconds
    if (spawnTimer.current > 3) {
      spawnTimer.current = 0;
      
      const newFirework = {
        id: nextId.current++,
        position: [
          playerPosition[0] + (Math.random() - 0.5) * 20,
          15 + Math.random() * 5,
          playerPosition[2] + (Math.random() - 0.5) * 20,
        ],
        color: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'][Math.floor(Math.random() * 6)],
        spawnTime: state.clock.elapsedTime,
      };
      
      setFireworks(prev => [...prev.slice(-10), newFirework]);
      
      // Play firework sound
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      
      osc.frequency.value = 800;
      osc.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.5);
      gain.gain.value = 0.1;
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start();
      osc.stop(audioContext.currentTime + 0.5);
    }
  });
  
  return (
    <>
      {fireworks.map(firework => (
        <group key={firework.id} position={firework.position}>
          <Sparkles
            count={100}
            scale={8}
            size={3}
            speed={2}
            opacity={0.8}
            color={firework.color}
          />
          <pointLight color={firework.color} intensity={15} distance={20} />
        </group>
      ))}
    </>
  );
}

function Aurora() {
  const auroraRef = useRef();
  
  useFrame((state) => {
    if (!auroraRef.current) return;
    auroraRef.current.material.uniforms.time.value = state.clock.elapsedTime;
  });
  
  return (
    <mesh position={[0, 20, -30]} scale={[80, 15, 1]}>
      <planeGeometry args={[1, 1, 32, 32]} />
      <shaderMaterial
        ref={auroraRef}
        transparent
        side={THREE.DoubleSide}
        uniforms={{
          time: { value: 0 },
        }}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float time;
          varying vec2 vUv;
          
          void main() {
            vec2 uv = vUv;
            
            // Wave animation
            float wave = sin(uv.x * 10.0 + time) * 0.5 + 0.5;
            float wave2 = sin(uv.x * 7.0 - time * 1.3) * 0.5 + 0.5;
            
            // Colors
            vec3 color1 = vec3(0.0, 1.0, 0.5); // Cyan
            vec3 color2 = vec3(0.5, 0.0, 1.0); // Purple
            vec3 color3 = vec3(0.0, 0.5, 1.0); // Blue
            
            vec3 finalColor = mix(color1, color2, wave);
            finalColor = mix(finalColor, color3, wave2);
            
            // Fade at edges
            float alpha = (1.0 - abs(uv.y - 0.5) * 2.0) * 0.5;
            
            gl_FragColor = vec4(finalColor, alpha);
          }
        `}
      />
    </mesh>
  );
}

function RareCreature({ playerPosition, onCatch, creatureType = 'unicorn' }) {
  const creatureRef = useRef();
  const [caught, setCaught] = useState(false);
  
  const creatures = {
    unicorn: { emoji: '🦄', color: '#fff', size: 1 },
    phoenix: { emoji: '🔥', color: '#ff6b35', size: 0.8 },
    dragon: { emoji: '🐉', color: '#a855f7', size: 1.2 },
  };
  
  const creature = creatures[creatureType];
  const position = [playerPosition[0] + 15, 0, playerPosition[2] + 15];
  
  useFrame((state) => {
    if (!creatureRef.current || caught) return;
    
    // Circle around spawn point
    const angle = state.clock.elapsedTime * 0.5;
    creatureRef.current.position.x = position[0] + Math.cos(angle) * 5;
    creatureRef.current.position.z = position[2] + Math.sin(angle) * 5;
    creatureRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.5 + 1;
    creatureRef.current.rotation.y = angle + Math.PI / 2;
  });
  
  const handleClick = () => {
    if (caught) return;
    
    setCaught(true);
    onCatch(creatureType);
    
    // Play catch sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    [523, 659, 784, 1046, 1318].forEach((freq, i) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      
      osc.frequency.value = freq;
      gain.gain.value = 0.08;
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start(audioContext.currentTime + i * 0.1);
      osc.stop(audioContext.currentTime + i * 0.1 + 0.3);
    });
  };
  
  if (caught) return null;
  
  return (
    <group
      ref={creatureRef}
      position={position}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      <mesh>
        <sphereGeometry args={[creature.size, 16, 16]} />
        <meshStandardMaterial
          color={creature.color}
          emissive={creature.color}
          emissiveIntensity={0.5}
        />
      </mesh>
      
      <Text
        position={[0, creature.size + 1, 0]}
        fontSize={0.8}
        anchorX="center"
        anchorY="middle"
      >
        {creature.emoji}
      </Text>
      
      <Text
        position={[0, creature.size + 1.8, 0]}
        fontSize={0.3}
        color="#fbbf24"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000"
      >
        Click to catch!
      </Text>
      
      <Sparkles count={80} scale={creature.size * 3} size={2} speed={0.5} color={creature.color} />
      <pointLight color={creature.color} intensity={10} distance={15} />
    </group>
  );
}

function TreasureMapMarker({ position, onDig }) {
  const markerRef = useRef();
  const [dug, setDug] = useState(false);
  
  useFrame((state) => {
    if (!markerRef.current || dug) return;
    markerRef.current.rotation.y += 0.02;
    markerRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 3) * 0.2;
  });
  
  const handleDig = () => {
    if (dug) return;
    
    setDug(true);
    onDig({
      Gold: 500 + Math.floor(Math.random() * 500),
      'Rare Gem': 1 + Math.floor(Math.random() * 3),
      'Ancient Artifact': Math.random() > 0.7 ? 1 : 0,
    });
    
    // Play dig sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.frequency.value = 200;
    osc.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.3);
    gain.gain.value = 0.1;
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + 0.3);
  };
  
  if (dug) {
    return (
      <group position={position}>
        <Text
          position={[0, 1, 0]}
          fontSize={0.4}
          color="#10b981"
          anchorX="center"
          anchorY="middle"
        >
          ✓ Treasure Found!
        </Text>
      </group>
    );
  }
  
  return (
    <group
      ref={markerRef}
      position={position}
      onClick={handleDig}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      {/* X Marker */}
      <mesh rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[2, 0.2, 0.2]} />
        <meshStandardMaterial color="#ff0000" />
      </mesh>
      <mesh rotation={[0, 0, -Math.PI / 4]}>
        <boxGeometry args={[2, 0.2, 0.2]} />
        <meshStandardMaterial color="#ff0000" />
      </mesh>
      
      {/* Shovel icon */}
      <Text
        position={[0, 1.5, 0]}
        fontSize={0.5}
        anchorX="center"
        anchorY="middle"
      >
        ⛏️
      </Text>
      
      <Text
        position={[0, 2.2, 0]}
        fontSize={0.3}
        color="#fbbf24"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000"
      >
        Click to dig!
      </Text>
      
      <Sparkles count={50} scale={3} size={2} speed={0.4} color="#fbbf24" />
      <pointLight color="#fbbf24" intensity={8} distance={12} />
    </group>
  );
}

export default function WorldEventsSystem({ 
  playerPosition, 
  onReward,
  isActive 
}) {
  const [activeEvent, setActiveEvent] = useState(null);
  const [eventTimer, setEventTimer] = useState(0);
  const checkTimer = useRef(0);
  const [eventHistory, setEventHistory] = useState([]);
  
  useFrame((state, delta) => {
    if (!isActive) return;
    
    // Check for new events every 5 minutes
    checkTimer.current += delta;
    
    if (checkTimer.current > 300 && !activeEvent) {
      checkTimer.current = 0;
      checkForEvent();
    }
    
    // Update event timer
    if (activeEvent) {
      setEventTimer(prev => {
        const newTime = prev + delta;
        const eventData = WORLD_EVENTS[activeEvent];
        
        if (eventData.duration > 0 && newTime >= eventData.duration) {
          setActiveEvent(null);
          return 0;
        }
        
        return newTime;
      });
    }
  });
  
  const checkForEvent = () => {
    // Random chance for each event
    for (const [eventId, eventData] of Object.entries(WORLD_EVENTS)) {
      // Don't repeat same event
      if (eventHistory.includes(eventId)) continue;
      
      if (Math.random() < eventData.chance) {
        setActiveEvent(eventId);
        setEventTimer(0);
        setEventHistory(prev => [...prev, eventId]);
        
        // Play event start sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        [400, 500, 600, 700, 800].forEach((freq, i) => {
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          
          osc.frequency.value = freq;
          gain.gain.value = 0.08;
          gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
          
          osc.connect(gain);
          gain.connect(audioContext.destination);
          osc.start(audioContext.currentTime + i * 0.08);
          osc.stop(audioContext.currentTime + i * 0.08 + 0.2);
        });
        
        break;
      }
    }
  };
  
  const currentEventData = activeEvent ? WORLD_EVENTS[activeEvent] : null;
  const timeRemaining = currentEventData ? currentEventData.duration - eventTimer : 0;
  
  return (
    <>
      {/* Render active event */}
      {activeEvent === 'meteorShower' && (
        <MeteorShower playerPosition={playerPosition} onCollect={onReward} />
      )}
      
      {activeEvent === 'travelingMerchant' && (
        <TravelingMerchant
          playerPosition={playerPosition}
          onInteract={() => alert('Rare items available! (Shop interface would open here)')}
        />
      )}
      
      {activeEvent === 'festival' && (
        <Festival playerPosition={playerPosition} />
      )}
      
      {activeEvent === 'aurora' && (
        <Aurora />
      )}
      
      {activeEvent === 'rareCreature' && (
        <RareCreature
          playerPosition={playerPosition}
          creatureType={['unicorn', 'phoenix', 'dragon'][Math.floor(Math.random() * 3)]}
          onCatch={(type) => onReward({ [`${type} Pet`]: 1 })}
        />
      )}
      
      {activeEvent === 'treasureMap' && (
        <TreasureMapMarker
          position={[
            playerPosition[0] + (Math.random() - 0.5) * 30,
            0,
            playerPosition[2] + (Math.random() - 0.5) * 30,
          ]}
          onDig={onReward}
        />
      )}
      
      {/* Event notification */}
      {activeEvent && currentEventData && (
        <Box
          sx={{
            position: 'fixed',
            top: 120,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
          }}
        >
          <Paper
            elevation={8}
            sx={{
              background: `linear-gradient(135deg, ${currentEventData.color}40, ${currentEventData.color}20)`,
              backdropFilter: 'blur(10px)',
              border: `3px solid ${currentEventData.color}`,
              borderRadius: '16px',
              padding: '16px 24px',
              minWidth: '300px',
              animation: 'bounce 0.5s ease-out',
            }}
          >
            <Typography
              variant="h6"
              sx={{
                color: '#fff',
                fontWeight: 'bold',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
              }}
            >
              <span style={{ fontSize: '32px' }}>{currentEventData.emoji}</span>
              {currentEventData.name}
            </Typography>
            
            <Typography
              variant="body2"
              sx={{
                color: '#cbd5e1',
                textAlign: 'center',
                mt: 1,
              }}
            >
              {currentEventData.description}
            </Typography>
            
            {currentEventData.duration > 0 && (
              <Chip
                label={`${Math.floor(timeRemaining / 60)}:${String(Math.floor(timeRemaining % 60)).padStart(2, '0')} remaining`}
                size="small"
                sx={{
                  mt: 1,
                  width: '100%',
                  background: currentEventData.color,
                  color: '#fff',
                  fontWeight: 'bold',
                }}
              />
            )}
          </Paper>
        </Box>
      )}
      
      <style>
        {`
          @keyframes bounce {
            0%, 100% { transform: translateX(-50%) translateY(0); }
            50% { transform: translateX(-50%) translateY(-10px); }
          }
        `}
      </style>
    </>
  );
}

export { WORLD_EVENTS };
