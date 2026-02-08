import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Chip,
  LinearProgress,
  Alert,
  Card,
  CardContent,
  Divider,
  IconButton,
  TextField,
} from '@mui/material';
import {
  CloudUpload as DeployIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  Settings as SettingsIcon,
  CloudDone as CloudDoneIcon,
  CloudQueue as CloudQueueIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const DeployPage = ({ onClose }) => {
  const [deploymentStatus, setDeploymentStatus] = useState('idle'); // idle, deploying, success, error
  const [deploymentInfo, setDeploymentInfo] = useState({
    backend: {
      url: import.meta.env.VITE_API_URL || 'Not configured',
      status: 'unknown',
      lastDeployed: null,
    },
    frontend: {
      url: window.location.origin,
      status: 'active',
      lastDeployed: null,
    },
    firebase: {
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'Not configured',
      status: 'unknown',
    },
  });

  useEffect(() => {
    // Check backend health
    checkBackendHealth();
    checkFirebaseConnection();
  }, []);

  const checkBackendHealth = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';
      const response = await fetch(`${API_URL}/health`, {
        method: 'GET',
      });
      
      if (response.ok) {
        setDeploymentInfo(prev => ({
          ...prev,
          backend: {
            ...prev.backend,
            status: 'healthy',
          },
        }));
      } else {
        setDeploymentInfo(prev => ({
          ...prev,
          backend: {
            ...prev.backend,
            status: 'unhealthy',
          },
        }));
      }
    } catch (error) {
      setDeploymentInfo(prev => ({
        ...prev,
        backend: {
          ...prev.backend,
          status: 'offline',
        },
      }));
    }
  };

  const checkFirebaseConnection = () => {
    try {
      if (import.meta.env.VITE_FIREBASE_PROJECT_ID) {
        setDeploymentInfo(prev => ({
          ...prev,
          firebase: {
            ...prev.firebase,
            status: 'connected',
          },
        }));
      }
    } catch (error) {
      setDeploymentInfo(prev => ({
        ...prev,
        firebase: {
          ...prev.firebase,
          status: 'disconnected',
        },
      }));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
      case 'active':
      case 'connected':
        return 'success';
      case 'unhealthy':
      case 'offline':
      case 'disconnected':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
      case 'active':
      case 'connected':
        return <SuccessIcon />;
      case 'unhealthy':
      case 'offline':
      case 'disconnected':
        return <ErrorIcon />;
      default:
        return <CloudQueueIcon />;
    }
  };

  const handleRefresh = () => {
    checkBackendHealth();
    checkFirebaseConnection();
  };

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, #0a0a1e 0%, #1a0a2e 50%, #0a1a2e 100%)',
        zIndex: 2000,
        overflowY: 'auto',
        p: 3,
      }}
    >
      {/* Animated background */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            'radial-gradient(circle at 20% 50%, rgba(0, 255, 255, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(138, 43, 226, 0.05) 0%, transparent 50%)',
          pointerEvents: 'none',
        }}
      />

      <Box sx={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <Box
          className="glass-panel"
          sx={{
            p: 3,
            mb: 3,
            borderRadius: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box>
            <Typography
              variant="h4"
              sx={{
                background: 'linear-gradient(135deg, #00ffff, #a78bfa, #ec4899)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 700,
                mb: 1,
              }}
            >
              <DeployIcon sx={{ mr: 2, verticalAlign: 'middle', color: '#00ffff' }} />
              Deployment Manager
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              Monitor and manage your Vesper AI deployments
            </Typography>
          </Box>
          <Box>
            <IconButton
              onClick={handleRefresh}
              sx={{
                color: '#00ffff',
                mr: 1,
                '&:hover': {
                  background: 'rgba(0, 255, 255, 0.1)',
                },
              }}
            >
              <RefreshIcon />
            </IconButton>
            <IconButton
              onClick={onClose}
              sx={{
                color: '#ff4444',
                '&:hover': {
                  background: 'rgba(255, 68, 68, 0.1)',
                },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Deployment Status Cards */}
        <Grid container spacing={3}>
          {/* Backend Status */}
          <Grid item xs={12} md={4}>
            <Card
              className="glass-panel"
              sx={{
                height: '100%',
                borderRadius: '16px',
                border: '1px solid rgba(0, 255, 255, 0.2)',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CloudDoneIcon sx={{ color: '#00ffff', mr: 1 }} />
                  <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                    Backend Service
                  </Typography>
                </Box>
                <Divider sx={{ borderColor: 'rgba(0, 255, 255, 0.2)', mb: 2 }} />
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 1 }}>
                    API URL
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#00ffff',
                      fontFamily: 'monospace',
                      wordBreak: 'break-all',
                    }}
                  >
                    {deploymentInfo.backend.url}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mr: 1 }}>
                    Status:
                  </Typography>
                  <Chip
                    icon={getStatusIcon(deploymentInfo.backend.status)}
                    label={deploymentInfo.backend.status.toUpperCase()}
                    color={getStatusColor(deploymentInfo.backend.status)}
                    size="small"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Frontend Status */}
          <Grid item xs={12} md={4}>
            <Card
              className="glass-panel"
              sx={{
                height: '100%',
                borderRadius: '16px',
                border: '1px solid rgba(0, 255, 255, 0.2)',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CloudDoneIcon sx={{ color: '#a78bfa', mr: 1 }} />
                  <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                    Frontend App
                  </Typography>
                </Box>
                <Divider sx={{ borderColor: 'rgba(167, 139, 250, 0.2)', mb: 2 }} />
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 1 }}>
                    App URL
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#a78bfa',
                      fontFamily: 'monospace',
                      wordBreak: 'break-all',
                    }}
                  >
                    {deploymentInfo.frontend.url}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mr: 1 }}>
                    Status:
                  </Typography>
                  <Chip
                    icon={getStatusIcon(deploymentInfo.frontend.status)}
                    label={deploymentInfo.frontend.status.toUpperCase()}
                    color={getStatusColor(deploymentInfo.frontend.status)}
                    size="small"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Firebase Status */}
          <Grid item xs={12} md={4}>
            <Card
              className="glass-panel"
              sx={{
                height: '100%',
                borderRadius: '16px',
                border: '1px solid rgba(0, 255, 255, 0.2)',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CloudDoneIcon sx={{ color: '#ec4899', mr: 1 }} />
                  <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                    Firebase
                  </Typography>
                </Box>
                <Divider sx={{ borderColor: 'rgba(236, 72, 153, 0.2)', mb: 2 }} />
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 1 }}>
                    Project ID
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#ec4899',
                      fontFamily: 'monospace',
                      wordBreak: 'break-all',
                    }}
                  >
                    {deploymentInfo.firebase.projectId}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mr: 1 }}>
                    Status:
                  </Typography>
                  <Chip
                    icon={getStatusIcon(deploymentInfo.firebase.status)}
                    label={deploymentInfo.firebase.status.toUpperCase()}
                    color={getStatusColor(deploymentInfo.firebase.status)}
                    size="small"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Deployment Guide */}
        <Paper
          className="glass-panel"
          sx={{
            mt: 3,
            p: 3,
            borderRadius: '20px',
          }}
        >
          <Typography
            variant="h5"
            sx={{
              color: '#00ffff',
              fontWeight: 600,
              mb: 2,
            }}
          >
            Deployment Guide
          </Typography>
          
          <Alert
            severity="info"
            icon={<SettingsIcon />}
            sx={{
              mb: 2,
              background: 'rgba(0, 255, 255, 0.1)',
              border: '1px solid rgba(0, 255, 255, 0.3)',
              color: '#fff',
              '& .MuiAlert-icon': {
                color: '#00ffff',
              },
            }}
          >
            <Typography variant="body2">
              For detailed deployment instructions, check the{' '}
              <Typography
                component="a"
                href="/DEPLOYMENT.md"
                target="_blank"
                sx={{
                  color: '#00ffff',
                  textDecoration: 'underline',
                  fontWeight: 600,
                }}
              >
                DEPLOYMENT.md
              </Typography>{' '}
              file in the project root.
            </Typography>
          </Alert>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: '12px',
                  background: 'rgba(0, 255, 255, 0.05)',
                  border: '1px solid rgba(0, 255, 255, 0.2)',
                }}
              >
                <Typography variant="h6" sx={{ color: '#00ffff', mb: 1, fontWeight: 600 }}>
                  Backend (Railway)
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                  1. Install Railway CLI: <code style={{ color: '#00ffff' }}>npm install -g @railway/cli</code>
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                  2. Login: <code style={{ color: '#00ffff' }}>railway login</code>
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                  3. Deploy: <code style={{ color: '#00ffff' }}>railway up</code>
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  4. Set environment variables in Railway dashboard
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: '12px',
                  background: 'rgba(167, 139, 250, 0.05)',
                  border: '1px solid rgba(167, 139, 250, 0.2)',
                }}
              >
                <Typography variant="h6" sx={{ color: '#a78bfa', mb: 1, fontWeight: 600 }}>
                  Frontend (Vercel)
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                  1. Install Vercel CLI: <code style={{ color: '#a78bfa' }}>npm install -g vercel</code>
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                  2. Login: <code style={{ color: '#a78bfa' }}>vercel login</code>
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                  3. Deploy: <code style={{ color: '#a78bfa' }}>vercel --prod</code>
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  4. Set environment variables in Vercel dashboard
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Quick Actions */}
        <Paper
          className="glass-panel"
          sx={{
            mt: 3,
            p: 3,
            borderRadius: '20px',
          }}
        >
          <Typography
            variant="h5"
            sx={{
              color: '#00ffff',
              fontWeight: 600,
              mb: 2,
            }}
          >
            Quick Actions
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleRefresh}
                sx={{
                  borderColor: '#00ffff',
                  color: '#00ffff',
                  '&:hover': {
                    borderColor: '#00ffff',
                    background: 'rgba(0, 255, 255, 0.1)',
                  },
                }}
              >
                Refresh Status
              </Button>
            </Grid>
            <Grid item xs={12} md={4}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<SettingsIcon />}
                onClick={() => window.open('/DEPLOYMENT.md', '_blank')}
                sx={{
                  borderColor: '#a78bfa',
                  color: '#a78bfa',
                  '&:hover': {
                    borderColor: '#a78bfa',
                    background: 'rgba(167, 139, 250, 0.1)',
                  },
                }}
              >
                View Docs
              </Button>
            </Grid>
            <Grid item xs={12} md={4}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<CloseIcon />}
                onClick={onClose}
                sx={{
                  borderColor: '#ff4444',
                  color: '#ff4444',
                  '&:hover': {
                    borderColor: '#ff4444',
                    background: 'rgba(255, 68, 68, 0.1)',
                  },
                }}
              >
                Close
              </Button>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </Box>
  );
};

export default DeployPage;
