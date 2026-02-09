import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  IconButton,
  Dialog,
  Slider
} from '@mui/material';
import { Close, Home, Cottage, Castle, Park } from '@mui/icons-material';

export default function PlayerHome({ isOpen, onClose }) {
  const [playerHomeConfig, setPlayerHomeConfig] = useState({
    homeType: 'cabin', // cabin, castle, treehouse
    exteriorColor: '#8b4513',
    interiorColor: '#f5deb3',
    furnitureStyle: 'cozy',
    lightingIntensity: 1.0,
    decorations: ['fireplace', 'bookshelf'],
  });
  
  useEffect(() => {
    // Load saved config
    const saved = localStorage.getItem('player_home_config');
    if (saved) {
      setPlayerHomeConfig(JSON.parse(saved));
    }
  }, []);
  
  const saveConfig = () => {
    localStorage.setItem('player_home_config', JSON.stringify(playerHomeConfig));
    window.dispatchEvent(new Event('storage'));
    
    // Play save sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.frequency.value = 600;
    osc.type = 'sine';
    gain.gain.value = 0.15;
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + 0.3);
  };
  
  const homeTypes = [
    { 
      id: 'cabin', 
      name: 'Cozy Cabin', 
      icon: <Cottage />, 
      description: 'Rustic wooden cabin with fireplace' 
    },
    { 
      id: 'castle', 
      name: 'Grand Castle', 
      icon: <Castle />, 
      description: 'Majestic stone castle with towers' 
    },
    { 
      id: 'treehouse', 
      name: 'Tree House', 
      icon: <Park />, 
      description: 'Magical elevated treehouse' 
    },
  ];
  
  const exteriorColors = [
    { name: 'Warm Brown', value: '#8b4513' },
    { name: 'Stone Gray', value: '#708090' },
    { name: 'Forest Green', value: '#228b22' },
    { name: 'Mystic Purple', value: '#9370db' },
    { name: 'Ocean Blue', value: '#4682b4' },
    { name: 'Sunset Orange', value: '#ff8c42' },
  ];
  
  const interiorColors = [
    { name: 'Warm Beige', value: '#f5deb3' },
    { name: 'Cool Gray', value: '#d3d3d3' },
    { name: 'Soft Pink', value: '#ffd1dc' },
    { name: 'Sky Blue', value: '#b0e0e6' },
    { name: 'Mint Green', value: '#c7f5d9' },
    { name: 'Lavender', value: '#e6d5f5' },
  ];
  
  const furnitureStyles = [
    { id: 'cozy', name: 'Cozy', emoji: '🛋️' },
    { id: 'elegant', name: 'Elegant', emoji: '✨' },
    { id: 'modern', name: 'Modern', emoji: '🏢' },
    { id: 'rustic', name: 'Rustic', emoji: '🪵' },
    { id: 'mystical', name: 'Mystical', emoji: '🔮' },
  ];
  
  const decorationOptions = [
    { id: 'fireplace', name: 'Fireplace', emoji: '🔥' },
    { id: 'bookshelf', name: 'Bookshelf', emoji: '📚' },
    { id: 'plants', name: 'Plants', emoji: '🌱' },
    { id: 'crystals', name: 'Crystals', emoji: '💎' },
    { id: 'paintings', name: 'Paintings', emoji: '🖼️' },
    { id: 'telescope', name: 'Telescope', emoji: '🔭' },
    { id: 'armor_stand', name: 'Armor Stand', emoji: '🛡️' },
    { id: 'music_box', name: 'Music Box', emoji: '🎵' },
  ];
  
  const toggleDecoration = (id) => {
    setPlayerHomeConfig(prev => ({
      ...prev,
      decorations: prev.decorations.includes(id)
        ? prev.decorations.filter(d => d !== id)
        : [...prev.decorations, id]
    }));
  };
  
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, rgba(75, 0, 130, 0.95), rgba(138, 43, 226, 0.95))',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          border: '2px solid rgba(186, 85, 211, 0.5)',
          boxShadow: '0 0 50px rgba(138, 43, 226, 0.5)',
        }
      }}
    >
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ color: '#fff', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Home /> Your Dream Home
          </Typography>
          <IconButton onClick={onClose} sx={{ color: '#fff' }}>
            <Close />
          </IconButton>
        </Box>
        
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 3, fontStyle: 'italic' }}>
          "Build YOUR perfect sanctuary in Vesper's world! Choose from a cozy cabin, grand castle, or magical treehouse. Make it uniquely YOURS! 🏡"
        </Typography>
        
        {/* Home Type Selection */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ color: '#fff', mb: 1 }}>
            🏠 Choose Your Home Type
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {homeTypes.map((type) => (
              <Paper
                key={type.id}
                elevation={playerHomeConfig.homeType === type.id ? 8 : 2}
                sx={{
                  flex: 1,
                  p: 2,
                  cursor: 'pointer',
                  background: playerHomeConfig.homeType === type.id
                    ? 'linear-gradient(135deg, #667eea, #764ba2)'
                    : 'rgba(255,255,255,0.1)',
                  border: playerHomeConfig.homeType === type.id
                    ? '2px solid #fff'
                    : '2px solid transparent',
                  transition: 'all 0.3s',
                  '&:hover': {
                    transform: 'scale(1.05)',
                    background: playerHomeConfig.homeType === type.id
                      ? 'linear-gradient(135deg, #667eea, #764ba2)'
                      : 'rgba(255,255,255,0.2)',
                  },
                }}
                onClick={() => setPlayerHomeConfig(prev => ({ ...prev, homeType: type.id }))}
              >
                <Box sx={{ textAlign: 'center', color: '#fff' }}>
                  <Box sx={{ fontSize: '48px', mb: 1 }}>{type.icon}</Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    {type.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    {type.description}
                  </Typography>
                </Box>
              </Paper>
            ))}
          </Box>
        </Box>
        
        {/* Exterior Color */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ color: '#fff', mb: 1 }}>
            🎨 Exterior Color
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {exteriorColors.map((color) => (
              <Button
                key={color.value}
                onClick={() => setPlayerHomeConfig(prev => ({ ...prev, exteriorColor: color.value }))}
                sx={{
                  minWidth: '80px',
                  background: color.value,
                  border: playerHomeConfig.exteriorColor === color.value ? '3px solid #fff' : '2px solid rgba(255,255,255,0.3)',
                  color: '#fff',
                  fontWeight: 'bold',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                  '&:hover': {
                    transform: 'scale(1.1)',
                  },
                }}
              >
                {color.name}
              </Button>
            ))}
          </Box>
        </Box>
        
        {/* Interior Color */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ color: '#fff', mb: 1 }}>
            🖌️ Interior Color
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {interiorColors.map((color) => (
              <Button
                key={color.value}
                onClick={() => setPlayerHomeConfig(prev => ({ ...prev, interiorColor: color.value }))}
                sx={{
                  minWidth: '80px',
                  background: color.value,
                  border: playerHomeConfig.interiorColor === color.value ? '3px solid #fff' : '2px solid rgba(255,255,255,0.3)',
                  color: '#333',
                  fontWeight: 'bold',
                  '&:hover': {
                    transform: 'scale(1.1)',
                  },
                }}
              >
                {color.name}
              </Button>
            ))}
          </Box>
        </Box>
        
        {/* Furniture Style */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ color: '#fff', mb: 1 }}>
            🛋️ Furniture Style
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {furnitureStyles.map((style) => (
              <Button
                key={style.id}
                variant={playerHomeConfig.furnitureStyle === style.id ? 'contained' : 'outlined'}
                onClick={() => setPlayerHomeConfig(prev => ({ ...prev, furnitureStyle: style.id }))}
                sx={{
                  flex: 1,
                  background: playerHomeConfig.furnitureStyle === style.id 
                    ? 'linear-gradient(135deg, #667eea, #764ba2)' 
                    : 'transparent',
                  borderColor: 'rgba(255,255,255,0.5)',
                  color: '#fff',
                }}
              >
                {style.emoji} {style.name}
              </Button>
            ))}
          </Box>
        </Box>
        
        {/* Decorations */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ color: '#fff', mb: 1 }}>
            ✨ Decorations
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
            {decorationOptions.map((deco) => (
              <Button
                key={deco.id}
                variant={playerHomeConfig.decorations.includes(deco.id) ? 'contained' : 'outlined'}
                onClick={() => toggleDecoration(deco.id)}
                sx={{
                  background: playerHomeConfig.decorations.includes(deco.id)
                    ? 'linear-gradient(135deg, #667eea, #764ba2)'
                    : 'transparent',
                  borderColor: 'rgba(255,255,255,0.5)',
                  color: '#fff',
                  fontSize: '12px',
                  padding: '8px',
                }}
              >
                {deco.emoji}<br />{deco.name}
              </Button>
            ))}
          </Box>
        </Box>
        
        {/* Lighting */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ color: '#fff', mb: 1 }}>
            💡 Lighting Intensity
          </Typography>
          <Slider
            value={playerHomeConfig.lightingIntensity}
            onChange={(e, v) => setPlayerHomeConfig(prev => ({ ...prev, lightingIntensity: v }))}
            min={0.3}
            max={2.0}
            step={0.1}
            marks={[
              { value: 0.3, label: '🌙 Dim' },
              { value: 1.0, label: '✨ Cozy' },
              { value: 2.0, label: '☀️ Bright' },
            ]}
            sx={{ color: '#ffd700' }}
          />
        </Box>
        
        {/* Save Button */}
        <Button
          fullWidth
          variant="contained"
          onClick={saveConfig}
          sx={{
            background: 'linear-gradient(135deg, #ffd700, #ffed4e)',
            color: '#333',
            fontWeight: 'bold',
            fontSize: '18px',
            padding: '15px',
            borderRadius: '12px',
            '&:hover': {
              background: 'linear-gradient(135deg, #ffed4e, #ffd700)',
              transform: 'scale(1.02)',
            },
          }}
        >
          💾 Save My Home Design
        </Button>
        
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: 'block', textAlign: 'center', mt: 2, fontStyle: 'italic' }}>
          "YOUR home, YOUR rules, YOUR style! Make it perfect! 🏡✨"
        </Typography>
      </Box>
    </Dialog>
  );
}
