import React, { useState, useEffect, Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { 
  Sky, 
  Stars, 
  OrbitControls, 
  PerspectiveCamera,
  Environment,
  ContactShadows,
  Cloud,
  Sparkles,
  Float,
  MeshReflectorMaterial,
  PerformanceMonitor
} from '@react-three/drei';
import { 
  EffectComposer, 
  Bloom, 
  DepthOfField, 
  SSAO,
  Vignette,
  ChromaticAberration,
  ToneMapping,
  GodRays,
  SMAA,
  Noise,
  LUT
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import Character from './Character';
import Terrain from './Terrain';
import Castle from './Castle';
import Weather from './Weather';
import GameUI from './GameUI';
import VesperNPC from './VesperNPC';
import Horses from './Horses';
import Grass from './Grass';
import Butterflies from './Butterflies';
import AmbientSounds from './AmbientSounds';
import TreasureChests from './TreasureChests';
import TeleportationPortals from './TeleportationPortals';
import AchievementSystem from './AchievementSystem';
import CastleInterior from './CastleInterior';
import VesperHome from './VesperHome';
import MagicAbilities from './MagicAbilities';
import SwimmingSystem from './SwimmingSystem';
import PhotoMode from './PhotoMode';
import PlayerHome from './PlayerHome';
import PlayerHomeExterior from './PlayerHomeExterior';
import PlayerHomeInterior from './PlayerHomeInterior';
import InventorySystem from './InventorySystem';
import QuestJournal from './QuestJournal';
import PetCompanion, { PetSelector } from './PetCompanion';
import FishingSystem from './FishingSystem';
import SeasonalSystem, { SEASONS } from './SeasonalSystem';
import CombatSystem from './CombatSystem';
import NightModeSystem, { Torch, NightTreasure } from './NightModeSystem';
import NPCVillage from './NPCVillage';
import CraftingSystem from './CraftingSystem';
import GatheringSystem from './GatheringSystem';
import WorldEventsSystem from './WorldEventsSystem';

export default function Game({ onExitGame, onChatWithNPC }) {
  const sunRef = useRef();
  const directionalLightRef = useRef();
  const [dpr, setDpr] = useState(1.5);
  const [weather, setWeather] = useState('clear');
  const [timeOfDay, setTimeOfDay] = useState('day');
  const [dayTime, setDayTime] = useState(0.5); // 0 = midnight, 0.5 = noon, 1 = midnight
  const [questsCompleted, setQuestsCompleted] = useState(0);
  const [crystalsCollected, setCrystalsCollected] = useState(0);
  const [treasuresFound, setTreasuresFound] = useState(0);
  const [portalsTraveled, setPortalsTraveled] = useState(0);
  const [horsesRidden, setHorsesRidden] = useState(0);
  const [playerPosition, setPlayerPosition] = useState([0, 2, 5]);
  const [showingChat, setShowingChat] = useState(false);
  const [keyboard, setKeyboard] = useState({
    forward: false,
    backward: false,
    left: false,
    right: false,
    '1': false,
    '2': false,
    '3': false,
    '4': false,
  });
  const [ridingHorseId, setRidingHorseId] = useState(null);
  const [ridingPosition, setRidingPosition] = useState(null);
  const [isRidingUnicorn, setIsRidingUnicorn] = useState(false);
  const [isFlying, setIsFlying] = useState(false);
  const [isInsideCastle, setIsInsideCastle] = useState(false);
  const [showVesperHome, setShowVesperHome] = useState(false);
  const [vesperHomeConfig, setVesperHomeConfig] = useState(null);
  const [isSwimming, setIsSwimming] = useState(false);
  const [photoModeActive, setPhotoModeActive] = useState(false);
  const [isInsidePlayerHome, setIsInsidePlayerHome] = useState(false);
  const [showPlayerHome, setShowPlayerHome] = useState(false);
  const [playerHomeConfig, setPlayerHomeConfig] = useState(null);
  
  // New RPG Systems State
  const [inventory, setInventory] = useState(() => Array(20).fill(null));
  const [showInventory, setShowInventory] = useState(false);
  const [showQuestJournal, setShowQuestJournal] = useState(false);
  const [questProgress, setQuestProgress] = useState(() => {
    const saved = localStorage.getItem('quest_progress');
    return saved ? JSON.parse(saved) : {};
  });
  const [activePet, setActivePet] = useState(null);
  const [showPetSelector, setShowPetSelector] = useState(false);
  const [isFishing, setIsFishing] = useState(false);
  const [currentSeason, setCurrentSeason] = useState('spring');
  const [playerHealth, setPlayerHealth] = useState(100);
  const [playerMaxHealth] = useState(100);
  const [playerGold, setPlayerGold] = useState(1000);
  const [showCrafting, setShowCrafting] = useState(false);
  const [unlockedRecipes, setUnlockedRecipes] = useState(() => {
    const saved = localStorage.getItem('unlocked_recipes');
    return saved ? JSON.parse(saved) : ['iron_sword', 'health_potion', 'torch', 'wooden_chair', 'leather_armor'];
  });
  const [playerTool, setPlayerTool] = useState(null);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if (key === 'w') setKeyboard(k => ({ ...k, forward: true }));
      if (key === 's') setKeyboard(k => ({ ...k, backward: true }));
      if (key === 'a') setKeyboard(k => ({ ...k, left: true }));
      if (key === 'd') setKeyboard(k => ({ ...k, right: true }));
      if (key === '1') setKeyboard(k => ({ ...k, '1': true }));
      if (key === '2') setKeyboard(k => ({ ...k, '2': true }));
      if (key === '3') setKeyboard(k => ({ ...k, '3': true }));
      if (key === '4') setKeyboard(k => ({ ...k, '4': true }));
      if (key === 'escape') onExitGame();
      if (key === 'c') setShowingChat(!showingChat);
      if (key === 'f') setPhotoModeActive(!photoModeActive);
      if (key === 'i') setShowInventory(!showInventory);
      if (key === 'j') setShowQuestJournal(!showQuestJournal);
      if (key === 'p') setShowPetSelector(!showPetSelector);
      if (key === 'r') setIsFishing(!isFishing);
      if (key === 'g') setShowCrafting(!showCrafting);
      
      // Space key for dismount or unicorn flying
      if (key === ' ') {
        if (ridingHorseId) {
          if (isRidingUnicorn) {
            setIsFlying(true);
          } else {
            // Dismount
            setRidingHorseId(null);
            setRidingPosition(null);
            setIsRidingUnicorn(false);
            setIsFlying(false);
          }
        }
      }
    };

    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      if (key === 'w') setKeyboard(k => ({ ...k, forward: false }));
      if (key === 's') setKeyboard(k => ({ ...k, backward: false }));
      if (key === 'a') setKeyboard(k => ({ ...k, left: false }));
      if (key === 'd') setKeyboard(k => ({ ...k, right: false }));
      if (key === '1') setKeyboard(k => ({ ...k, '1': false }));
      if (key === '2') setKeyboard(k => ({ ...k, '2': false }));
      if (key === '3') setKeyboard(k => ({ ...k, '3': false }));
      if (key === '4') setKeyboard(k => ({ ...k, '4': false }));
      
      // Release flying
      if (key === ' ' && isRidingUnicorn) {
        setIsFlying(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onExitGame, showingChat, showInventory, showQuestJournal, showPetSelector, isFishing, photoModeActive, showCrafting]);

  // Handle player teleportation
  const handlePlayerTeleport = (newPosition) => {
    setPlayerPosition(newPosition);
    setPortalsTraveled(prev => prev + 1);
  };
  
  // Handle horse mounting
  const handleMount = (horseId, position, isUnicorn) => {
    if (ridingHorseId === horseId) {
      // Dismount
      setRidingHorseId(null);
      setRidingPosition(null);
      setIsRidingUnicorn(false);
      setIsFlying(false);
    } else {
      // Mount
      setRidingHorseId(horseId);
      setRidingPosition(position);
      setIsRidingUnicorn(isUnicorn);
      setPlayerPosition([position[0], position[1] + 2, position[2]]);
      setHorsesRidden(prev => prev + 1);
    }
  };
  
  // Handle entering castle
  const handleEnterCastle = () => {
    setIsInsideCastle(true);
    setPlayerPosition([0, 2, -20]); // Move player inside
    
    // Play enter sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.frequency.value = 400;
    osc.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.3);
    gain.gain.value = 0.15;
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + 0.3);
  };
  
  // Handle exiting castle
  const handleExitCastle = () => {
    setIsInsideCastle(false);
    setPlayerPosition([0, 2, -15]); // Move player outside
  };
  
  // Handle entering player home
  const handleEnterPlayerHome = () => {
    setIsInsidePlayerHome(true);
    setPlayerPosition([0, 2, 0]); // Move player inside
    
    // Play enter sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.frequency.value = 500;
    osc.frequency.exponentialRampToValueAtTime(900, audioContext.currentTime + 0.3);
    gain.gain.value = 0.15;
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + 0.3);
  };
  
  // Handle exiting player home
  const handleExitPlayerHome = () => {
    setIsInsidePlayerHome(false);
    setPlayerPosition([25, 2, 25]); // Move player outside
  };
  
  // New RPG System Handlers
  const handleAddToInventory = (item) => {
    setInventory(prev => {
      const firstEmpty = prev.findIndex(slot => slot === null);
      if (firstEmpty === -1) {
        alert('Inventory full!');
        return prev;
      }
      const newInventory = [...prev];
      newInventory[firstEmpty] = { ...item, quantity: item.quantity || 1 };
      return newInventory;
    });
  };
  
  const handleUpdateInventory = (newInventory) => {
    setInventory(newInventory);
  };
  
  const handleUseItem = (item) => {
    if (item.type === 'potion' && item.healing) {
      setPlayerHealth(prev => Math.min(playerMaxHealth, prev + item.healing));
      alert(`Used ${item.name}! +${item.healing} HP`);
    } else if (item.type === 'tool') {
      setPlayerTool(item.name);
      alert(`Equipped ${item.name}!`);
    }
  };
  
  const handlePlayerDamage = (damage) => {
    setPlayerHealth(prev => Math.max(0, prev - damage));
  };
  
  const handleEnemyKilled = (enemyData) => {
    setPlayerGold(prev => prev + enemyData.xp);
    // Random loot drop
    const drop = enemyData.drops[Math.floor(Math.random() * enemyData.drops.length)];
    handleAddToInventory({ name: drop, type: 'material', rarity: 'uncommon' });
  };
  
  const handleCraft = (recipe, quality) => {
    const resultItem = {
      ...recipe.result,
      name: quality !== 'common' ? `${quality} ${recipe.result.name}` : recipe.result.name,
      rarity: quality,
    };
    handleAddToInventory(resultItem);
  };
  
  const handleGatherResources = (resources) => {
    Object.entries(resources).forEach(([name, amount]) => {
      for (let i = 0; i < amount; i++) {
        handleAddToInventory({ name, type: 'material', rarity: 'common' });
      }
    });
  };
  
  const handleWorldEventReward = (rewards) => {
    Object.entries(rewards).forEach(([name, amount]) => {
      if (name === 'Gold') {
        setPlayerGold(prev => prev + amount);
      } else if (amount > 0) {
        for (let i = 0; i < amount; i++) {
          handleAddToInventory({ name, type: 'treasure', rarity: 'rare' });
        }
      }
    });
  };
  
  // Save quest progress and recipes
  useEffect(() => {
    localStorage.setItem('quest_progress', JSON.stringify(questProgress));
  }, [questProgress]);
  
  useEffect(() => {
    localStorage.setItem('unlocked_recipes', JSON.stringify(unlockedRecipes));
  }, [unlockedRecipes]);
  
  // Load Vesper's home config and Player's home config
  useEffect(() => {
    const saved = localStorage.getItem('vesper_home_config');
    if (saved) {
      try {
        setVesperHomeConfig(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load home config:', e);
      }
    }
    
    const playerSaved = localStorage.getItem('player_home_config');
    if (playerSaved) {
      try {
        setPlayerHomeConfig(JSON.parse(playerSaved));
      } catch (e) {
        console.error('Failed to load player home config:', e);
      }
    }
    
    // Listen for config updates
    const handleStorageChange = () => {
      const updated = localStorage.getItem('vesper_home_config');
      if (updated) {
        try {
          setVesperHomeConfig(JSON.parse(updated));
        } catch (e) {
          console.error('Failed to load updated config:', e);
        }
      }
      const playerUpdated = localStorage.getItem('player_home_config');
      if (playerUpdated) {
        try {
          setPlayerHomeConfig(JSON.parse(playerUpdated));
        } catch (e) {
          console.error('Failed to load updated player config:', e);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Cycle weather every 60 seconds
  useEffect(() => {
    const weatherCycle = ['clear', 'clear', 'rain', 'sunset', 'night', 'fog'];
    let index = 0;

    const interval = setInterval(() => {
      index = (index + 1) % weatherCycle.length;
      setWeather(weatherCycle[index]);
    }, 60000); // Change every minute

    return () => clearInterval(interval);
  }, []);

  // Dynamic day/night cycle - full cycle every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setDayTime(prev => {
        const newTime = (prev + 0.001) % 1; // 0.1% per second = 1000 seconds = ~16.6 minutes full cycle
        
        // Update time of day based on dayTime
        if (newTime >= 0.25 && newTime < 0.35) {
          setTimeOfDay('sunrise');
        } else if (newTime >= 0.35 && newTime < 0.65) {
          setTimeOfDay('day');
        } else if (newTime >= 0.65 && newTime < 0.75) {
          setTimeOfDay('sunset');
        } else {
          setTimeOfDay('night');
        }
        
        return newTime;
      });
    }, 100); // Update every 100ms for smooth transitions

    return () => clearInterval(interval);
  }, []);

  // Update sun position based on time of day
  useEffect(() => {
    if (sunRef.current && directionalLightRef.current) {
      // Calculate sun position (arc across sky)
      const angle = dayTime * Math.PI * 2 - Math.PI / 2; // Start from horizon
      const sunX = Math.cos(angle) * 100;
      const sunY = Math.sin(angle) * 80 + 20; // Keep above horizon minimum
      const sunZ = 50;
      
      sunRef.current.position.set(sunX, Math.max(sunY, -20), sunZ);
      directionalLightRef.current.position.set(sunX, Math.max(sunY, 10), sunZ);
    }
  }, [dayTime]);

  const handleWeatherChange = (newWeather) => {
    setWeather(newWeather);
  };

  const handleCrystalCollect = () => {
    setCrystalsCollected(prev => prev + 1);
    if ((crystalsCollected + 1) % 3 === 0) {
      setQuestsCompleted(prev => prev + 1);
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* 3D Canvas */}
      <Canvas
        shadows={{type: THREE.PCFSoftShadowMap}}
        dpr={dpr}
        camera={{ position: [0, 5, 10], fov: 60 }}
        style={{ background: '#000' }}
        gl={{ 
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true
        }}
      >
        {/* Ambient sounds and music */}
        <AmbientSounds weather={weather} isPlaying={true} />
        
        {/* Performance optimization - adaptive quality */}
        <PerformanceMonitor 
          onIncline={() => setDpr(2)} 
          onDecline={() => setDpr(1)}
        />
        
        {/* Enhanced Lighting System - Dynamic based on time of day */}
        <ambientLight 
          intensity={Math.max(0.2, Math.sin(dayTime * Math.PI * 2) * 0.4 + 0.4)} 
          color={dayTime < 0.25 || dayTime > 0.75 ? '#4a5f8f' : '#ffffff'} 
        />
        
        {/* Main directional light (sun) with high-quality shadows */}
        <directionalLight
          ref={directionalLightRef}
          position={[50, 50, 25]}
          intensity={Math.max(0.3, Math.sin(dayTime * Math.PI * 2) * 1.7 + 0.5)}
          color={
            dayTime < 0.3 ? '#ff8c69' : // Sunrise orange
            dayTime < 0.7 ? '#ffffff' : // Daytime white  
            '#ff6b35' // Sunset orange
          }
          castShadow
          shadow-mapSize-width={4096}
          shadow-mapSize-height={4096}
          shadow-camera-far={150}
          shadow-camera-left={-60}
          shadow-camera-right={60}
          shadow-camera-top={60}
          shadow-camera-bottom={-60}
          shadow-bias={-0.0001}
          shadow-normalBias={0.02}
        />
        
        {/* Fill light for softer shadows */}
        <directionalLight
          position={[-30, 20, -30]}
          intensity={weather === 'night' ? 0.2 : 0.8}
          color={weather === 'night' ? '#6a7faf' : '#e3f2ff'}
        />
        
        {/* Ground bounce light simulation */}
        <hemisphereLight
          skyColor="#87ceeb"
          groundColor="#3a5a1a"
          intensity={weather === 'night' ? 0.1 : 0.4}
        />

        {/* Sky */}
        {weather === 'clear' && <Sky sunPosition={[100, 20, 100]} />}
        {weather === 'night' && <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />}

        {/* Sun mesh for god rays effect */}
        {weather === 'clear' && (
          <mesh ref={sunRef} position={[100, 20, 100]}>
            <sphereGeometry args={[5, 32, 32]} />
            <meshBasicMaterial color="#FDB813" toneMapped={false} />
          </mesh>
        )}

        {/* Environment */}
        <Environment preset={weather === 'night' ? 'night' : 'sunset'} />

        {/* Weather system */}
        <Weather type={weather} />

        {/* Game world */}
        <Terrain />
        <Grass count={50000} spread={80} />
        <Castle position={[0, 0, -25]} onEnter={handleEnterCastle} />
        
        {/* Player's Home - positioned in different location */}
        {playerHomeConfig && (
          <PlayerHomeExterior 
            position={[25, 0, 25]}
            homeType={playerHomeConfig.homeType || 'cabin'}
            exteriorColor={playerHomeConfig.exteriorColor || '#8b4513'}
            onEnter={handleEnterPlayerHome}
          />
        )}
        
        {/* Castle Interior - only render when inside */}
        {isInsideCastle && (
          <CastleInterior 
            isInside={isInsideCastle}
            homeConfig={vesperHomeConfig}
            onExit={handleExitCastle}
          />
        )}
        
        {/* Player Home Interior - only render when inside */}
        {isInsidePlayerHome && playerHomeConfig && (
          <PlayerHomeInterior 
            isInside={isInsidePlayerHome}
            homeConfig={playerHomeConfig}
            onExit={handleExitPlayerHome}
          />
        )}
        
        {/* Swimming System (water, fish, underwater treasures) */}
        {!isInsideCastle && !isInsidePlayerHome && (
          <SwimmingSystem 
            playerPosition={playerPosition}
            isSwimming={isSwimming}
            onSwimmingChange={setIsSwimming}
          />
        )}
        
        {/* Only render outdoor elements when outside */}
        {!isInsideCastle && !isInsidePlayerHome && (
          <>
            <Horses onMount={handleMount} ridingHorseId={ridingHorseId} />
            <Butterflies />
            <TreasureChests />
            <TeleportationPortals onPlayerMove={handlePlayerTeleport} />
          </>
        )}

        {/* Player character */}
        <Character position={playerPosition} keyboard={keyboard} />
        
        {/* Magic Abilities System */}
        <MagicAbilities
          playerPosition={playerPosition}
          playerRotation={0}
          keyboard={keyboard}
        />
        
        {/* Vesper NPC near castle */}
        <VesperNPC 
          position={[-8, 1.5, -15]} 
          crystalsCollected={crystalsCollected}
          onInteract={() => {
            setShowingChat(true);
            if (onChatWithNPC) onChatWithNPC();
          }}
          onCrystalCollect={handleCrystalCollect}
        />
        
        {/* NEW RPG SYSTEMS - Only when outside */}
        {!isInsideCastle && !isInsidePlayerHome && (
          <>
            {/* Seasonal System - Changes environment */}
            <SeasonalSystem 
              currentSeason={currentSeason}
              onSeasonChange={setCurrentSeason}
            />
            
            {/* Night Mode System - Dangerous nights */}
            <NightModeSystem
              dayTime={dayTime}
              isNightActive={timeOfDay === 'night'}
              onSpawnEnemy={(type, position) => {
                // Enemy spawning handled by CombatSystem
              }}
              playerPosition={playerPosition}
              safeZones={[
                { position: [0, 0, -25], radius: 15 }, // Castle area
                { position: [25, 0, 25], radius: 10 }, // Player home
                { position: [47, 0, 47], radius: 12 }, // Village plaza
              ]}
            />
            
            {/* Torch for player (equippable from inventory) */}
            {playerTool && playerTool.includes('Torch') && (
              <Torch
                position={[playerPosition[0] + 1, playerPosition[1] + 1, playerPosition[2]]}
                isActive={true}
              />
            )}
            
            {/* NPC Village with 6 characters */}
            <NPCVillage
              playerPosition={playerPosition}
              dayTime={dayTime}
              playerGold={playerGold}
              onTrade={(action, item) => {
                if (action === 'buy') {
                  setPlayerGold(prev => prev - item.price);
                  handleAddToInventory(item);
                }
              }}
              onGift={(npcId, gift) => {
                // Remove gift from inventory
                setInventory(prev => {
                  const index = prev.findIndex(item => item && item.name === gift);
                  if (index !== -1) {
                    const newInv = [...prev];
                    newInv[index] = null;
                    return newInv;
                  }
                  return prev;
                });
              }}
            />
            
            {/* Gathering System - Resource nodes */}
            <GatheringSystem
              playerPosition={playerPosition}
              playerTool={playerTool}
              onGatherResources={handleGatherResources}
              isActive={true}
            />
            
            {/* Combat System - Enemies and fighting */}
            <CombatSystem
              playerPosition={playerPosition}
              playerHealth={playerHealth}
              playerMaxHealth={playerMaxHealth}
              onPlayerDamage={handlePlayerDamage}
              onEnemyKilled={handleEnemyKilled}
              currentTime={dayTime}
              isActive={true}
            />
            
            {/* Fishing System */}
            <FishingSystem
              playerPosition={playerPosition}
              isActive={isFishing}
              onCatch={(fish) => {
                handleAddToInventory({ ...fish, type: 'food' });
              }}
              onToggle={() => setIsFishing(!isFishing)}
              inventory={inventory}
              onAddToInventory={handleAddToInventory}
            />
            
            {/* Pet Companion */}
            {activePet && (
              <PetCompanion
                type={activePet}
                playerPosition={playerPosition}
                isActive={true}
              />
            )}
            
            {/* World Events System - Random exciting events */}
            <WorldEventsSystem
              playerPosition={playerPosition}
              onReward={handleWorldEventReward}
              isActive={true}
            />
          </>
        )}

        {/* Ground shadows */}
        <ContactShadows 
          position={[0, 0, 0]} 
          opacity={0.5} 
          scale={100} 
          blur={1} 
          far={10} 
        />

        {/* Camera controls (for debugging - can remove later) */}
        <OrbitControls 
          enablePan={false}
          enableZoom={false}
          enableRotate={false}
          target={[0, 1, 0]}
        />

        {/* AAA Post-Processing Effects */}
        <EffectComposer multisampling={8}>
          {/* SMAA - Superior anti-aliasing */}
          <SMAA />
          
          {/* God Rays - Volumetric light shafts from sun */}
          {sunRef.current && weather === 'clear' && (
            <GodRays
              sun={sunRef.current}
              samples={60}
              density={0.97}
              decay={0.95}
              weight={0.6}
              exposure={0.3}
              clampMax={1}
              blur={true}
            />
          )}
          
          {/* Bloom - Makes magical elements glow beautifully */}
          <Bloom 
            luminanceThreshold={0.2}
            intensity={1.5}
            levels={9}
            mipmapBlur
          />
          {/* Depth of Field - Cinematic focus blur */}
          <DepthOfField 
            focusDistance={0.02}
            focalLength={0.05}
            bokehScale={3}
            height={480}
          />
          
          {/* SSAO - Realistic ambient shadows */}
          <SSAO 
            radius={0.01}
            intensity={30}
            luminanceInfluence={0.6}
            color="black"
          />
          
          {/* Vignette - Dramatic edge darkening */}
          <Vignette 
            offset={0.3}
            darkness={0.5}
            eskil={false}
          />
          
          {/* Chromatic Aberration - Subtle lens distortion */}
          <ChromaticAberration 
            offset={[0.0015, 0.0015]}
            radialModulation={true}
            modulationOffset={0.3}
          />
          
          {/* Film Grain - Cinematic texture */}
          <Noise 
            opacity={0.03}
            premultiply={false}
          />
          
          {/* Tone Mapping */}
          <ToneMapping 
            resolution={256}
            whitePoint={4}
            middleGrey={0.6}
            minLuminance={0.01}
            averageLuminance={1.0}
            adaptationRate={2.0}
          />
        </EffectComposer>
      </Canvas>

      {/* Game UI Overlay */}
      <GameUI
        weather={weather}
        onWeatherChange={handleWeatherChange}
        crystalsCollected={crystalsCollected}
        questsCompleted={questsCompleted}
        onExitGame={onExitGame}
        showingChat={showingChat}
        onToggleChat={() => setShowingChat(!showingChat)}
        playerPosition={playerPosition}
        onOpenVesperHome={() => setShowVesperHome(true)}
        onOpenPlayerHome={() => setShowPlayerHome(true)}
      />
      
      {/* Achievement System */}
      <AchievementSystem
        crystalsCollected={crystalsCollected}
        questsCompleted={questsCompleted}
        treasuresFound={treasuresFound}
        portalsTraveled={portalsTraveled}
        horsesRidden={horsesRidden}
      />
      
      {/* Vesper's Home Customization UI */}
      <VesperHome
        isOpen={showVesperHome}
        onClose={() => setShowVesperHome(false)}
      />
      
      {/* Player's Home Customization UI */}
      <PlayerHome
        isOpen={showPlayerHome}
        onClose={() => setShowPlayerHome(false)}
      />
      
      {/* Photo Mode */}
      <PhotoMode
        isActive={photoModeActive}
        onToggle={() => setPhotoModeActive(!photoModeActive)}
      />
      
      {/* NEW RPG SYSTEM UIs */}
      
      {/* Inventory System */}
      <InventorySystem
        isOpen={showInventory}
        onClose={() => setShowInventory(false)}
        inventory={inventory}
        onUpdateInventory={handleUpdateInventory}
        onUseItem={handleUseItem}
      />
      
      {/* Quest Journal */}
      <QuestJournal
        isOpen={showQuestJournal}
        onClose={() => setShowQuestJournal(false)}
        questProgress={questProgress}
        playerStats={{ gold: playerGold, level: 1 }}
      />
      
      {/* Pet Selector */}
      <PetSelector
        isOpen={showPetSelector}
        onClose={() => setShowPetSelector(false)}
        onSelectPet={(petType) => {
          setActivePet(petType);
          setShowPetSelector(false);
        }}
        activePet={activePet}
      />
      
      {/* Crafting System */}
      <CraftingSystem
        isOpen={showCrafting}
        onClose={() => setShowCrafting(false)}
        inventory={inventory}
        onCraft={handleCraft}
        unlockedRecipes={unlockedRecipes}
      />

      {/* Instructions overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(10px)',
          padding: '15px 20px',
          borderRadius: '12px',
          border: '1px solid rgba(0, 255, 255, 0.3)',
          color: '#00ffff',
          fontFamily: 'monospace',
          fontSize: '14px',
          lineHeight: '1.6',
        }}
      >
        <div><strong>🎮 Controls:</strong></div>
        <div>WASD - Move around</div>
        <div>Mouse - Look around</div>
        <div>C - Chat with Vesper</div>
        <div>ESC - Exit to menu</div>
        <div>F - 📸 Photo Mode</div>
        <div style={{ marginTop: '8px', color: '#ec4899' }}>
          <strong>🎮 RPG Systems:</strong>
        </div>
        <div>I - 🎒 Inventory (20 slots)</div>
        <div>J - 📖 Quest Journal</div>
        <div>P - 🐾 Pet Companion</div>
        <div>R - 🎣 Fishing Mode</div>
        <div>G - ⚒️ Crafting Station</div>
        <div style={{ marginTop: '8px', color: '#a78bfa' }}>
          <strong>✨ Magic Abilities:</strong>
        </div>
        <div>1 - 🔥 Fireball</div>
        <div>2 - ⚡ Speed Boost</div>
        <div>3 - 🌀 Levitation</div>
        <div>4 - 💡 Light Orb</div>
        <div style={{ marginTop: '8px', color: '#00bfff' }}>
          <strong>🏊 Swimming:</strong>
        </div>
        <div>Walk into water to swim!</div>
        <div style={{ marginTop: '8px', color: '#ffd700' }}>
          💎 Collect crystals • ⚔️ Fight enemies • 🌿 Gather resources
        </div>
        <div style={{ marginTop: '4px', color: '#10b981' }}>
          🏘️ NPC Village at [47, 47] • 🏡 Your home at [25, 25]
        </div>
        <div style={{ marginTop: '4px', color: '#8b5cf6' }}>
          🌙 Beware the night! • ✨ Watch for world events!
        </div>
      </div>
    </div>
  );
}
