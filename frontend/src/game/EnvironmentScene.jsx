import React, { useMemo, useRef, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * EnvironmentScene — Loads a complete GLB scene as THE world.
 * 
 * Instead of placing tiny models on a flat plane, this loads an entire
 * pre-made environment (diorama, scene, world) as the full 3D space.
 * 
 * The scene is centered, scaled to fit, and the player exists INSIDE it.
 */
export default function EnvironmentScene({ 
  url, 
  scale = 1, 
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  autoCenter = true,
  autoScale = false,
  targetSize = 100,
  enableAnimations = true,
  onLoaded = null,
}) {
  const { scene, animations } = useGLTF(url);
  const groupRef = useRef();
  const mixerRef = useRef();
  const { camera } = useThree();

  // Clone scene so React can manage it properly
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    
    // Enable shadows on all meshes
    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        // Fix any materials that might be too dark
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => { m.side = THREE.DoubleSide; });
          } else {
            child.material.side = THREE.DoubleSide;
          }
        }
      }
    });
    
    return clone;
  }, [scene]);

  // Calculate scene bounds for auto-centering and auto-scaling
  const sceneAdjustments = useMemo(() => {
    const box = new THREE.Box3().setFromObject(clonedScene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    
    let finalScale = scale;
    if (autoScale && maxDim > 0) {
      finalScale = targetSize / maxDim;
    }

    let offset = [0, 0, 0];
    if (autoCenter) {
      offset = [-center.x, -box.min.y, -center.z]; // Center XZ, put floor at Y=0
    }
    
    return { 
      offset, 
      finalScale, 
      bounds: { center, size, maxDim, min: box.min, max: box.max }
    };
  }, [clonedScene, scale, autoCenter, autoScale, targetSize]);

  // Play all animations in the scene
  useEffect(() => {
    if (enableAnimations && animations && animations.length > 0) {
      const mixer = new THREE.AnimationMixer(clonedScene);
      animations.forEach((clip) => {
        const action = mixer.clipAction(clip);
        action.play();
      });
      mixerRef.current = mixer;
      
      return () => {
        mixer.stopAllAction();
        mixer.uncacheRoot(clonedScene);
      };
    }
  }, [clonedScene, animations, enableAnimations]);

  // Update animations
  useFrame((_, delta) => {
    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }
  });

  // Notify parent when loaded with scene info
  useEffect(() => {
    if (onLoaded) {
      onLoaded({
        bounds: sceneAdjustments.bounds,
        scale: sceneAdjustments.finalScale,
      });
    }
  }, [sceneAdjustments]);

  return (
    <group 
      ref={groupRef}
      position={position}
      rotation={rotation}
    >
      <group 
        position={sceneAdjustments.offset}
        scale={sceneAdjustments.finalScale}
      >
        <primitive object={clonedScene} />
      </group>
    </group>
  );
}

/**
 * EnvironmentLighting — Provides atmosphere-matched lighting for an environment
 */
export function EnvironmentLighting({ preset = 'forest', ambientColor = '#ffffff' }) {
  const presets = {
    forest: {
      ambient: 0.5,
      directional: 0.7,
      directionalColor: '#ffe4b5',
      directionalPos: [30, 50, 30],
      fill: 0.3,
      fillColor: '#88cc88',
    },
    cottage: {
      ambient: 0.6,
      directional: 0.8,
      directionalColor: '#ffddaa',
      directionalPos: [40, 60, 40],
      fill: 0.25,
      fillColor: '#ffcc88',
    },
    rainy: {
      ambient: 0.3,
      directional: 0.4,
      directionalColor: '#99aacc',
      directionalPos: [20, 40, 30],
      fill: 0.2,
      fillColor: '#667788',
    },
    ocean: {
      ambient: 0.5,
      directional: 0.9,
      directionalColor: '#ffe8cc',
      directionalPos: [60, 40, 50],
      fill: 0.3,
      fillColor: '#4488cc',
    },
    dark: {
      ambient: 0.15,
      directional: 0.3,
      directionalColor: '#9966cc',
      directionalPos: [10, 30, 20],
      fill: 0.1,
      fillColor: '#4422aa',
    },
    fantasy: {
      ambient: 0.4,
      directional: 0.8,
      directionalColor: '#ffaaee',
      directionalPos: [50, 80, 50],
      fill: 0.3,
      fillColor: '#a080ff',
    },
    overcast: {
      ambient: 0.4,
      directional: 0.5,
      directionalColor: '#ccccdd',
      directionalPos: [30, 50, 30],
      fill: 0.3,
      fillColor: '#8899aa',
    },
  };

  const p = presets[preset] || presets.forest;

  return (
    <>
      <ambientLight intensity={p.ambient} color={ambientColor || p.fillColor} />
      <directionalLight 
        position={p.directionalPos}
        intensity={p.directional}
        color={p.directionalColor}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={200}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
      />
      <hemisphereLight 
        color={p.directionalColor} 
        groundColor={p.fillColor} 
        intensity={p.fill} 
      />
    </>
  );
}
