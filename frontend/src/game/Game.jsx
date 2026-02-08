import React, { useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
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
  MeshReflectorMaterial
} from '@react-three/drei';
import { 
  EffectComposer, 
  Bloom, 
  DepthOfField, 
  SSAO,
  Vignette,
  ChromaticAberration,
  ToneMapping
} from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import Character from './Character';
import Terrain from './Terrain';
import Castle from './Castle';
import Weather from './Weather';
import GameUI from './GameUI';
import VesperNPC from './VesperNPC';
import Horses from './Horses';

export default function Game({ onExitGame, onChatWithNPC }) {
  const [weather, setWeather] = useState('clear');
  const [timeOfDay, setTimeOfDay] = useState('day');
  const [questsCompleted, setQuestsCompleted] = useState(0);
  const [crystalsCollected, setCrystalsCollected] = useState(0);
  const [playerPosition, setPlayerPosition] = useState([0, 2, 5]);
  const [showingChat, setShowingChat] = useState(false);
  const [keyboard, setKeyboard] = useState({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if (key === 'w') setKeyboard(k => ({ ...k, forward: true }));
      if (key === 's') setKeyboard(k => ({ ...k, backward: true }));
      if (key === 'a') setKeyboard(k => ({ ...k, left: true }));
      if (key === 'd') setKeyboard(k => ({ ...k, right: true }));
      if (key === 'escape') onExitGame();
      if (key === 'c') setShowingChat(!showingChat);
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
  }, [onExitGame, showingChat]);

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
        shadows
        camera={{ position: [0, 5, 10], fov: 60 }}
        style={{ background: '#000' }}
        gl={{ 
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance'
        }}
      >
        {/* Lighting */}
        <ambientLight intensity={weather === 'night' ? 0.2 : 0.5} />
        <directionalLight
          position={[50, 50, 25]}
          intensity={weather === 'night' ? 0.3 : 1.5}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={100}
          shadow-camera-left={-50}
          shadow-camera-right={50}
          shadow-camera-top={50}
          shadow-camera-bottom={-50}
        />

        {/* Sky */}
        {weather === 'clear' && <Sky sunPosition={[100, 20, 100]} />}
        {weather === 'night' && <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />}

        {/* Environment */}
        <Environment preset={weather === 'night' ? 'night' : 'sunset'} />

        {/* Weather system */}
        <Weather type={weather} />

        {/* Game world */}
        <Terrain />
        <Castle position={[0, 0, -25]} />
        <Horses />

        {/* Player character */
        <Character position={playerPosition} keyboard={keyboard} />

        {/* Vesper NPC near castle */}
        <VesperNPC 
          position={[-8, 1.5, -15]} 
          onInteract={() => {
            setShowingChat(true);
            onChatWithNPC?.();
          }}
        />

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
          
          {/* ACES Filmic Tone Mapping - Hollywood-grade color */}
          <ToneMapping 
            mode={ToneMappingMode.ACES_FILMIC}
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
        <div style={{ marginTop: '10px', color: '#ffd700' }}>
          💎 Collect glowing crystals to complete quests!
        </div>
      </div>
    </div>
  );
}
