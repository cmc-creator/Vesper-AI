import React, { useState, useCallback } from 'react';
import { Text, Billboard } from '@react-three/drei';

/**
 * InteractiveObject — Wraps any 3D children to make them clickable/hoverable
 * Adds: hover glow, cursor change, label tooltip, click handler
 * 
 * Usage:
 *   <InteractiveObject label="Treasure Chest" onInteract={() => openChest()} position={[10, 0, 5]}>
 *     <mesh><boxGeometry /><meshStandardMaterial color="gold" /></mesh>
 *   </InteractiveObject>
 */
export default function InteractiveObject({
  children,
  label,
  onInteract,
  interactText = 'Click to interact',
  glowColor = '#00ffff',
  position = [0, 0, 0],
  labelOffset = 2.5,
}) {
  const [hovered, setHovered] = useState(false);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    if (onInteract) onInteract();
  }, [onInteract]);

  const handleOver = useCallback((e) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'pointer';
  }, []);

  const handleOut = useCallback(() => {
    setHovered(false);
    document.body.style.cursor = 'default';
  }, []);

  return (
    <group
      position={position}
      onClick={handleClick}
      onPointerOver={handleOver}
      onPointerOut={handleOut}
    >
      {children}

      {/* Hover glow light */}
      {hovered && (
        <pointLight
          position={[0, 1, 0]}
          color={glowColor}
          intensity={5}
          distance={8}
          decay={2}
        />
      )}

      {/* Label tooltip on hover */}
      {hovered && label && (
        <Billboard position={[0, labelOffset, 0]}>
          <Text
            fontSize={0.35}
            color={glowColor}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.03}
            outlineColor="#000000"
          >
            {label}
          </Text>
          <Text
            position={[0, -0.45, 0]}
            fontSize={0.2}
            color="#aaaaaa"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            {interactText}
          </Text>
        </Billboard>
      )}
    </group>
  );
}
