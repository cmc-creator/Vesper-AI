import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Box, 
  Typography, 
  Grid, 
  LinearProgress,
  Chip,
  Avatar
} from '@mui/material';
import * as THREE from 'three';

const NPC_DATA = {
  merchant: {
    name: 'Marcus the Merchant',
    emoji: '🧙‍♂️',
    color: '#8b4513',
    size: 0.8,
    position: [45, 0, 45],
    waypoints: [[45, 0, 45], [47, 0, 45], [47, 0, 47], [45, 0, 47]],
    dialogue: {
      greeting: "Welcome, traveler! Care to browse my wares?",
      trade: "I have the finest goods in all the realm!",
      goodbye: "Safe travels, friend!",
    },
    shop: [
      { name: 'Health Potion', price: 50, type: 'potion', emoji: '🧪' },
      { name: 'Iron Sword', price: 200, type: 'weapon', emoji: '⚔️' },
      { name: 'Torch', price: 25, type: 'tool', emoji: '🔦' },
      { name: 'Magic Crystal', price: 500, type: 'material', emoji: '💎' },
    ],
  },
  questGiver: {
    name: 'Elder Sage',
    emoji: '👴',
    color: '#9ca3af',
    size: 0.75,
    position: [40, 0, 50],
    waypoints: [[40, 0, 50]],
    dialogue: {
      greeting: "Ah, you've come. The realm needs heroes like you.",
      quest: "I have tasks that need doing. Will you help?",
      goodbye: "May wisdom guide your path.",
    },
  },
  blacksmith: {
    name: 'Bjorn the Blacksmith',
    emoji: '⚒️',
    color: '#ef4444',
    size: 0.9,
    position: [50, 0, 40],
    waypoints: [[50, 0, 40], [51, 0, 40]],
    dialogue: {
      greeting: "Ho there! Need weapons or armor?",
      upgrade: "Bring me materials and I'll forge you something legendary!",
      goodbye: "Keep your blade sharp!",
    },
    upgrades: [
      { name: 'Iron Sword → Steel Sword', materials: ['Iron Ore x5', 'Coal x3'], price: 100 },
      { name: 'Leather Armor → Chain Mail', materials: ['Iron Ore x10', 'Leather x5'], price: 250 },
    ],
  },
  alchemist: {
    name: 'Luna the Alchemist',
    emoji: '🧪',
    color: '#8b5cf6',
    size: 0.7,
    position: [55, 0, 50],
    waypoints: [[55, 0, 50], [55, 0, 52]],
    dialogue: {
      greeting: "Greetings! Potions and elixirs are my specialty.",
      brew: "Bring me herbs and I'll brew you something wonderful!",
      goodbye: "May magic flow through you!",
    },
    potions: [
      { name: 'Super Health Potion', materials: ['Red Herb x3', 'Crystal x1'], effect: 'Heal 100 HP' },
      { name: 'Speed Potion', materials: ['Yellow Herb x2', 'Feather x1'], effect: '2x Speed for 60s' },
      { name: 'Strength Potion', materials: ['Orange Herb x2', 'Monster Bone x1'], effect: '2x Attack for 60s' },
    ],
  },
  romantic: {
    name: 'Aurora',
    emoji: '💖',
    color: '#ec4899',
    size: 0.7,
    position: [42, 0, 42],
    waypoints: [[42, 0, 42], [43, 0, 43], [42, 0, 44]],
    dialogue: {
      greeting: "Oh, hello! *blushes* I didn't expect to see you here...",
      gift: "You're so kind! I love flowers and shiny things...",
      romance: "You make my heart flutter... 💕",
      goodbye: "I hope we meet again soon!",
    },
    favoriteGifts: ['Flower', 'Diamond', 'Rainbow Crystal', 'Love Potion'],
  },
  guard: {
    name: 'Sir Roland',
    emoji: '🛡️',
    color: '#3b82f6',
    size: 0.85,
    position: [48, 0, 48],
    waypoints: [[48, 0, 48], [48, 0, 50], [50, 0, 50], [50, 0, 48]],
    dialogue: {
      greeting: "Halt! State your business... oh, it's you. Welcome back.",
      duty: "I protect this village with my life!",
      goodbye: "Stay vigilant out there!",
    },
  },
};

function NPC({ npcId, data, onInteract, dayTime }) {
  const npcRef = useRef();
  const [waypointIndex, setWaypointIndex] = useState(0);
  const [isMoving, setIsMoving] = useState(true);
  
  const currentWaypoint = data.waypoints[waypointIndex];
  
  useFrame((state, delta) => {
    if (!npcRef.current || data.waypoints.length === 1) return;
    
    const target = new THREE.Vector3(...currentWaypoint);
    const current = npcRef.current.position.clone();
    const direction = target.sub(current);
    const distance = direction.length();
    
    if (distance < 0.1) {
      setWaypointIndex((waypointIndex + 1) % data.waypoints.length);
      setIsMoving(false);
    } else {
      direction.normalize();
      npcRef.current.position.x += direction.x * 0.5 * delta;
      npcRef.current.position.z += direction.z * 0.5 * delta;
      npcRef.current.rotation.y = Math.atan2(direction.x, direction.z);
      setIsMoving(true);
    }
    
    // Bobbing animation
    npcRef.current.position.y = data.position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1;
  });
  
  // NPCs rest at night
  const isResting = dayTime > 0.75 || dayTime < 0.25;
  
  return (
    <group
      ref={npcRef}
      position={data.position}
      onClick={() => onInteract(npcId)}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      {/* NPC body */}
      <mesh castShadow>
        <sphereGeometry args={[data.size, 16, 16]} />
        <meshStandardMaterial
          color={data.color}
          roughness={0.6}
          metalness={0.3}
        />
      </mesh>
      
      {/* Eyes */}
      <mesh position={[data.size * 0.3, data.size * 0.3, data.size * 0.7]}>
        <sphereGeometry args={[data.size * 0.15, 8, 8]} />
        <meshStandardMaterial color="#000" />
      </mesh>
      <mesh position={[-data.size * 0.3, data.size * 0.3, data.size * 0.7]}>
        <sphereGeometry args={[data.size * 0.15, 8, 8]} />
        <meshStandardMaterial color="#000" />
      </mesh>
      
      {/* Name tag */}
      <Text
        position={[0, data.size + 0.8, 0]}
        fontSize={0.25}
        color="#fff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000"
      >
        {data.emoji} {data.name}
      </Text>
      
      {/* Sleeping indicator */}
      {isResting && (
        <Text
          position={[0, data.size + 1.2, 0]}
          fontSize={0.3}
          color="#fff"
          anchorX="center"
          anchorY="middle"
        >
          💤
        </Text>
      )}
      
      {/* Click indicator */}
      {!isResting && (
        <mesh position={[0, data.size + 1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.4, 16]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  );
}

function VillageBuilding({ position, type, size = [3, 2, 3] }) {
  return (
    <group position={position}>
      {/* Main building */}
      <mesh castShadow position={[0, size[1] / 2, 0]}>
        <boxGeometry args={size} />
        <meshStandardMaterial color="#d4a574" />
      </mesh>
      
      {/* Roof */}
      <mesh position={[0, size[1] + 0.5, 0]}>
        <coneGeometry args={[size[0] * 0.7, 1, 4]} />
        <meshStandardMaterial color="#8b4513" />
      </mesh>
      
      {/* Door */}
      <mesh position={[0, size[1] / 2 - 0.3, size[2] / 2 + 0.01]}>
        <boxGeometry args={[0.6, 1, 0.1]} />
        <meshStandardMaterial color="#4a2511" />
      </mesh>
      
      {/* Windows */}
      <mesh position={[size[0] / 3, size[1] / 2, size[2] / 2 + 0.01]}>
        <boxGeometry args={[0.4, 0.4, 0.05]} />
        <meshStandardMaterial color="#87ceeb" emissive="#ffd700" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[-size[0] / 3, size[1] / 2, size[2] / 2 + 0.01]}>
        <boxGeometry args={[0.4, 0.4, 0.05]} />
        <meshStandardMaterial color="#87ceeb" emissive="#ffd700" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

export default function NPCVillage({ playerPosition, dayTime, playerGold, onTrade, onGift }) {
  const [activeNPC, setActiveNPC] = useState(null);
  const [dialogueStep, setDialogueStep] = useState(0);
  const [relationships, setRelationships] = useState(() => {
    const saved = localStorage.getItem('npc_relationships');
    return saved ? JSON.parse(saved) : {
      merchant: 0,
      questGiver: 0,
      blacksmith: 0,
      alchemist: 0,
      romantic: 0,
      guard: 0,
    };
  });
  
  useEffect(() => {
    localStorage.setItem('npc_relationships', JSON.stringify(relationships));
  }, [relationships]);
  
  const handleInteract = (npcId) => {
    const npc = NPC_DATA[npcId];
    const isResting = dayTime > 0.75 || dayTime < 0.25;
    
    if (isResting) {
      alert(`${npc.name} is sleeping! Come back during the day.`);
      return;
    }
    
    setActiveNPC(npcId);
    setDialogueStep(0);
    
    // Play interaction sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.frequency.value = 600;
    gain.gain.value = 0.1;
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + 0.2);
  };
  
  const handleGift = (npcId, gift) => {
    const npc = NPC_DATA[npcId];
    
    if (npc.favoriteGifts && npc.favoriteGifts.includes(gift)) {
      setRelationships(prev => ({
        ...prev,
        [npcId]: Math.min(100, prev[npcId] + 20),
      }));
      
      if (onGift) onGift(npcId, gift);
      
      alert(`${npc.name} loves it! +20 relationship ❤️`);
    } else {
      setRelationships(prev => ({
        ...prev,
        [npcId]: Math.min(100, prev[npcId] + 5),
      }));
      
      alert(`${npc.name} thanks you! +5 relationship`);
    }
  };
  
  const currentNPC = activeNPC ? NPC_DATA[activeNPC] : null;
  const relationship = activeNPC ? relationships[activeNPC] : 0;
  
  return (
    <>
      {/* Village Buildings */}
      <VillageBuilding position={[45, 0, 45]} type="merchant" />
      <VillageBuilding position={[40, 0, 50]} type="elder" size={[3.5, 2.5, 3.5]} />
      <VillageBuilding position={[50, 0, 40]} type="blacksmith" size={[4, 2, 3]} />
      <VillageBuilding position={[55, 0, 50]} type="alchemist" size={[2.5, 2, 2.5]} />
      <VillageBuilding position={[42, 0, 42]} type="house" size={[3, 2, 3]} />
      <VillageBuilding position={[50, 0, 50]} type="guardTower" size={[2, 3, 2]} />
      
      {/* Central Plaza */}
      <mesh position={[47, 0.05, 47]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[8, 32]} />
        <meshStandardMaterial color="#c4b5a0" />
      </mesh>
      
      {/* Fountain */}
      <group position={[47, 0, 47]}>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[1, 1.2, 1, 16]} />
          <meshStandardMaterial color="#87ceeb" />
        </mesh>
        <mesh position={[0, 1.2, 0]}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial color="#87ceeb" />
        </mesh>
        <pointLight color="#87ceeb" intensity={2} distance={10} />
      </group>
      
      {/* NPCs */}
      {Object.entries(NPC_DATA).map(([id, data]) => (
        <NPC
          key={id}
          npcId={id}
          data={data}
          onInteract={handleInteract}
          dayTime={dayTime}
        />
      ))}
      
      {/* Dialogue UI */}
      <Dialog
        open={!!activeNPC}
        onClose={() => setActiveNPC(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
            border: '2px solid #fbbf24',
            borderRadius: '16px',
          },
        }}
      >
        {current NPC && (
          <>
            <DialogTitle sx={{ borderBottom: '1px solid #fbbf24', pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ width: 60, height: 60, fontSize: '32px', background: currentNPC.color }}>
                  {currentNPC.emoji}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ color: '#fff', fontWeight: 'bold' }}>
                    {currentNPC.name}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" sx={{ color: '#cbd5e1', display: 'block', mb: 0.5 }}>
                      Relationship: {relationship}/100 ❤️
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={relationship}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        background: 'rgba(255, 255, 255, 0.1)',
                        '& .MuiLinearProgress-bar': {
                          background: 'linear-gradient(90deg, #ec4899, #f43f5e)',
                        },
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            </DialogTitle>
            
            <DialogContent sx={{ mt: 2 }}>
              <Typography sx={{ color: '#fff', fontSize: '16px', mb: 2 }}>
                {dialogueStep === 0 && currentNPC.dialogue.greeting}
                {dialogueStep === 1 && (currentNPC.dialogue.trade || currentNPC.dialogue.quest || currentNPC.dialogue.upgrade || currentNPC.dialogue.brew || currentNPC.dialogue.gift || currentNPC.dialogue.duty)}
                {dialogueStep === 2 && relationship > 50 && currentNPC.dialogue.romance}
              </Typography>
              
              {/* Merchant Shop */}
              {activeNPC === 'merchant' && dialogueStep === 1 && (
                <Grid container spacing={2}>
                  {currentNPC.shop.map((item, i) => (
                    <Grid item xs={6} key={i}>
                      <Box
                        sx={{
                          p: 2,
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          cursor: 'pointer',
                          '&:hover': { background: 'rgba(255, 255, 255, 0.1)' },
                        }}
                        onClick={() => {
                          if (playerGold >= item.price) {
                            if (onTrade) onTrade('buy', item);
                            alert(`Purchased ${item.name} for ${item.price} gold!`);
                          } else {
                            alert('Not enough gold!');
                          }
                        }}
                      >
                        <Typography sx={{ fontSize: '24px', textAlign: 'center' }}>{item.emoji}</Typography>
                        <Typography sx={{ color: '#fff', fontSize: '14px', textAlign: 'center', mt: 1 }}>
                          {item.name}
                        </Typography>
                        <Chip label={`${item.price} 🪙`} size="small" sx={{ mt: 1, width: '100%' }} />
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              )}
              
              {/* Romantic Interest */}
              {activeNPC === 'romantic' && relationship >= 50 && dialogueStep === 2 && (
                <Typography sx={{ color: '#ec4899', fontStyle: 'italic', fontSize: '14px' }}>
                  "Every moment with you is precious..." 💕✨
                </Typography>
              )}
            </DialogContent>
            
            <DialogActions sx={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', p: 2 }}>
              {dialogueStep < (relationship > 50 && currentNPC.dialogue.romance ? 2 : 1) && (
                <Button
                  onClick={() => setDialogueStep(dialogueStep + 1)}
                  variant="contained"
                  sx={{ background: 'linear-gradient(90deg, #fbbf24, #f59e0b)' }}
                >
                  Continue
                </Button>
              )}
              
              {activeNPC === 'romantic' && (
                <Button
                  onClick={() => {
                    // Gift interface would open here
                    alert('Gift system - select an item from your inventory to give!');
                  }}
                  variant="outlined"
                  sx={{ borderColor: '#ec4899', color: '#ec4899' }}
                >
                  🎁 Give Gift
                </Button>
              )}
              
              <Button onClick={() => setActiveNPC(null)} variant="outlined">
                Goodbye
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
}
