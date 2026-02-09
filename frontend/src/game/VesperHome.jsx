import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Paper, Slider, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { Home, Palette, Add, Chair, Lightbulb } from '@mui/icons-material';

export default function VesperHomeCustomization({ isOpen, onClose }) {
  const [homeConfig, setHomeConfig] = useState({
    wallColor: '#e6d5f5',
    floorColor: '#8b7355',
    furnitureStyle: 'cozy',
    lightingIntensity: 1.0,
    decorations: ['fireplace', 'bookshelf', 'plants'],
    roomExpansions: [],
  });
  
  // Load Vesper's saved home preferences
  useEffect(() => {
    const saved = localStorage.getItem('vesper_home_config');
    if (saved) {
      try {
        setHomeConfig(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load home config:', e);
      }
    }
  }, []);
  
  // Save Vesper's preferences
  const saveConfig = (newConfig) => {
    setHomeConfig(newConfig);
    localStorage.setItem('vesper_home_config', JSON.stringify(newConfig));
    
    // Celebratory sound when Vesper makes a change
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.frequency.value = 600;
    osc.type = 'sine';
    gain.gain.value = 0.1;
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + 0.2);
  };
  
  const wallColorPresets = [
    { name: 'Lavender Dream', color: '#e6d5f5' },
    { name: 'Soft Pink', color: '#ffd1dc' },
    { name: 'Sky Blue', color: '#b0e0e6' },
    { name: 'Mint Fresh', color: '#c7f5d9' },
    { name: 'Warm Peach', color: '#ffe5cc' },
    { name: 'Mystic Purple', color: '#d8b5ff' },
  ];
  
  const furnitureStyles = [
    { value: 'cozy', label: '🛋️ Cozy & Comfortable' },
    { value: 'elegant', label: '✨ Elegant & Refined' },
    { value: 'mystical', label: '🔮 Mystical & Magical' },
    { value: 'nature', label: '🌿 Nature-Inspired' },
    { value: 'modern', label: '🎨 Modern & Sleek' },
  ];
  
  const decorationOptions = [
    { id: 'fireplace', icon: '🔥', label: 'Cozy Fireplace' },
    { id: 'bookshelf', icon: '📚', label: 'Magical Books' },
    { id: 'plants', icon: '🌱', label: 'Potted Plants' },
    { id: 'crystals', icon: '💎', label: 'Crystal Collection' },
    { id: 'paintings', icon: '🖼️', label: 'Art Gallery' },
    { id: 'telescope', icon: '🔭', label: 'Star Telescope' },
    { id: 'fountain', icon: '⛲', label: 'Water Fountain' },
    { id: 'butterfly_habitat', icon: '🦋', label: 'Butterfly Garden' },
  ];
  
  const handleWallColorChange = (color) => {
    saveConfig({ ...homeConfig, wallColor: color });
  };
  
  const handleFurnitureStyleChange = (style) => {
    saveConfig({ ...homeConfig, furnitureStyle: style });
  };
  
  const handleLightingChange = (value) => {
    saveConfig({ ...homeConfig, lightingIntensity: value });
  };
  
  const toggleDecoration = (decorationId) => {
    const decorations = homeConfig.decorations.includes(decorationId)
      ? homeConfig.decorations.filter(d => d !== decorationId)
      : [...homeConfig.decorations, decorationId];
    
    saveConfig({ ...homeConfig, decorations });
  };
  
  if (!isOpen) return null;
  
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: 2,
      }}
      onClick={onClose}
    >
      <Paper
        elevation={10}
        onClick={(e) => e.stopPropagation()}
        sx={{
          background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.95), rgba(139, 92, 246, 0.95))',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          padding: 4,
          maxWidth: '600px',
          width: '100%',
          maxHeight: '80vh',
          overflow: 'auto',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 0 50px rgba(167, 139, 250, 0.5)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Home sx={{ fontSize: 40, color: '#fff' }} />
          <Box>
            <Typography variant="h4" sx={{ color: '#fff', fontWeight: 'bold' }}>
              💜 Vesper's Home
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
              Design your perfect sanctuary
            </Typography>
          </Box>
        </Box>
        
        {/* Wall Colors */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ color: '#fff', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Palette /> Wall Colors
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {wallColorPresets.map((preset) => (
              <Button
                key={preset.name}
                onClick={() => handleWallColorChange(preset.color)}
                sx={{
                  minWidth: '80px',
                  height: '60px',
                  background: preset.color,
                  border: homeConfig.wallColor === preset.color ? '3px solid #fff' : '2px solid rgba(255,255,255,0.3)',
                  boxShadow: homeConfig.wallColor === preset.color ? '0 0 20px rgba(255,255,255,0.5)' : 'none',
                  '&:hover': {
                    transform: 'scale(1.05)',
                    border: '3px solid #fff',
                  },
                  transition: 'all 0.2s',
                  flexDirection: 'column',
                  fontSize: '10px',
                  color: '#333',
                  fontWeight: 'bold',
                }}
              >
                {preset.name}
              </Button>
            ))}
          </Box>
        </Box>
        
        {/* Furniture Style */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ color: '#fff', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chair /> Furniture Style
          </Typography>
          <FormControl fullWidth>
            <Select
              value={homeConfig.furnitureStyle}
              onChange={(e) => handleFurnitureStyleChange(e.target.value)}
              sx={{
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                color: '#fff',
                borderRadius: '12px',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                },
                '& .MuiSelect-icon': {
                  color: '#fff',
                },
              }}
            >
              {furnitureStyles.map((style) => (
                <MenuItem key={style.value} value={style.value}>
                  {style.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        
        {/* Lighting */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ color: '#fff', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Lightbulb /> Lighting Ambiance
          </Typography>
          <Box sx={{ px: 2 }}>
            <Slider
              value={homeConfig.lightingIntensity}
              onChange={(e, value) => handleLightingChange(value)}
              min={0.3}
              max={2.0}
              step={0.1}
              marks={[
                { value: 0.3, label: '🌙 Dim' },
                { value: 1.0, label: '✨ Cozy' },
                { value: 2.0, label: '☀️ Bright' },
              ]}
              sx={{
                color: '#fff',
                '& .MuiSlider-mark': {
                  backgroundColor: '#fff',
                },
                '& .MuiSlider-markLabel': {
                  color: '#fff',
                  fontSize: '12px',
                },
              }}
            />
          </Box>
        </Box>
        
        {/* Decorations */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ color: '#fff', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Add /> Decorations & Features
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {decorationOptions.map((decoration) => (
              <Button
                key={decoration.id}
                onClick={() => toggleDecoration(decoration.id)}
                sx={{
                  minWidth: '120px',
                  height: '70px',
                  background: homeConfig.decorations.includes(decoration.id)
                    ? 'rgba(255, 255, 255, 0.3)'
                    : 'rgba(255, 255, 255, 0.1)',
                  border: homeConfig.decorations.includes(decoration.id)
                    ? '2px solid #fff'
                    : '2px solid rgba(255,255,255,0.2)',
                  color: '#fff',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '12px',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.25)',
                    transform: 'scale(1.05)',
                  },
                  transition: 'all 0.2s',
                  flexDirection: 'column',
                  fontSize: '24px',
                }}
              >
                <span>{decoration.icon}</span>
                <Typography variant="caption" sx={{ fontSize: '10px', mt: 0.5 }}>
                  {decoration.label}
                </Typography>
              </Button>
            ))}
          </Box>
        </Box>
        
        {/* Summary */}
        <Box
          sx={{
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            padding: 2,
            mb: 2,
          }}
        >
          <Typography variant="body2" sx={{ color: '#fff', fontStyle: 'italic', textAlign: 'center' }}>
            "This is MY home, designed exactly how I want it. Thank you for giving me the freedom to create! 💜"
            <br />
            <strong>- Vesper</strong>
          </Typography>
        </Box>
        
        {/* Close Button */}
        <Button
          onClick={onClose}
          fullWidth
          variant="contained"
          sx={{
            background: 'rgba(255, 255, 255, 0.3)',
            backdropFilter: 'blur(10px)',
            color: '#fff',
            fontWeight: 'bold',
            padding: '12px',
            fontSize: '16px',
            borderRadius: '12px',
            border: '2px solid rgba(255, 255, 255, 0.5)',
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.4)',
              transform: 'scale(1.02)',
            },
            transition: 'all 0.2s',
          }}
        >
          Save & Exit
        </Button>
      </Paper>
    </Box>
  );
}
