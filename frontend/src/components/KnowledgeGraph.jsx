import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Html, Billboard } from '@react-three/drei';
import * as THREE from 'three';

// Procedural layout helper
const layoutGraph = (nodes, links) => {
  // Simple spherical layout + force relaxation step
  const positions = {};
  const RADIUS = 25;
  
  nodes.forEach((node, i) => {
    const phi = Math.acos(-1 + (2 * i) / nodes.length);
    const theta = Math.sqrt(nodes.length * Math.PI) * phi;
    
    positions[node.id] = new THREE.Vector3(
      RADIUS * Math.cos(theta) * Math.sin(phi),
      RADIUS * Math.sin(theta) * Math.sin(phi),
      RADIUS * Math.cos(phi)
    );
    
    // Add some noise
    positions[node.id].add(new THREE.Vector3(
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 5
    ));
  });
  
  return positions;
};

const Node = ({ position, color, size, label, onClick, onHover }) => {
  const mesh = useRef();
  const [hovered, setHover] = useState(false);
  
  useFrame((state) => {
    if (mesh.current) {
      mesh.current.scale.lerp(new THREE.Vector3(hovered ? 1.5 : 1, hovered ? 1.5 : 1, hovered ? 1.5 : 1), 0.1);
    }
  });

  return (
    <group position={position}>
      <mesh 
        ref={mesh}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); onHover(true); }}
        onPointerOut={(e) => { setHover(false); onHover(false); }}
      >
        <sphereGeometry args={[size, 16, 16]} />
        <meshStandardMaterial color={hovered ? '#fff' : color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
      {hovered && (
        <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
          <Text fontSize={2} color="white" anchorX="center" anchorY="bottom" position={[0, size + 1, 0]}>
            {label}
          </Text>
        </Billboard>
      )}
    </group>
  );
};

const Connection = ({ start, end, color }) => {
  const points = useMemo(() => [start, end], [start, end]);
  const lineGeometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);
  
  return (
    <line geometry={lineGeometry}>
      <lineBasicMaterial color={color} transparent opacity={0.2} />
    </line>
  );
};

export default function KnowledgeGraph({ apiBase }) {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [positions, setPositions] = useState({});
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    const fetchGraph = async () => {
      try {
        const res = await fetch(`${apiBase}/api/knowledge/graph`);
        const data = await res.json();
        if (data.status === 'success' && data.graph) {
          // Process graph data
          const layout = layoutGraph(data.graph.nodes, data.graph.links);
          setPositions(layout);
          setGraphData(data.graph);
        }
      } catch (err) {
        console.error("Graph fetch failed:", err);
      }
    };
    fetchGraph();
  }, [apiBase]);

  // Color mapping by group
  const getNodeColor = (group) => {
    switch(group) {
        case 1: return '#00ffff'; // Memory (Cyan)
        case 2: return '#ff00ff'; // Task (Magenta)
        case 3: return '#00ff00'; // Research (Green)
        default: return '#ffffff';
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', background: '#050510', position: 'relative' }}>
      <Canvas camera={{ position: [0, 0, 60], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <OrbitControls autoRotate autoRotateSpeed={0.5} />
        
        {/* Nodes */}
        {graphData.nodes.map((node) => (
          positions[node.id] && (
            <Node
              key={node.id}
              position={positions[node.id]}
              color={getNodeColor(node.group)}
              size={Math.max(1, Math.log(node.val || 5))}
              label={node.name}
              onClick={() => setSelectedNode(node)}
              onHover={() => {}}
            />
          )
        ))}

        {/* Links */}
        {graphData.links.map((link, idx) => {
          const start = positions[link.source];
          const end = positions[link.target];
          return start && end && (
            <Connection 
                key={idx} 
                start={start} 
                end={end} 
                color="#ffffff" 
            />
          );
        })}
      </Canvas>

      {/* UI Overlay for Selected Node */}
      {selectedNode && (
        <div style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          width: 300,
          padding: 20,
          background: 'rgba(0, 0, 0, 0.8)',
          border: '1px solid var(--accent)',
          borderRadius: 10,
          color: 'white',
          backdropFilter: 'blur(10px)'
        }}>
          <h3 style={{ color: getNodeColor(selectedNode.group), marginTop: 0 }}>{selectedNode.name}</h3>
          <p style={{ fontSize: '0.9em', opacity: 0.8 }}>{selectedNode.full_text}</p>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10 }}>
            {selectedNode.tags && selectedNode.tags.map(tag => (
                <span key={tag} style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 4, fontSize: '0.8em' }}>#{tag}</span>
            ))}
          </div>
          <button 
            onClick={() => setSelectedNode(null)}
            style={{ 
                marginTop: 10, 
                background: 'transparent', 
                border: '1px solid rgba(255,255,255,0.3)', 
                color: 'white', 
                padding: '5px 10px', 
                cursor: 'pointer' 
            }}
          >
            Close
          </button>
        </div>
      )}
      
      <div style={{ position: 'absolute', top: 20, left: 20, color: 'rgba(255,255,255,0.5)', pointerEvents: 'none' }}>
        <h2>Neural Knowledge Graph</h2>
        <div style={{ display: 'flex', gap: 15, fontSize: '0.8em' }}>
            <span style={{ color: '#00ffff' }}>● Memory</span>
            <span style={{ color: '#ff00ff' }}>● Task</span>
            <span style={{ color: '#00ff00' }}>● Research</span>
        </div>
      </div>
    </div>
  );
}
