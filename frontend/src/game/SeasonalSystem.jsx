import React, { useRef,useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';

const SEASONS = {
  spring: {
    name: 'Spring',
    skyColor: '#87CEEB',
    grassColor: '#7CFC00',
    flowers: true,
    particleColor: '#FFB6C1', // Cherry blossoms
    ambientColor: '#FFE4E1',
    duration: 300, // 5 minutes
  },
  summer: {
    name: 'Summer',
    skyColor: '#00BFFF',
    grassColor: '#228B22',
    flowers: false,
    particleColor: '#FFD700', // Sun rays
    ambientColor: '#FFFACD',
    duration: 300,
  },
  fall: {
    name: 'Autumn',
    skyColor: '#FF8C00',
    grassColor: '#8B4513',
    flowers: false,
    particleColor: '#FF6347', // Falling leaves
    ambientColor: '#FFA500',
    duration: 300,
  },
  winter: {
    name: 'Winter',
    skyColor: '#B0C4DE',
    grassColor: '#F0F8FF',
    flowers: false,
    particleColor: '#FFFFFF', // Snow
    ambientColor: '#E0FFFF',
    duration: 300,
  },
};

function Flower({ position, season }) {
  const flowerRef = useRef();
  const colors = {
    spring: ['#FFB6C1', '#FF69B4', '#FFC0CB', '#FF1493'],
  };
  
  const color = colors[season]?.[Math.floor(Math.random() * colors[season].length)] || '#FFB6C1';
  
  useFrame((state) => {
    if (!flowerRef.current) return;
    const time = state.clock.elapsedTime;
    flowerRef.current.rotation.z = Math.sin(time + position[0]) * 0.1;
  });
  
  return (
    <group ref={flowerRef} position={position}>
      {/* Stem */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.4, 6]} />
        <meshStandardMaterial color="#228B22" />
      </mesh>
      
      {/* Petals */}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh
          key={i}
          position={[
            Math.sin((i / 5) * Math.PI * 2) * 0.15,
            0.45,
            Math.cos((i / 5) * Math.PI * 2) * 0.15,
          ]}
          rotation={[Math.PI / 2, 0, (i / 5) * Math.PI * 2]}
        >
          <circleGeometry args={[0.1, 8]} />
          <meshStandardMaterial color={color} side={THREE.DoubleSide} />
        </mesh>
      ))}
      
      {/* Center */}
      <mesh position={[0, 0.45, 0]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#FFD700" />
      </mesh>
    </group>
  );
}

function SeasonalParticle({ season, count = 1000 }) {
  const particlesRef = useRef();
  const { scene } = useThree();
  
  useEffect(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    
    for (let i = 0; i < count * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 100; // x
      positions[i + 1] = Math.random() * 20 + 10; // y
      positions[i + 2] = (Math.random() - 0.5) * 100; // z
      
      velocities[i] = (Math.random() - 0.5) * 0.1;
      velocities[i + 1] = -Math.random() * 0.2 - 0.1;
      velocities[i + 2] = (Math.random() - 0.5) * 0.1;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    
    const seasonData = SEASONS[season];
    const material = new THREE.PointsMaterial({
      color: seasonData.particleColor,
      size: season === 'fall' ? 0.3 : season === 'winter' ? 0.2 : 0.15,
      transparent: true,
      opacity: season === 'winter' ? 0.9 : 0.7,
      map: createParticleTexture(season),
    });
    
    const particles = new THREE.Points(geometry, material);
    particlesRef.current = particles;
    scene.add(particles);
    
    return () => {
      scene.remove(particles);
      geometry.dispose();
      material.dispose();
    };
  }, [season, count, scene]);
  
  useFrame(() => {
    if (!particlesRef.current) return;
    
    const positions = particlesRef.current.geometry.attributes.position.array;
    const velocities = particlesRef.current.geometry.attributes.velocity.array;
    
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] += velocities[i];
      positions[i + 1] += velocities[i + 1];
      positions[i + 2] += velocities[i + 2];
      
      // Reset particles that fall below ground
      if (positions[i + 1] < 0) {
        positions[i + 1] = 20;
        positions[i] = (Math.random() - 0.5) * 100;
        positions[i + 2] = (Math.random() - 0.5) * 100;
      }
    }
    
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });
  
  return null;
}

function createParticleTexture(season) {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  
  if (season === 'fall') {
    // Leaf shape
    ctx.fillStyle = SEASONS[season].particleColor;
    ctx.beginPath();
    ctx.ellipse(16, 16, 12, 8, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (season === 'winter') {
    // Snowflake
    ctx.strokeStyle = SEASONS[season].particleColor;
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(16, 16);
      ctx.lineTo(16 + Math.cos(angle) * 12, 16 + Math.sin(angle) * 12);
      ctx.stroke();
    }
  } else {
    // Circle (cherry blossom or sun ray)
    ctx.fillStyle = SEASONS[season].particleColor;
    ctx.beginPath();
    ctx.arc(16, 16, 12, 0, Math.PI * 2);
    ctx.fill();
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export default function SeasonalSystem({ currentSeason, onSeasonChange }) {
  const timerRef = useRef(0);
  const seasonData = SEASONS[currentSeason] || SEASONS.spring;
  const { scene } = useThree();
  
  useFrame((state, delta) => {
    timerRef.current += delta;
    
    // Auto-cycle seasons after duration
    if (timerRef.current >= seasonData.duration) {
      timerRef.current = 0;
      const seasons = Object.keys(SEASONS);
      const currentIndex = seasons.indexOf(currentSeason);
      const nextSeason = seasons[(currentIndex + 1) % seasons.length];
      if (onSeasonChange) {
        onSeasonChange(nextSeason);
      }
    }
    
    // Update scene fog color based on season
    if (scene.fog) {
      scene.fog.color = new THREE.Color(seasonData.skyColor);
    }
  });
  
  // Generate flowers for spring
  const flowers = [];
  if (seasonData.flowers) {
    for (let i = 0; i < 50; i++) {
      const x = (Math.random() - 0.5) * 80;
      const z = (Math.random() - 0.5) * 80;
      flowers.push(
        <Flower
          key={i}
          position={[x, 0, z]}
          season={currentSeason}
        />
      );
    }
  }
  
  return (
    <>
      {/* Seasonal particles */}
      <SeasonalParticle season={currentSeason} count={800} />
      
      {/* Flowers (spring only) */}
      {flowers}
      
      {/* Ambient light adjustment */}
      <ambientLight 
        intensity={currentSeason === 'winter' ? 0.6 : 0.8} 
        color={seasonData.ambientColor} 
      />
      
      {/* Season indicator (optional sparkles) */}
      <Sparkles
        count={100}
        scale={[100, 20, 100]}
        position={[0, 10, 0]}
        size={0.5}
        speed={0.1}
        opacity={0.2}
        color={seasonData.particleColor}
      />
    </>
  );
}

export { SEASONS };
