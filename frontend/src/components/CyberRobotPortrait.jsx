import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float } from '@react-three/drei';
import { Box, Typography } from '@mui/material';
import * as THREE from 'three';

function RobotBust({ accentColor, isSpeaking }) {
  const headRef = useRef();
  const chinRef = useRef();
  const eyeMat = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: new THREE.Color(accentColor),
      emissive: new THREE.Color(accentColor),
      emissiveIntensity: isSpeaking ? 3.2 : 2.2,
      metalness: 0.2,
      roughness: 0.15,
    }),
    [accentColor, isSpeaking]
  );

  const shellMat = useMemo(
    () => new THREE.MeshPhysicalMaterial({
      color: '#c8d2e3',
      metalness: 0.9,
      roughness: 0.2,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      sheen: 0.85,
      sheenColor: new THREE.Color('#edf3ff'),
    }),
    []
  );

  const darkMat = useMemo(
    () => new THREE.MeshPhysicalMaterial({
      color: '#1a2032',
      metalness: 0.72,
      roughness: 0.32,
      clearcoat: 0.55,
    }),
    []
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(t * 0.36) * 0.12;
      headRef.current.rotation.x = Math.sin(t * 0.24) * 0.025 - 0.05;
      headRef.current.position.y = Math.sin(t * 0.62) * 0.02 + 0.06;
    }
    if (chinRef.current) {
      chinRef.current.position.y = isSpeaking ? -0.68 + Math.sin(t * 15) * 0.008 : -0.68;
    }
    eyeMat.emissiveIntensity = isSpeaking ? 2.7 + Math.sin(t * 10) * 0.45 : 1.9 + Math.sin(t * 2.4) * 0.14;
  });

  return (
    <group position={[0, -0.22, 0]}>
      <Float speed={1.2} rotationIntensity={0.12} floatIntensity={0.1}>
        <group ref={headRef}>
          {/* Sleek cranial shell */}
          <mesh material={shellMat} position={[0, 0.22, 0]} castShadow receiveShadow>
            <capsuleGeometry args={[0.56, 1.02, 12, 24]} />
          </mesh>

          {/* Facial visor with subtle taper */}
          <mesh material={darkMat} position={[0, 0.24, 0.47]} castShadow>
            <boxGeometry args={[0.84, 0.3, 0.15]} />
          </mesh>

          {/* Crown antenna */}
          <mesh material={shellMat} position={[0, 0.93, 0.03]} castShadow>
            <cylinderGeometry args={[0.1, 0.04, 0.2, 10]} />
          </mesh>

          {/* Eyes */}
          <mesh material={eyeMat} position={[-0.2, 0.25, 0.56]}>
            <sphereGeometry args={[0.065, 20, 20]} />
          </mesh>
          <mesh material={eyeMat} position={[0.2, 0.25, 0.56]}>
            <sphereGeometry args={[0.065, 20, 20]} />
          </mesh>

          {/* Slim light strip */}
          <mesh material={eyeMat} position={[0, -0.01, 0.58]}>
            <boxGeometry args={[0.36, 0.035, 0.04]} />
          </mesh>

          {/* Mid-face panel */}
          <mesh material={darkMat} position={[0, -0.14, 0.52]} castShadow>
            <boxGeometry args={[0.58, 0.12, 0.1]} />
          </mesh>

          {/* Chin / jawline */}
          <group ref={chinRef}>
            <mesh material={shellMat} position={[0, -0.68, 0.06]} castShadow>
              <boxGeometry args={[0.54, 0.2, 0.34]} />
            </mesh>
          </group>

          {/* Small shoulder caps */}
          <mesh material={shellMat} position={[-0.58, -0.08, 0]} rotation={[0, 0, -0.36]} castShadow>
            <capsuleGeometry args={[0.09, 0.42, 6, 10]} />
          </mesh>
          <mesh material={shellMat} position={[0.58, -0.08, 0]} rotation={[0, 0, 0.36]} castShadow>
            <capsuleGeometry args={[0.09, 0.42, 6, 10]} />
          </mesh>

          {/* Elegant neck */}
          <mesh material={darkMat} position={[0, -0.92, -0.02]} castShadow>
            <cylinderGeometry args={[0.22, 0.28, 0.35, 16]} />
          </mesh>

          {/* Upper torso */}
          <mesh material={darkMat} position={[0, -1.28, -0.04]} castShadow>
            <capsuleGeometry args={[0.46, 0.52, 10, 20]} />
          </mesh>
          <mesh material={shellMat} position={[0, -1.05, 0.22]} castShadow>
            <boxGeometry args={[0.5, 0.11, 0.12]} />
          </mesh>
          <mesh material={eyeMat} position={[0, -1.05, 0.31]}>
            <boxGeometry args={[0.34, 0.03, 0.03]} />
          </mesh>
        </group>
      </Float>
    </group>
  );
}

export default function CyberRobotPortrait({ accentColor = '#00ffff', isSpeaking = false }) {
  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: `radial-gradient(circle at 50% 18%, ${accentColor}20 0%, rgba(10,14,26,0.95) 58%, rgba(4,6,14,1) 100%)`,
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.045), transparent 22%, transparent 82%, rgba(255,255,255,0.025))',
          pointerEvents: 'none',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '100% 4px',
          opacity: 0.18,
          mixBlendMode: 'screen',
          pointerEvents: 'none',
        },
      }}
    >
      <Canvas camera={{ position: [0, 0.18, 4.9], fov: 27 }} shadows gl={{ antialias: true, alpha: true }}>
        <color attach="background" args={['#000000']} />
        <fog attach="fog" args={['#080d18', 5.8, 9]} />
        <ambientLight intensity={0.36} />
        <hemisphereLight skyColor={'#a7cfff'} groundColor={'#050913'} intensity={0.8} />
        <spotLight position={[2.1, 3.7, 4.2]} intensity={48} angle={0.34} penumbra={0.95} color={'#ffffff'} castShadow />
        <pointLight position={[-2.2, 1.4, 2.5]} intensity={14} color={accentColor} />
        <pointLight position={[0, -1.5, 2.2]} intensity={8} color={'#bcd7ff'} />
        <RobotBust accentColor={accentColor} isSpeaking={isSpeaking} />
        <Environment preset="studio" />
      </Canvas>

      <Typography
        variant="caption"
        sx={{
          position: 'absolute',
          bottom: 8,
          left: 0,
          right: 0,
          textAlign: 'center',
          color: accentColor,
          opacity: 0.88,
          fontSize: '0.62rem',
          letterSpacing: 1.4,
          fontWeight: 800,
          textTransform: 'uppercase',
          textShadow: `0 0 12px ${accentColor}66`,
          pointerEvents: 'none',
        }}
      >
        VESPER ELEGANCE CORE
      </Typography>
    </Box>
  );
}
