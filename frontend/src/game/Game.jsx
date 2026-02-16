import React, { useState, useEffect, Suspense, useRef, lazy, useMemo, useCallback, Component } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { 
  Sky, 
  Stars, 
  OrbitControls as DreiOrbitControls,
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

// Safe wrapper: if postprocessing crashes (version mismatch, GPU issues), world still renders
class SafeEffects extends Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err) { console.warn('[SafeEffects] Postprocessing disabled:', err.message); }
  render() { return this.state.hasError ? null : this.props.children; }
}
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
import EnvironmentScene, { EnvironmentLighting } from './EnvironmentScene';
import EnvironmentBrowser, { AddEnvironmentDialog } from './EnvironmentBrowser';
import WorldPortals, { ReturnPortal } from './WorldPortals';
import environmentCatalog from './environmentCatalog.json';

// Lazy load the world editor
const WorldEditor = lazy(() => import('./WorldEditor'));

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
// TeleportationPortals replaced by WorldPortals (imported above)
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
  const [editorMode, setEditorMode] = useState(false);
  
  // Environment System
  const [showEnvironmentBrowser, setShowEnvironmentBrowser] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [activeEnvironmentId, setActiveEnvironmentId] = useState(() => {
    return localStorage.getItem('vesper_active_environment') || null;
  });
  const [environmentLoading, setEnvironmentLoading] = useState(false);
  
  // World transition
  const [transitionVisible, setTransitionVisible] = useState(false);
  const [transitionOpacity, setTransitionOpacity] = useState(0);
  const [transitionText, setTransitionText] = useState('');

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

  // Active environment data
  const activeEnvironment = useMemo(() => {
    if (!activeEnvironmentId) return null;
    return environmentCatalog.environments.find(e => e.id === activeEnvironmentId) || null;
  }, [activeEnvironmentId]);

  const activeSkyPreset = useMemo(() => {
    if (!activeEnvironment) return null;
    return environmentCatalog.skyPresets[activeEnvironment.skyPreset] || null;
  }, [activeEnvironment]);

  const handleSelectEnvironment = useCallback((envId) => {
    setEnvironmentLoading(true);
    setActiveEnvironmentId(envId);
    localStorage.setItem('vesper_active_environment', envId);
    const env = environmentCatalog.environments.find(e => e.id === envId);
    if (env) {
      setPlayerPosition(env.playerSpawn || [0, 2, 10]);
    }
    setShowEnvironmentBrowser(false);
    // Loading state cleared when scene's onLoaded fires
    setTimeout(() => setEnvironmentLoading(false), 2000);
  }, []);

  const handleBackToClassic = useCallback(() => {
    setActiveEnvironmentId(null);
    localStorage.removeItem('vesper_active_environment');
    setPlayerPosition([0, 0, 0]);
    setShowEnvironmentBrowser(false);
  }, []);

  // Smooth world-to-world teleport with fade transition
  const handleWorldTeleport = useCallback((envId) => {
    const isReturn = envId === '__nexus__';
    if (!isReturn) {
      const env = environmentCatalog.environments.find(e => e.id === envId);
      setTransitionText(`Traveling to ${env?.name || 'Unknown World'}...`);
    } else {
      setTransitionText('Returning to Nexus...');
    }
    setTransitionVisible(true);
    setTimeout(() => setTransitionOpacity(1), 30);
    setTimeout(() => {
      if (isReturn) {
        handleBackToClassic();
      } else {
        handleSelectEnvironment(envId);
        setEnvironmentLoading(false);
      }
    }, 700);
    setTimeout(() => setTransitionOpacity(0), 1400);
    setTimeout(() => setTransitionVisible(false), 2100);
  }, [handleBackToClassic, handleSelectEnvironment]);

  // Keyboard controls configuration for 3D world (WASD)
  const keyboardMap = useMemo(() => [
    { name: 'forward', keys: ['ArrowUp', 'w', 'W'] },
    { name: 'backward', keys: ['ArrowDown', 's', 'S'] },
    { name: 'left', keys: ['ArrowLeft', 'a', 'A'] },
    { name: 'right', keys: ['ArrowRight', 'd', 'D'] },
    { name: 'run', keys: ['Shift'] },
    { name: 'jump', keys: ['Space'] },
    { name: 'interact', keys: ['e', 'E'] },
    { name: 'fly', keys: ['f', 'F'] },
    { name: 'descend', keys: ['c', 'C'] },
  ], []);

  // Keyboard controls for UI only
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      // ESC handled by KeyboardControls or here? Let's keep ESC here for menu.
      if (key === 'escape') {
        if (editorMode) {
          setEditorMode(false);
          return;
        }
        onExitGame();
      }

      // F8 to toggle world editor
      if (e.key === 'F8') {
        e.preventDefault();
        setEditorMode(prev => !prev);
        return;
      }

      // F9 to toggle environment browser
      if (e.key === 'F9') {
        e.preventDefault();
        setShowEnvironmentBrowser(prev => !prev);
        return;
      }

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
  }, [onExitGame, showInventory, showQuestJournal, showPetSelector, isFishing, showCrafting, editorMode]);

  // If in editor mode, render WorldEditor overlay instead
  if (editorMode) {
    return (
      <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
        <Suspense fallback={
          <div style={{
            width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#0a0a1e', color: '#00ffff', fontFamily: 'monospace', fontSize: 18,
          }}>
            Loading World Editor...
          </div>
        }>
          <WorldEditor onExit={() => setEditorMode(false)} />
        </Suspense>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <KeyboardControls map={keyboardMap}>
        <Canvas 
          camera={{ 
            position: activeEnvironment 
              ? [activeEnvironment.playerSpawn[0], activeEnvironment.playerSpawn[1] + 10, activeEnvironment.playerSpawn[2] + (activeEnvironment.cameraDistance || 20)] 
              : [0, 30, 40], 
            fov: 50 
          }} 
          gl={{ antialias: true }} 
          shadows
        >
          <Suspense fallback={null}>

          {activeEnvironment ? (
            /* ============================================================
               ENVIRONMENT MODE — Load a complete pre-made 3D scene
               ============================================================ */
            <>
              {/* Environment-matched lighting */}
              <EnvironmentLighting 
                preset={activeEnvironment.skyPreset || 'forest'} 
                ambientColor={activeEnvironment.ambientColor}
              />
              
              {/* Environment-matched fog */}
              <fog attach="fog" args={[
                activeEnvironment.fogColor || '#201040', 
                activeEnvironment.fogNear || 20, 
                activeEnvironment.fogFar || 150
              ]} />

              {/* Sky matched to environment */}
              {activeSkyPreset && (
                <Sky 
                  sunPosition={activeSkyPreset.sunPosition}
                  turbidity={activeSkyPreset.turbidity}
                  rayleigh={activeSkyPreset.rayleigh}
                  mieCoefficient={0.005}
                  mieDirectionalG={0.8}
                  inclination={activeSkyPreset.inclination}
                  azimuth={activeSkyPreset.azimuth}
                />
              )}
              <Stars radius={100} depth={50} count={1500} factor={6} saturation={1} fade speed={0.5} />

              {/* THE COMPLETE 3D ENVIRONMENT */}
              <EnvironmentScene 
                url={activeEnvironment.file}
                scale={activeEnvironment.scale || 1}
                autoCenter={true}
                enableAnimations={true}
                onLoaded={(info) => {
                  setEnvironmentLoading(false);
                  console.log(`[Environment] Loaded "${activeEnvironment.name}"`, info);
                }}
              />

              {/* Vesper NPC follows you into any environment */}
              <VesperNPC position={[
                (activeEnvironment.playerSpawn[0] || 0) + 5,
                (activeEnvironment.playerSpawn[1] || 0),
                (activeEnvironment.playerSpawn[2] || 0) + 5
              ]} onChat={onChatWithNPC} />

              {/* Return portal back to nexus */}
              <ReturnPortal
                position={[
                  (activeEnvironment.playerSpawn[0] || 0),
                  0,
                  (activeEnvironment.playerSpawn[2] || 0) - 18
                ]}
                onReturn={() => handleWorldTeleport('__nexus__')}
              />

              {/* Player */}
              <PlayerController 
                startPosition={activeEnvironment.playerSpawn || [0, 2, 10]}
                onPositionChange={handlePlayerTeleport} 
                cameraDistance={activeEnvironment.cameraDistance || 15}
              />

              <ContactShadows position={[0, 0, 0]} opacity={0.3} scale={100} blur={2.5} far={40} resolution={256} color="#000000" />

              {/* Atmospheric Post-Processing for environments too */}
              <SafeEffects>
                <EffectComposer>
                  <Bloom luminanceThreshold={0.3} luminanceSmoothing={0.9} intensity={1.0} mipmapBlur />
                  <Vignette eskil={false} offset={0.15} darkness={0.6} />
                </EffectComposer>
              </SafeEffects>
            </>
          ) : (
            /* ============================================================
               CLASSIC MODE — Second World: Dark Fantasy / Cyberpunk Nexus
               ============================================================ */
            <>
              {/* === SECOND WORLD ATMOSPHERE === */}
              <ambientLight intensity={0.15} color="#201040" />
              <pointLight position={[0, 30, 0]} intensity={2} color="#8040ff" castShadow distance={100} decay={1} />
              <pointLight position={[50, 15, 50]} intensity={0.8} color="#00ffff" castShadow distance={80} decay={2} />
              <pointLight position={[-50, 15, -50]} intensity={0.6} color="#ff40ff" distance={80} decay={2} />
              <directionalLight 
                position={[30, 60, 30]} 
                intensity={0.3} 
                color="#4020a0" 
                castShadow 
                shadow-mapSize={[2048, 2048]}
              />
              <fog attach="fog" args={['#08041a', 15, 180]} />

              <Sky 
                sunPosition={[10, -5, 100]} 
                turbidity={20} 
                rayleigh={0.5} 
                mieCoefficient={0.01} 
                mieDirectionalG={0.99}
                inclination={0.48}
                azimuth={0.25}
              />
              <Stars radius={100} depth={50} count={4000} factor={8} saturation={0.8} fade speed={0.3} />
              
              <Plaza />
              <Grass position={[0, 0, 0]} />
              <Castle position={[0, 0, -50]} scale={6} />
              <Weather season={currentSeason} />
              
              <VesperNPC position={[25, 0, 25]} onChat={onChatWithNPC} />
              <Horses position={[45, 0, -20]} onMount={() => {}} />
              <Butterflies count={30} />
              
              <WorldModels />

              {/* World Portals — gateways to other environments */}
              <WorldPortals
                environments={environmentCatalog.environments}
                onTeleportToWorld={handleWorldTeleport}
              />
              
              <PlayerController 
                startPosition={playerPosition}
                onPositionChange={handlePlayerTeleport} 
                cameraDistance={25}
              />

              <ContactShadows position={[0, 0, 0]} opacity={0.35} scale={100} blur={2.5} far={40} resolution={256} color="#000000" />

              {/* Second World Post-Processing */}
              <SafeEffects>
                <EffectComposer>
                  <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} intensity={1.5} mipmapBlur />
                  <Vignette eskil={false} offset={0.2} darkness={0.8} />
                  <Noise opacity={0.03} />
                </EffectComposer>
              </SafeEffects>
            </>
          )}

          </Suspense>
        </Canvas>
      </KeyboardControls>

      {/* === GAME UI LAYER === */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
        {/* Top bar buttons */}
        <div style={{
          position: 'absolute',
          top: 12,
          left: 12,
          pointerEvents: 'auto',
          zIndex: 50,
          display: 'flex',
          gap: 8,
        }}>
          {/* Editor button (classic mode only) */}
          {!activeEnvironment && (
            <button
              onClick={() => setEditorMode(true)}
              title="Open World Editor (F8)"
              style={{
                padding: '6px 12px',
                background: 'rgba(0, 255, 255, 0.1)',
                border: '1px solid #00ffff44',
                color: '#00ffff',
                borderRadius: 6,
                cursor: 'pointer',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 11,
                fontWeight: 600,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(0, 255, 255, 0.25)';
                e.currentTarget.style.borderColor = '#00ffff';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(0, 255, 255, 0.1)';
                e.currentTarget.style.borderColor = '#00ffff44';
              }}
            >
              EDITOR (F8)
            </button>
          )}

          {/* Environment Browser button */}
          <button
            onClick={() => setShowEnvironmentBrowser(true)}
            title="Browse Environments (F9)"
            style={{
              padding: '6px 12px',
              background: activeEnvironment ? 'rgba(0, 255, 136, 0.15)' : 'rgba(0, 255, 255, 0.1)',
              border: `1px solid ${activeEnvironment ? '#00ff8844' : '#00ffff44'}`,
              color: activeEnvironment ? '#00ff88' : '#00ffff',
              borderRadius: 6,
              cursor: 'pointer',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 11,
              fontWeight: 600,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = activeEnvironment ? 'rgba(0, 255, 136, 0.3)' : 'rgba(0, 255, 255, 0.25)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = activeEnvironment ? 'rgba(0, 255, 136, 0.15)' : 'rgba(0, 255, 255, 0.1)';
            }}
          >
            🌍 WORLDS (F9)
          </button>

          {/* Back to classic button (when in environment mode) */}
          {activeEnvironment && (
            <button
              onClick={handleBackToClassic}
              title="Back to classic world"
              style={{
                padding: '6px 12px',
                background: 'rgba(255, 170, 0, 0.1)',
                border: '1px solid rgba(255, 170, 0, 0.3)',
                color: '#ffaa00',
                borderRadius: 6,
                cursor: 'pointer',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 11,
                fontWeight: 600,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 170, 0, 0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 170, 0, 0.1)'}
            >
              ← CLASSIC
            </button>
          )}
        </div>

        {/* Active environment name badge */}
        {activeEnvironment && (
          <div style={{
            position: 'absolute',
            top: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            zIndex: 40,
            padding: '6px 16px',
            background: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(0, 255, 136, 0.2)',
            borderRadius: 20,
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 12,
            fontWeight: 600,
            color: '#00ff88',
            textShadow: '0 0 10px rgba(0,255,136,0.5)',
          }}>
            🌍 {activeEnvironment.name}
          </div>
        )}

        {/* Loading overlay */}
        {environmentLoading && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(5, 5, 15, 0.8)',
            pointerEvents: 'auto',
            zIndex: 100,
          }}>
            <div style={{
              fontFamily: '"JetBrains Mono", monospace',
              color: '#00ffff',
              fontSize: 18,
              fontWeight: 700,
              animation: 'pulse 1.5s ease-in-out infinite',
            }}>
              Loading environment...
            </div>
          </div>
        )}

        <Suspense fallback={null}>
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
          
          <div style={{ pointerEvents: 'auto' }}>
            <AchievementSystem />
          </div>
          
          <div style={{ pointerEvents: 'auto' }}>
            {photoModeActive && <PhotoMode active={true} />}
            {showInventory && <InventorySystem onClose={() => setShowInventory(false)} />}
            {showQuestJournal && <QuestJournal onClose={() => setShowQuestJournal(false)} />}
            {showPetSelector && <PetCompanion onSelect={setActivePet} onClose={() => setShowPetSelector(false)} />}
            {showCrafting && <CraftingSystem recipes={unlockedRecipes} onClose={() => setShowCrafting(false)} />}
          </div>
        </Suspense>
      </div>

      {/* Environment Browser Overlay */}
      {showEnvironmentBrowser && (
        <EnvironmentBrowser
          environments={environmentCatalog.environments}
          activeEnvironmentId={activeEnvironmentId}
          onSelect={handleSelectEnvironment}
          onClose={() => setShowEnvironmentBrowser(false)}
          onAddNew={() => setShowAddDialog(true)}
        />
      )}

      {/* Add Environment Dialog */}
      {showAddDialog && (
        <AddEnvironmentDialog onClose={() => setShowAddDialog(false)} />
      )}

      {/* World transition overlay */}
      {transitionVisible && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: '#050510',
          opacity: transitionOpacity,
          transition: 'opacity 0.6s ease',
          zIndex: 200,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: transitionOpacity > 0.5 ? 'all' : 'none',
        }}>
          <div style={{
            color: '#00ffff',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 22,
            fontWeight: 700,
            textShadow: '0 0 30px rgba(0, 255, 255, 0.5)',
            letterSpacing: 2,
          }}>
            {transitionText}
          </div>
          <div style={{
            marginTop: 16,
            width: 80,
            height: 2,
            background: '#00ffff',
            borderRadius: 2,
            boxShadow: '0 0 20px rgba(0, 255, 255, 0.5)',
          }} />
        </div>
      )}

      {/* Controls hint */}
      <div style={{
        position: 'absolute',
        bottom: 10,
        left: '50%',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
        zIndex: 30,
        display: 'flex',
        gap: 8,
        padding: '4px 14px',
        background: 'rgba(0, 0, 0, 0.35)',
        borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.06)',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.4)',
        letterSpacing: 0.5,
      }}>
        <span>WASD Move</span><span style={{opacity:0.3}}>|</span>
        <span>Shift Run</span><span style={{opacity:0.3}}>|</span>
        <span>F Fly</span><span style={{opacity:0.3}}>|</span>
        <span>Space Jump/Up</span><span style={{opacity:0.3}}>|</span>
        <span>C Down</span><span style={{opacity:0.3}}>|</span>
        <span>Scroll Zoom</span><span style={{opacity:0.3}}>|</span>
        <span>Drag Orbit</span>
      </div>
    </div>
  );

  function handlePlayerTeleport(newPosition) {
    setPlayerPosition(newPosition);
    setPortalsTraveled(prev => prev + 1);
  }
}
