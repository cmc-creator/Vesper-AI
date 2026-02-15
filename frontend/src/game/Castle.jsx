import React, { useRef, useMemo } from 'react';
import { useGLTF, Sparkles, Html } from '@react-three/drei';
import * as THREE from 'three';

export default function Castle({ position = [0, 0, -50] }) {
  // Load the downloaded GLB
  const { scene } = useGLTF('/models/hohenzollern_castle.glb');
  
  // Clone to avoid mutation of cached asset
  const castleScene = useMemo(() => scene.clone(), [scene]);

  return (
    <group position={position}>
      {/* 
        Hohenzollern Castle Model 
        Credits: Based on "Hohenzollern Castle" via Sketchfab
      */}
      <primitive 
        object={castleScene} 
        scale={0.02} // Adjusted scale - start small, it might be huge
        position={[0, 0, 0]} 
        rotation={[0, Math.PI, 0]} 
        castShadow 
        receiveShadow
      />

      {/* Magical Aura for the Castle */}
      <Sparkles 
        count={200}
        scale={[60, 40, 60]}
        size={4}
        speed={0.2}
        opacity={0.5}
        color="#a080ff"
        position={[0, 10, 0]}
      />

      {/* Floating Label / Credits */}
      <Html position={[0, 25, 0]} center distanceFactor={40}>
        <div style={{ 
          background: 'rgba(0,0,0,0.7)', 
          padding: '8px 12px', 
          borderRadius: '8px',
          color: 'white',
          textAlign: 'center',
          backdropFilter: 'blur(4px)',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <h3 style={{ margin: 0, fontSize: '14px', color: '#ffd700' }}>Hohenzollern Castle</h3>
          <p style={{ margin: '4px 0 0', fontSize: '10px', opacity: 0.8 }}>Relic of the Old World</p>
        </div>
      </Html>
    </group>
  );
}

// Preload to avoid pop-in
useGLTF.preload('/models/hohenzollern_castle.glb');
