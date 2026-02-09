import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles, Text } from '@react-three/drei';
import { Box, LinearProgress, Typography, Paper } from '@mui/material';
import * as THREE from 'three';

const ENEMY_TYPES = {
  shadow: {
    name: 'Shadow Creature',
    health: 50,
    damage: 10,
    speed: 0.05,
    color: '#4B0082',
    size: 0.8,
    xp: 50,
    drops: ['Shadow Essence', 'Dark Crystal'],
  },
  guardian: {
    name: 'Forest Guardian',
    health: 100,
    damage: 15,
    speed: 0.03,
    color: '#228B22',
    size: 1.2,
    xp: 100,
    drops: ['Nature Gem', 'Ancient Wood'],
  },
  ghoul: {
    name: 'Ghoul',
    health: 75,
    damage: 20,
    speed: 0.07,
    color: '#8B0000',
    size: 1.0,
    xp: 75,
    drops: ['Bone Fragment', 'Soul Stone'],
  },
};

function Enemy({ id, type, position, onDeath, onAttackPlayer, playerPosition }) {
  const enemyRef = useRef();
  const [health, setHealth] = useState(ENEMY_TYPES[type].health);
  const [isAttacking, setIsAttacking] = useState(false);
  const attackCooldown = useRef(0);
  
  const enemyData = ENEMY_TYPES[type];
  const maxHealth = enemyData.health;
  
  useFrame((state, delta) => {
    if (!enemyRef.current || health <= 0) return;
    
    const dx = playerPosition[0] - enemyRef.current.position.x;
    const dz = playerPosition[2] - enemyRef.current.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    // Move towards player
    if (distance > 2) {
      enemyRef.current.position.x += (dx / distance) * enemyData.speed;
      enemyRef.current.position.z += (dz / distance) * enemyData.speed;
      enemyRef.current.rotation.y = Math.atan2(dx, dz);
      setIsAttacking(false);
    } else {
      // In attack range
      setIsAttacking(true);
      attackCooldown.current += delta;
      
      if (attackCooldown.current > 2) {
        attackCooldown.current = 0;
        onAttackPlayer(enemyData.damage);
        
        // Attack animation (slight lunge)
        const lunge = new THREE.Vector3(dx / distance * 0.5, 0, dz / distance * 0.5);
        enemyRef.current.position.add(lunge);
      }
    }
    
    // Bobbing animation
    enemyRef.current.position.y = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
  });
  
  const takeDamage = (damage) => {
    const newHealth = Math.max(0, health - damage);
    setHealth(newHealth);
    
    if (newHealth <= 0) {
      onDeath(enemyData);
    }
    
    // Play hit sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.frequency.value = 300;
    osc.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.1);
    gain.gain.value = 0.1;
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + 0.1);
  };
  
  // Expose takeDamage method
  useEffect(() => {
    window[`enemy_${id}_takeDamage`] = takeDamage;
    return () => delete window[`enemy_${id}_takeDamage`];
  }, [health]);
  
  if (health <= 0) return null;
  
  return (
    <group ref={enemyRef} position={position}>
      {/* Enemy body */}
      <mesh castShadow>
        <sphereGeometry args={[enemyData.size, 16, 16]} />
        <meshStandardMaterial 
          color={enemyData.color}
          roughness={0.8}
          emissive={enemyData.color}
          emissiveIntensity={isAttacking ? 0.8 : 0.3}
        />
      </mesh>
      
      {/* Eyes */}
      <mesh position={[enemyData.size * 0.4, enemyData.size * 0.3, enemyData.size * 0.6]}>
        <sphereGeometry args={[enemyData.size * 0.15, 8, 8]} />
        <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={2} />
      </mesh>
      <mesh position={[-enemyData.size * 0.4, enemyData.size * 0.3, enemyData.size * 0.6]}>
        <sphereGeometry args={[enemyData.size * 0.15, 8, 8]} />
        <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={2} />
      </mesh>
      
      {/* Particles */}
      <Sparkles
        count={30}
        scale={enemyData.size * 2}
        size={1}
        speed={isAttacking ? 0.8 : 0.3}
        opacity={0.6}
        color={enemyData.color}
      />
      
      {/* Health bar */}
      <group position={[0, enemyData.size + 0.5, 0]}>
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[1.5, 0.2]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.5} />
        </mesh>
        <mesh position={[-(1 - health / maxHealth) * 0.75, 0, 0.01]} scale={[health / maxHealth, 1, 1]}>
          <planeGeometry args={[1.5, 0.15]} />
          <meshBasicMaterial color={health / maxHealth > 0.3 ? "#10b981" : "#ef4444"} />
        </mesh>
      </group>
      
      {/* Name */}
      <Text
        position={[0, enemyData.size + 1, 0]}
        fontSize={0.3}
        color="#fff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        {enemyData.name}
      </Text>
      
      <pointLight 
        position={[0, 0, 0]} 
        color={enemyData.color} 
        intensity={isAttacking ? 5 : 2} 
        distance={8} 
      />
    </group>
  );
}

export default function CombatSystem({ 
  playerPosition, 
  playerHealth, 
  playerMaxHealth,
  onPlayerDamage,
  onEnemyKilled,
  currentTime,
  isActive 
}) {
  const [enemies, setEnemies] = useState([]);
  const [combatLog, setCombatLog] = useState([]);
  const spawnTimer = useRef(0);
  const nextEnemyId = useRef(0);
  
  useFrame((state, delta) => {
    if (!isActive) return;
    
    spawnTimer.current += delta;
    
    // Spawn enemies every 10 seconds (max 5 enemies)
    if (spawnTimer.current > 10 && enemies.length < 5) {
      spawnTimer.current = 0;
      spawnEnemy();
    }
  });
  
  const spawnEnemy = () => {
    const types = Object.keys(ENEMY_TYPES);
    const randomType = types[Math.floor(Math.random() * types.length)];
    
    // Spawn around player at distance
    const angle = Math.random() * Math.PI * 2;
    const distance = 15 + Math.random() * 10;
    const spawnX = playerPosition[0] + Math.cos(angle) * distance;
    const spawnZ = playerPosition[2] + Math.sin(angle) * distance;
    
    const newEnemy = {
      id: nextEnemyId.current++,
      type: randomType,
      position: [spawnX, 1, spawnZ],
    };
    
    setEnemies(prev => [...prev, newEnemy]);
    
    addToLog(`${ENEMY_TYPES[randomType].name} appeared!`, '#ff6b35');
  };
  
  const handleEnemyDeath = (enemyId, enemyData) => {
    setEnemies(prev => prev.filter(e => e.id !== enemyId));
    
    addToLog(`Defeated ${enemyData.name}! +${enemyData.xp} XP`, '#10b981');
    
    // Drop random item
    const drop = enemyData.drops[Math.floor(Math.random() * enemyData.drops.length)];
    addToLog(`Found ${drop}!`, '#ffd700');
    
    if (onEnemyKilled) {
      onEnemyKilled(enemyData);
    }
    
    // Play death sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    [400, 300, 200].forEach((freq, i) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      
      osc.frequency.value = freq;
      gain.gain.value = 0.1;
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start(audioContext.currentTime + i * 0.1);
      osc.stop(audioContext.currentTime + i * 0.1 + 0.2);
    });
  };
  
  const handlePlayerAttack = (enemyId) => {
    const damageFn = window[`enemy_${enemyId}_takeDamage`];
    if (damageFn) {
      const damage = 25 + Math.floor(Math.random() * 15); // 25-40 damage
      damageFn(damage);
      addToLog(`You dealt ${damage} damage!`, '#00bfff');
    }
  };
  
  const addToLog = (message, color) => {
    const entry = { message, color, time: Date.now() };
    setCombatLog(prev => [...prev.slice(-4), entry]);
    setTimeout(() => {
      setCombatLog(prev => prev.filter(e => e.time !== entry.time));
    }, 3000);
  };
  
  // Auto-attack nearest enemy every 1.5 seconds
  useEffect(() => {
    if (!isActive || enemies.length === 0) return;
    
    const interval = setInterval(() => {
      const nearest = enemies.reduce((closest, enemy) => {
        const dx = playerPosition[0] - enemy.position[0];
        const dz = playerPosition[2] - enemy.position[2];
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        if (!closest || dist < closest.dist) {
          return { enemy, dist };
        }
        return closest;
      }, null);
      
      if (nearest && nearest.dist < 10) {
        handlePlayerAttack(nearest.enemy.id);
      }
    }, 1500);
    
    return () => clearInterval(interval);
  }, [enemies, isActive, playerPosition]);
  
  return (
    <>
      {/* Render enemies */}
      {enemies.map(enemy => (
        <Enemy
          key={enemy.id}
          id={enemy.id}
          type={enemy.type}
          position={enemy.position}
          onDeath={(data) => handleEnemyDeath(enemy.id, data)}
          onAttackPlayer={onPlayerDamage}
          playerPosition={playerPosition}
        />
      ))}
      
      {/* Player Health Bar */}
      {isActive && (
        <Box
          sx={{
            position: 'fixed',
            top: 80,
            left: 20,
            zIndex: 9999,
          }}
        >
          <Paper
            elevation={6}
            sx={{
              background: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(10px)',
              borderRadius: '12px',
              padding: '12px 16px',
              border: '2px solid #ef4444',
              minWidth: '200px',
            }}
          >
            <Typography variant="caption" sx={{ color: '#fff', display: 'block', mb: 0.5 }}>
              ❤️ Health
            </Typography>
            <LinearProgress
              variant="determinate"
              value={(playerHealth / playerMaxHealth) * 100}
              sx={{
                height: 12,
                borderRadius: 6,
                background: 'rgba(255, 255, 255, 0.1)',
                '& .MuiLinearProgress-bar': {
                  background: playerHealth / playerMaxHealth > 0.5 
                    ? 'linear-gradient(90deg, #10b981, #059669)' 
                    : 'linear-gradient(90deg, #ef4444, #dc2626)',
                },
              }}
            />
            <Typography variant="caption" sx={{ color: '#fff', display: 'block', mt: 0.5 }}>
              {playerHealth} / {playerMaxHealth}
            </Typography>
          </Paper>
        </Box>
      )}
      
      {/* Combat Log */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 100,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          pointerEvents: 'none',
        }}
      >
        {combatLog.map((entry, i) => (
          <Typography
            key={entry.time}
            sx={{
              color: entry.color,
              fontWeight: 'bold',
              fontSize: '16px',
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
              textAlign: 'center',
              marginBottom: '4px',
              animation: 'fadeInUp 0.3s ease-out',
            }}
          >
            ⚔️ {entry.message}
          </Typography>
        ))}
      </Box>
    </>
  );
}
