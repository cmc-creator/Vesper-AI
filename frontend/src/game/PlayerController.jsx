import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls, OrbitControls, useAnimations, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Third-Person Controller for Vesper AI
 * Mimics "Dreamlight Valley" style:
 * - WASD to move relative to camera
 * - Mouse to orbit camera around player
 * - Character faces movement direction
 */
export default function PlayerController({ 
  startPosition = [0, 0, 0], 
  onPositionChange // callback to update global game state if needed
}) {
  const { camera } = useThree();
  const playerRef = useRef();
  const controlsRef = useRef();

  // Temporary simple mesh for the player until we have a rigged avatar
  // In a real scenario, this would be a skinned mesh with animations
  
  // Movement state
  const currentVelocity = useRef(new THREE.Vector3());
  const isMoving = useRef(false);
  const facingTarget = useRef(0); // Target rotation angle

  // Constants
  const MOVEMENT_SPEED = 12;
  const ROTATION_SPEED = 10;
  const DECELERATION = 10.0;
  const ACCELERATION = 40.0;

  // Input handling
  // useKeyboardControls returns [sub, get] when used without selector
  const keyboard = useKeyboardControls(); 
  
  // Safety check
  const getKeys = keyboard ? keyboard[1] : () => ({}); 

  // Initial Setup
  useEffect(() => {
    // Set camera behind and above player — isometric-ish third person view
    camera.position.set(0, 25, 35);
    camera.lookAt(0, 0, 0);
  }, []);

  useFrame((state, delta) => {
    if (!playerRef.current) return;
    
    // Safety check for getKeys
    const keys = getKeys ? getKeys() : {};
    const { forward, backward, left, right, run } = keys;
    const timeDelta = delta;

    // 1. Get Camera Direction (ignoring Y for flat movement)
    const cameraForward = new THREE.Vector3();
    camera.getWorldDirection(cameraForward);
    cameraForward.y = 0;
    cameraForward.normalize();

    const cameraRight = new THREE.Vector3();
    cameraRight.crossVectors(cameraForward, new THREE.Vector3(0, 1, 0));

    // 2. Calculate input vector
    const inputVector = new THREE.Vector3(0, 0, 0);
    if (forward) inputVector.add(cameraForward);
    if (backward) inputVector.sub(cameraForward);
    if (right) inputVector.add(cameraRight);
    if (left) inputVector.sub(cameraRight);

    // Normalize safety
    if (inputVector.length() > 0) {
      inputVector.normalize();
      isMoving.current = true;
      // Calculate target rotation angle based on input
      facingTarget.current = Math.atan2(inputVector.x, inputVector.z);
    } else {
      isMoving.current = false;
    }

    // 3. Apply speed modifier (Run/Walk)
    const currentSpeed = run ? MOVEMENT_SPEED * 1.8 : MOVEMENT_SPEED;

    // 4. Update Velocity with Acceleration/Deceleration
    if (isMoving.current) {
      currentVelocity.current.x = THREE.MathUtils.lerp(currentVelocity.current.x, inputVector.x * currentSpeed, ACCELERATION * timeDelta);
      currentVelocity.current.z = THREE.MathUtils.lerp(currentVelocity.current.z, inputVector.z * currentSpeed, ACCELERATION * timeDelta);
    } else {
      currentVelocity.current.x = THREE.MathUtils.lerp(currentVelocity.current.x, 0, DECELERATION * timeDelta);
      currentVelocity.current.z = THREE.MathUtils.lerp(currentVelocity.current.z, 0, DECELERATION * timeDelta);
    }

    // 5. Move Player
    playerRef.current.position.x += currentVelocity.current.x * timeDelta;
    playerRef.current.position.z += currentVelocity.current.z * timeDelta;

    // 6. Rotate Player to face movement
    if (isMoving.current || currentVelocity.current.length() > 0.1) {
      const targetRotation = facingTarget.current;
      // Smooth rotation
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), targetRotation);
      playerRef.current.quaternion.slerp(q, ROTATION_SPEED * timeDelta);
    }

    // 7. Update OrbitControls target to follow player
    if (controlsRef.current) {
        // Smoothly interpolate the target to the player's new position
        controlsRef.current.target.lerp(playerRef.current.position, 0.2);
        controlsRef.current.update();
    }

    // 8. Update external state if needed (throttled)
    if (onPositionChange && state.clock.elapsedTime % 0.5 < 0.1) {
    //   onPositionChange(playerRef.current.position.toArray());
    }
  });

  return (
    <>
      <OrbitControls 
        ref={controlsRef}
        enablePan={false}
        enableZoom={true}
        maxPolarAngle={Math.PI / 2.5}
        minPolarAngle={Math.PI / 8}
        minDistance={8}
        maxDistance={80}
      />
      
      <group ref={playerRef} position={startPosition}>
        {/* Placeholder Avatar - Simple Capsule with Direction Indicator */}
        <mesh position={[0, 0.9, 0]} castShadow>
          <capsuleGeometry args={[0.3, 1.8, 4, 8]} />
          <meshStandardMaterial color="#ec4899" roughness={0.3} />
        </mesh>
        
        {/* Face/Eyes to see rotation */}
        <mesh position={[0, 1.5, 0.25]}>
            <boxGeometry args={[0.4, 0.2, 0.2]} />
            <meshStandardMaterial color="white" />
        </mesh>

        {/* Shadow/Grounding check */}
        <pointLight position={[0, 2, 0]} intensity={2} distance={5} color="#ec4899" />
      </group>
    </>
  );
}
