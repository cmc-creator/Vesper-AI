import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Grid,
  Typography,
  Box,
  LinearProgress,
  Chip,
  Stack,
  CircularProgress
} from '@mui/material';
import {
  Close as CloseIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  Dns as DnsIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

const MetricCard = ({ icon, label, value, subtext, color = 'var(--accent)' }) => (
  <Box 
    sx={{ 
      p: 2, 
      bgcolor: 'rgba(255,255,255,0.05)', 
      borderRadius: 2, 
      border: '1px solid rgba(255,255,255,0.1)',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 1
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: color }}>
      {icon}
      <Typography variant="body2" sx={{ fontWeight: 600 }}>{label}</Typography>
    </Box>
    <Typography variant="h4" sx={{ fontWeight: 700, color: '#fff' }}>{value}</Typography>
    {subtext && <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>{subtext}</Typography>}
  </Box>
);

export default function SystemDiagnostics({ open, onClose, apiBase }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/system/health`);
      if (!res.ok) throw new Error('Failed to fetch diagnostics');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchData();
      const interval = setInterval(fetchData, 3000); // 3s refresh
      return () => clearInterval(interval);
    }
  }, [open, apiBase]);

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        style: {
          backgroundColor: 'rgba(10, 10, 20, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--accent)',
          borderRadius: '16px',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SpeedIcon sx={{ color: 'var(--accent)' }} />
          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>System Diagnostics</Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.5)' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ p: 3 }}>
        {loading && !data ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
            <CircularProgress size={60} sx={{ color: 'var(--accent)' }} />
          </Box>
        ) : error ? (
          <Typography color="error" align="center">{error}</Typography>
        ) : (
          <Stack spacing={3}>
            {/* Status Header */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Chip 
                    label={data?.status?.toUpperCase()} 
                    color={data?.status === 'operational' ? 'success' : 'error'}
                    variant="outlined"
                />
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                    Last Updated: {new Date(data?.timestamp * 1000).toLocaleTimeString()}
                </Typography>
            </Box>

            {/* Metrics Grid */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard 
                    icon={<SpeedIcon />} 
                    label="CPU Usage" 
                    value={`${data?.metrics?.cpu_usage_percent}%`}
                    subtext="Real-time Load"
                    color="#ff4444"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard 
                    icon={<MemoryIcon />} 
                    label="Memory" 
                    value={`${data?.metrics?.memory_usage_percent}%`}
                    subtext={`${data?.metrics?.memory_available_gb}GB Available`}
                    color="#00ff88"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard 
                    icon={<StorageIcon />} 
                    label="Disk" 
                    value={`${data?.metrics?.disk_usage_percent}%`}
                    color="#00ffff"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard 
                    icon={<DnsIcon />} 
                    label="Services" 
                    value={`${Object.keys(data?.services || {}).length}`}
                    subtext="Active Modules"
                    color="#ff8800"
                />
              </Grid>
            </Grid>

            {/* Visual Bars */}
            <Box>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1, display: 'block' }}>System Load Distribution</Typography>
                <Box sx={{ display: 'flex', gap: 1, height: 8, borderRadius: 4, overflow: 'hidden' }}>
                    <Box sx={{ width: `${data?.metrics?.cpu_usage_percent}%`, bgcolor: '#ff4444' }} />
                    <Box sx={{ width: `${data?.metrics?.memory_usage_percent}%`, bgcolor: '#00ff88' }} />
                    <Box sx={{ width: `${data?.metrics?.disk_usage_percent}%`, bgcolor: '#00ffff' }} />
                </Box>
                <Box sx={{ display: 'flex', gap: 3, mt: 1 }}>
                    <Typography variant="caption" sx={{ color: '#ff4444' }}>● CPU</Typography>
                    <Typography variant="caption" sx={{ color: '#00ff88' }}>● MEM</Typography>
                    <Typography variant="caption" sx={{ color: '#00ffff' }}>● DSK</Typography>
                </Box>
            </Box>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
