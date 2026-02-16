import React, { useRef, useMemo } from 'react';
import { useGLTF, Sparkles, Html } from '@react-three/drei';
import * as THREE from 'three';

export default function Castle({ position = [0, 0, -30], scale = 5 }) {
  // Load the downloaded GLB
  const { scene } = useGLTF('/models/hohenzollern_castle.glb');
  
  // Clone to avoid mutation of cached asset
  const castleScene = useMemo(() => scene.clone(), [scene]);

  return (
    <group position={position}>
      <primitive 
        object={castleScene} 
        scale={scale}
        position={[0, 0, 0]} 
        rotation={[0, Math.PI, 0]} 
        castShadow 
        receiveShadow
      />

      {/* Magical Aura for the Castle */}
      <Sparkles 
        count={200}
        scale={[60, 40, 60]}
        size={6}
        speed={0.2}
        opacity={0.5}
        color="#a080ff"
        position={[0, 10, 0]}
      />

      {/* Floating Label */}
      <Html position={[0, 25, 0]} center distanceFactor={60}>
        <div style={{ 
          background: 'rgba(0,0,0,0.7)', 
          padding: '6px 10px', 
          borderRadius: '8px',
          color: 'white',
          textAlign: 'center',
          backdropFilter: 'blur(4px)',
          border: '1px solid rgba(255,215,0,0.3)',
          whiteSpace: 'nowrap'
        }}>
          <h3 style={{ margin: 0, fontSize: '12px', color: '#ffd700' }}>Hohenzollern Castle</h3>
        </div>
      </Html>
    </group>
  );
}

useGLTF.preload('/models/hohenzollern_castle.glb');
