import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, CircularProgress, Stack, Chip, LinearProgress } from '@mui/material';

const SystemStatusCard = ({ apiBase }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${apiBase || ''}/api/system/health`);
        if (!res.ok) throw new Error('Network response was not ok');
        const json = await res.json();
        setData(json);
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'var(--accent)' }}>System Status</Typography>
        <Box 
          sx={{ 
            width: 12, 
            height: 12, 
            borderRadius: '50%', 
            bgcolor: backendColor,
            boxShadow: `0 0 8px ${backendColor}`
          }} 
        />
      </Box>

      <Stack spacing={1.5}>
        {/* Backend Status */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>Backend</Typography>
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
      </Stack>
    </Paper>
  );
};

export default SystemStatusCard;
