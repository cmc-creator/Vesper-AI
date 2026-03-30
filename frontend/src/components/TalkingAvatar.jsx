/**
 * TalkingAvatar.jsx
 * Real-time lip-synced 3D avatar — supports FBX and GLB/GLTF.
 * Drives mouthOpen + viseme morph targets from live Web Audio amplitude.
 * Defaults to /model.fbx (local file) when no avatarUrl is provided.
 */
import React, {
  Suspense, useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useFBX, OrbitControls, Environment, ContactShadows, Html } from '@react-three/drei';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { Box, Typography, CircularProgress } from '@mui/material';
import { GraphicEq } from '@mui/icons-material';
import * as THREE from 'three';

// ── Default model served from /public ─────────────────────────────────────────
const DEFAULT_AVATAR_URL = '/model.glb';

// ─── Viseme cycle (rotates through adjacent mouth shapes while speaking) ─────
const VISEME_SHAPES = [
  'viseme_aa', 'viseme_E', 'viseme_I', 'viseme_O', 'viseme_U',
  'viseme_PP', 'viseme_FF', 'viseme_TH', 'viseme_DD',
  'viseme_kk', 'viseme_CH', 'viseme_SS', 'viseme_nn', 'viseme_RR',
];

function findUpperArmBone(root, side = 'left') {
  const patterns = side === 'left'
    ? ['mixamorigleftarm', 'leftarm', 'left_arm', 'upperarm_l', 'l_upperarm', 'arm_l']
    : ['mixamorigrigtharm', 'mixamorigrightarm', 'rightarm', 'right_arm', 'upperarm_r', 'r_upperarm', 'arm_r'];

  let match = null;
  root.traverse((obj) => {
    if (match || !obj.isBone || !obj.name) return;
    const n = obj.name.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (patterns.some((p) => n.includes(p))) {
      match = obj;
    }
  });
  return match;
}

function findArmEndBone(upperArm, side = 'left') {
  const endPatterns = side === 'left'
    ? ['lefthand', 'left_hand', 'leftwrist', 'leftforearm', 'left_lowerarm', 'lowerarm_l', 'hand_l']
    : ['righthand', 'right_hand', 'rightwrist', 'rightforearm', 'right_lowerarm', 'lowerarm_r', 'hand_r'];

  let namedMatch = null;
  let deepest = null;
  let deepestDepth = -1;

  upperArm.traverse((obj) => {
    if (!obj.isBone || obj === upperArm) return;
    const name = (obj.name || '').toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!namedMatch && endPatterns.some((p) => name.includes(p))) {
      namedMatch = obj;
    }

    let depth = 0;
    let cur = obj;
    while (cur && cur !== upperArm) {
      depth += 1;
      cur = cur.parent;
    }
    if (depth > deepestDepth) {
      deepestDepth = depth;
      deepest = obj;
    }
  });

  return namedMatch || deepest;
}

function scoreArmPose(upperArm, endBone) {
  if (!endBone) return -999;
  const shoulderPos = new THREE.Vector3();
  const endPos = new THREE.Vector3();
  upperArm.getWorldPosition(shoulderPos);
  endBone.getWorldPosition(endPos);

  const verticalDrop = shoulderPos.y - endPos.y;
  const lateralExtension = Math.abs(endPos.x - shoulderPos.x);
  const forwardExtension = Math.abs(endPos.z - shoulderPos.z);
  return verticalDrop * 1.2 - lateralExtension * 1.5 - forwardExtension * 0.75;
}

function applyBestRelaxedArmRotation(root, upperArm, side = 'left') {
  if (!upperArm) return;

  const endBone = findArmEndBone(upperArm, side);
  const originalQuat = upperArm.quaternion.clone();
  const candidates = [
    { x: 0, z: 0 },
    { x: 0, y: 0.3, z: 1.2 },
    { x: 0, y: -0.3, z: -1.2 },
    { x: 0, y: 0.4, z: 1.5 },
    { x: 0, y: -0.4, z: -1.5 },
    { x: 0, y: 0.5, z: 1.8 },
    { x: 0, y: -0.5, z: -1.8 },
    { x: 1.0, z: 0 },
    { x: -1.0, z: 0 },
    { x: 0.6, y: 0.25, z: 1.1 },
    { x: 0.6, y: -0.25, z: -1.1 },
    { x: -0.6, y: 0.25, z: 1.1 },
    { x: -0.6, y: -0.25, z: -1.1 },
  ];

  let bestQuat = originalQuat.clone();
  let bestScore = -999;

  for (const candidate of candidates) {
    upperArm.quaternion.copy(originalQuat);
    upperArm.rotateX(candidate.x || 0);
    upperArm.rotateY(candidate.y || 0);
    upperArm.rotateZ(candidate.z || 0);
    root.updateMatrixWorld(true);
    const score = scoreArmPose(upperArm, endBone);
    if (score > bestScore) {
      bestScore = score;
      bestQuat = upperArm.quaternion.clone();
    }
  }

  upperArm.quaternion.copy(bestQuat);
  root.updateMatrixWorld(true);
}

function applyRelaxedArmPose(root) {
  const leftUpperArm = findUpperArmBone(root, 'left');
  const rightUpperArm = findUpperArmBone(root, 'right');

  applyBestRelaxedArmRotation(root, leftUpperArm, 'left');
  applyBestRelaxedArmRotation(root, rightUpperArm, 'right');
}

// ── Shared lip-sync hook (works for both FBX and GLB meshes) ──────────────────
function useLipSync(sceneObject, analyserRef, isSpeaking) {
  const meshesRef = useRef([]);
  const smoothAmplitude = useRef(0);
  const currentVisemeRef = useRef(0);
  const visemeTimerRef = useRef(0);
  const blinkTimerRef = useRef(0);
  const blinkDurationRef = useRef(0);

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
    blinkTimerRef.current -= delta;
    if (blinkDurationRef.current > 0) blinkDurationRef.current -= delta;
    if (blinkTimerRef.current <= 0) {
      // Softer, more natural blink cadence.
      blinkDurationRef.current = 0.075 + Math.random() * 0.04;
      blinkTimerRef.current = 2.7 + Math.random() * 3.2;
    }
    const blinkOn = blinkDurationRef.current > 0;
    const blinkVal = blinkOn ? 1 : 0;
    const eyeFocus = isSpeaking ? 0.02 : 0.045;
    const eyeWander = Math.sin(performance.now() * 0.0012) * eyeFocus;

    if (!isSpeaking || !analyserRef?.current) {
      smoothAmplitude.current = THREE.MathUtils.lerp(smoothAmplitude.current, 0, 0.15);
      setMorph('mouthOpen', smoothAmplitude.current * 0.3);
      setMorph('eyeBlinkLeft', blinkVal);
      setMorph('eyeBlinkRight', blinkVal);
      setMorph('blink_left', blinkVal);
      setMorph('blink_right', blinkVal);
      setMorph('eyesClosed', blinkVal * 0.9);
      // Keep gaze mostly centered with tiny alive motion.
      setMorph('eyeLookInLeft', Math.max(0, eyeWander));
      setMorph('eyeLookOutLeft', Math.max(0, -eyeWander));
      setMorph('eyeLookInRight', Math.max(0, -eyeWander));
      setMorph('eyeLookOutRight', Math.max(0, eyeWander));
      setMorph('eyeLookUpLeft', 0.01);
      setMorph('eyeLookUpRight', 0.01);
      setMorph('eyeLookDownLeft', 0);
      setMorph('eyeLookDownRight', 0);
      setMorph('cheekSquintLeft', 0);
      setMorph('cheekSquintRight', 0);
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
    setMorph('eyeBlinkLeft', blinkVal);
    setMorph('eyeBlinkRight', blinkVal);
    setMorph('blink_left', blinkVal);
    setMorph('blink_right', blinkVal);
    setMorph('eyesClosed', blinkVal * 0.9);
    // Speaking gaze bias: steady eye contact with tiny micro-saccades.
    setMorph('eyeLookInLeft', Math.max(0, eyeWander));
    setMorph('eyeLookOutLeft', Math.max(0, -eyeWander));
    setMorph('eyeLookInRight', Math.max(0, -eyeWander));
    setMorph('eyeLookOutRight', Math.max(0, eyeWander));
    setMorph('eyeLookUpLeft', 0.012);
    setMorph('eyeLookUpRight', 0.012);
    setMorph('eyeLookDownLeft', 0);
    setMorph('eyeLookDownRight', 0);
    const cheek = Math.min(0.35, amp * 0.45);
    setMorph('cheekSquintLeft', cheek);
    setMorph('cheekSquintRight', cheek);
    setMorph('cheekPuff', amp * 0.12);
    // A tiny confident smile lives under speech dynamics.
    setMorph('mouthSmile', 0.06 + amp * 0.18);
  }, [analyserRef, isSpeaking, setMorph]);
}

function getSpeechAmplitude(analyserRef) {
  const analyser = analyserRef?.current;
  if (!analyser || !analyser.frequencyBinCount) return 0;
  try {
    const len = analyser.frequencyBinCount;
    if (!analyser.__vesperData || analyser.__vesperData.length !== len) {
      analyser.__vesperData = new Uint8Array(len);
    }
    const data = analyser.__vesperData;
    analyser.getByteFrequencyData(data);

    const sliceWidth = data.length / 4;
    let sum = 0;
    const start = Math.floor(sliceWidth * 0.1);
    const end = Math.floor(sliceWidth * 1.5);
    for (let i = start; i < end; i++) sum += data[i];
    return Math.max(0, Math.min(1, sum / (sliceWidth * 1.4 * 255)));
  } catch (_) {
    return 0;
  }
}

// ── Fixed portrait camera — tuned for sidebar portrait card framing
// Keeps full face visible while placing crown close to top edge of the card.
function CameraSetup({ isSpeaking = false }) {
  const { camera } = useThree();
  const baseRef = useRef({ x: 0, y: 0, z: 0, fov: 31 });
  useEffect(() => {
    camera.position.set(0, 2.48, 1.16);
    camera.fov = 31;
    camera.updateProjectionMatrix();
    camera.lookAt(0, 2.2, 0);
    baseRef.current = { x: 0, y: 2.48, z: 1.16, fov: 31 };
  }, [camera]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const breath = isSpeaking ? 0.45 : 1;
    const y = baseRef.current.y + Math.sin(t * 0.55) * 0.008 * breath;
    const z = baseRef.current.z + Math.sin(t * 0.42) * 0.006 * breath;
    camera.position.set(baseRef.current.x, y, z);
    camera.fov = baseRef.current.fov + Math.sin(t * 0.35) * 0.12;
    camera.updateProjectionMatrix();
    camera.lookAt(0, 2.2, 0);
  });

  return null;
}

// ── GLB/GLTF model ─────────────────────────────────────────────────────────────
function LipSyncModelGLTF({ url, analyserRef, isSpeaking, scale, position }) {
  const groupRef  = useRef();
  const headRef   = useRef(null);
  const spineRef  = useRef(null);
  const jawRef    = useRef(null);
  const neckRef   = useRef(null);
  const baseHeadRotRef = useRef(null);
  const baseSpineRotRef = useRef(null);
  const baseJawRotRef = useRef(null);
  const baseNeckRotRef = useRef(null);

  const { scene } = useGLTF(url);

  const cloned = React.useMemo(() => {
    const c = skeletonClone(scene);
    c.traverse((obj) => {
      if (obj.isMesh) {
        obj.material = Array.isArray(obj.material)
          ? obj.material.map(m => m.clone())
          : obj.material.clone();
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);

  useEffect(() => {
    if (!cloned) return;
    // Cache head + spine for procedural motion
    cloned.traverse((obj) => {
      const n = obj.name.toLowerCase();
      if (!headRef.current  && n.includes('head') && !n.includes('headtop') && !n.includes('end')) headRef.current  = obj;
      if (!spineRef.current && (n.includes('spine1') || n.includes('spine2') || n.includes('chest'))) spineRef.current = obj;
      if (!jawRef.current && (n.includes('jaw') || n.includes('chin'))) jawRef.current = obj;
      if (!neckRef.current && n.includes('neck')) neckRef.current = obj;
    });

    if (headRef.current) baseHeadRotRef.current = {
      x: headRef.current.rotation.x,
      y: headRef.current.rotation.y,
      z: headRef.current.rotation.z,
    };
    if (spineRef.current) baseSpineRotRef.current = {
      x: spineRef.current.rotation.x,
      y: spineRef.current.rotation.y,
      z: spineRef.current.rotation.z,
    };
    if (jawRef.current) baseJawRotRef.current = {
      x: jawRef.current.rotation.x,
      y: jawRef.current.rotation.y,
      z: jawRef.current.rotation.z,
    };
    if (neckRef.current) baseNeckRotRef.current = {
      x: neckRef.current.rotation.x,
      y: neckRef.current.rotation.y,
      z: neckRef.current.rotation.z,
    };

    // Relax T-pose style arms so they sit naturally by the torso.
    applyRelaxedArmPose(cloned);
  }, [cloned]);

  const tick = useLipSync(cloned, analyserRef, isSpeaking);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const speechAmp = isSpeaking ? getSpeechAmplitude(analyserRef) : 0;
    // Subtle head sway — alive, not robotic
    if (headRef.current && baseHeadRotRef.current) {
      headRef.current.rotation.x = baseHeadRotRef.current.x + Math.sin(t * 0.32) * 0.008 - speechAmp * 0.02;
      headRef.current.rotation.y = baseHeadRotRef.current.y + Math.sin(t * 0.35) * 0.03;
      headRef.current.rotation.z = baseHeadRotRef.current.z + Math.sin(t * 0.28) * 0.012;
    }
    if (jawRef.current && baseJawRotRef.current) jawRef.current.rotation.x = baseJawRotRef.current.x + speechAmp * 0.28;
    if (neckRef.current && baseNeckRotRef.current) {
      neckRef.current.rotation.x = baseNeckRotRef.current.x + Math.sin(t * 0.55) * 0.008 + speechAmp * 0.012;
      neckRef.current.rotation.y = baseNeckRotRef.current.y + Math.sin(t * 0.42) * 0.007;
    }
    // Breathing
    if (spineRef.current && baseSpineRotRef.current) {
      spineRef.current.rotation.x = baseSpineRotRef.current.x + Math.sin(t * 0.75) * 0.006 + speechAmp * 0.01;
    }
    // Gentle float bob
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(t * 0.6) * 0.02 + speechAmp * 0.04;
    }
    tick(delta);
  });

  return (
    <group ref={groupRef} position={position} scale={scale}>
      <primitive object={cloned} />
    </group>
  );
}

// ── FBX model ──────────────────────────────────────────────────────────────────
function LipSyncModelFBX({ url, analyserRef, isSpeaking, scale, position }) {
  const groupRef = useRef();
  const headRef  = useRef(null);
  const spineRef = useRef(null);
  const jawRef   = useRef(null);
  const neckRef  = useRef(null);
  const baseHeadRotRef = useRef(null);
  const baseSpineRotRef = useRef(null);
  const baseJawRotRef = useRef(null);
  const baseNeckRotRef = useRef(null);
  const fbx = useFBX(url);
  const cloned = React.useMemo(() => fbx.clone(true), [fbx]);
  const tick = useLipSync(cloned, analyserRef, isSpeaking);

  useEffect(() => {
    if (!cloned) return;
    cloned.traverse((obj) => {
      const n = (obj.name || '').toLowerCase();
      if (!headRef.current && n.includes('head') && !n.includes('headtop') && !n.includes('end')) headRef.current = obj;
      if (!spineRef.current && (n.includes('spine') || n.includes('chest'))) spineRef.current = obj;
      if (!jawRef.current && (n.includes('jaw') || n.includes('chin'))) jawRef.current = obj;
      if (!neckRef.current && n.includes('neck')) neckRef.current = obj;
    });
    if (headRef.current) baseHeadRotRef.current = {
      x: headRef.current.rotation.x,
      y: headRef.current.rotation.y,
      z: headRef.current.rotation.z,
    };
    if (spineRef.current) baseSpineRotRef.current = {
      x: spineRef.current.rotation.x,
      y: spineRef.current.rotation.y,
      z: spineRef.current.rotation.z,
    };
    if (jawRef.current) baseJawRotRef.current = {
      x: jawRef.current.rotation.x,
      y: jawRef.current.rotation.y,
      z: jawRef.current.rotation.z,
    };
    if (neckRef.current) baseNeckRotRef.current = {
      x: neckRef.current.rotation.x,
      y: neckRef.current.rotation.y,
      z: neckRef.current.rotation.z,
    };
    applyRelaxedArmPose(cloned);
  }, [cloned]);

  // Auto-normalise: measure bounding box and scale so the model is ~1.8 units tall
  const normScale = React.useMemo(() => {
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    box.getSize(size);
    const tallest = Math.max(size.x, size.y, size.z);
    if (tallest < 0.01) return scale; // fallback if empty
    return (1.8 / tallest) * scale;
  }, [cloned, scale]);

  // Center the model vertically on its own bounding box
  const normPosition = React.useMemo(() => {
    const box = new THREE.Box3().setFromObject(cloned);
    const center = new THREE.Vector3();
    box.getCenter(center);
    return [position[0] - center.x * normScale, position[1] - center.y * normScale, position[2]];
  }, [cloned, normScale, position]);

  useFrame(({ clock }, delta) => {
    const speechAmp = isSpeaking ? getSpeechAmplitude(analyserRef) : 0;
    if (headRef.current && baseHeadRotRef.current) {
      headRef.current.rotation.x = baseHeadRotRef.current.x + Math.sin(clock.elapsedTime * 0.3) * 0.008 - speechAmp * 0.018;
      headRef.current.rotation.y = baseHeadRotRef.current.y + Math.sin(clock.elapsedTime * 0.35) * 0.03;
    }
    if (jawRef.current && baseJawRotRef.current) jawRef.current.rotation.x = baseJawRotRef.current.x + speechAmp * 0.26;
    if (neckRef.current && baseNeckRotRef.current) {
      neckRef.current.rotation.x = baseNeckRotRef.current.x + Math.sin(clock.elapsedTime * 0.52) * 0.007 + speechAmp * 0.01;
      neckRef.current.rotation.y = baseNeckRotRef.current.y + Math.sin(clock.elapsedTime * 0.4) * 0.007;
    }
    if (spineRef.current && baseSpineRotRef.current) {
      spineRef.current.rotation.x = baseSpineRotRef.current.x + Math.sin(clock.elapsedTime * 0.7) * 0.006 + speechAmp * 0.01;
    }
    if (groupRef.current)
      groupRef.current.position.y = normPosition[1] + Math.sin(clock.elapsedTime * 0.7) * 0.03 + speechAmp * 0.035;
    tick(delta);
  });
  return <group ref={groupRef} position={normPosition} scale={normScale}><primitive object={cloned} /></group>;
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

// ─── Makeup overlay — cosmic ice-queen goddess ──────────────────────────────
function MakeupOverlay({ isSpeaking, accentColor = '#a855f7' }) {
  const accent = new THREE.Color(accentColor);
  const aR = Math.round(accent.r * 255);
  const aG = Math.round(accent.g * 255);
  const aB = Math.round(accent.b * 255);

  return (
    <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3 }}>

      {/* ── Ambient face rim — very faint cool halo around face edge only ── */}
      <Box sx={{
        position: 'absolute',
        left: '8%', right: '8%',
        top: '9%', height: '64%',
        borderRadius: '44% 44% 52% 52% / 28% 28% 72% 72%',
        background: 'radial-gradient(ellipse at 50% 44%, rgba(0,0,0,0) 52%, rgba(80,160,220,0.12) 76%, rgba(0,0,0,0) 100%)',
        mixBlendMode: 'screen',
        filter: 'blur(6px)',
      }} />

      {/* ── Cheek flush — cool lavender-rose, very subtle ── */}
      <Box sx={{
        position: 'absolute',
        left: '4%', top: '36%', width: '22%', height: '14%',
        borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(180,120,200,0.13) 0%, rgba(0,0,0,0) 100%)',
        mixBlendMode: 'screen',
        filter: 'blur(6px)',
      }} />
      <Box sx={{
        position: 'absolute',
        right: '4%', top: '36%', width: '22%', height: '14%',
        borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(180,120,200,0.13) 0%, rgba(0,0,0,0) 100%)',
        mixBlendMode: 'screen',
        filter: 'blur(6px)',
      }} />

      {/* ── Lip color — barely-there cool pink ── */}
      <Box sx={{
        position: 'absolute',
        left: '33%', right: '33%', top: '51%', height: '7%',
        borderRadius: '50% 50% 46% 46%',
        background: 'radial-gradient(ellipse at 50% 44%, rgba(180,110,160,0.22) 0%, rgba(140,70,130,0.1) 55%, rgba(0,0,0,0) 100%)',
        mixBlendMode: 'screen',
        filter: 'blur(2.4px)',
      }} />

      {/* ── Accent crown glow — top edge shimmer ── */}
      <Box sx={{
        position: 'absolute',
        left: '18%', right: '18%', top: '-5%', height: '14%',
        background: `radial-gradient(ellipse at 50% 80%, rgba(${aR},${aG},${aB},0.14) 0%, rgba(0,0,0,0) 100%)`,
        filter: 'blur(3px)',
        mixBlendMode: 'screen',
      }} />
    </Box>
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

function FlowingHairOverlay({ isSpeaking, accentColor = '#a855f7' }) {
  // Stable sparkle positions — computed once, not on every render
  const sparkles = [
    { x: 8,  y: -18 }, { x: 14, y: -8  }, { x: 88, y: -22 }, { x: 82, y: -4  },
    { x: 5,  y: 12  }, { x: 92, y: 8   }, { x: 11, y: 28  }, { x: 86, y: 18  },
    { x: 18, y: -30 }, { x: 78, y: -28 }, { x: 6,  y: 42  }, { x: 91, y: 38  },
  ];
  const durations = [4.2, 5.1, 3.8, 6.0, 4.7, 5.4, 3.6, 4.9, 5.8, 4.1, 6.2, 3.9];
  const delays    = [0,   0.8, 1.5, 0.3, 1.9, 0.6, 2.1, 1.2, 0.1, 1.7, 0.9, 2.4];

  return (
    <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2 }}>
      {/* Soft vignette around the very edges — does NOT cover the center */}
      <Box sx={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 42%, rgba(0,0,0,0.55) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Sparkles scattered near top edges (outside face area) */}
      {sparkles.map((s, i) => (
        <Box key={`spark-${i}`} sx={{
          position: 'absolute',
          left: `${s.x}%`,
          top: `${s.y}%`,
          width: '2px', height: '2px',
          borderRadius: '50%',
          background: 'rgba(160,210,255,0.9)',
          boxShadow: '0 0 4px rgba(120,190,240,0.6)',
          animation: `sparkle${i} ${durations[i]}s ease-in-out ${delays[i]}s infinite`,
          [`@keyframes sparkle${i}`]: {
            '0%, 100%': { opacity: 0.05, transform: 'scale(0.8)' },
            '50%':       { opacity: 0.55, transform: 'scale(1.3)' },
          },
        }} />
      ))}
    </Box>
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
  fill = false,
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
      height: fill ? '100%' : (compact ? 130 : height),
      flex: fill ? 1 : undefined,
      borderRadius: 2,
      overflow: 'hidden',
      background: `radial-gradient(ellipse at 50% 30%, ${accentColor}18 0%, #0d0d1a 70%)`,
      border: `1px solid ${accentColor}33`,
      transition: 'box-shadow 0.4s ease',
      boxShadow: isSpeaking
        ? `0 0 30px ${accentColor}55, inset 0 0 40px ${accentColor}0a`
        : `inset 0 0 30px rgba(0,0,0,0.4)`,
    }}>
      <Canvas
        camera={{ position: [0, 2.48, 1.16], fov: 31 }}
        gl={{ antialias: true, alpha: true, toneMappingExposure: 1.4 }}
        style={{ background: 'transparent' }}
        onError={() => setLoadError(true)}
      >
        <CameraSetup isSpeaking={isSpeaking} />
        {/* Low ambient — cool cosmic atmosphere */}
        <ambientLight intensity={0.32} />
        {/* Hemisphere — cool ice-blue sky for divine feel */}
        <hemisphereLight skyColor="#4da6ff" groundColor="#0a0a1a" intensity={0.48} />
        {/* Primary key light from upper-front-right */}
        <directionalLight position={[1.5, 3, 3]} intensity={2.2} castShadow />
        {/* Cool blue-cyan fill from front-left — cosmic divine light */}
        <pointLight position={[0.6, 2.6, 1.8]} intensity={1.4} color="#00d4ff" />
        {/* Soft fill from the left — accent tinted */}
        <directionalLight position={[-2, 1.5, 1]} intensity={0.7} color={accentColor} />
        {/* Rim / back light — cool blue-white */}
        <directionalLight position={[0, 2, -4]} intensity={0.8} color="#b3d9ff" />
        {/* Speaking pulse — front cool point ✓ */}
        <pointLight position={[0, 1.6, 1.2]} intensity={isSpeaking ? 1.6 : 0.0} color="#00d4ff" />
        {/* Subtle cheek cool bounce */}
        <pointLight position={[0, 1.8, 0.8]} intensity={0.32} color="#6699ff" />

        <Suspense fallback={<LoadingFallback accentColor={accentColor} />}>
          <LipSyncModel
            url={resolvedUrl}
            analyserRef={analyserRef}
            isSpeaking={isSpeaking}
            scale={compact ? 1.24 : 1.4}
            position={[0, 0.03, 0]}
          />
          <ContactShadows position={[0, 0, 0]} opacity={0.3} scale={4} blur={2} />
          <Environment preset="warehouse" />
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

      {/* Hair, makeup, and glow overlays */}
      <FlowingHairOverlay isSpeaking={isSpeaking} accentColor={accentColor} />
      <MakeupOverlay isSpeaking={isSpeaking} accentColor={accentColor} />
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
