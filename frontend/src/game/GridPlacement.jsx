import React, { useState, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { Grid } from '@react-three/drei';

export default function GridPlacement({ active, onPlace, gridSize = 1 }) {
  const [hoverPos, setHoverPos] = useState(null);
  const { scene } = useThree();

  if (!active) return null;

  return (
    <group position={[0, 0.05, 0]}>
      {/* Visual Grid for Placement Mode */}
      <Grid 
        args={[100, 100]} 
        cellSize={gridSize} 
        cellThickness={1} 
        cellColor="#63b3ed" 
        sectionSize={5} 
        sectionThickness={1.5} 
        sectionColor="#3182ce" 
        fadeDistance={50} 
        infiniteGrid 
      />
      
      {/* Detection Plane */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        visible={false}
        onPointerMove={(e) => {
          // Snap to Grid
          const x = Math.round(e.point.x / gridSize) * gridSize;
          const z = Math.round(e.point.z / gridSize) * gridSize;
          setHoverPos([x, 0, z]);
        }}
        onClick={(e) => {
          if (hoverPos) onPlace(hoverPos);
        }}
      >
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Ghost Object (Cursor) */}
      {hoverPos && (
        <mesh position={hoverPos}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#48bb78" transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  );
}