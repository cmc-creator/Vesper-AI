import React, { useState } from 'react';
import { Box, Typography, Chip, IconButton, Paper } from '@mui/material';
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
      {/* Top HUD */}
      <Box
        sx={{
          position: 'absolute',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 2,
          alignItems: 'center',
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(15px)',
          padding: '12px 24px',
          borderRadius: '16px',
          border: '1px solid rgba(0, 255, 255, 0.3)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
        }}
      >
        <Typography
          variant="h6"
          sx={{
            color: '#00ffff',
            fontWeight: 600,
            textShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
          }}
        >
          ✨ Vesper's World
        </Typography>
      </Box>

      {/* Stats Panel */}
      <Paper
        sx={{
          position: 'absolute',
          top: 20,
          right: 20,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(15px)',
          padding: '16px 20px',
          borderRadius: '16px',
          border: '1px solid rgba(0, 255, 255, 0.3)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
          minWidth: '200px',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: '#00ffff',
            textTransform: 'uppercase',
            fontWeight: 600,
            letterSpacing: '1px',
            mb: 2,
            display: 'block',
          }}
        >
          Character Stats
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Typography sx={{ color: '#fff', fontSize: '14px', mb: 0.5 }}>
            💎 Crystals Collected
          </Typography>
          <Typography
            sx={{
              color: '#ffd700',
              fontSize: '24px',
              fontWeight: 700,
              textShadow: '0 0 10px rgba(255, 215, 0, 0.5)',
            }}
          >
            {crystalsCollected} / 8
          </Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography sx={{ color: '#fff', fontSize: '14px', mb: 0.5 }}>
            🏆 Quests Completed
          </Typography>
          <Typography
            sx={{
              color: '#a78bfa',
              fontSize: '24px',
              fontWeight: 700,
              textShadow: '0 0 10px rgba(167, 139, 250, 0.5)',
            }}
          >
            {questsCompleted}
          </Typography>
        </Box>

        <Box>
          <Typography sx={{ color: '#fff', fontSize: '14px', mb: 1 }}>
            🌤️ Current Weather
          </Typography>
          <Chip
            icon={weatherIcons[weather]}
            label={weather.charAt(0).toUpperCase() + weather.slice(1)}
            sx={{
              background: 'rgba(0, 255, 255, 0.2)',
              color: '#00ffff',
              border: '1px solid rgba(0, 255, 255, 0.5)',
              '& .MuiChip-icon': {
                color: '#00ffff',
              },
            }}
          />
        </Box>
      </Paper>

      {/* Weather Control (Debug) */}
      <Paper
        sx={{
          position: 'absolute',
          top: 240,
          right: 20,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(15px)',
          padding: '12px 16px',
          borderRadius: '12px',
          border: '1px solid rgba(0, 255, 255, 0.3)',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: '#00ffff',
            textTransform: 'uppercase',
            fontWeight: 600,
            letterSpacing: '1px',
            mb: 1,
            display: 'block',
          }}
        >
          Change Weather
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {['clear', 'rain', 'fog', 'night', 'sunset'].map((w) => (
            <Chip
              key={w}
              icon={weatherIcons[w]}
              label={w}
              onClick={() => onWeatherChange(w)}
              variant={weather === w ? 'filled' : 'outlined'}
              sx={{
                cursor: 'pointer',
                color: weather === w ? '#000' : '#00ffff',
                background: weather === w ? '#00ffff' : 'transparent',
                border: '1px solid rgba(0, 255, 255, 0.5)',
                '& .MuiChip-icon': {
                  color: weather === w ? '#000' : '#00ffff',
                },
                '&:hover': {
                  background: weather === w ? '#00ffff' : 'rgba(0, 255, 255, 0.1)',
                },
              }}
            />
          ))}
        </Box>
      </Paper>

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

      {/* Chat button */}
      <IconButton
        onClick={onToggleChat}
        sx={{
          position: 'absolute',
          bottom: 100,
          right: 20,
          width: 60,
          height: 60,
          background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)',
          border: '2px solid rgba(167, 139, 250, 0.5)',
          boxShadow: '0 0 30px rgba(167, 139, 250, 0.5)',
          '&:hover': {
            background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
            transform: 'scale(1.1)',
            boxShadow: '0 0 40px rgba(167, 139, 250, 0.7)',
          },
          transition: 'all 0.3s ease',
        }}
      >
        <Chat sx={{ color: '#fff', fontSize: 28 }} />
      </IconButton>
      
      {/* Customization button */}
      <IconButton
        onClick={() => setShowCustomization(true)}
        sx={{
          position: 'absolute',
          bottom: 180,
          right: 20,
          width: 60,
          height: 60,
          background: 'linear-gradient(135deg, #00ffff, #0099cc)',
          border: '2px solid rgba(0, 255, 255, 0.5)',
          boxShadow: '0 0 30px rgba(0, 255, 255, 0.5)',
          '&:hover': {
            background: 'linear-gradient(135deg, #0099cc, #0077aa)',
            transform: 'scale(1.1)',
            boxShadow: '0 0 40px rgba(0, 255, 255, 0.7)',
          },
          transition: 'all 0.3s ease',
        }}
      >
        <Palette sx={{ color: '#fff', fontSize: 28 }} />
      </IconButton>
      
      {/* Vesper's Home button */}
      <IconButton
        onClick={onOpenVesperHome}
        sx={{
          position: 'absolute',
          bottom: 260,
          right: 20,
          width: 60,
          height: 60,
          background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)',
          border: '2px solid rgba(167, 139, 250, 0.5)',
          boxShadow: '0 0 30px rgba(167, 139, 250, 0.5)',
          '&:hover': {
            background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
            transform: 'scale(1.1)',
            boxShadow: '0 0 40px rgba(167, 139, 250, 0.7)',
          },
          transition: 'all 0.3s ease',
        }}
      >
        <Home sx={{ color: '#fff', fontSize: 28 }} />
      </IconButton>
      
      {/* YOUR Home button */}
      <IconButton
        onClick={onOpenPlayerHome}
        sx={{
          position: 'absolute',
          bottom: 340,
          right: 20,
          width: 60,
          height: 60,
          background: 'linear-gradient(135deg, #10b981, #059669)',
          border: '2px solid rgba(16, 185, 129, 0.5)',
          boxShadow: '0 0 30px rgba(16, 185, 129, 0.5)',
          '&:hover': {
            background: 'linear-gradient(135deg, #059669, #047857)',
            transform: 'scale(1.1)',
            boxShadow: '0 0 40px rgba(16, 185, 129, 0.7)',
          },
          transition: 'all 0.3s ease',
        }}
      >
        <Home sx={{ color: '#fff', fontSize: 28 }} />
      </IconButton>

      {/* Exit button */}
      <IconButton
        onClick={onExitGame}
        sx={{
          position: 'absolute',
          top: 20,
          left: 20,
          background: 'rgba(255, 0, 0, 0.3)',
          border: '1px solid rgba(255, 0, 0, 0.5)',
          color: '#ff4444',
          '&:hover': {
            background: 'rgba(255, 0, 0, 0.5)',
          },
        }}
      >
        <Close />
      </IconButton>

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
    </>
  );
}
