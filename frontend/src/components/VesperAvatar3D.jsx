import React, { Suspense, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, ContactShadows, Html } from '@react-three/drei';
import { Box, Typography, CircularProgress, IconButton, Tooltip } from '@mui/material';
import { Fullscreen, FullscreenExit, ThreeDRotation } from '@mui/icons-material';

// ── Individual 3D Model ────────────────────────────────────────────
function AvatarModel({ url, scale = 1.5, position = [0, -1, 0], autoRotate = true }) {
  const group = useRef();
  const { scene } = useGLTF(url);
  
  // Clone scene to avoid sharing issues
  const clonedScene = React.useMemo(() => scene.clone(), [scene]);
  
  // Auto-rotate
  useFrame((state) => {
    if (group.current && autoRotate) {
      group.current.rotation.y += 0.003;
    }
    // Subtle hover animation
    if (group.current) {
      group.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.8) * 0.05;
    }
  });

  return (
    <group ref={group} position={position} scale={scale}>
      <primitive object={clonedScene} />
    </group>
  );
}

// ── Loading Fallback ───────────────────────────────────────────────
function LoadingFallback() {
  return (
    <Html center>
      <Box sx={{ textAlign: 'center' }}>
        <CircularProgress size={24} sx={{ color: '#00ffff' }} />
        <Typography variant="caption" sx={{ color: '#00ffff', display: 'block', mt: 1, fontSize: '0.65rem' }}>
          Loading model...
        </Typography>
      </Box>
    </Html>
  );
}

// ── Main Avatar Viewer ─────────────────────────────────────────────
export default function VesperAvatar3D({ 
  avatarUrl, 
  scale = 1.5, 
  position = [0, -1, 0],
  height = 250,
  showControls = true,
  autoRotate = true,
  accentColor = '#00ffff',
  compact = false,
  onError,
}) {
  const [expanded, setExpanded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [rotating, setRotating] = useState(autoRotate);

  useEffect(() => {
    setLoadError(false);
  }, [avatarUrl]);

  if (!avatarUrl) {
    return (
      <Box sx={{ 
        height: compact ? 120 : height, 
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.3)',
        borderRadius: 2,
        border: '1px dashed rgba(255,255,255,0.1)',
      }}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)' }}>
          No avatar selected
        </Typography>
      </Box>
    );
  }

  if (loadError) {
    return (
      <Box sx={{ 
        height: compact ? 120 : height, 
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.3)',
        borderRadius: 2,
        border: '1px dashed rgba(255,68,68,0.2)',
      }}>
        <Typography variant="caption" sx={{ color: 'rgba(255,68,68,0.5)' }}>
          Failed to load model
        </Typography>
      </Box>
    );
  }

  const viewerHeight = expanded ? '70vh' : (compact ? 120 : height);

  return (
    <Box sx={{ 
      position: 'relative',
      height: viewerHeight,
      borderRadius: 2,
      overflow: 'hidden',
      background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.1), rgba(0,0,0,0.5))',
      border: `1px solid ${accentColor}15`,
      transition: 'height 0.3s ease',
    }}>
      <Canvas
        camera={{ position: [0, 1, 3.5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
        onError={() => { setLoadError(true); onError?.(); }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
        <directionalLight position={[-3, 3, -3]} intensity={0.3} color={accentColor} />
        <pointLight position={[0, 2, 0]} intensity={0.3} color={accentColor} />
        
        <Suspense fallback={<LoadingFallback />}>
          <AvatarModel 
            url={avatarUrl} 
            scale={scale} 
            position={position} 
            autoRotate={rotating}
          />
          <ContactShadows 
            position={[0, position[1], 0]} 
            opacity={0.4} 
            scale={10} 
            blur={2} 
          />
          <Environment preset="city" />
        </Suspense>
        
        <OrbitControls 
          enablePan={false} 
          enableZoom={true}
          minDistance={1.5}
          maxDistance={8}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 1.5}
        />
      </Canvas>

      {/* Controls overlay */}
      {showControls && (
        <Box sx={{ 
          position: 'absolute', 
          top: 4, right: 4, 
          display: 'flex', 
          gap: 0.5,
          opacity: 0.5,
          transition: 'opacity 0.2s',
          '&:hover': { opacity: 1 },
        }}>
          <Tooltip title={rotating ? 'Stop rotation' : 'Auto-rotate'}>
            <IconButton 
              size="small" 
              onClick={() => setRotating(!rotating)}
              sx={{ 
                color: rotating ? accentColor : 'rgba(255,255,255,0.5)',
                bgcolor: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(8px)',
                width: 28, height: 28,
                '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' },
              }}
            >
              <ThreeDRotation sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={expanded ? 'Collapse' : 'Expand'}>
            <IconButton 
              size="small" 
              onClick={() => setExpanded(!expanded)}
              sx={{ 
                color: 'rgba(255,255,255,0.7)',
                bgcolor: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(8px)',
                width: 28, height: 28,
                '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' },
              }}
            >
              {expanded ? <FullscreenExit sx={{ fontSize: 16 }} /> : <Fullscreen sx={{ fontSize: 16 }} />}
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Box>
  );
}

// ── Compact Avatar Thumbnail (for grid selection) ──────────────────
export function AvatarThumbnail({ 
  url, 
  name, 
  isActive, 
  onClick, 
  accentColor = '#00ffff',
  scale = 1.0,
  position = [0, -0.5, 0],
}) {
  return (
    <Box
      onClick={onClick}
      sx={{
        width: 100,
        height: 120,
        cursor: 'pointer',
        borderRadius: 2,
        overflow: 'hidden',
        border: isActive ? `2px solid ${accentColor}` : '2px solid rgba(255,255,255,0.06)',
        bgcolor: isActive ? `${accentColor}10` : 'rgba(255,255,255,0.02)',
        transition: 'all 0.2s ease',
        '&:hover': { 
          borderColor: `${accentColor}66`,
          transform: 'translateY(-2px)',
          bgcolor: `${accentColor}15`,
        },
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ flex: 1, position: 'relative' }}>
        {url ? (
          <Canvas
            camera={{ position: [0, 0.5, 2.5], fov: 40 }}
            gl={{ antialias: true, alpha: true }}
            style={{ background: 'transparent' }}
          >
            <ambientLight intensity={0.6} />
            <directionalLight position={[3, 3, 3]} intensity={0.5} />
            <Suspense fallback={null}>
              <AvatarModel url={url} scale={scale * 0.7} position={position} autoRotate={false} />
            </Suspense>
          </Canvas>
        ) : (
          <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography sx={{ fontSize: '2rem' }}>🤖</Typography>
          </Box>
        )}
      </Box>
      <Typography 
        variant="caption" 
        sx={{ 
          color: isActive ? accentColor : 'rgba(255,255,255,0.7)',
          fontWeight: isActive ? 700 : 500,
          fontSize: '0.6rem',
          textAlign: 'center',
          px: 0.5,
          py: 0.5,
          lineHeight: 1.1,
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {name}
      </Typography>
    </Box>
  );
}
