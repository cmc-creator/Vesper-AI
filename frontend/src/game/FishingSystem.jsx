import React, { useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Sparkles } from '@react-three/drei';
import { Box, Paper, LinearProgress, Typography, Button } from '@mui/material';
import * as THREE from 'three';

const FISH_SPECIES = [
  { id: 'minnow', name: 'Minnow', rarity: 'common', weight: '0.1-0.3', emoji: '🐟', chance: 40 },
  { id: 'trout', name: 'Rainbow Trout', rarity: 'common', weight: '1-3', emoji: '🐠', chance: 30 },
  { id: 'bass', name: 'Largemouth Bass', rarity: 'uncommon', weight: '2-5', emoji: '🐟', chance: 15 },
  { id: 'salmon', name: 'Golden Salmon', rarity: 'uncommon', weight: '4-8', emoji: '🐠', chance: 10 },
  { id: 'koi', name: 'Mystic Koi', rarity: 'rare', weight: '3-6', emoji: '🎏', chance: 3 },
  { id: 'angel', name: 'Angelfish', rarity: 'rare', weight: '1-2', emoji: '🐠', chance: 1.5 },
  { id: 'dragon', name: 'Dragon Fish', rarity: 'epic', weight: '10-15', emoji: '🐉', chance: 0.4 },
  { id: 'phoenix', name: 'Phoenix Fish', rarity: 'legendary', weight: '15-20', emoji: '🔥', chance: 0.1 },
];

const RARITY_COLORS = {
  common: '#9ca3af',
  uncommon: '#10b981',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
};

function FishingMinigame({ onCatch, onFail, onClose }) {
  const [progress, setProgress] = useState(0);
  const [barPosition, setBarPosition] = useState(50);
  const [fishPosition, setFishPosition] = useState(50);
  const [isActive, setIsActive] = useState(true);
  const timerRef = useRef(0);
  
  const barSize = 15;
  const catchZoneMin = fishPosition - barSize / 2;
  const catchZoneMax = fishPosition + barSize / 2;
  
  useFrame((state, delta) => {
    if (!isActive) return;
    
    timerRef.current += delta;
    
    // Move fish randomly
    if (Math.random() < 0.02) {
      setFishPosition(Math.random() * 100);
    }
    
    // Check if bar is in catch zone
    if (barPosition >= catchZoneMin && barPosition <= catchZoneMax) {
      setProgress(prev => {
        const newProgress = Math.min(100, prev + delta * 30);
        if (newProgress >= 100) {
          setIsActive(false);
          setTimeout(() => onCatch(), 100);
        }
        return newProgress;
      });
    } else {
      setProgress(prev => {
        const newProgress = Math.max(0, prev - delta * 20);
        return newProgress;
      });
    }
    
    // Timeout after 15 seconds
    if (timerRef.current > 15) {
      setIsActive(false);
      onFail();
    }
  });
  
  const handleClick = () => {
    setBarPosition(prev => Math.min(100, prev + 20));
  };
  
  React.useEffect(() => {
    const handleSpace = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleClick();
      }
    };
    window.addEventListener('keydown', handleSpace);
    return () => window.removeEventListener('keydown', handleSpace);
  }, []);
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      setBarPosition(prev => Math.max(0, prev - 2));
    }, 50);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <Box
      onClick={handleClick}
      sx={{
        position: 'fixed',
        bottom: 100,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '400px',
        zIndex: 10000,
      }}
    >
      <Paper
        elevation={10}
        sx={{
          background: 'linear-gradient(135deg, rgba(0, 100, 200, 0.95), rgba(0, 150, 255, 0.95))',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          padding: '20px',
          border: '2px solid rgba(0, 255, 255, 0.5)',
          boxShadow: '0 0 40px rgba(0, 200, 255, 0.6)',
        }}
      >
        <Typography variant="h6" sx={{ color: '#fff', textAlign: 'center', mb: 2 }}>
          🎣 Fishing!
        </Typography>
        
        {/* Progress bar */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ color: '#fff' }}>
            Catch Progress
          </Typography>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 10,
              borderRadius: 5,
              background: 'rgba(255, 255, 255, 0.2)',
              '& .MuiLinearProgress-bar': {
                background: 'linear-gradient(90deg, #10b981, #059669)',
              },
            }}
          />
        </Box>
        
        {/* Fishing bar */}
        <Box
          sx={{
            position: 'relative',
            height: 80,
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '2px solid rgba(255, 255, 255, 0.3)',
          }}
        >
          {/* Fish target zone */}
          <Box
            sx={{
              position: 'absolute',
              left: `${fishPosition}%`,
              transform: 'translateX(-50%)',
              width: `${barSize}%`,
              height: '100%',
              background: 'rgba(255, 215, 0, 0.3)',
              border: '2px solid #ffd700',
            }}
          />
          
          {/* Player bar */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '100%',
              height: `${barPosition}%`,
              background: 'linear-gradient(180deg, rgba(0, 255, 255, 0.6), rgba(0, 200, 255, 0.8))',
              transition: 'height 0.05s',
            }}
          />
          
          {/* Fish indicator */}
          <Typography
            sx={{
              position: 'absolute',
              left: `${fishPosition}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '32px',
            }}
          >
            🐠
          </Typography>
        </Box>
        
        <Typography variant="caption" sx={{ color: '#fff', display: 'block', textAlign: 'center', mt: 2 }}>
          Click or press SPACE to reel! Keep bar in the golden zone!
        </Typography>
        
        <Button
          onClick={onClose}
          size="small"
          sx={{ mt: 1, color: '#fff', width: '100%' }}
        >
          Cancel
        </Button>
      </Paper>
    </Box>
  );
}

function FishingRod({ position, isActive, onCast }) {
  const rodRef = useRef();
  const lineRef = useRef();
  
  useFrame((state) => {
    if (!rodRef.current) return;
    
    const time = state.clock.elapsedTime;
    
    if (isActive) {
      rodRef.current.rotation.x = Math.sin(time * 2) * 0.1 - 0.3;
    }
  });
  
  if (!isActive) return null;
  
  return (
    <group position={position}>
      {/* Rod */}
      <mesh ref={rodRef} rotation={[-Math.PI / 6, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.05, 2, 8]} />
        <meshStandardMaterial color="#8b4513" />
      </mesh>
      
      {/* Line */}
      <mesh ref={lineRef} position={[0, 0.5, 1]}>
        <cylinderGeometry args={[0.01, 0.01, 2, 4]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.6} />
      </mesh>
      
      {/* Bobber */}
      <mesh position={[0, -0.5, 2]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#ff0000" />
      </mesh>
      
      <Sparkles
        count={10}
        scale={2}
        position={[0, -0.5, 2]}
        size={0.5}
        speed={0.2}
        color="#00bfff"
      />
    </group>
  );
}

export default function FishingSystem({ 
  playerPosition, 
  isActive, 
  onCatch, 
  onToggle,
  inventory,
  onAddToInventory 
}) {
  const [isFishing, setIsFishing] = useState(false);
  const [showMinigame, setShowMinigame] = useState(false);
  const [lastCatch, setLastCatch] = useState(null);
  
  const startFishing = () => {
    if (!isActive) return;
    
    setIsFishing(true);
    
    // Random delay before fish bites (2-5 seconds)
    const delay = 2000 + Math.random() * 3000;
    setTimeout(() => {
      if (isFishing) {
        setShowMinigame(true);
        // Play bite sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        osc.frequency.value = 400;
        osc.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.2);
        gain.gain.value = 0.15;
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.start();
        osc.stop(audioContext.currentTime + 0.2);
      }
    }, delay);
  };
  
  const handleCatch = () => {
    // Determine which fish was caught
    const roll = Math.random() * 100;
    let cumulative = 0;
    let caughtFish = FISH_SPECIES[0];
    
    for (const fish of FISH_SPECIES) {
      cumulative += fish.chance;
      if (roll <= cumulative) {
        caughtFish = fish;
        break;
      }
    }
    
    const weight = (
      parseFloat(caughtFish.weight.split('-')[0]) +
      Math.random() * (parseFloat(caughtFish.weight.split('-')[1]) - parseFloat(caughtFish.weight.split('-')[0]))
    ).toFixed(1);
    
    setLastCatch({ ...caughtFish, weight });
    setShowMinigame(false);
    setIsFishing(false);
    
    // Add to inventory
    if (onAddToInventory) {
      onAddToInventory({
        id: `fish_${Date.now()}`,
        name: caughtFish.name,
        type: 'food',
        rarity: caughtFish.rarity,
        description: `A ${caughtFish.rarity} fish weighing ${weight} lbs`,
        weight: parseFloat(weight) * 0.1,
        stackable: true,
        quantity: 1,
      });
    }
    
    if (onCatch) {
      onCatch(caughtFish);
    }
    
    // Play success sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    [523, 659, 784, 1046].forEach((freq, i) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      
      osc.frequency.value = freq;
      gain.gain.value = 0.1;
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1 * (i + 1) + 0.2);
      
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start(audioContext.currentTime + 0.1 * i);
      osc.stop(audioContext.currentTime + 0.1 * (i + 1) + 0.2);
    });
    
    // Clear catch notification after 3 seconds
    setTimeout(() => setLastCatch(null), 3000);
  };
  
  const handleFail = () => {
    setShowMinigame(false);
    setIsFishing(false);
    
    // Play fail sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.frequency.value = 200;
    osc.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.3);
    gain.gain.value = 0.15;
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + 0.3);
  };
  
  React.useEffect(() => {
    if (isActive && !isFishing && !showMinigame) {
      startFishing();
    }
  }, [isActive]);
  
  return (
    <>
      {/* Fishing rod in world */}
      <FishingRod 
        position={playerPosition} 
        isActive={isActive}
        onCast={startFishing}
      />
      
      {/* Fishing minigame UI */}
      {showMinigame && (
        <FishingMinigame
          onCatch={handleCatch}
          onFail={handleFail}
          onClose={() => {
            setShowMinigame(false);
            setIsFishing(false);
          }}
        />
      )}
      
      {/* Catch notification */}
      {lastCatch && (
        <Box
          sx={{
            position: 'fixed',
            top: 100,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10001,
          }}
        >
          <Paper
            elevation={10}
            sx={{
              background: `linear-gradient(135deg, ${RARITY_COLORS[lastCatch.rarity]}40, ${RARITY_COLORS[lastCatch.rarity]}80)`,
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              padding: '20px 40px',
              border: `2px solid ${RARITY_COLORS[lastCatch.rarity]}`,
              boxShadow: `0 0 40px ${RARITY_COLORS[lastCatch.rarity]}`,
              animation: 'slideDown 0.3s ease-out',
            }}
          >
            <Typography variant="h5" sx={{ color: '#fff', textAlign: 'center', fontWeight: 'bold' }}>
              🎣 {lastCatch.emoji} Caught!
            </Typography>
            <Typography variant="h6" sx={{ color: RARITY_COLORS[lastCatch.rarity], textAlign: 'center' }}>
              {lastCatch.name}
            </Typography>
            <Typography variant="body2" sx={{ color: '#fff', textAlign: 'center' }}>
              {lastCatch.weight} lbs • {lastCatch.rarity}
            </Typography>
          </Paper>
        </Box>
      )}
    </>
  );
}
