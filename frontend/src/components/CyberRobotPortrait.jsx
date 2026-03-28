import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float } from '@react-three/drei';
import { Box, Typography } from '@mui/material';
import * as THREE from 'three';

function RobotBust({ accentColor, isSpeaking }) {
  const headRef = useRef();
  const jawRef = useRef();
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
      color: '#9aa3b2',
      metalness: 0.92,
      roughness: 0.24,
      clearcoat: 0.9,
      clearcoatRoughness: 0.18,
      sheen: 0.6,
      sheenColor: new THREE.Color('#d8e4ff'),
    }),
    []
  );

  const darkMat = useMemo(
    () => new THREE.MeshPhysicalMaterial({
      color: '#151b29',
      metalness: 0.78,
      roughness: 0.38,
      clearcoat: 0.4,
    }),
    []
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(t * 0.42) * 0.18;
      headRef.current.rotation.x = Math.sin(t * 0.28) * 0.04 - 0.08;
      headRef.current.position.y = Math.sin(t * 0.7) * 0.03 + 0.05;
    }
    if (jawRef.current) {
      jawRef.current.position.y = isSpeaking ? -0.72 + Math.sin(t * 16) * 0.015 : -0.72;
    }
    eyeMat.emissiveIntensity = isSpeaking ? 2.8 + Math.sin(t * 12) * 0.6 : 2.15 + Math.sin(t * 2.8) * 0.18;
  });

  return (
    <group position={[0, -0.32, 0]}>
      <Float speed={1.4} rotationIntensity={0.18} floatIntensity={0.15}>
        <group ref={headRef}>
          <mesh material={shellMat} position={[0, 0.12, 0]} castShadow receiveShadow>
            <capsuleGeometry args={[0.68, 1.18, 10, 20]} />
          </mesh>

          <mesh material={darkMat} position={[0, 0.16, 0.5]} castShadow>
            <boxGeometry args={[1.02, 0.38, 0.18]} />
          </mesh>

          <mesh material={shellMat} position={[0, 0.88, 0.02]} castShadow>
            <cylinderGeometry args={[0.22, 0.12, 0.22, 6]} />
          </mesh>

          <mesh material={eyeMat} position={[-0.24, 0.2, 0.6]}>
            <sphereGeometry args={[0.085, 20, 20]} />
          </mesh>
          <mesh material={eyeMat} position={[0.24, 0.2, 0.6]}>
            <sphereGeometry args={[0.085, 20, 20]} />
          </mesh>

          <mesh material={eyeMat} position={[0, -0.08, 0.61]}>
            <boxGeometry args={[0.4, 0.05, 0.05]} />
          </mesh>

          <mesh material={darkMat} position={[0, -0.22, 0.56]} castShadow>
            <boxGeometry args={[0.72, 0.18, 0.12]} />
          </mesh>

          <group ref={jawRef}>
            <mesh material={shellMat} position={[0, -0.72, 0.08]} castShadow>
              <boxGeometry args={[0.78, 0.28, 0.54]} />
            </mesh>
          </group>

          <mesh material={shellMat} position={[-0.78, 0.06, 0]} rotation={[0, 0, -0.45]} castShadow>
            <capsuleGeometry args={[0.12, 0.64, 6, 10]} />
          </mesh>
          <mesh material={shellMat} position={[0.78, 0.06, 0]} rotation={[0, 0, 0.45]} castShadow>
            <capsuleGeometry args={[0.12, 0.64, 6, 10]} />
          </mesh>

          <mesh material={darkMat} position={[0, -1.24, -0.04]} castShadow>
            <boxGeometry args={[1.58, 0.58, 0.86]} />
          </mesh>
          <mesh material={shellMat} position={[0, -1.02, 0.28]} castShadow>
            <boxGeometry args={[0.9, 0.2, 0.18]} />
          </mesh>
          <mesh material={eyeMat} position={[0, -1.03, 0.4]}>
            <boxGeometry args={[0.58, 0.045, 0.04]} />
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
        background: `radial-gradient(circle at 50% 22%, ${accentColor}22 0%, rgba(5,9,20,0.96) 56%, rgba(3,5,12,1) 100%)`,
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.05), transparent 18%, transparent 82%, rgba(255,255,255,0.03))',
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
      <Canvas camera={{ position: [0, 0.15, 4.7], fov: 28 }} shadows gl={{ antialias: true, alpha: true }}>
        <color attach="background" args={['#000000']} />
        <fog attach="fog" args={['#070b14', 5.5, 8.5]} />
        <ambientLight intensity={0.45} />
        <hemisphereLight skyColor={'#8cc9ff'} groundColor={'#04070f'} intensity={0.9} />
        <spotLight position={[2.4, 3.6, 4.5]} intensity={55} angle={0.38} penumbra={0.9} color={'#ffffff'} castShadow />
        <pointLight position={[-2.5, 1.2, 2.8]} intensity={18} color={accentColor} />
        <pointLight position={[0, -1.8, 2.6]} intensity={10} color={'#7ed3ff'} />
        <RobotBust accentColor={accentColor} isSpeaking={isSpeaking} />
        <Environment preset="city" />
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
        VESPER SYNTH-01
      </Typography>
    </Box>
  );
}
