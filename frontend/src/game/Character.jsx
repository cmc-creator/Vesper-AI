import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';

export default function Character({ position = [0, 2, 5], keyboard = {} }) {
  const characterRef = useRef();
  const { camera } = useThree();
  
  const speed = 0.1;
  const rotateSpeed = 0.05;
  
  // Movement state
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    if (!characterRef.current) return;

    const character = characterRef.current;
    
    // Get keyboard input from props
    const moveForward = keyboard?.forward || false;
    const moveBackward = keyboard?.backward || false;
    const moveLeft = keyboard?.left || false;
    const moveRight = keyboard?.right || false;

    // Calculate movement direction
    direction.current.set(0, 0, 0);
    
    if (moveForward) direction.current.z -= 1;
    if (moveBackward) direction.current.z += 1;
    if (moveLeft) direction.current.x -= 1;
    if (moveRight) direction.current.x += 1;

    // Normalize direction
    if (direction.current.length() > 0) {
      direction.current.normalize();
    }

    // Apply camera rotation to movement
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0;
    cameraDirection.normalize();

    const angle = Math.atan2(cameraDirection.x, cameraDirection.z);
    
    // Rotate movement direction
    const rotatedDirection = direction.current.clone();
    rotatedDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);

    // Update velocity
    velocity.current.lerp(rotatedDirection.multiplyScalar(speed), 0.3);

    // Apply movement
    character.position.add(velocity.current);

    // Keep character above ground
    if (character.position.y < 0.5) {
      character.position.y = 0.5;
    }

    // Camera follows character (third-person)
    const cameraOffset = new THREE.Vector3(0, 3, 6);
    cameraOffset.applyQuaternion(camera.quaternion);
    
    const idealPosition = character.position.clone().add(
      new THREE.Vector3(
        Math.sin(angle) * 5,
        4,
        Math.cos(angle) * 5
      )
    );
    
    camera.position.lerp(idealPosition, 0.1);
    camera.lookAt(character.position.clone().add(new THREE.Vector3(0, 1, 0)));
  });

  return (
    <group ref={characterRef} position={position}>
      {/* Character body - magical humanoid with enhanced glow */}
      <mesh castShadow position={[0, 0.5, 0]}>
        <capsuleGeometry args={[0.3, 1, 8, 16]} />
        <meshStandardMaterial 
          color="#a78bfa" 
          emissive="#8b5cf6"
          emissiveIntensity={1.2}
          roughness={0.3}
          metalness={0.4}
          toneMapped={false}
        />
      </mesh>

      {/* Glowing aura with bloom */}
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.65, 16, 16]} />
        <meshBasicMaterial 
          color="#a78bfa" 
          transparent 
          opacity={0.2}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Head with enhanced glow */}
      <mesh castShadow position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial 
          color="#fde047" 
          emissive="#fbbf24"
          emissiveIntensity={0.8}
          roughness={0.3}
          metalness={0.5}
          toneMapped={false}
        />
      </mesh>

      {/* Eyes (glowing cyan with bloom) */}
      <mesh position={[-0.15, 1.6, 0.25]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshBasicMaterial color="#00ffff" toneMapped={false} />
      </mesh>
      <mesh position={[0.15, 1.6, 0.25]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshBasicMaterial color="#00ffff" toneMapped={false} />
      </mesh>

      {/* Glowing magical orb with intense bloom */}
      <mesh position={[0, 2.5, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial 
          color="#00ffff"
          emissive="#00ffff"
          emissiveIntensity={3.0}
          toneMapped={false}
        />
      </mesh>
      
      {/* Magical sparkles around character */}
      <Sparkles
        count={50}
        scale={2.5}
        size={1.2}
        speed={0.4}
        opacity={0.7}
        color="#a78bfa"
      />
      
      {/* Enhanced character lighting */}
      <pointLight position={[0, 1, 0]} color="#a78bfa" intensity={4} distance={12} decay={2} />
      <pointLight position={[0, 2.5, 0]} color="#00ffff" intensity={2} distance={8} decay={2} />
    </group>
  );
}
