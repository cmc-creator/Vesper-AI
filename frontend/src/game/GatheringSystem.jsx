import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles, Text } from '@react-three/drei';
import { Box, LinearProgress, Typography, Paper } from '@mui/material';
import * as THREE from 'three';

const RESOURCE_NODES = {
  tree: {
    name: 'Tree',
    emoji: '🌳',
    color: '#228B22',
    size: [0.5, 3, 0.5],
    resources: ['Wood', 'Ancient Wood'],
    yields: { Wood: [2, 5], 'Ancient Wood': [0, 1] },
    tool: 'axe',
    gatherTime: 3,
  },
  rock: {
    name: 'Rock',
    emoji: '🪨',
    color: '#808080',
    size: [1, 1, 1],
    resources: ['Stone', 'Iron Ore', 'Coal'],
    yields: { Stone: [3, 6], 'Iron Ore': [1, 3], Coal: [0, 2] },
    tool: 'pickaxe',
    gatherTime: 3,
  },
  herb: {
    name: 'Herb',
    emoji: '🌿',
    color: '#10b981',
    size: [0.3, 0.5, 0.3],
    resources: ['Red Herb', 'Yellow Herb', 'Orange Herb', 'Green Herb'],
    yields: { 'Red Herb': [1, 2], 'Yellow Herb': [1, 2], 'Orange Herb': [1, 2], 'Green Herb': [1, 2] },
    tool: null,
    gatherTime: 2,
  },
  crystal: {
    name: 'Crystal',
    emoji: '💎',
    color: '#8b5cf6',
    size: [0.6, 1.2, 0.6],
    resources: ['Magic Crystal', 'Mythril', 'Diamond'],
    yields: { 'Magic Crystal': [1, 2], Mythril: [0, 1], Diamond: [0, 1] },
    tool: 'pickaxe',
    gatherTime: 4,
  },
  flower: {
    name: 'Flower',
    emoji: '🌸',
    color: '#ec4899',
    size: [0.2, 0.4, 0.2],
    resources: ['Flower', 'Petal', 'Nectar'],
    yields: { Flower: [1, 1], Petal: [2, 4], Nectar: [1, 2] },
    tool: null,
    gatherTime: 1,
  },
};

function ResourceNode({ 
  id, 
  type, 
  position, 
  onGather, 
  playerPosition,
  playerTool 
}) {
  const nodeRef = useRef();
  const [health, setHealth] = useState(100);
  const [isGathering, setIsGathering] = useState(false);
  const [gatherProgress, setGatherProgress] = useState(0);
  const [respawnTimer, setRespawnTimer] = useState(0);
  
  const nodeData = RESOURCE_NODES[type];
  const isDepleted = health <= 0;
  
  useFrame((state, delta) => {
    if (!nodeRef.current) return;
    
    // Respawn after 60 seconds
    if (isDepleted) {
      setRespawnTimer(prev => {
        const newTime = prev + delta;
        if (newTime >= 60) {
          setHealth(100);
          setGatherProgress(0);
          setIsGathering(false);
          return 0;
        }
        return newTime;
      });
      return;
    }
    
    // Check distance to player
    const dx = playerPosition[0] - position[0];
    const dz = playerPosition[2] - position[2];
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    // Auto-gather when close
    if (distance < 2 && !isGathering) {
      // Check if player has required tool
      if (nodeData.tool && (!playerTool || !playerTool.includes(nodeData.tool))) {
        return;
      }
      
      setIsGathering(true);
    } else if (distance >= 2) {
      setIsGathering(false);
      setGatherProgress(0);
    }
    
    // Gathering progress
    if (isGathering) {
      setGatherProgress(prev => {
        const newProgress = prev + (delta / nodeData.gatherTime) * 100;
        
        if (newProgress >= 100) {
          // Gather complete!
          const resources = {};
          
          Object.entries(nodeData.yields).forEach(([resource, [min, max]]) => {
            const amount = Math.floor(Math.random() * (max - min + 1)) + min;
            if (amount > 0) {
              resources[resource] = amount;
            }
          });
          
          onGather(resources);
          setHealth(0); // Deplete node
          setIsGathering(false);
          
          // Play gather sound
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          [400, 500, 600].forEach((freq, i) => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            
            osc.frequency.value = freq;
            gain.gain.value = 0.08;
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.start(audioContext.currentTime + i * 0.1);
            osc.stop(audioContext.currentTime + i * 0.1 + 0.2);
          });
          
          return 0;
        }
        
        return newProgress;
      });
    }
    
    // Bobbing animation for alive nodes
    if (!isDepleted) {
      nodeRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.05;
    }
  });
  
  if (isDepleted) {
    return (
      <group position={position}>
        <Text
          position={[0, 2, 0]}
          fontSize={0.3}
          color="#cbd5e1"
          anchorX="center"
          anchorY="middle"
        >
          Respawning: {Math.floor(60 - respawnTimer)}s
        </Text>
      </group>
    );
  }
  
  return (
    <group 
      ref={nodeRef} 
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      {/* Node visual */}
      {type === 'tree' && (
        <>
          {/* Trunk */}
          <mesh position={[0, nodeData.size[1] / 2, 0]}>
            <cylinderGeometry args={nodeData.size} />
            <meshStandardMaterial color="#8b4513" />
          </mesh>
          {/* Leaves */}
          <mesh position={[0, nodeData.size[1] + 0.8, 0]}>
            <sphereGeometry args={[1.2, 8, 8]} />
            <meshStandardMaterial color={nodeData.color} />
          </mesh>
        </>
      )}
      
      {type === 'rock' && (
        <mesh>
          <dodecahedronGeometry args={[nodeData.size[0], 0]} />
          <meshStandardMaterial 
            color={nodeData.color}
            roughness={0.8}
            metalness={0.2}
          />
        </mesh>
      )}
      
      {type === 'herb' && (
        <>
          {/* Stem */}
          <mesh position={[0, nodeData.size[1] / 2, 0]}>
            <cylinderGeometry args={[0.02, 0.02, nodeData.size[1], 4]} />
            <meshStandardMaterial color="#228B22" />
          </mesh>
          {/* Leaves */}
          {[0, 1, 2].map(i => (
            <mesh key={i} position={[Math.cos(i * 2) * 0.2, nodeData.size[1] * 0.7, Math.sin(i * 2) * 0.2]}>
              <boxGeometry args={[0.3, 0.1, 0.15]} />
              <meshStandardMaterial color={nodeData.color} />
            </mesh>
          ))}
        </>
      )}
      
      {type === 'crystal' && (
        <mesh>
          <octahedronGeometry args={[nodeData.size[0], 0]} />
          <meshStandardMaterial
            color={nodeData.color}
            emissive={nodeData.color}
            emissiveIntensity={0.5}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      )}
      
      {type === 'flower' && (
        <>
          {/* Stem */}
          <mesh position={[0, nodeData.size[1] / 2, 0]}>
            <cylinderGeometry args={[0.02, 0.02, nodeData.size[1], 4]} />
            <meshStandardMaterial color="#228B22" />
          </mesh>
          {/* Petals */}
          {[0, 1, 2, 3, 4].map(i => {
            const angle = (i / 5) * Math.PI * 2;
            return (
              <mesh 
                key={i} 
                position={[
                  Math.cos(angle) * 0.15,
                  nodeData.size[1],
                  Math.sin(angle) * 0.15
                ]}
              >
                <circleGeometry args={[0.1, 8]} />
                <meshStandardMaterial color={nodeData.color} side={THREE.DoubleSide} />
              </mesh>
            );
          })}
          {/* Center */}
          <mesh position={[0, nodeData.size[1], 0]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial color="#fbbf24" />
          </mesh>
        </>
      )}
      
      {/* Sparkles */}
      <Sparkles
        count={20}
        scale={2}
        size={1}
        speed={0.3}
        opacity={0.6}
        color={nodeData.color}
      />
      
      {/* Name label */}
      <Text
        position={[0, (type === 'tree' ? 4 : 1.5), 0]}
        fontSize={0.3}
        color="#fff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000"
      >
        {nodeData.emoji} {nodeData.name}
      </Text>
      
      {/* Tool requirement */}
      {nodeData.tool && (
        <Text
          position={[0, (type === 'tree' ? 3.5 : 1), 0]}
          fontSize={0.2}
          color="#fbbf24"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.03}
          outlineColor="#000"
        >
          Requires: {nodeData.tool}
        </Text>
      )}
      
      {/* Gather progress */}
      {isGathering && (
        <group position={[0, -0.5, 0]}>
          <mesh>
            <planeGeometry args={[1.5, 0.2]} />
            <meshBasicMaterial color="#000" transparent opacity={0.7} />
          </mesh>
          <mesh position={[-(1 - gatherProgress / 100) * 0.75, 0, 0.01]} scale={[gatherProgress / 100, 1, 1]}>
            <planeGeometry args={[1.5, 0.15]} />
            <meshBasicMaterial color="#10b981" />
          </mesh>
        </group>
      )}
    </group>
  );
}

export default function GatheringSystem({ 
  playerPosition, 
  playerTool,
  onGatherResources,
  isActive 
}) {
  const [nodes, setNodes] = useState(() => {
    // Generate resource nodes around the map
    const generated = [];
    let nextId = 0;
    
    // Trees (20)
    for (let i = 0; i < 20; i++) {
      generated.push({
        id: nextId++,
        type: 'tree',
        position: [
          Math.random() * 80 - 40,
          0,
          Math.random() * 80 - 40,
        ],
      });
    }
    
    // Rocks (15)
    for (let i = 0; i < 15; i++) {
      generated.push({
        id: nextId++,
        type: 'rock',
        position: [
          Math.random() * 80 - 40,
          0,
          Math.random() * 80 - 40,
        ],
      });
    }
    
    // Herbs (25)
    for (let i = 0; i < 25; i++) {
      generated.push({
        id: nextId++,
        type: 'herb',
        position: [
          Math.random() * 80 - 40,
          0,
          Math.random() * 80 - 40,
        ],
      });
    }
    
    // Crystals (8)
    for (let i = 0; i < 8; i++) {
      generated.push({
        id: nextId++,
        type: 'crystal',
        position: [
          Math.random() * 80 - 40,
          0,
          Math.random() * 80 - 40,
        ],
      });
    }
    
    // Flowers (30)
    for (let i = 0; i < 30; i++) {
      generated.push({
        id: nextId++,
        type: 'flower',
        position: [
          Math.random() * 80 - 40,
          0,
          Math.random() * 80 - 40,
        ],
      });
    }
    
    return generated;
  });
  
  const [recentGathers, setRecentGathers] = useState([]);
  
  const handleGather = (resources) => {
    // Add to recent gathers display
    const entries = Object.entries(resources).map(([name, amount]) => `+${amount} ${name}`);
    setRecentGathers(prev => [...prev.slice(-3), ...entries]);
    
    setTimeout(() => {
      setRecentGathers(prev => prev.slice(entries.length));
    }, 3000);
    
    if (onGatherResources) {
      onGatherResources(resources);
    }
  };
  
  if (!isActive) return null;
  
  return (
    <>
      {/* Render resource nodes */}
      {nodes.map(node => (
        <ResourceNode
          key={node.id}
          id={node.id}
          type={node.type}
          position={node.position}
          playerPosition={playerPosition}
          playerTool={playerTool}
          onGather={handleGather}
        />
      ))}
      
      {/* Gather notifications */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 140,
          right: 20,
          zIndex: 9999,
          pointerEvents: 'none',
        }}
      >
        {recentGathers.map((text, i) => (
          <Paper
            key={i}
            elevation={6}
            sx={{
              background: 'rgba(16, 185, 129, 0.9)',
              backdropFilter: 'blur(10px)',
              borderRadius: '8px',
              padding: '8px 12px',
              mb: 1,
              animation: 'slideInRight 0.3s ease-out',
            }}
          >
            <Typography sx={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>
              📦 {text}
            </Typography>
          </Paper>
        ))}
      </Box>
      
      <style>
        {`
          @keyframes slideInRight {
            from {
              transform: translateX(100px);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}
      </style>
    </>
  );
}

export { RESOURCE_NODES };
