import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, CircularProgress, Stack, Chip, LinearProgress, IconButton, Collapse } from '@mui/material';
import { ExpandLess, ExpandMore, VisibilityOff } from '@mui/icons-material';

const SystemStatusCard = ({ apiBase, onHide }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [failCount, setFailCount] = useState(0);
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
        setFailCount(0);
      } catch (err) {
        console.error("System status fetch error:", err);
        setError(true);
        setFailCount(prev => prev + 1);
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

  // "Waking up" for first 3 failures (~15s), then "Offline"
  const isWakingUp = error && failCount <= 3;
  const backendStatus = error
    ? (isWakingUp ? 'Waking up...' : 'Offline')
    : (loading ? 'Checking...' : 'Online');
  const backendColor = error
    ? (isWakingUp ? '#ffbb33' : '#ff4444')
    : (loading ? '#ffbb33' : '#00ff88');

  return (
    <Paper 
      className="ops-card glass-card"
      sx={{
        p: 2,
        borderRadius: 2,
        background: 'var(--panel-bg)',
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
        <Box sx={{ maxHeight: 220, overflowY: 'auto', pr: 0.5, '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,255,255,0.2)', borderRadius: 2 }, '&::-webkit-scrollbar-track': { bgcolor: 'transparent' } }}>
            <Stack spacing={1.5}>
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
        </Box>
      </Collapse>
    </Paper>
  );
};

export default SystemStatusCard;
