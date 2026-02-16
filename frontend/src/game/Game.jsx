import React, { useState, useEffect, Suspense, useRef, lazy, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { 
  Sky, 
  Stars, 
  OrbitControls as DreiOrbitControls, // Renamed to avoid confusion if we use it manually
  PerspectiveCamera,
  Environment,
  ContactShadows,
  Cloud,
  Sparkles,
  Float,
  MeshReflectorMaterial,
  PerformanceMonitor,
  KeyboardControls
} from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import PlayerController from './PlayerController';
import Plaza from './Plaza';
import Castle from './Castle';
import Weather from './Weather';
import GameUI from './GameUI';
import VesperNPC from './VesperNPC';
import Horses from './Horses';
import Grass from './Grass';
import Butterflies from './Butterflies';
import WorldModels from './WorldModels';

// Lazy load RPG systems to avoid bundle errors
const InventorySystem = lazy(() => import('./InventorySystem'));
const QuestJournal = lazy(() => import('./QuestJournal'));
const PetCompanion = lazy(() => import('./PetCompanion'));
const FishingSystem = lazy(() => import('./FishingSystem'));
const SeasonalSystem = lazy(() => import('./SeasonalSystem'));
const CombatSystem = lazy(() => import('./CombatSystem'));
const NightModeSystem = lazy(() => import('./NightModeSystem'));
const NPCVillage = lazy(() => import('./NPCVillage'));
const CraftingSystem = lazy(() => import('./CraftingSystem'));
const GatheringSystem = lazy(() => import('./GatheringSystem'));
const WorldEventsSystem = lazy(() => import('./WorldEventsSystem'));
const AmbientSounds = lazy(() => import('./AmbientSounds'));
const TreasureChests = lazy(() => import('./TreasureChests'));
const TeleportationPortals = lazy(() => import('./TeleportationPortals'));
const AchievementSystem = lazy(() => import('./AchievementSystem'));
const CastleInterior = lazy(() => import('./CastleInterior'));
const VesperHome = lazy(() => import('./VesperHome'));
const MagicAbilities = lazy(() => import('./MagicAbilities'));
const SwimmingSystem = lazy(() => import('./SwimmingSystem'));
const PhotoMode = lazy(() => import('./PhotoMode'));
const PlayerHome = lazy(() => import('./PlayerHome'));
const PlayerHomeExterior = lazy(() => import('./PlayerHomeExterior'));
const PlayerHomeInterior = lazy(() => import('./PlayerHomeInterior'));


export default function Game({ onExitGame, onChatWithNPC }) {
  const [playerPosition, setPlayerPosition] = useState([0, 0, 0]);
  
  // UI Panels
  const [showInventory, setShowInventory] = useState(false);
  const [showQuestJournal, setShowQuestJournal] = useState(false);
  const [showCrafting, setShowCrafting] = useState(false);
  const [showPetSelector, setShowPetSelector] = useState(false);
  const [showingChat, setShowingChat] = useState(false);
  const [photoModeActive, setPhotoModeActive] = useState(false);
  
  // Player State
  const [playerHealth, setPlayerHealth] = useState(100);
  const [playerMaxHealth] = useState(100);
  const [playerGold, setPlayerGold] = useState(1000);
  const [playerTool, setPlayerTool] = useState(null);
  const [activePet, setActivePet] = useState(null);
  
  // World State
  const [currentSeason, setCurrentSeason] = useState('spring');
  const [isFishing, setIsFishing] = useState(false);
  const [isInsideCastle, setIsInsideCastle] = useState(false);
  const [isInsidePlayerHome, setIsInsidePlayerHome] = useState(false);
  
  // Player Status/Achievements
  const [ridingHorseId, setRidingHorseId] = useState(null);
  const [ridingPosition, setRidingPosition] = useState(null);
  const [isRidingUnicorn, setIsRidingUnicorn] = useState(false);
  const [isFlying, setIsFlying] = useState(false);
  const [horsesRidden, setHorsesRidden] = useState(0);
  const [portalsTraveled, setPortalsTraveled] = useState(0);
  
  // Unlocked Content
  const [unlockedRecipes, setUnlockedRecipes] = useState(() => {
    const saved = localStorage.getItem('unlocked_recipes');
    return saved ? JSON.parse(saved) : ['iron_sword', 'health_potion', 'torch', 'wooden_chair', 'leather_armor'];
  });

  // Keyboard controls configuration for 3D world (WASD)
  const keyboardMap = useMemo(() => [
    { name: 'forward', keys: ['ArrowUp', 'w', 'W'] },
    { name: 'backward', keys: ['ArrowDown', 's', 'S'] },
    { name: 'left', keys: ['ArrowLeft', 'a', 'A'] },
    { name: 'right', keys: ['ArrowRight', 'd', 'D'] },
    { name: 'run', keys: ['Shift'] },
    { name: 'jump', keys: ['Space'] },
    { name: 'interact', keys: ['e', 'E'] },
  ], []);

  // Keyboard controls for UI only
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      // ESC handled by KeyboardControls or here? Let's keep ESC here for menu.
      if (key === 'escape') onExitGame();

      // UI Toggles
      if (key === 'i') setShowInventory(!showInventory);
      if (key === 'j') setShowQuestJournal(!showQuestJournal);
      if (key === 'p') setShowPetSelector(!showPetSelector);
      if (key === 'r') setIsFishing(!isFishing);
      if (key === 'g') setShowCrafting(!showCrafting);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onExitGame, showInventory, showQuestJournal, showPetSelector, isFishing, showCrafting]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <KeyboardControls map={keyboardMap}>
        <Canvas camera={{ position: [0, 30, 40], fov: 50 }} gl={{ antialias: true }} shadows>
          <Suspense fallback={null}>
          {/* === MAGICAL ATMOSPHERE & LIGHTING === */}
          <ambientLight intensity={0.4} color="#a080ff" />
          <pointLight position={[20, 20, 20]} intensity={1.5} color="#ffaaee" castShadow />
          <directionalLight 
            position={[50, 80, 50]} 
            intensity={0.8} 
            color="#ffddaa" 
            castShadow 
            shadow-mapSize={[2048, 2048]}
          />
          <fog attach="fog" args={['#201040', 30, 250]} />

          {/* === ENVIRONMENT & SKY === */}
          <Sky 
            sunPosition={[100, 10, 100]} 
            turbidity={8} 
            rayleigh={4} 
            mieCoefficient={0.005} 
            mieDirectionalG={0.8}
            inclination={0.6}
            azimuth={0.25}
          />
          <Stars radius={100} depth={50} count={2000} factor={6} saturation={1} fade speed={0.5} />
          
          {/* === POST PROCESSING (Disabled for Stability) === */}
          {/* 
          <EffectComposer>
            <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} height={300} intensity={1.5} />
            <Vignette eskil={false} offset={0.1} darkness={0.4} />
            <Noise opacity={0.02} />
          </EffectComposer> 
          */}
          
          {/* === CORE WORLD LAYER (ZONE 1: PLAZA) === */}
          {/* Replaces the old procedural terrain with a Gray Box Plaza */}
          <Plaza />
          <Grass position={[0, 0, 0]} />
          <Castle position={[0, 0, -50]} scale={6} />
          <Weather season={currentSeason} />
          
          {/* === INTERACTIVE ELEMENTS === */}
          <VesperNPC position={[25, 0, 25]} onChat={onChatWithNPC} />
          {/* USER MODELS: Add your custom models here */}
          {/* <primitive object={customModel} scale={2} position={[0, 0, 0]} /> */}
          <Horses position={[45, 0, -20]} onMount={() => {}} />
          <Butterflies count={30} />
          
          {/* === DOWNLOADED 3D MODELS === */}
          <WorldModels />
          
          {/* === PLAYER CHARACTER (Third Person Controller) === */}
          <PlayerController 
            startPosition={playerPosition}
            onPositionChange={handlePlayerTeleport} 
            cameraDistance={25} /* Move camera further back for giant scale feel */
          />

          {/* === LIGHTING EFFECTS === */}
          <ContactShadows position={[0, 0, 0]} opacity={0.35} scale={100} blur={2.5} far={40} resolution={256} color="#000000" />
        </Suspense>
        </Canvas>
      </KeyboardControls>

      {/* === GAME UI LAYER === */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
        <Suspense fallback={null}>
          {/* HUD & Stats (Add pointer events allow on UI container children if needed, handled in GameUI) */}
          <GameUI 
            health={playerHealth}
            maxHealth={playerMaxHealth}
            gold={playerGold}
            season={currentSeason}
            showInventory={showInventory}
            showQuests={showQuestJournal}
            onExitGame={onExitGame}
            onToggleChat={() => setShowingChat(!showingChat)}
            onCustomize={() => {}} 
          />
          
          {/* Persistent UI Systems - Ensure all have pointerEvents: 'auto' */}
          <div style={{ pointerEvents: 'auto' }}>
            <AchievementSystem />
          </div>
          
          {/* Conditional Panels - Only render when active */}
          <div style={{ pointerEvents: 'auto' }}>
            {photoModeActive && <PhotoMode active={true} />}
            {showInventory && <InventorySystem onClose={() => setShowInventory(false)} />}
            {showQuestJournal && <QuestJournal onClose={() => setShowQuestJournal(false)} />}
            {showPetSelector && <PetCompanion onSelect={setActivePet} onClose={() => setShowPetSelector(false)} />}
            {showCrafting && <CraftingSystem recipes={unlockedRecipes} onClose={() => setShowCrafting(false)} />}
          </div>
        </Suspense>
      </div>
    </div>
  );

  function handlePlayerTeleport(newPosition) {
    setPlayerPosition(newPosition);
    setPortalsTraveled(prev => prev + 1);
  }
}
