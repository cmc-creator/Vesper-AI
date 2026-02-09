import React, { useState, useEffect, Suspense, useRef, lazy } from 'react';
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
import Character from './Character';
import Terrain from './Terrain';
import Castle from './Castle';
import Weather from './Weather';
import GameUI from './GameUI';
import VesperNPC from './VesperNPC';
import Horses from './Horses';
import Grass from './Grass';
import Butterflies from './Butterflies';

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
  const [playerPosition, setPlayerPosition] = useState([0, 1.2, 2]);
  const [keyboard, setKeyboard] = useState({ forward: false, backward: false, left: false, right: false });
  const [showInventory, setShowInventory] = useState(false);
  const [showQuestJournal, setShowQuestJournal] = useState(false);
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
  const [showingChat, setShowingChat] = useState(false);
  const [photoModeActive, setPhotoModeActive] = useState(false);
  const [isInsideCastle, setIsInsideCastle] = useState(false);
  const [isInsidePlayerHome, setIsInsidePlayerHome] = useState(false);
  const [ridingHorseId, setRidingHorseId] = useState(null);
  const [ridingPosition, setRidingPosition] = useState(null);
  const [isRidingUnicorn, setIsRidingUnicorn] = useState(false);
  const [isFlying, setIsFlying] = useState(false);
  const [horsesRidden, setHorsesRidden] = useState(0);
  const [portalsTraveled, setPortalsTraveled] = useState(0);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if (key === 'w') setKeyboard(k => ({ ...k, forward: true }));
      if (key === 's') setKeyboard(k => ({ ...k, backward: true }));
      if (key === 'a') setKeyboard(k => ({ ...k, left: true }));
      if (key === 'd') setKeyboard(k => ({ ...k, right: true }));
      if (key === 'escape') onExitGame();
      if (key === 'i') setShowInventory(!showInventory);
      if (key === 'j') setShowQuestJournal(!showQuestJournal);
      if (key === 'p') setShowPetSelector(!showPetSelector);
      if (key === 'r') setIsFishing(!isFishing);
      if (key === 'g') setShowCrafting(!showCrafting);
    };

    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      if (key === 'w') setKeyboard(k => ({ ...k, forward: false }));
      if (key === 's') setKeyboard(k => ({ ...k, backward: false }));
      if (key === 'a') setKeyboard(k => ({ ...k, left: false }));
      if (key === 'd') setKeyboard(k => ({ ...k, right: false }));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onExitGame, showInventory, showQuestJournal, showPetSelector, isFishing, showCrafting]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas camera={{ position: [0, 5, 10], fov: 60 }} gl={{ antialias: true }}>
        <Suspense fallback={null}>
          {/* Lighting */}
          <ambientLight intensity={0.8} />
          <pointLight position={[20, 20, 20]} intensity={0.8} />
          <directionalLight position={[100, 100, 100]} intensity={0.5} castShadow />

          {/* Environment */}
          <Sky sunPosition={[100, 20, 100]} turbidity={10} rayleigh={2} mieCoefficient={0.005} mieDirectionalG={0.7} />
          <Stars radius={100} depth={20} count={800} factor={4} saturation={0} fade speed={1} />
          <Environment preset="sunset" />
          
          {/* World Components */}
          <Terrain position={[0, -1, 0]} />
          <Castle position={[0, 0, -8]} />
          <Grass position={[0, 0, 0]} />
          <Butterflies count={30} />
          <Weather season={currentSeason} />
          <VesperNPC position={[5, 0, 5]} onChat={onChatWithNPC} />
          <Horses position={[8, 0, 2]} onMount={() => {}} />

          {/* Player */}
          <Character 
            position={playerPosition} 
            keyboard={keyboard} 
            onChatWithNPC={onChatWithNPC}
            health={playerHealth}
            maxHealth={playerMaxHealth}
          />

          {/* Shadows */}
          <ContactShadows position={[0, 0, 0]} opacity={0.35} scale={100} blur={2.5} far={40} resolution={256} color="#000000" />
        </Suspense>
      </Canvas>

      {/* UI Overlays */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
        <Suspense fallback={null}>
          <GameUI 
            health={playerHealth}
            maxHealth={playerMaxHealth}
            gold={playerGold}
            season={currentSeason}
            showInventory={showInventory}
            showQuests={showQuestJournal}
          />
          
          <AchievementSystem />
          <PhotoMode active={photoModeActive} />
          
          {showInventory && <InventorySystem onClose={() => setShowInventory(false)} />}
          {showQuestJournal && <QuestJournal onClose={() => setShowQuestJournal(false)} />}
          {showPetSelector && <PetCompanion onSelect={setActivePet} onClose={() => setShowPetSelector(false)} />}
          {showCrafting && <CraftingSystem recipes={unlockedRecipes} onClose={() => setShowCrafting(false)} />}
        </Suspense>
      </div>

      {/* Exit button */}
      <button 
        onClick={onExitGame}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          padding: '10px 20px',
          fontSize: '16px',
          background: '#ff0000',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          zIndex: 100
        }}
      >
        Exit [ESC]
      </button>

      {/* Controls Overlay */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        color: 'white',
        fontSize: '12px',
        background: 'rgba(0, 0, 0, 0.7)',
        padding: '15px',
        borderRadius: '8px',
        zIndex: 50,
        maxWidth: '300px'
      }}>
        <div><strong>Controls:</strong></div>
        <div>WASD - Move | ESC - Exit | I - Inventory | J - Quests</div>
        <div>P - Pets | R - Fishing | G - Crafting</div>
        <div style={{ marginTop: '10px', color: '#00ffff' }}>
          ✨ Core world loaded. Systems coming back step-by-step. ✨
        </div>
      </div>
    </div>
  );

  function handlePlayerTeleport(newPosition) {
    setPlayerPosition(newPosition);
    setPortalsTraveled(prev => prev + 1);
  }
}
