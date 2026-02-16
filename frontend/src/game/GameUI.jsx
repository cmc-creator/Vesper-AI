import React, { useState } from 'react';
import { Box, Typography, Chip, IconButton, Paper, Stack, Tooltip } from '@mui/material';
import {
  WbSunny,
  Nightlight,
  Cloud,
  Grain,
  AcUnit,
  Close,
  Chat,
  Palette,
  Home,
  HelpOutline,
} from '@mui/icons-material';
import Minimap from './Minimap';
import CharacterCustomization from './CharacterCustomization';

export default function GameUI({
  weather = 'clear',
  onWeatherChange = () => {},
  crystalsCollected = 0,
  questsCompleted = 0,
  onExitGame = () => {},
  showingChat = false,
  onToggleChat = () => {},
  playerPosition = [0, 2, 5],
  onCustomize = () => {},
  onOpenVesperHome = () => {},
  onOpenPlayerHome = () => {},
  health = 100,
  maxHealth = 100,
  gold = 0,
  season = 'spring',
  showInventory = false,
  showQuests = false,
}) {
  const [showCustomization, setShowCustomization] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const weatherIcons = {
    clear: <WbSunny />,
    rain: <Grain />,
    fog: <Cloud />,
    night: <Nightlight />,
    sunset: <WbSunny />,
    snow: <AcUnit />,
  };

  return (
    <>
      {/* === VERTICAL TASKBAR (Right Side) === */}
      <Box
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        sx={{
          position: 'absolute',
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: isHovered ? 'flex-start' : 'center',
          background: isHovered ? 'rgba(10, 14, 30, 0.9)' : 'rgba(10, 14, 30, 0.4)',
          backdropFilter: isHovered ? 'blur(20px)' : 'blur(5px)',
          padding: isHovered ? '20px' : '10px 5px',
          borderRadius: '16px 0 0 16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRight: 'none',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          zIndex: 1000,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          width: isHovered ? '260px' : '50px',
          pointerEvents: 'auto', // IMPORTANT: Whole bar captures clicks
          overflow: 'hidden',
          gap: 2
        }}
      >
        
        {/* STATS SECTION */}
        <Box sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, height: '30px' }}>
                <Box sx={{ minWidth: 40, textAlign: 'center', fontSize: '1.2rem' }}>💎</Box>
                <Box sx={{ 
                  opacity: isHovered ? 1 : 0, 
                  transition: 'opacity 0.2s', 
                  whiteSpace: 'nowrap',
                  visibility: isHovered ? 'visible' : 'hidden'
                }}>
                    <Typography variant="caption" sx={{ color: '#aaa', display: 'block' }}>CRYSTALS</Typography>
                    <Typography variant="body2" sx={{ color: '#ffd700', fontWeight: 'bold' }}>{crystalsCollected}/8</Typography>
                </Box>
            </Box>

             <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, height: '30px' }}>
                <Box sx={{ minWidth: 40, textAlign: 'center', fontSize: '1.2rem' }}>📜</Box>
                <Box sx={{ 
                  opacity: isHovered ? 1 : 0, 
                  transition: 'opacity 0.2s', 
                  whiteSpace: 'nowrap',
                  visibility: isHovered ? 'visible' : 'hidden'
                }}>
                    <Typography variant="caption" sx={{ color: '#aaa', display: 'block' }}>QUESTS</Typography>
                    <Typography variant="body2" sx={{ color: '#a78bfa', fontWeight: 'bold' }}>{questsCompleted}</Typography>
                </Box>
            </Box>
        </Box>
            
        {/* DIVIDER */}
        <Box sx={{ height: '1px', bgcolor: 'rgba(255,255,255,0.1)', width: '100%', my: 1 }} />

        {/* WEATHER SECTION */}
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', height: '40px' }}>
                 <Box sx={{ minWidth: 40, textAlign: 'center', color: '#00ffff' }}>{weatherIcons[weather]}</Box>
                 {isHovered && (
                   <Box sx={{ display: 'flex', gap: 0.5, animation: 'fadeIn 0.3s forwards' }}>
                     {['clear', 'rain', 'fog', 'night'].map((w) => (
                      <IconButton 
                        key={w}
                        size="small"
                        onClick={() => onWeatherChange(w)}
                        sx={{
                          color: weather === w ? '#00ffff' : 'rgba(255,255,255,0.3)',
                          border: weather === w ? '1px solid rgba(0,255,255,0.3)' : '1px solid transparent',
                        }}
                      >
                        {weatherIcons[w]}
                      </IconButton>
                    ))}
                   </Box>
                 )}
        </Box>
            
        {/* DIVIDER */}
        <Box sx={{ height: '1px', bgcolor: 'rgba(255,255,255,0.1)', width: '100%', my: 1 }} />

        {/* ACTIONS */}
        <Stack spacing={2} sx={{ width: '100%' }}>
            
            <Box 
              sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', height: '40px' }} 
              onClick={onToggleChat}
            >
                <IconButton size="small" sx={{ color: '#a78bfa', p:0, minWidth: 40, flexShrink: 0 }}><Chat /></IconButton>
                <Typography sx={{ 
                  opacity: isHovered ? 1 : 0, 
                  transition: 'opacity 0.2s', 
                  color: '#eee',
                  whiteSpace: 'nowrap',
                  display: isHovered ? 'block' : 'none'
                }}>Chat</Typography>
            </Box>
            
            <Box 
              sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', height: '40px' }} 
              onClick={() => setShowCustomization(true)}
            >
                <IconButton size="small" sx={{ color: '#00ffff', p:0, minWidth: 40, flexShrink: 0 }}><Palette /></IconButton>
                <Typography sx={{ 
                  opacity: isHovered ? 1 : 0, 
                  transition: 'opacity 0.2s', 
                  color: '#eee',
                  whiteSpace: 'nowrap',
                  display: isHovered ? 'block' : 'none'
                }}>Customize</Typography>
            </Box>
            
            <Box 
              sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', height: '40px' }} 
              onClick={() => setShowControls(!showControls)}
            >
                <IconButton size="small" sx={{ color: '#fff', p:0, minWidth: 40, flexShrink: 0 }}><HelpOutline /></IconButton>
                <Typography sx={{ 
                  opacity: isHovered ? 1 : 0, 
                  transition: 'opacity 0.2s', 
                  color: '#eee',
                  whiteSpace: 'nowrap',
                  display: isHovered ? 'block' : 'none'
                }}>Controls</Typography>
            </Box>
            
            <Box 
              sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', height: '40px' }} 
              onClick={onExitGame}
            >
                <IconButton size="small" sx={{ color: '#ff4444', p:0, minWidth: 40, flexShrink: 0 }}><Close /></IconButton>
                <Typography sx={{ 
                  opacity: isHovered ? 1 : 0, 
                  transition: 'opacity 0.2s', 
                  color: '#ff4444',
                  whiteSpace: 'nowrap',
                  display: isHovered ? 'block' : 'none' 
                }}>Exit World</Typography>
            </Box>
        </Stack>

      </Box>

      {/* Quest Notifications */}
      <Box
        sx={{
          position: 'absolute',
          top: 100,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(167, 139, 250, 0.9)',
          backdropFilter: 'blur(10px)',
          padding: '12px 24px',
          borderRadius: '12px',
          border: '2px solid #a78bfa',
          boxShadow: '0 0 30px rgba(167, 139, 250, 0.5)',
          display: crystalsCollected > 0 && crystalsCollected % 3 === 0 ? 'block' : 'none',
        }}
      >
        <Typography
          sx={{
            color: '#fff',
            fontWeight: 700,
            fontSize: '18px',
          }}
        >
          🎉 Quest Complete! +1 XP
        </Typography>
      </Box>

      {/* Floating buttons removed - moved to Unified Taskbar */}


      {/* Minimap */}
      <Minimap 
        playerPosition={playerPosition} 
        crystalsCollected={crystalsCollected}
      />
      
      {/* Character Customization Panel */}
      <CharacterCustomization
        isOpen={showCustomization}
        onClose={() => setShowCustomization(false)}
        onCustomize={onCustomize}
      />

      {/* Controls Overlay */}
      {showControls && (
        <Box
          onClick={() => setShowControls(false)}
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            cursor: 'pointer'
          }}
        >
          <Box
            onClick={(e) => e.stopPropagation()}
            sx={{
              background: 'rgba(10, 10, 20, 0.95)',
              backdropFilter: 'blur(20px)',
              p: 3,
              borderRadius: 4,
              border: '1px solid rgba(0, 255, 255, 0.3)',
              boxShadow: '0 0 50px rgba(0, 255, 255, 0.2)',
              maxWidth: '400px',
              textAlign: 'center',
              cursor: 'default'
            }}
          >
            <Typography variant="h5" sx={{ mb: 2, color: '#00ffff', fontWeight: 700 }}>Game Controls</Typography>
            <Stack spacing={1} sx={{ textAlign: 'left', mb: 3, color: '#ddd' }}>
              <Typography variant="body2"><strong>W A S D</strong> - Move Character</Typography>
              <Typography variant="body2"><strong>Mouse</strong> - Look / Rotate Camera</Typography>
              <Typography variant="body2"><strong>Space</strong> - Jump</Typography>
              <Typography variant="body2"><strong>E</strong> - Interact</Typography>
              <Typography variant="body2"><strong>Shift</strong> - Sprint</Typography>
              <Typography variant="body2"><strong>I</strong> - Inventory | <strong>J</strong> - Journal</Typography>
            </Stack>
            <Chip 
               label="Close" 
               onClick={() => setShowControls(false)}
               sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}
            />
          </Box>
        </Box>
      )}
    </>
  );
}
