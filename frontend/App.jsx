import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { db } from './firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import {
  Box,
  Drawer,
  Toolbar,
  Typography,
  Tabs,
  Tab,
  Paper,
  TextField,
  Button,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Divider,
  Fade,
  Slide,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  LinearProgress,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Chat as ChatIcon,
  Search as SearchIcon,
  Memory as MemoryIcon,
  BubbleChart as BubbleChartIcon,
  Psychology as PsychologyIcon,
  Send as SendIcon,
  DeleteOutline as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Code as CodeIcon,
  Storage as DatabaseIcon,
  Description as FileIcon,
  Settings as SettingsIcon,
  AttachFile as AttachFileIcon,
} from '@mui/icons-material';
import './App.css';

// API Configuration
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
console.log('API URL:', API);
const drawerWidth = 260;

// Theme definitions
const themes = {
  cyan: { primary: '#00ffff', secondary: '#00ccff', name: 'Cyan Matrix' },
  green: { primary: '#00ff00', secondary: '#00cc00', name: 'Neon Green' },
  purple: { primary: '#bf00ff', secondary: '#9900cc', name: 'Purple Haze' },
  blue: { primary: '#0088ff', secondary: '#0066cc', name: 'Electric Blue' },
  pink: { primary: '#ff00ff', secondary: '#cc00cc', name: 'Cyber Pink' },
};

// Hexagonal Grid Background Component with 3D depth
function HexagonalGrid({ theme = 'cyan' }) {
  const currentTheme = themes[theme];
  useEffect(() => {
    const canvas = document.getElementById('hex-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const hexSize = 40;
    const hexHeight = hexSize * 2;
    const hexWidth = Math.sqrt(3) * hexSize;
    const cols = Math.ceil(canvas.width / hexWidth) + 2;
    const rows = Math.ceil(canvas.height / hexHeight) + 2;
    
    const hexagons = [];
    
    for (let row = -1; row < rows; row++) {
      for (let col = -1; col < cols; col++) {
        const x = col * hexWidth + (row % 2) * (hexWidth / 2);
        const y = row * hexHeight * 0.75;
        hexagons.push({
          x,
          y,
          opacity: Math.random() * 0.5,
          pulseSpeed: 0.02 + Math.random() * 0.03,
          glowIntensity: Math.random(),
        });
      }
    }

    function drawHexagon(x, y, opacity, glow) {
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const hx = hexSize * Math.cos(angle);
        const hy = hexSize * Math.sin(angle);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      
      // 3D depth effect - inner shadow
      ctx.shadowBlur = 20;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 5;
      
      // Multi-layer gradient for 3D depth
      const gradient = ctx.createRadialGradient(0, -hexSize * 0.3, 0, 0, 0, hexSize * 1.2);
      const [r, g, b] = currentTheme.primary === '#00ffff' ? [0, 255, 255] 
        : currentTheme.primary === '#00ff00' ? [0, 255, 0]
        : currentTheme.primary === '#bf00ff' ? [191, 0, 255]
        : currentTheme.primary === '#0088ff' ? [0, 136, 255]
        : [255, 0, 255];
      
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${opacity * 0.25})`);
      gradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${opacity * 0.15})`);
      gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${opacity * 0.05})`);
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Bright glowing edges with 3D effect
      ctx.shadowBlur = 20 + glow * 30;
      ctx.shadowColor = currentTheme.primary;
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity * 0.9})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    }

    let frame = 0;
    function animate() {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      hexagons.forEach(hex => {
        hex.opacity = 0.1 + Math.sin(frame * hex.pulseSpeed + hex.glowIntensity * 10) * 0.4;
        hex.glowIntensity = 0.3 + Math.sin(frame * 0.01 + hex.x * 0.01) * 0.7;
        drawHexagon(hex.x, hex.y, hex.opacity, hex.glowIntensity);
      });
      
      frame++;
      requestAnimationFrame(animate);
    }
    
    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      <canvas
        id="hex-canvas"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: -1,
          background: '#000000',
        }}
      />
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '100vh',
          background: `repeating-linear-gradient(0deg, transparent, transparent 2px, ${currentTheme.primary}05 2px, ${currentTheme.primary}05 4px)`,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
    </>
  );
}

// Glass Card Component
function GlassCard({ children, theme = 'cyan', sx = {} }) {
  const currentTheme = themes[theme];
  return (
    <Card
      sx={{
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(24px)',
        border: `1px solid ${currentTheme.primary}20`,
        borderRadius: '16px',
        boxShadow: `0 8px 32px rgba(0, 0, 0, 0.8), 0 0 40px ${currentTheme.primary}15`,
        color: '#ffffff',
        ...sx,
      }}
    >
      {children}
    </Card>
  );
}

// Chat Panel
function ChatPanel({ theme = 'cyan' }) {
  const currentTheme = themes[theme];
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Load chat history from Firebase on mount
  useEffect(() => {
    const messagesRef = collection(db, 'chat_messages');
    const q = query(
      messagesRef,
      orderBy('timestamp', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        role: doc.data().role,
        content: doc.data().content,
        timestamp: doc.data().timestamp
      }));
      setMessages(loadedMessages);
    }, (error) => {
      console.error('Firebase listener error:', error);
    });

    return () => unsubscribe();
  }, []);
  
  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    
    const messageText = input;
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`${API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Chat response:', data);
      // Messages are saved to Firebase by backend and will appear via listener
      
    } catch (err) {
      console.error('Chat error:', err);
      // Show error in UI
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassCard theme={theme} sx={{ height: '600px', maxWidth: '900px', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1, overflow: 'auto', p: 3 }}>
        {messages.map((msg, idx) => (
          <Box
            key={idx}
            sx={{
              mb: 2,
              p: 2,
              background: msg.role === 'user' 
                ? `${currentTheme.primary}08` 
                : 'rgba(255, 255, 255, 0.03)',
              borderRadius: '12px',
              borderLeft: msg.role === 'user' 
                ? `3px solid ${currentTheme.primary}` 
                : '3px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <Typography 
              variant="caption" 
              sx={{ 
                color: msg.role === 'user' ? currentTheme.primary : 'rgba(255, 255, 255, 0.6)',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontWeight: 600,
                mb: 0.5,
              }}
            >
              {msg.role === 'user' ? 'You' : 'Vesper'}
            </Typography>
            <Box 
              sx={{ 
                color: '#ffffff',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                '& p': { margin: '0.5em 0' },
                '& ul, & ol': { margin: '0.5em 0', paddingLeft: '1.5em' },
                '& li': { margin: '0.25em 0' },
                '& code': { 
                  background: 'rgba(0, 255, 255, 0.1)',
                  padding: '0.2em 0.4em',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                },
                '& pre': {
                  background: 'rgba(0, 255, 255, 0.05)',
                  padding: '1em',
                  borderRadius: '8px',
                  overflow: 'auto',
                },
                '& strong': { color: currentTheme.primary },
              }}
            >
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </Box>
          </Box>
        ))}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} sx={{ color: currentTheme.primary }} />
          </Box>
        )}
        <div ref={messagesEndRef} />
      </CardContent>
      <Box sx={{ p: 3, pt: 0, display: 'flex', gap: 1.5, alignItems: 'flex-end' }}>
        <IconButton
          sx={{
            color: currentTheme.primary,
            background: 'rgba(255, 255, 255, 0.03)',
            border: `1px solid ${currentTheme.primary}20`,
            borderRadius: '12px',
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.08)',
              borderColor: `${currentTheme.primary}40`,
            },
          }}
        >
          <AttachFileIcon />
        </IconButton>
        <TextField
          fullWidth
          multiline
          minRows={2}
          maxRows={3}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Message Vesper... (Shift+Enter for new line)"
          disabled={loading}
          sx={{
            '& .MuiOutlinedInput-root': {
              background: 'rgba(255, 255, 255, 0.03)',
              border: `1px solid ${currentTheme.primary}20`,
              borderRadius: '12px',
              color: '#ffffff',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              '& fieldset': { border: 'none' },
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.05)',
                borderColor: `${currentTheme.primary}40`,
              },
              '&.Mui-focused': {
                background: 'rgba(255, 255, 255, 0.05)',
                boxShadow: `0 0 0 2px ${currentTheme.primary}66`,
              },
            },
          }}
        />
        <Button
          variant="contained"
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          sx={{
            background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.secondary} 100%)`,
            color: '#000000',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontWeight: 600,
            borderRadius: '12px',
            px: 4,
            '&:hover': {
              background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.primary}dd 100%)`,
              transform: 'scale(0.98)',
            },
            '&:disabled': {
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'rgba(255, 255, 255, 0.3)',
            },
          }}
        >
          <SendIcon />
        </Button>
      </Box>
    </GlassCard>
  );
}

// Research Panel with Tools
function ResearchPanel({ theme = 'cyan' }) {
  const currentTheme = themes[theme];
  const [tab, setTab] = useState(0);
  
  return (
    <GlassCard theme={theme} sx={{ height: '600px', maxWidth: '900px' }}>
      <Tabs
        value={tab}
        onChange={(e, v) => setTab(v)}
        sx={{
          borderBottom: `1px solid ${currentTheme.primary}20`,
          '& .MuiTab-root': {
            color: 'rgba(255, 255, 255, 0.6)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            textTransform: 'none',
            fontWeight: 500,
            '&.Mui-selected': {
              color: currentTheme.primary,
            },
          },
          '& .MuiTabs-indicator': {
            background: currentTheme.primary,
          },
        }}
      >
        <Tab label="Web Scraper" />
        <Tab label="Database" />
        <Tab label="Files" />
        <Tab label="Code" />
        <Tab label="Synthesis" />
      </Tabs>
      <Box sx={{ p: 3 }}>
        {tab === 0 && <WebScraperTool theme={theme} />}
        {tab === 1 && <DatabaseTool />}
        {tab === 2 && <FileProcessorTool />}
        {tab === 3 && <CodeExecutorTool />}
        {tab === 4 && <SynthesizerTool />}
      </Box>
    </GlassCard>
  );
}

// Web Scraper Tool
function WebScraperTool({ theme = 'cyan' }) {
  const currentTheme = themes[theme];
  const [url, setUrl] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const scrape = async () => {
    if (!url.trim()) return;
    setLoading(true);
    try {
      const response = await fetch(`${API}/api/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), deep: true })
      });
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, color: '#ffffff', fontFamily: 'system-ui' }}>
        Web Scraper
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          fullWidth
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="Enter URL..."
          disabled={loading}
          sx={{
            '& .MuiOutlinedInput-root': {
              background: 'rgba(255, 255, 255, 0.03)',
              color: '#ffffff',
              '& fieldset': { borderColor: `${currentTheme.primary}30` },
              '&:hover fieldset': { borderColor: `${currentTheme.primary}50` },
              '&.Mui-focused fieldset': { borderColor: currentTheme.primary },
            },
          }}
        />
        <Button
          variant="contained"
          onClick={scrape}
          disabled={loading}
          sx={{
            background: currentTheme.primary,
            color: '#000000',
            '&:hover': { background: currentTheme.secondary },
          }}
        >
          Scrape
        </Button>
      </Box>
      {loading && <CircularProgress sx={{ color: currentTheme.primary }} />}
      {result && (
        <Box sx={{ 
          mt: 2, 
          p: 2, 
          background: 'rgba(255, 255, 255, 0.03)', 
          borderRadius: '8px',
          maxHeight: '400px',
          overflow: 'auto',
        }}>
          <pre style={{ color: '#ffffff', fontFamily: 'monospace', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </Box>
      )}
    </Box>
  );
}

// Database Tool
function DatabaseTool() {
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, color: '#ffffff' }}>
        Database Manager
      </Typography>
      <Typography sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
        Database tools coming soon...
      </Typography>
    </Box>
  );
}

// File Processor Tool
function FileProcessorTool() {
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, color: '#ffffff' }}>
        File Processor
      </Typography>
      <Typography sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
        File processing tools coming soon...
      </Typography>
    </Box>
  );
}

// Code Executor Tool
function CodeExecutorTool() {
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, color: '#ffffff' }}>
        Code Executor
      </Typography>
      <Typography sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
        Code execution tools coming soon...
      </Typography>
    </Box>
  );
}

// Synthesizer Tool
function SynthesizerTool() {
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, color: '#ffffff' }}>
        Research Synthesizer
      </Typography>
      <Typography sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
        Multi-source synthesis coming soon...
      </Typography>
    </Box>
  );
}

// Settings Panel
function SettingsPanel({ theme = 'cyan', onThemeChange }) {
  const currentTheme = themes[theme];
  
  return (
    <GlassCard sx={{ height: '600px', maxWidth: '900px', p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3, color: '#ffffff', fontFamily: 'system-ui' }}>
        Settings
      </Typography>
      
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2, color: '#ffffff', fontFamily: 'system-ui', fontSize: '1rem' }}>
          Theme Selection
        </Typography>
        <Typography variant="body2" sx={{ mb: 3, color: 'rgba(255, 255, 255, 0.6)', fontFamily: 'system-ui' }}>
          Choose your color theme. This will update the entire interface including background, buttons, and accents.
        </Typography>
        <Grid container spacing={2}>
          {Object.entries(themes).map(([key, themeOption]) => (
            <Grid item xs={12} sm={6} md={4} key={key}>
              <Button
                fullWidth
                onClick={() => onThemeChange(key)}
                sx={{
                  p: 2,
                  borderRadius: '12px',
                  background: theme === key 
                    ? `linear-gradient(135deg, ${themeOption.primary}20, ${themeOption.secondary}10)`
                    : 'rgba(255, 255, 255, 0.03)',
                  border: theme === key 
                    ? `2px solid ${themeOption.primary}`
                    : `2px solid ${themeOption.primary}15`,
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  '&:hover': {
                    background: `linear-gradient(135deg, ${themeOption.primary}15, ${themeOption.secondary}08)`,
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <Box sx={{
                  width: '100%',
                  height: 60,
                  borderRadius: '8px',
                  background: `linear-gradient(135deg, ${themeOption.primary}, ${themeOption.secondary})`,
                  boxShadow: `0 4px 20px ${themeOption.primary}40`,
                }} />
                <Typography sx={{ 
                  color: '#ffffff', 
                  fontFamily: 'system-ui',
                  fontWeight: theme === key ? 600 : 400,
                  textTransform: 'none',
                }}>
                  {themeOption.name}
                </Typography>
              </Button>
            </Grid>
          ))}
        </Grid>
      </Box>
      
      <Divider sx={{ my: 3, borderColor: `${currentTheme.primary}20` }} />
      
      <Box>
        <Typography variant="h6" sx={{ mb: 2, color: '#ffffff', fontFamily: 'system-ui', fontSize: '1rem' }}>
          About
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontFamily: 'system-ui' }}>
          Vesper AI Assistant - Version 1.0
        </Typography>
      </Box>
    </GlassCard>
  );
}

// Memory Panel
function MemoryPanel({ theme = 'cyan' }) {
  const currentTheme = themes[theme];
  return (
    <GlassCard theme={theme} sx={{ height: '600px', maxWidth: '900px', p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3, color: '#ffffff' }}>
        Memory Bank
      </Typography>
      <Typography sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
        Memory storage coming soon...
      </Typography>
    </GlassCard>
  );
}

// Tasks Panel
function TasksPanel({ theme = 'cyan' }) {
  const currentTheme = themes[theme];
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    fetch(`${API}/api/tasks`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setTasks(data))
      .catch(() => setTasks([]));
  }, []);

  return (
    <GlassCard sx={{ height: '600px', maxWidth: '900px', p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3, color: '#ffffff' }}>
        Task Manager
      </Typography>
      <List>
        {tasks.map((task, idx) => (
          <ListItem
            key={idx}
            sx={{
              mb: 1,
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '8px',
              borderLeft: `3px solid ${currentTheme.primary}`,
            }}
          >
            <ListItemText
              primary={task.task}
              secondary={task.status}
              primaryTypographyProps={{ color: '#ffffff' }}
              secondaryTypographyProps={{ color: 'rgba(255, 255, 255, 0.6)' }}
            />
          </ListItem>
        ))}
      </List>
    </GlassCard>
  );
}

// Main App
export default function App() {
  const [currentView, setCurrentView] = useState('chat');
  const [currentTheme, setCurrentTheme] = useState('cyan');
  const theme = themes[currentTheme];

  const menuItems = [
    { id: 'chat', label: 'Chat', icon: <ChatIcon /> },
    { id: 'research', label: 'Research', icon: <SearchIcon /> },
    { id: 'memory', label: 'Memory', icon: <MemoryIcon /> },
    { id: 'tasks', label: 'Tasks', icon: <CheckCircleIcon /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon /> },
  ];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <HexagonalGrid theme={currentTheme} />
      
      {/* Modern Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            background: '#000000',
            backdropFilter: 'blur(10px)',
            borderRight: `1px solid ${theme.primary}15`,
            boxShadow: `2px 0 30px ${theme.primary}10`,
          },
        }}
      >
        <Toolbar sx={{ 
          borderBottom: `1px solid ${theme.primary}15`,
          background: 'transparent',
          paddingY: 3,
        }}>
          <Box sx={{
            width: 36,
            height: 36,
            borderRadius: '8px',
            background: `linear-gradient(135deg, ${theme.primary}26, ${theme.secondary}1a)`,
            border: `1px solid ${theme.primary}33`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mr: 2,
          }}>
            <BubbleChartIcon sx={{ 
              color: theme.primary, 
              fontSize: 22,
            }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ 
              color: '#ffffff', 
              fontFamily: 'system-ui, -apple-system, sans-serif', 
              fontWeight: 600,
              fontSize: '1.1rem',
              lineHeight: 1.2,
            }}>
              Vesper
            </Typography>
            <Typography variant="caption" sx={{ 
              color: 'rgba(255, 255, 255, 0.5)', 
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: '0.75rem',
            }}>
              AI Assistant
            </Typography>
          </Box>
        </Toolbar>
        <List sx={{ mt: 2 }}>
          {menuItems.map((item) => (
            <ListItem
              button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              sx={{
                mb: 0.5,
                mx: 1.5,
                borderRadius: '8px',
                background: currentView === item.id 
                  ? 'rgba(255, 255, 255, 0.03)'
                  : 'transparent',
                borderLeft: currentView === item.id 
                  ? `3px solid ${theme.primary}`
                  : '3px solid transparent',
                paddingLeft: currentView === item.id ? 1 : 1.375,
                transition: 'all 0.2s ease',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderLeft: `3px solid ${theme.primary}80`,
                },
              }}
            >
              <Box sx={{ 
                color: currentView === item.id ? theme.primary : 'rgba(255, 255, 255, 0.4)', 
                mr: 2,
                display: 'flex',
                alignItems: 'center',
              }}>
                {item.icon}
              </Box>
              <ListItemText 
                primary={item.label} 
                primaryTypographyProps={{
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontWeight: currentView === item.id ? 600 : 400,
                  color: currentView === item.id ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
                  fontSize: '0.9rem',
                }}
              />
            </ListItem>
          ))}
        </List>
        
        {/* Status Indicator */}
        <Box sx={{ 
          position: 'absolute', 
          bottom: 0, 
          left: 0, 
          right: 0, 
          p: 2,
          borderTop: `1px solid ${theme.primary}15`,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: theme.primary,
              boxShadow: `0 0 8px ${theme.primary}`,
            }} />
            <Box>
              <Typography sx={{ 
                color: '#ffffff', 
                fontSize: '0.85rem',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontWeight: 500,
              }}>
                System Online
              </Typography>
              <Typography sx={{ 
                color: 'rgba(255, 255, 255, 0.4)', 
                fontSize: '0.7rem',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}>
                All systems operational
              </Typography>
            </Box>
          </Box>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          ml: 0,
          width: `calc(100% - ${drawerWidth}px)`,
        }}
      >
        <Fade in={true} timeout={500}>
          <Box>
            {currentView === 'chat' && <ChatPanel theme={currentTheme} />}
            {currentView === 'research' && <ResearchPanel theme={currentTheme} />}
            {currentView === 'memory' && <MemoryPanel theme={currentTheme} />}
            {currentView === 'tasks' && <TasksPanel theme={currentTheme} />}
            {currentView === 'settings' && <SettingsPanel theme={currentTheme} onThemeChange={setCurrentTheme} />}
          </Box>
        </Fade>
      </Box>
    </Box>
  );
}
