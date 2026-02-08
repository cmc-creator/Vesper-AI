import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import Character from './Character';

export default function Game({ onExitGame, onChatWithNPC }) {
  const [playerPosition, setPlayerPosition] = useState([0, 0, 0]);
  const [keyboard, setKeyboard] = useState({ forward: false, backward: false, left: false, right: false });

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas camera={{ position: [0, 5, 10], fov: 60 }}>
        <ambientLight intensity={0.6} />
        <pointLight position={[20, 20, 20]} intensity={1} />
        
        {/* Character only */}
        <Character position={playerPosition} keyboard={keyboard} onChatWithNPC={onChatWithNPC} />

        {/* Ground plane */}
        <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color="#333333" />
        </mesh>
      </Canvas>

      {/* Exit button */}
      <button 
        onClick={onExitGame}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          padding: '10px 20px',
          fontSize: '16px',
          background: '#ff0000',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          zIndex: 100
        }}
      >
        Exit Game
      </button>
    </div>
  );
}
