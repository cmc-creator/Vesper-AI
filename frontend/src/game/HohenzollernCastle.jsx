import React, { useRef } from 'react';
import { useGLTF } from '@react-three/drei';

export default function HohenzollernCastle({ position = [0, 0, -50], scale = 1, rotation = [0, 0, 0] }) {
  const { scene } = useGLTF('/models/hohenzollern_castle.glb');
  
  // Clone the scene to avoid reuse issues if we spawn multiple castles
  const castleRef = useRef();

  return (
    <primitive 
        ref={castleRef}
        object={scene} 
        position={position} 
        scale={scale} 
        rotation={rotation} 
        castShadow
        receiveShadow
    />
  );
}

// Preload the model to avoid pop-in
useGLTF.preload('/models/hohenzollern_castle.glb');