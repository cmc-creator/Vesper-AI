import React, { useState, useRef } from 'react';
import { Box, Button, IconButton, Slider, Typography, Paper } from '@mui/material';
import { CameraAlt, Close, FilterVintage, Brightness6, Contrast, WbSunny } from '@mui/icons-material';
import html2canvas from 'html2canvas';

export default function PhotoMode({ isActive, onToggle }) {
  const [filter, setFilter] = useState('none');
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const canvasRef = useRef(null);
  
  const filters = [
    { name: 'None', value: 'none', style: {} },
    { name: 'Vintage', value: 'vintage', style: { filter: 'sepia(50%) contrast(110%)' } },
    { name: 'Cool', value: 'cool', style: { filter: 'hue-rotate(180deg) saturate(120%)' } },
    { name: 'Warm', value: 'warm', style: { filter: 'sepia(30%) saturate(140%)' } },
    { name: 'Dramatic', value: 'dramatic', style: { filter: 'contrast(150%) saturate(80%)' } },
    { name: 'Dream', value: 'dream', style: { filter: 'blur(0.5px) brightness(110%) saturate(140%)' } },
    { name: 'B&W', value: 'bw', style: { filter: 'grayscale(100%) contrast(120%)' } },
  ];
  
  const takeScreenshot = async () => {
    try {
      // Get canvas element
      const canvas = document.querySelector('canvas');
      if (!canvas) {
        console.error('Canvas not found');
        return;
      }
      
      // Create a temporary link
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.download = `vesper-adventure-${timestamp}.png`;
      
      // Get canvas as blob
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        
        // Success notification sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        osc.frequency.value = 800;
        osc.type = 'sine';
        gain.gain.value = 0.1;
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.start();
        osc.stop(audioContext.currentTime + 0.2);
      });
    } catch (error) {
      console.error('Screenshot failed:', error);
    }
  };
  
  const currentFilterStyle = filters.find(f => f.value === filter)?.style || {};
  const combinedStyle = {
    ...currentFilterStyle,
    filter: `${currentFilterStyle.filter || ''} brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`.trim()
  };
  
  if (!isActive) {
    // Floating camera button when inactive
    return (
      <IconButton
        onClick={onToggle}
        sx={{
          position: 'fixed',
          bottom: 340,
          right: 20,
          width: 60,
          height: 60,
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          border: '2px solid rgba(102, 126, 234, 0.5)',
          boxShadow: '0 0 30px rgba(102, 126, 234, 0.5)',
          '&:hover': {
            background: 'linear-gradient(135deg, #764ba2, #667eea)',
            transform: 'scale(1.1)',
            boxShadow: '0 0 40px rgba(102, 126, 234, 0.7)',
          },
          transition: 'all 0.3s ease',
          zIndex: 9999,
        }}
      >
        <CameraAlt sx={{ color: '#fff', fontSize: 28 }} />
      </IconButton>
    );
  }
  
  return (
    <>
      {/* Apply filter to entire canvas */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 9998,
        ...combinedStyle,
      }} />
      
      {/* Photo Mode UI */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'transparent',
          zIndex: 9999,
          pointerEvents: 'none',
        }}
      >
        {/* Crosshair */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '40px',
            height: '40px',
            border: '2px solid rgba(255, 255, 255, 0.5)',
            borderRadius: '50%',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: '50%',
              left: '-10px',
              right: '-10px',
              height: '1px',
              background: 'rgba(255, 255, 255, 0.5)',
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              left: '50%',
              top: '-10px',
              bottom: '-10px',
              width: '1px',
              background: 'rgba(255, 255, 255, 0.5)',
            },
          }}
        />
        
        {/* Control Panel */}
        <Paper
          elevation={10}
          sx={{
            position: 'absolute',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.9), rgba(30, 30, 30, 0.9))',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            padding: 3,
            minWidth: '600px',
            border: '2px solid rgba(102, 126, 234, 0.5)',
            boxShadow: '0 0 40px rgba(102, 126, 234, 0.3)',
            pointerEvents: 'all',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ color: '#fff', display: 'flex', alignItems: 'center', gap: 1 }}>
              <CameraAlt /> Photo Mode
            </Typography>
            <IconButton onClick={onToggle} sx={{ color: '#fff' }}>
              <Close />
            </IconButton>
          </Box>
          
          {/* Filters */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ color: '#fff', mb: 1 }}>
              <FilterVintage sx={{ fontSize: 16, mr: 0.5 }} /> Filters
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {filters.map((f) => (
                <Button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  variant={filter === f.value ? 'contained' : 'outlined'}
                  size="small"
                  sx={{
                    background: filter === f.value ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'transparent',
                    borderColor: 'rgba(102, 126, 234, 0.5)',
                    color: '#fff',
                    '&:hover': {
                      background: 'rgba(102, 126, 234, 0.3)',
                      borderColor: '#667eea',
                    },
                  }}
                >
                  {f.name}
                </Button>
              ))}
            </Box>
          </Box>
          
          {/* Adjustments */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, mb: 2 }}>
            <Box>
              <Typography variant="caption" sx={{ color: '#fff', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Brightness6 sx={{ fontSize: 14 }} /> Brightness
              </Typography>
              <Slider
                value={brightness}
                onChange={(e, v) => setBrightness(v)}
                min={50}
                max={150}
                sx={{ color: '#667eea' }}
              />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#fff', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Contrast sx={{ fontSize: 14 }} /> Contrast
              </Typography>
              <Slider
                value={contrast}
                onChange={(e, v) => setContrast(v)}
                min={50}
                max={150}
                sx={{ color: '#667eea' }}
              />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#fff', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <WbSunny sx={{ fontSize: 14 }} /> Saturation
              </Typography>
              <Slider
                value={saturation}
                onChange={(e, v) => setSaturation(v)}
                min={0}
                max={200}
                sx={{ color: '#667eea' }}
              />
            </Box>
          </Box>
          
          {/* Capture Button */}
          <Button
            fullWidth
            variant="contained"
            startIcon={<CameraAlt />}
            onClick={takeScreenshot}
            sx={{
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '16px',
              padding: '12px',
              borderRadius: '12px',
              '&:hover': {
                background: 'linear-gradient(135deg, #764ba2, #667eea)',
                transform: 'scale(1.02)',
              },
              transition: 'all 0.2s',
            }}
          >
            Capture Screenshot
          </Button>
          
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block', textAlign: 'center', mt: 1 }}>
            📸 Press capture to save your screenshot
          </Typography>
        </Paper>
      </Box>
    </>
  );
}
