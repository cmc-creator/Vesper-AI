import React, { useRef, useMemo, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Sparkles, Html } from '@react-three/drei';
import * as THREE from 'three';

/* ============================================================
   GLB Horse — loads a real 3D model + plays animations
   ============================================================ */
function GLBHorse({ url, position, scale = 2, rotation = [0, 0, 0], isUnicorn = false, onMount, isRiding, id }) {
  const { scene, animations } = useGLTF(url);
  const cloned = useMemo(() => scene.clone(), [scene]);
  const mixerRef = useRef();
  const groupRef = useRef();

  // Play all embedded animations (idle, walk, etc.)
  useMemo(() => {
    if (animations && animations.length > 0) {
      const mixer = new THREE.AnimationMixer(cloned);
      animations.forEach((clip) => {
        const action = mixer.clipAction(clip);
        action.play();
      });
      mixerRef.current = mixer;
    }
  }, [cloned, animations]);

  useFrame((_, delta) => {
    if (mixerRef.current) mixerRef.current.update(delta);
    if (groupRef.current && isRiding) {
      groupRef.current.scale.setScalar(scale * 1.15);
    } else if (groupRef.current) {
      groupRef.current.scale.setScalar(scale);
    }
  });

  const handleClick = (e) => {
    e.stopPropagation();
    if (onMount) {
      onMount(id, position, isUnicorn);
      // Mount sound
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = isUnicorn ? 600 : 400;
        osc.frequency.exponentialRampToValueAtTime(isUnicorn ? 800 : 500, ctx.currentTime + 0.2);
        gain.gain.value = 0.15;
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } catch { /* audio not available */ }
    }
  };

  return (
    <group ref={groupRef} position={position} rotation={rotation} onClick={handleClick}>
      <primitive object={cloned} scale={scale} castShadow receiveShadow />

      {/* Unicorn magical effects */}
      {isUnicorn && (
        <>
          {/* Golden horn glow */}
          <pointLight position={[0, 3, -1]} color="#ffd700" intensity={4} distance={12} decay={2} />

          {/* Magic sparkles */}
          <Sparkles count={80} scale={4} size={2} speed={0.4} opacity={0.9} color="#ffd700" />

          {/* Aura */}
          <mesh position={[0, 1.5, 0]}>
            <sphereGeometry args={[2, 16, 16]} />
            <meshBasicMaterial color="#ffd700" transparent opacity={0.08} blending={THREE.AdditiveBlending} />
          </mesh>

          {/* Rainbow trail when riding */}
          {isRiding && (
            <Sparkles count={120} scale={6} size={3} speed={0.8} opacity={0.7} color="#ff88ff" />
          )}
        </>
      )}

      {/* Interaction label */}
      <Html position={[0, 3.5, 0]} center distanceFactor={30}>
        <div style={{
          background: 'rgba(0,0,0,0.7)',
          padding: '4px 10px',
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 700,
          fontFamily: '"JetBrains Mono", monospace',
          whiteSpace: 'nowrap',
          color: isRiding ? '#00ff00' : isUnicorn ? '#ffd700' : '#00ffff',
          border: `1px solid ${isRiding ? '#00ff0044' : isUnicorn ? '#ffd70044' : '#00ffff44'}`,
          textShadow: `0 0 8px ${isRiding ? '#00ff00' : isUnicorn ? '#ffd700' : '#00ffff'}`,
          cursor: 'pointer',
        }}>
          {isRiding
            ? (isUnicorn ? '🦄 RIDING! (Space to fly)' : '🐴 RIDING!')
            : (isUnicorn ? '🦄 Click to Ride Unicorn!' : '🐴 Click to Ride')
          }
        </div>
      </Html>

      {/* Ambient light per horse */}
      <pointLight
        position={[0, 2, 0]}
        color={isUnicorn ? '#ffd700' : '#ffffff'}
        intensity={isUnicorn ? 2.5 : 0.4}
        distance={isUnicorn ? 10 : 5}
        decay={2}
      />
    </group>
  );
}

/* ============================================================
   HORSES — 3 real GLB model variants + 1 magical unicorn
   ============================================================ */
const HORSE_MODELS = [
  '/models/horse.glb',
  '/models/horse_2.glb',
  '/models/realistic_animated_horse.glb',
];

// Stable positions spread across the world (avoiding castle area)
const HORSE_PLACEMENTS = [
  { pos: [40, 0, 30], rot: [0, -0.5, 0], model: 0, scale: 2 },
  { pos: [-35, 0, 45], rot: [0, 1.2, 0], model: 1, scale: 2 },
  { pos: [55, 0, -30], rot: [0, 2.5, 0], model: 2, scale: 2 },
  { pos: [-50, 0, -20], rot: [0, 0.8, 0], model: 0, scale: 1.8 },
  { pos: [20, 0, 65], rot: [0, -1.8, 0], model: 1, scale: 2.2 },
  { pos: [-60, 0, 70], rot: [0, 3.0, 0], model: 2, scale: 1.9 },
  { pos: [70, 0, 50], rot: [0, -2.2, 0], model: 0, scale: 2.1 },
  { pos: [-25, 0, -65], rot: [0, 0.3, 0], model: 1, scale: 2 },
];

// Unicorn gets the best animated model, placed in a magical grove
const UNICORN_POS = [45, 0, -55];
const UNICORN_ROT = [0, Math.PI / 4, 0];

export default function Horses({ onMount, ridingHorseId }) {
  return (
    <group>
      {/* Real GLB horses scattered across the world */}
      {HORSE_PLACEMENTS.map((h, i) => (
        <Suspense key={`horse-${i}`} fallback={null}>
          <GLBHorse
            id={`horse-${i}`}
            url={HORSE_MODELS[h.model]}
            position={h.pos}
            rotation={h.rot}
            scale={h.scale}
            onMount={onMount}
            isRiding={ridingHorseId === `horse-${i}`}
          />
        </Suspense>
      ))}

      {/* ★ THE UNICORN — realistic animated horse with magic effects */}
      <Suspense fallback={null}>
        <GLBHorse
          id="unicorn"
          url="/models/realistic_animated_horse.glb"
          position={UNICORN_POS}
          rotation={UNICORN_ROT}
          scale={2.5}
          isUnicorn={true}
          onMount={onMount}
          isRiding={ridingHorseId === 'unicorn'}
        />
      </Suspense>
    </group>
  );
}
