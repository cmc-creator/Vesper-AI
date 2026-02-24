/**
 * TalkingAvatar.jsx
 * Real-time lip-synced 3D avatar using Ready Player Me GLB + Web Audio API.
 * Drives mouthOpen and viseme morph targets from live audio amplitude.
 * Drop-in replacement/wrapper for VesperAvatar3D with speaking support.
 */
import React, {
  Suspense, useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle
} from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, ContactShadows, Html } from '@react-three/drei';
import { Box, Typography, CircularProgress, Tooltip, IconButton } from '@mui/material';
import { GraphicEq, VolumeOff, VolumeUp } from '@mui/icons-material';
import * as THREE from 'three';

// ─── Viseme cycle (rotates through adjacent mouth shapes while speaking) ─────
const VISEME_SHAPES = [
  'viseme_aa', 'viseme_E', 'viseme_I', 'viseme_O', 'viseme_U',
  'viseme_PP', 'viseme_FF', 'viseme_TH', 'viseme_DD',
  'viseme_kk', 'viseme_CH', 'viseme_SS', 'viseme_nn', 'viseme_RR',
];

// ─── The 3D model with live morph-target control ──────────────────────────────
function LipSyncModel({ url, analyserRef, isSpeaking, scale = 1.6, position = [0, -1.1, 0] }) {
  const groupRef = useRef();
  const meshesRef = useRef([]);          // meshes that have morph targets
  const currentVisemeRef = useRef(0);
  const visemeTimerRef = useRef(0);
  const smoothAmplitude = useRef(0);

  const { scene } = useGLTF(url);
  const clonedScene = React.useMemo(() => scene.clone(true), [scene]);

  // Gather all morph-target meshes once the scene loads
  useEffect(() => {
    const meshes = [];
    clonedScene.traverse((obj) => {
      if (obj.isMesh && obj.morphTargetInfluences && obj.morphTargetDictionary) {
        meshes.push(obj);
      }
    });
    meshesRef.current = meshes;
  }, [clonedScene]);

  // Helper: set a named morph target on all meshes that have it
  const setMorph = useCallback((name, value) => {
    for (const mesh of meshesRef.current) {
      const idx = mesh.morphTargetDictionary?.[name];
      if (idx !== undefined) {
        mesh.morphTargetInfluences[idx] = Math.max(0, Math.min(1, value));
      }
    }
  }, []);

  // Reset all mouth morphs to zero
  const resetMorphs = useCallback(() => {
    const allMorphNames = ['mouthOpen', 'mouthSmile', ...VISEME_SHAPES];
    for (const name of allMorphNames) setMorph(name, 0);
  }, [setMorph]);

  useFrame((state, delta) => {
    // Subtle hover
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.7) * 0.04;
    }

    if (!isSpeaking || !analyserRef?.current) {
      // Decay to zero when not speaking
      smoothAmplitude.current = THREE.MathUtils.lerp(smoothAmplitude.current, 0, 0.15);
      setMorph('mouthOpen', smoothAmplitude.current * 0.3);
      return;
    }

    // Read amplitude from live audio
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Focus on speech-frequency range (roughly 300–3000 Hz)
    const sliceWidth = dataArray.length / 4;
    let sum = 0;
    for (let i = Math.floor(sliceWidth * 0.1); i < Math.floor(sliceWidth * 1.5); i++) {
      sum += dataArray[i];
    }
    const rawAmplitude = sum / (sliceWidth * 1.4 * 255);  // 0–1
    smoothAmplitude.current = THREE.MathUtils.lerp(smoothAmplitude.current, rawAmplitude, 0.4);

    const amp = smoothAmplitude.current;

    // Drive primary mouth open
    setMorph('mouthOpen', amp * 0.85);

    // Cycle through viseme shapes based on amplitude (gives natural look)
    visemeTimerRef.current += delta;
    const switchInterval = 0.06 + (1 - amp) * 0.12; // faster when louder
    if (visemeTimerRef.current >= switchInterval) {
      visemeTimerRef.current = 0;
      // Fade out current viseme
      setMorph(VISEME_SHAPES[currentVisemeRef.current], 0);
      // Pick next (slightly randomised)
      currentVisemeRef.current = (currentVisemeRef.current + 1 + Math.floor(Math.random() * 3)) % VISEME_SHAPES.length;
      // Apply new one proportional to amplitude
      setMorph(VISEME_SHAPES[currentVisemeRef.current], amp * 0.6);
    }

    // Small smile while speaking — feels more natural
    setMorph('mouthSmile', amp * 0.2);
  });

  return (
    <group ref={groupRef} position={position} scale={scale}>
      <primitive object={clonedScene} />
    </group>
  );
}

// ─── Loading placeholder ──────────────────────────────────────────────────────
function LoadingFallback({ accentColor }) {
  return (
    <Html center>
      <Box sx={{ textAlign: 'center' }}>
        <CircularProgress size={22} sx={{ color: accentColor }} />
        <Typography variant="caption" sx={{ color: accentColor, display: 'block', mt: 1, fontSize: '0.6rem', fontFamily: 'monospace' }}>
          Initialising...
        </Typography>
      </Box>
    </Html>
  );
}

// ─── Speaking indicator ring (CSS, not Three.js) ─────────────────────────────
function SpeakingRing({ isSpeaking, accentColor }) {
  if (!isSpeaking) return null;
  return (
    <Box sx={{
      position: 'absolute',
      inset: 0,
      borderRadius: 'inherit',
      pointerEvents: 'none',
      '&::before': {
        content: '""',
        position: 'absolute',
        inset: -3,
        borderRadius: 'inherit',
        border: `2px solid ${accentColor}`,
        boxShadow: `0 0 18px ${accentColor}88, inset 0 0 18px ${accentColor}22`,
        animation: 'talkingPulse 0.8s ease-in-out infinite',
      },
      '@keyframes talkingPulse': {
        '0%, 100%': { opacity: 0.6, transform: 'scale(1)' },
        '50%':       { opacity: 1,   transform: 'scale(1.01)' },
      },
    }} />
  );
}

// ─── Main exported component ──────────────────────────────────────────────────
/**
 * Props:
 *   avatarUrl    {string}  - Ready Player Me .glb URL
 *   isSpeaking   {boolean} - Is Vesper currently speaking?
 *   analyserRef  {React.ref} - Web Audio AnalyserNode ref (from parent TTS code)
 *   height       {number}  - Container height in px (default 300)
 *   compact      {boolean} - Smaller view for sidebar/chat bubble
 *   accentColor  {string}  - Theme accent colour
 */
const TalkingAvatar = forwardRef(function TalkingAvatar({
  avatarUrl,
  isSpeaking = false,
  analyserRef,
  height = 300,
  compact = false,
  accentColor = '#a855f7',
  showControls = true,
}, ref) {
  const [loadError, setLoadError] = useState(false);

  // Allow parent to know if model loaded ok
  useImperativeHandle(ref, () => ({ hasError: loadError }));

  if (!avatarUrl) {
    return (
      <Box sx={{
        height: compact ? 130 : height,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 1,
        background: 'rgba(0,0,0,0.4)',
        borderRadius: 2,
        border: `1px dashed ${accentColor}33`,
      }}>
        <Typography variant="caption" sx={{ color: `${accentColor}88`, fontFamily: 'monospace', textAlign: 'center', px: 2 }}>
          No avatar URL set.{'\n'}
          Create one at readyplayer.me and paste the .glb URL in Settings.
        </Typography>
      </Box>
    );
  }

  if (loadError) {
    return (
      <Box sx={{
        height: compact ? 130 : height,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)', borderRadius: 2,
        border: '1px dashed rgba(255,68,68,0.3)',
      }}>
        <Typography variant="caption" sx={{ color: 'rgba(255,68,68,0.7)' }}>
          Failed to load avatar model
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{
      position: 'relative',
      height: compact ? 130 : height,
      borderRadius: 2,
      overflow: 'hidden',
      background: 'radial-gradient(ellipse at 50% 80%, rgba(168,85,247,0.08), rgba(0,0,0,0.6))',
      border: `1px solid ${accentColor}22`,
      transition: 'box-shadow 0.4s ease',
      boxShadow: isSpeaking ? `0 0 30px ${accentColor}44` : 'none',
    }}>
      <Canvas
        camera={{ position: [0, 0.4, compact ? 2.2 : 3], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
        onError={() => setLoadError(true)}
      >
        <ambientLight intensity={0.55} />
        <directionalLight position={[3, 5, 4]} intensity={0.9} castShadow />
        <directionalLight position={[-3, 2, -2]} intensity={0.35} color={accentColor} />
        <pointLight position={[0, 3, 1]} intensity={isSpeaking ? 0.8 : 0.25} color={accentColor} />

        <Suspense fallback={<LoadingFallback accentColor={accentColor} />}>
          <LipSyncModel
            url={avatarUrl}
            analyserRef={analyserRef}
            isSpeaking={isSpeaking}
            scale={compact ? 1.3 : 1.6}
            position={compact ? [0, -0.9, 0] : [0, -1.1, 0]}
          />
          <ContactShadows position={[0, -1.2, 0]} opacity={0.35} scale={8} blur={2.5} />
          <Environment preset="night" />
        </Suspense>

        {showControls && (
          <OrbitControls
            enablePan={false}
            enableZoom={!compact}
            minDistance={1.5} maxDistance={6}
            minPolarAngle={Math.PI / 6} maxPolarAngle={Math.PI / 1.8}
            autoRotate={!isSpeaking && !compact}
            autoRotateSpeed={0.6}
          />
        )}
      </Canvas>

      {/* Speaking glow ring */}
      <SpeakingRing isSpeaking={isSpeaking} accentColor={accentColor} />

      {/* Speaking badge */}
      {isSpeaking && (
        <Box sx={{
          position: 'absolute', bottom: 8, left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 0.5,
          bgcolor: `${accentColor}22`,
          border: `1px solid ${accentColor}55`,
          borderRadius: 10,
          px: 1.2, py: 0.3,
          backdropFilter: 'blur(8px)',
        }}>
          <GraphicEq sx={{ fontSize: 12, color: accentColor, animation: 'spin 1s linear infinite',
            '@keyframes spin': { '0%': { opacity: 0.4 }, '50%': { opacity: 1 }, '100%': { opacity: 0.4 } }
          }} />
          <Typography variant="caption" sx={{ fontSize: '0.6rem', color: accentColor, fontFamily: 'monospace', letterSpacing: 1 }}>
            SPEAKING
          </Typography>
        </Box>
      )}
    </Box>
  );
});

export default TalkingAvatar;
