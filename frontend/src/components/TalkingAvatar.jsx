/**
 * TalkingAvatar.jsx
 * Real-time lip-synced 3D avatar — supports FBX and GLB/GLTF.
 * Drives mouthOpen + viseme morph targets from live Web Audio amplitude.
 * Defaults to /model.fbx (local file) when no avatarUrl is provided.
 */
import React, {
  Suspense, useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle,
} from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, useFBX, OrbitControls, Environment, ContactShadows, Html } from '@react-three/drei';
import { Box, Typography, CircularProgress } from '@mui/material';
import { GraphicEq } from '@mui/icons-material';
import * as THREE from 'three';

// ── Default model served from /public ──────────────────────────────────────────
const DEFAULT_AVATAR_URL = '/model.fbx';

// ─── Viseme cycle (rotates through adjacent mouth shapes while speaking) ─────
const VISEME_SHAPES = [
  'viseme_aa', 'viseme_E', 'viseme_I', 'viseme_O', 'viseme_U',
  'viseme_PP', 'viseme_FF', 'viseme_TH', 'viseme_DD',
  'viseme_kk', 'viseme_CH', 'viseme_SS', 'viseme_nn', 'viseme_RR',
];

// ── Shared lip-sync hook (works for both FBX and GLB meshes) ──────────────────
function useLipSync(sceneObject, analyserRef, isSpeaking) {
  const meshesRef = useRef([]);
  const smoothAmplitude = useRef(0);
  const currentVisemeRef = useRef(0);
  const visemeTimerRef = useRef(0);

  useEffect(() => {
    if (!sceneObject) return;
    const meshes = [];
    sceneObject.traverse((obj) => {
      if (obj.isMesh && obj.morphTargetInfluences && obj.morphTargetDictionary) meshes.push(obj);
    });
    meshesRef.current = meshes;
  }, [sceneObject]);

  const setMorph = useCallback((name, value) => {
    for (const mesh of meshesRef.current) {
      const idx = mesh.morphTargetDictionary?.[name];
      if (idx !== undefined) mesh.morphTargetInfluences[idx] = Math.max(0, Math.min(1, value));
    }
  }, []);

  return useCallback((delta) => {
    if (!isSpeaking || !analyserRef?.current) {
      smoothAmplitude.current = THREE.MathUtils.lerp(smoothAmplitude.current, 0, 0.15);
      setMorph('mouthOpen', smoothAmplitude.current * 0.3);
      return;
    }
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    const sliceWidth = dataArray.length / 4;
    let sum = 0;
    for (let i = Math.floor(sliceWidth * 0.1); i < Math.floor(sliceWidth * 1.5); i++) sum += dataArray[i];
    const rawAmp = sum / (sliceWidth * 1.4 * 255);
    smoothAmplitude.current = THREE.MathUtils.lerp(smoothAmplitude.current, rawAmp, 0.4);
    const amp = smoothAmplitude.current;
    setMorph('mouthOpen', amp * 0.85);
    visemeTimerRef.current += delta;
    const interval = 0.06 + (1 - amp) * 0.12;
    if (visemeTimerRef.current >= interval) {
      visemeTimerRef.current = 0;
      setMorph(VISEME_SHAPES[currentVisemeRef.current], 0);
      currentVisemeRef.current = (currentVisemeRef.current + 1 + Math.floor(Math.random() * 3)) % VISEME_SHAPES.length;
      setMorph(VISEME_SHAPES[currentVisemeRef.current], amp * 0.6);
    }
    setMorph('mouthSmile', amp * 0.2);
  }, [analyserRef, isSpeaking, setMorph]);
}

// ── GLB/GLTF model ─────────────────────────────────────────────────────────────
function LipSyncModelGLTF({ url, analyserRef, isSpeaking, scale, position }) {
  const groupRef = useRef();
  const { scene } = useGLTF(url);
  const cloned = React.useMemo(() => scene.clone(true), [scene]);
  const tick = useLipSync(cloned, analyserRef, isSpeaking);
  useFrame(({ clock }, delta) => {
    if (groupRef.current) groupRef.current.position.y = position[1] + Math.sin(clock.elapsedTime * 0.7) * 0.04;
    tick(delta);
  });
  return <group ref={groupRef} position={position} scale={scale}><primitive object={cloned} /></group>;
}

// ── FBX model ──────────────────────────────────────────────────────────────────
function LipSyncModelFBX({ url, analyserRef, isSpeaking, scale, position }) {
  const groupRef = useRef();
  const fbx = useFBX(url);
  const cloned = React.useMemo(() => fbx.clone(true), [fbx]);
  const tick = useLipSync(cloned, analyserRef, isSpeaking);
  useFrame(({ clock }, delta) => {
    if (groupRef.current) groupRef.current.position.y = position[1] + Math.sin(clock.elapsedTime * 0.7) * 0.04;
    tick(delta);
  });
  return <group ref={groupRef} position={position} scale={scale}><primitive object={cloned} /></group>;
}

// ── Router: pick loader by file extension ──────────────────────────────────────
function LipSyncModel({ url, ...props }) {
  if (url?.toLowerCase().endsWith('.fbx')) return <LipSyncModelFBX url={url} {...props} />;
  return <LipSyncModelGLTF url={url} {...props} />;
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

  // Fall back to bundled local model when no URL provided
  const resolvedUrl = avatarUrl || DEFAULT_AVATAR_URL;

  useImperativeHandle(ref, () => ({ hasError: loadError }));

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
            url={resolvedUrl}
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
