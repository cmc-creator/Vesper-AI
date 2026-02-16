import React, { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls, OrbitControls, Sparkles, Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';

// ─── Movement Constants ───────────────────────────────────────────
const WALK_SPEED = 8;
const RUN_SPEED = 18;
const FLY_SPEED = 22;
const FLY_VERTICAL_SPEED = 12;
const JUMP_FORCE = 10;
const GRAVITY = -25;
const ACCELERATION = 25;
const DECELERATION = 12;
const ROTATION_SPEED = 8;
const CAMERA_LERP = 0.08;
const GROUND_Y = 0;

/**
 * PlayerController — Second Life-style third-person controller
 * 
 * Features:
 *  - Smooth orbit camera (drag to orbit, scroll to zoom)
 *  - WASD movement relative to camera facing
 *  - Shift to run
 *  - F to toggle fly mode
 *  - Space to jump (ground) / ascend (flying)
 *  - C to descend (flying)
 *  - Cyberpunk humanoid avatar with glow effects
 */
export default function PlayerController({
  startPosition = [0, 0, 0],
  onPositionChange,
  cameraDistance = 20,
}) {
  const playerRef = useRef();
  const controlsRef = useRef();
  const velocity = useRef(new THREE.Vector3());
  const verticalVel = useRef(0);
  const facingAngle = useRef(0);
  const isMoving = useRef(false);
  const [flying, setFlying] = useState(false);
  const prevFlyKey = useRef(false);
  const prevJumpKey = useRef(false);
  const grounded = useRef(true);
  const { camera } = useThree();

  const [, getKeys] = useKeyboardControls();

  // Teleport player when startPosition changes (world switch, portal travel)
  const posKey = startPosition.join(',');
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.position.set(...startPosition);
      velocity.current.set(0, 0, 0);
      verticalVel.current = 0;
      grounded.current = true;
      // Snap camera target immediately for teleports
      if (controlsRef.current) {
        controlsRef.current.target.set(
          startPosition[0],
          startPosition[1] + 1.5,
          startPosition[2]
        );
        controlsRef.current.update();
      }
    }
  }, [posKey]);

  // ── Main Game Loop ──────────────────────────────────────────────
  useFrame((state, delta) => {
    if (!playerRef.current || !controlsRef.current) return;
    const dt = Math.min(delta, 0.05); // Cap delta for stability
    const keys = getKeys();

    // ── Fly Toggle (F key edge detection) ──
    if (keys.fly && !prevFlyKey.current) {
      setFlying(prev => {
        if (!prev) {
          // Entering fly mode — small upward boost
          verticalVel.current = 3;
          grounded.current = false;
        }
        return !prev;
      });
    }
    prevFlyKey.current = keys.fly;

    // ── Camera Azimuth for Movement Direction ──
    const azimuth = Math.atan2(
      camera.position.x - controlsRef.current.target.x,
      camera.position.z - controlsRef.current.target.z
    );

    // ── Input Direction (camera-relative WASD) ──
    let mx = 0, mz = 0;
    if (keys.forward)  { mx -= Math.sin(azimuth); mz -= Math.cos(azimuth); }
    if (keys.backward) { mx += Math.sin(azimuth); mz += Math.cos(azimuth); }
    if (keys.left)     { mx -= Math.cos(azimuth); mz += Math.sin(azimuth); }
    if (keys.right)    { mx += Math.cos(azimuth); mz -= Math.sin(azimuth); }

    const mag = Math.sqrt(mx * mx + mz * mz);
    if (mag > 0) { mx /= mag; mz /= mag; }
    isMoving.current = mag > 0;

    // ── Speed ──
    const speed = flying ? FLY_SPEED : (keys.run ? RUN_SPEED : WALK_SPEED);

    // ── Horizontal Velocity (smooth acceleration) ──
    if (isMoving.current) {
      velocity.current.x += (mx * speed - velocity.current.x) * ACCELERATION * dt;
      velocity.current.z += (mz * speed - velocity.current.z) * ACCELERATION * dt;
      facingAngle.current = Math.atan2(mx, mz);
    } else {
      velocity.current.x *= (1 - DECELERATION * dt);
      velocity.current.z *= (1 - DECELERATION * dt);
      if (Math.abs(velocity.current.x) < 0.01) velocity.current.x = 0;
      if (Math.abs(velocity.current.z) < 0.01) velocity.current.z = 0;
    }

    // ── Vertical Movement ──
    if (flying) {
      // Fly: Space = ascend, C = descend
      let vTarget = 0;
      if (keys.jump) vTarget = FLY_VERTICAL_SPEED;
      if (keys.descend) vTarget = -FLY_VERTICAL_SPEED;
      verticalVel.current += (vTarget - verticalVel.current) * 6 * dt;
    } else {
      // Ground: jump on Space press
      if (grounded.current && keys.jump && !prevJumpKey.current) {
        verticalVel.current = JUMP_FORCE;
        grounded.current = false;
      }
      verticalVel.current += GRAVITY * dt;
    }
    prevJumpKey.current = keys.jump;

    // ── Apply Position ──
    const pos = playerRef.current.position;
    pos.x += velocity.current.x * dt;
    pos.z += velocity.current.z * dt;
    pos.y += verticalVel.current * dt;

    // ── Ground Collision ──
    if (pos.y <= GROUND_Y) {
      pos.y = GROUND_Y;
      verticalVel.current = 0;
      grounded.current = true;
    }

    // ── Smooth Rotation ──
    if (isMoving.current) {
      const tgtQ = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0), facingAngle.current
      );
      playerRef.current.quaternion.slerp(tgtQ, ROTATION_SPEED * dt);
    }

    // ── Camera Follow ──
    controlsRef.current.target.lerp(
      new THREE.Vector3(pos.x, pos.y + 1.5, pos.z),
      CAMERA_LERP
    );
    controlsRef.current.update();

    // ── Report Position (throttled) ──
    if (onPositionChange && state.clock.elapsedTime % 0.5 < 0.05) {
      onPositionChange([pos.x, pos.y, pos.z]);
    }
  });

  return (
    <>
      {/* ── Orbit Camera Controls ── */}
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableZoom={true}
        enableDamping={true}
        dampingFactor={0.05}
        maxPolarAngle={Math.PI / 2.1}
        minPolarAngle={Math.PI / 10}
        minDistance={3}
        maxDistance={60}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
      />

      {/* ── Player Group ── */}
      <group ref={playerRef} position={startPosition}>
        {/* Cyberpunk Avatar */}
        <CyberpunkAvatar flying={flying} movingRef={isMoving} />

        {/* Flying effects */}
        {flying && (
          <>
            <Sparkles count={25} scale={2.5} size={3} speed={2} color="#00ffff" opacity={0.6} />
            <pointLight position={[0, 0.5, 0]} intensity={4} distance={8} color="#00ffff" />
          </>
        )}

        {/* Status indicator (always faces camera) */}
        <Billboard position={[0, 3.2, 0]}>
          {flying && (
            <Text
              fontSize={0.22}
              color="#00ffff"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.02}
              outlineColor="#000000"
            >
              ✦ FLYING ✦
            </Text>
          )}
        </Billboard>

        {/* Ambient avatar glow */}
        <pointLight
          position={[0, 2.5, 0]}
          intensity={flying ? 3 : 1.5}
          distance={5}
          color={flying ? '#00ffff' : '#ec4899'}
        />
      </group>
    </>
  );
}

// ─── Cyberpunk Humanoid Avatar ────────────────────────────────────

function CyberpunkAvatar({ flying, movingRef }) {
  const bodyRef = useRef();
  const timeVal = useRef(0);

  useFrame((_, delta) => {
    timeVal.current += delta;
    if (!bodyRef.current) return;
    const moving = movingRef.current;

    if (moving && !flying) {
      // Walk bob
      bodyRef.current.position.y = Math.sin(timeVal.current * 8) * 0.05;
      bodyRef.current.rotation.x = 0;
    } else if (flying) {
      // Fly: gentle hover + forward lean when moving
      bodyRef.current.position.y = Math.sin(timeVal.current * 2) * 0.1;
      bodyRef.current.rotation.x = moving ? -0.2 : -0.05;
    } else {
      // Idle
      bodyRef.current.position.y = 0;
      bodyRef.current.rotation.x = 0;
    }
  });

  const accent = flying ? '#00ffff' : '#ec4899';
  const emissive = flying ? '#007799' : '#991040';

  return (
    <group ref={bodyRef}>
      {/* Torso */}
      <mesh position={[0, 1.1, 0]} castShadow>
        <capsuleGeometry args={[0.22, 0.65, 4, 12]} />
        <meshStandardMaterial
          color="#16162a"
          metalness={0.6}
          roughness={0.3}
          emissive={emissive}
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.85, 0]} castShadow>
        <sphereGeometry args={[0.2, 12, 12]} />
        <meshStandardMaterial
          color="#1e1e3a"
          metalness={0.5}
          roughness={0.4}
          emissive={emissive}
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Visor (glowing eyes) */}
      <mesh position={[0, 1.85, 0.17]}>
        <boxGeometry args={[0.28, 0.07, 0.05]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={2.5}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      {/* Shoulder pads */}
      <mesh position={[-0.32, 1.35, 0]} castShadow>
        <boxGeometry args={[0.12, 0.08, 0.18]} />
        <meshStandardMaterial color="#16162a" emissive={accent} emissiveIntensity={0.5} metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0.32, 1.35, 0]} castShadow>
        <boxGeometry args={[0.12, 0.08, 0.18]} />
        <meshStandardMaterial color="#16162a" emissive={accent} emissiveIntensity={0.5} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Arms */}
      <mesh position={[-0.32, 0.95, 0]} castShadow>
        <capsuleGeometry args={[0.06, 0.45, 4, 8]} />
        <meshStandardMaterial color="#12122a" metalness={0.5} roughness={0.4} emissive={emissive} emissiveIntensity={0.15} />
      </mesh>
      <mesh position={[0.32, 0.95, 0]} castShadow>
        <capsuleGeometry args={[0.06, 0.45, 4, 8]} />
        <meshStandardMaterial color="#12122a" metalness={0.5} roughness={0.4} emissive={emissive} emissiveIntensity={0.15} />
      </mesh>

      {/* Legs */}
      <mesh position={[-0.1, 0.35, 0]} castShadow>
        <capsuleGeometry args={[0.08, 0.45, 4, 8]} />
        <meshStandardMaterial color="#0e0e1e" metalness={0.4} roughness={0.5} emissive={emissive} emissiveIntensity={0.1} />
      </mesh>
      <mesh position={[0.1, 0.35, 0]} castShadow>
        <capsuleGeometry args={[0.08, 0.45, 4, 8]} />
        <meshStandardMaterial color="#0e0e1e" metalness={0.4} roughness={0.5} emissive={emissive} emissiveIntensity={0.1} />
      </mesh>

      {/* Chest stripe (glowing accent line) */}
      <mesh position={[0, 1.15, 0.23]}>
        <boxGeometry args={[0.03, 0.25, 0.01]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={3} metalness={1} roughness={0} />
      </mesh>

      {/* Belt */}
      <mesh position={[0, 0.7, 0]}>
        <torusGeometry args={[0.2, 0.025, 8, 24]} />
        <meshStandardMaterial color="#0a0a18" emissive={accent} emissiveIntensity={0.8} metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  );
}
