import React, { useState, useCallback, useRef, useEffect, Suspense } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, TransformControls, Grid, Html, Sky, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { getWorldLayout, saveWorldLayout, resetWorldLayout, GLBModel, AnimatedGLBModel } from './WorldModels';
import Plaza from './Plaza';
import Grass from './Grass';
import Castle from './Castle';
import defaultConfig from './worldConfig.json';

/* ============================================================
   EDITOR SCENE — renders inside the Canvas
   ============================================================ */
function EditorScene({ layout, selectedId, onSelectModel, onTransformEnd, transformMode }) {
  const controlsRef = useRef();
  const orbitRef = useRef();
  const selectedObjRef = useRef();

  // Find the selected model's group in the scene
  const { scene } = useThree();

  useEffect(() => {
    if (!selectedId) {
      selectedObjRef.current = null;
      return;
    }
    // Find the group for the selected model by traversing the scene
    let found = null;
    scene.traverse((obj) => {
      if (obj.userData && obj.userData.modelId === selectedId) {
        found = obj;
      }
    });
    selectedObjRef.current = found;
  }, [selectedId, scene, layout]);

  return (
    <>
      {/* Editor Camera */}
      <OrbitControls
        ref={orbitRef}
        makeDefault
        enableDamping
        dampingFactor={0.1}
        minDistance={20}
        maxDistance={400}
        maxPolarAngle={Math.PI / 2.2}
        target={[0, 0, 0]}
      />

      {/* Grid overlay */}
      <Grid
        infiniteGrid
        cellSize={10}
        cellThickness={0.5}
        cellColor="#1a4a6a"
        sectionSize={50}
        sectionThickness={1}
        sectionColor="#00ffff"
        fadeDistance={400}
        fadeStrength={1}
        followCamera={false}
        position={[0, 0.05, 0]}
      />

      {/* Lighting */}
      <ambientLight intensity={0.6} color="#a0a0ff" />
      <directionalLight position={[50, 80, 50]} intensity={0.8} color="#ffddaa" castShadow />
      <fog attach="fog" args={['#201040', 30, 300]} />
      <Sky sunPosition={[100, 10, 100]} turbidity={8} rayleigh={4} />
      <Stars radius={100} depth={50} count={1000} factor={4} />

      {/* Ground / Plaza */}
      <Plaza />
      <Castle position={[0, 0, -50]} scale={6} />

      {/* Render all models */}
      {layout.map((m) => {
        const ModelComp = m.animated ? AnimatedGLBModel : GLBModel;
        const isSelected = selectedId === m.id;

        return (
          <group
            key={m.id}
            userData={{ modelId: m.id }}
          >
            <ModelComp
              url={m.url}
              position={m.position}
              rotation={m.rotation}
              scale={typeof m.scale === 'number' ? m.scale : 1}
              label={m.label}
              labelColor={m.labelColor}
              selected={isSelected}
              onClick={(e) => {
                e.stopPropagation();
                onSelectModel(m.id);
              }}
            />
          </group>
        );
      })}

      {/* Axis indicators */}
      <axesHelper args={[20]} position={[0, 0.1, 0]} />
    </>
  );
}

/* ============================================================
   EDITOR UI PANEL — the HTML overlay for controls
   ============================================================ */
function EditorPanel({ layout, selectedId, onSelectModel, onUpdateModel, onSave, onReset, onExit, transformMode, setTransformMode }) {
  const selectedModel = layout.find(m => m.id === selectedId);

  const updateField = (field, index, value) => {
    if (!selectedModel) return;
    const updated = { ...selectedModel };
    if (index !== null) {
      updated[field] = [...updated[field]];
      updated[field][index] = parseFloat(value) || 0;
    } else {
      updated[field] = parseFloat(value) || 0;
    }
    onUpdateModel(selectedId, updated);
  };

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      bottom: 0,
      width: 320,
      background: 'rgba(10, 10, 30, 0.95)',
      borderRight: '1px solid #00ffff33',
      color: '#e0e0e0',
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      fontSize: 12,
      display: 'flex',
      flexDirection: 'column',
      pointerEvents: 'auto',
      zIndex: 100,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        background: 'rgba(0, 255, 255, 0.08)',
        borderBottom: '1px solid #00ffff44',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ color: '#00ffff', fontWeight: 700, fontSize: 14 }}>
          WORLD EDITOR
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onSave} style={btnStyle('#00ff88')}>SAVE</button>
          <button onClick={onReset} style={btnStyle('#ff8800')}>RESET</button>
          <button onClick={onExit} style={btnStyle('#ff4444')}>EXIT</button>
        </div>
      </div>

      {/* Transform Mode Selector */}
      <div style={{
        padding: '8px 16px',
        display: 'flex',
        gap: 6,
        borderBottom: '1px solid #ffffff11',
      }}>
        {['translate', 'rotate', 'scale'].map(mode => (
          <button
            key={mode}
            onClick={() => setTransformMode(mode)}
            style={{
              ...btnStyle(transformMode === mode ? '#00ffff' : '#666'),
              flex: 1,
              fontWeight: transformMode === mode ? 700 : 400,
            }}
          >
            {mode.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Model List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px 0',
      }}>
        <div style={{ padding: '4px 16px 8px', color: '#888', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
          Models ({layout.length})
        </div>
        {layout.map(m => (
          <div
            key={m.id}
            onClick={() => onSelectModel(m.id)}
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              background: selectedId === m.id ? 'rgba(0, 255, 136, 0.15)' : 'transparent',
              borderLeft: selectedId === m.id ? '3px solid #00ff88' : '3px solid transparent',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (selectedId !== m.id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            onMouseLeave={e => { if (selectedId !== m.id) e.currentTarget.style.background = 'transparent'; }}
          >
            <div>
              <div style={{ color: selectedId === m.id ? '#00ff88' : '#ccc', fontWeight: 600 }}>
                {m.label || m.id}
              </div>
              <div style={{ color: '#666', fontSize: 10 }}>
                [{m.position.map(v => v.toFixed(1)).join(', ')}] s:{m.scale}
              </div>
            </div>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: m.labelColor || '#fff',
              boxShadow: `0 0 6px ${m.labelColor || '#fff'}`,
            }} />
          </div>
        ))}
      </div>

      {/* Selected Model Properties */}
      {selectedModel && (
        <div style={{
          borderTop: '1px solid #00ffff33',
          padding: '12px 16px',
          background: 'rgba(0, 255, 136, 0.03)',
          maxHeight: 280,
          overflowY: 'auto',
        }}>
          <div style={{ color: '#00ff88', fontWeight: 700, marginBottom: 8 }}>
            {selectedModel.label || selectedModel.id}
          </div>

          {/* Position */}
          <div style={{ marginBottom: 8 }}>
            <label style={labelStyle}>Position (X, Y, Z)</label>
            <div style={{ display: 'flex', gap: 4 }}>
              {['X', 'Y', 'Z'].map((axis, i) => (
                <div key={axis} style={{ flex: 1 }}>
                  <span style={{ color: ['#ff4444', '#44ff44', '#4444ff'][i], fontSize: 10 }}>{axis}</span>
                  <input
                    type="number"
                    step="1"
                    value={selectedModel.position[i]}
                    onChange={e => updateField('position', i, e.target.value)}
                    style={inputStyle}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Rotation */}
          <div style={{ marginBottom: 8 }}>
            <label style={labelStyle}>Rotation (X, Y, Z)</label>
            <div style={{ display: 'flex', gap: 4 }}>
              {['X', 'Y', 'Z'].map((axis, i) => (
                <div key={axis} style={{ flex: 1 }}>
                  <span style={{ color: ['#ff4444', '#44ff44', '#4444ff'][i], fontSize: 10 }}>{axis}</span>
                  <input
                    type="number"
                    step="0.1"
                    value={selectedModel.rotation[i]}
                    onChange={e => updateField('rotation', i, e.target.value)}
                    style={inputStyle}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Scale */}
          <div style={{ marginBottom: 8 }}>
            <label style={labelStyle}>Scale</label>
            <input
              type="number"
              step="0.5"
              min="0.1"
              value={selectedModel.scale}
              onChange={e => updateField('scale', null, e.target.value)}
              style={{ ...inputStyle, width: '100%' }}
            />
          </div>

          {/* Quick actions */}
          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
            <button
              onClick={() => {
                const updated = { ...selectedModel, position: [selectedModel.position[0], 0, selectedModel.position[2]] };
                onUpdateModel(selectedId, updated);
              }}
              style={{ ...btnStyle('#4488ff'), flex: 1, fontSize: 10 }}
            >
              GROUND (Y=0)
            </button>
            <button
              onClick={() => {
                const updated = { ...selectedModel, rotation: [0, 0, 0] };
                onUpdateModel(selectedId, updated);
              }}
              style={{ ...btnStyle('#4488ff'), flex: 1, fontSize: 10 }}
            >
              RESET ROT
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div style={{
        padding: '8px 16px',
        borderTop: '1px solid #ffffff11',
        color: '#555',
        fontSize: 10,
        lineHeight: 1.6,
      }}>
        Click model in 3D or list to select<br />
        Use number inputs to adjust position<br />
        Scroll to zoom • Drag to orbit<br />
        SAVE writes to localStorage
      </div>
    </div>
  );
}

/* ============================================================
   STYLES
   ============================================================ */
const btnStyle = (color) => ({
  padding: '4px 10px',
  background: 'transparent',
  border: `1px solid ${color}`,
  color: color,
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 11,
  fontFamily: 'inherit',
  transition: 'all 0.15s',
});

const labelStyle = {
  color: '#888',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  marginBottom: 2,
  display: 'block',
};

const inputStyle = {
  width: '100%',
  padding: '4px 6px',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid #333',
  borderRadius: 3,
  color: '#e0e0e0',
  fontSize: 12,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};

/* ============================================================
   MAIN WORLD EDITOR COMPONENT
   ============================================================ */
export default function WorldEditor({ onExit }) {
  const [layout, setLayout] = useState(() => getWorldLayout());
  const [selectedId, setSelectedId] = useState(null);
  const [transformMode, setTransformMode] = useState('translate');
  const [saved, setSaved] = useState(false);

  const handleSelectModel = useCallback((id) => {
    setSelectedId(prev => prev === id ? null : id);
  }, []);

  const handleUpdateModel = useCallback((id, updatedModel) => {
    setLayout(prev => prev.map(m => m.id === id ? updatedModel : m));
    setSaved(false);
  }, []);

  const handleSave = useCallback(() => {
    saveWorldLayout(layout);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [layout]);

  const handleReset = useCallback(() => {
    if (window.confirm('Reset all models to default positions? This cannot be undone.')) {
      resetWorldLayout();
      setLayout(defaultConfig.models);
      setSelectedId(null);
    }
  }, []);

  const handleTransformEnd = useCallback((id, newPosition) => {
    setLayout(prev => prev.map(m => {
      if (m.id !== id) return m;
      return { ...m, position: newPosition };
    }));
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#0a0a1e' }}>
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 120, 120], fov: 50 }}
        gl={{ antialias: true }}
        shadows
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      >
        <Suspense fallback={null}>
          <EditorScene
            layout={layout}
            selectedId={selectedId}
            onSelectModel={handleSelectModel}
            onTransformEnd={handleTransformEnd}
            transformMode={transformMode}
          />
        </Suspense>
      </Canvas>

      {/* UI Panel */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
        <EditorPanel
          layout={layout}
          selectedId={selectedId}
          onSelectModel={handleSelectModel}
          onUpdateModel={handleUpdateModel}
          onSave={handleSave}
          onReset={handleReset}
          onExit={onExit}
          transformMode={transformMode}
          setTransformMode={setTransformMode}
        />
      </div>

      {/* Save indicator */}
      {saved && (
        <div style={{
          position: 'absolute',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 255, 136, 0.2)',
          border: '1px solid #00ff88',
          color: '#00ff88',
          padding: '8px 24px',
          borderRadius: 8,
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 14,
          fontWeight: 700,
          zIndex: 200,
          pointerEvents: 'none',
        }}>
          LAYOUT SAVED
        </div>
      )}

      {/* Keyboard shortcut hints */}
      <div style={{
        position: 'absolute',
        bottom: 12,
        right: 12,
        background: 'rgba(10,10,30,0.85)',
        border: '1px solid #333',
        borderRadius: 6,
        padding: '8px 12px',
        color: '#666',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 10,
        lineHeight: 1.8,
        pointerEvents: 'none',
        zIndex: 200,
      }}>
        ESC → Exit Editor<br />
        Click → Select Model<br />
        Left Panel → Edit Properties<br />
        Mouse Drag → Orbit Camera<br />
        Scroll → Zoom
      </div>
    </div>
  );
}
