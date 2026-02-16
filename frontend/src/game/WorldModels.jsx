import React, { useMemo, useRef, useCallback, Suspense } from 'react';
import { useGLTF, Html, Float } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import defaultConfig from './worldConfig.json';

/* ============================================================
   localStorage helpers for world layout persistence
   ============================================================ */
const STORAGE_KEY = 'vesper_world_layout';

export function getWorldLayout() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) { /* ignore corrupt data */ }
  return defaultConfig.models;
}

export function saveWorldLayout(models) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(models));
}

export function resetWorldLayout() {
  localStorage.removeItem(STORAGE_KEY);
}

/* ============================================================
   Error Boundary for individual 3D models — prevents one
   broken model from crashing the entire scene
   ============================================================ */
class ModelErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error) {
    console.warn(`[WorldModels] Failed to load "${this.props.label || 'model'}":`, error.message);
  }
  render() {
    if (this.state.hasError) return null; // Silently skip broken models
    return this.props.children;
  }
}

/* ============================================================
   Generic GLB Model loader — clones scene so React can reuse it
   ============================================================ */
export function GLBModel({ url, position = [0, 0, 0], scale = 1, rotation = [0, 0, 0], label, labelColor = '#fff', onClick, selected = false, groupRef }) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => scene.clone(), [scene]);
  return (
    <group ref={groupRef} position={position} rotation={rotation} onClick={onClick} userData={{ isWorldModel: true }}>
      <primitive object={cloned} scale={scale} castShadow receiveShadow />
      {selected && (
        <mesh position={[0, 3, 0]}>
          <sphereGeometry args={[0.6, 8, 8]} />
          <meshBasicMaterial color="#00ff88" wireframe transparent opacity={0.8} />
        </mesh>
      )}
      {label && (
        <Html position={[0, 4, 0]} center distanceFactor={40}>
          <div style={{
            background: 'rgba(0,0,0,0.75)',
            padding: '4px 8px',
            borderRadius: '6px',
            color: selected ? '#00ff88' : labelColor,
            fontSize: '11px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            border: `1px solid ${selected ? '#00ff88' : labelColor}44`,
            textShadow: `0 0 6px ${selected ? '#00ff88' : labelColor}`,
          }}>
            {label}
          </div>
        </Html>
      )}
    </group>
  );
}

/* ============================================================
   Animated model wrapper — plays all animations in the GLB
   ============================================================ */
export function AnimatedGLBModel({ url, position = [0, 0, 0], scale = 1, rotation = [0, 0, 0], label, labelColor = '#fff', onClick, selected = false, groupRef }) {
  const { scene, animations } = useGLTF(url);
  const cloned = useMemo(() => scene.clone(), [scene]);
  const mixerRef = useRef();

  useMemo(() => {
    if (animations && animations.length > 0) {
      const mixer = new THREE.AnimationMixer(cloned);
      animations.forEach((clip) => mixer.clipAction(clip).play());
      mixerRef.current = mixer;
    }
  }, [cloned, animations]);

  useFrame((_, delta) => {
    if (mixerRef.current) mixerRef.current.update(delta);
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation} onClick={onClick} userData={{ isWorldModel: true }}>
      <primitive object={cloned} scale={scale} castShadow receiveShadow />
      {selected && (
        <mesh position={[0, 3, 0]}>
          <sphereGeometry args={[0.6, 8, 8]} />
          <meshBasicMaterial color="#00ff88" wireframe transparent opacity={0.8} />
        </mesh>
      )}
      {label && (
        <Html position={[0, 4, 0]} center distanceFactor={40}>
          <div style={{
            background: 'rgba(0,0,0,0.75)',
            padding: '4px 8px',
            borderRadius: '6px',
            color: selected ? '#00ff88' : labelColor,
            fontSize: '11px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            border: `1px solid ${selected ? '#00ff88' : labelColor}44`,
            textShadow: `0 0 6px ${selected ? '#00ff88' : labelColor}`,
          }}>
            {label}
          </div>
        </Html>
      )}
    </group>
  );
}

/* ============================================================
   WORLD MODELS — data-driven from worldConfig.json + localStorage
   ============================================================ */
export default function WorldModels({ layout, selectedId, onSelectModel }) {
  // Use provided layout (from editor), or load from storage
  const models = layout || useMemo(() => getWorldLayout(), []);

  const handleClick = useCallback((e, modelId) => {
    if (onSelectModel) {
      e.stopPropagation();
      onSelectModel(modelId);
    }
  }, [onSelectModel]);

  return (
    <group>
      {models.map((m) => {
        const ModelComp = m.animated ? AnimatedGLBModel : GLBModel;
        const scaleVal = typeof m.scale === 'number' ? m.scale : 1;
        const isSelected = selectedId === m.id;

        const modelElement = (
          <ModelErrorBoundary key={m.id} label={m.label || m.id}>
            <Suspense fallback={null}>
              <ModelComp
                url={m.url}
                position={m.position}
                rotation={m.rotation}
                scale={scaleVal}
                label={m.label}
                labelColor={m.labelColor}
                selected={isSelected}
                onClick={(e) => handleClick(e, m.id)}
              />
            </Suspense>
          </ModelErrorBoundary>
        );

        if (m.flying) {
          return (
            <ModelErrorBoundary key={`fly-${m.id}`} label={m.label || m.id}>
              <Float key={m.id} speed={1.5} rotationIntensity={0.3} floatIntensity={3} floatingRange={[5, 15]}>
                {modelElement}
              </Float>
            </ModelErrorBoundary>
          );
        }

        return modelElement;
      })}

      {/* === ATMOSPHERIC LIGHTING === */}
      <pointLight position={[70, 5, -75]} intensity={3} color="#ff4400" distance={25} decay={2} />
      <pointLight position={[-30, 12, -50]} intensity={1.5} color="#00ffff" distance={20} decay={2} />
      <pointLight position={[80, 6, -70]} intensity={2} color="#6622aa" distance={30} decay={2} />
      <pointLight position={[35, 4, 65]} intensity={1} color="#4488ff" distance={20} decay={2} />
    </group>
  );
}

/* Preloads removed for performance — models load on demand */
