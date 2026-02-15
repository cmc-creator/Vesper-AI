import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, CircularProgress, Stack, Chip, LinearProgress, Slider, IconButton, Collapse } from '@mui/material';
import { ExpandLess, ExpandMore, VisibilityOff } from '@mui/icons-material';

const SystemStatusCard = ({ apiBase, onScaleChange, currentScale = 1, onHide }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const start = performance.now();
      try {
        const res = await fetch(`${apiBase || ''}/api/system/health`);
        const latency = Math.round(performance.now() - start);
        if (!res.ok) throw new Error('Network response was not ok');
        const json = await res.json();
        setData({ ...json, latency });
        setError(false);
      } catch (err) {
        console.error("System status fetch error:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // Pulse every 5s
    return () => clearInterval(interval);
  }, [apiBase]);

  // Default values if data is missing/loading
  const cpu = data?.metrics?.cpu_usage_percent || 0;
  const ram = data?.metrics?.memory_usage_percent || 0;
  const backendStatus = error ? 'Offline' : (loading ? 'Checking...' : 'Online');
  const backendColor = error ? '#ff4444' : (loading ? '#ffbb33' : '#00ff88');

  return (
    <Paper 
      className="ops-card glass-card"
      sx={{
        p: 2,
        borderRadius: 2,
        background: 'rgba(10, 14, 30, 0.6)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        mb: 2
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box 
            sx={{ 
              width: 8, 
              height: 8, 
              borderRadius: '50%', 
              bgcolor: backendColor,
              boxShadow: `0 0 8px ${backendColor}`
            }} 
          />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--accent)' }}>System</Typography>
        </Box>
        <Box>
            <IconButton size="small" onClick={() => setExpanded(!expanded)} sx={{ color: 'rgba(255,255,255,0.5)' }}>
                {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
            </IconButton>
            <IconButton size="small" onClick={onHide} sx={{ color: 'rgba(255,255,255,0.5)' }}>
                <VisibilityOff fontSize="small" />
            </IconButton>
        </Box>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ display: 'flex', gap: 2 }}>
            {/* Stats Column */}
            <Stack spacing={1.5} sx={{ flex: 1 }}>
                {/* Backend Status */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>Backend</Typography>
                <Chip 
                    label={backendStatus} 
                    size="small" 
                    sx={{ 
                    bgcolor: `${backendColor}20`, 
                    color: backendColor, 
                    fontSize: '10px', 
                    height: '20px',
                    fontWeight: 700
                    }} 
                />
                </Box>
                
                {/* Latency */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>Ping</Typography>
          <Typography variant="caption" sx={{ color: data?.latency < 100 ? '#00ff88' : '#ffbb33', fontFamily: 'monospace' }}>
             {data?.latency ? `${data.latency}ms` : '--'}
          </Typography>
        </Box>

        {/* CPU Usage */}
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>CPU</Typography>
            <Typography variant="caption" sx={{ color: 'var(--accent)' }}>{cpu}%</Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={cpu} 
            sx={{ 
              height: 4, 
              borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.1)',
              '& .MuiLinearProgress-bar': { bgcolor: 'var(--accent)' }
            }} 
          />
        </Box>

        {/* RAM Usage */}
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>RAM</Typography>
            <Typography variant="caption" sx={{ color: '#c084fc' }}>{ram}%</Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={ram} 
            sx={{ 
              height: 4, 
              borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.1)',
              '& .MuiLinearProgress-bar': { bgcolor: '#c084fc' }
            }} 
          />
        </Box>

        {/* Disk Usage */}
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>Disk</Typography>
            <Typography variant="caption" sx={{ color: '#00d9ff' }}>{data?.metrics?.disk_usage_percent || 0}%</Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={data?.metrics?.disk_usage_percent || 0} 
            sx={{ 
              height: 4, 
              borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.1)',
              '& .MuiLinearProgress-bar': { bgcolor: '#00d9ff' }
            }} 
          />
        </Box>

            </Stack>

            {/* Vertical Scale Slider */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 120 }}>
               <Slider
                  orientation="vertical"
                  size="small"
                  value={currentScale}
                  min={0.5}
                  max={1.5}
                  step={0.1}
                  onChange={(_, val) => onScaleChange && onScaleChange(val)}
                  valueLabelDisplay="auto"
                  sx={{
                    color: 'var(--accent, #00ffff)',
                    height: 100,
                    '& .MuiSlider-thumb': {
                      width: 12,
                      height: 12,
                      '&:hover': { boxShadow: '0 0 0 8px rgba(0, 255, 255, 0.1)' },
                    },
                    '& .MuiSlider-rail': { opacity: 0.2 },
                  }}
                />
                <Typography variant="caption" sx={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)', mt: 1, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>UI Scale</Typography>
            </Box>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default SystemStatusCard;
