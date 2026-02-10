import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Typography,
  CircularProgress,
  Paper,
  Chip,
  Stack,
  Tooltip,
  Divider,
  Badge,
  Button,
  Grid,
  Snackbar,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Send as SendIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  HistoryRounded,
  BoltRounded,
  ContentCopyRounded,
  StorageRounded,
  ScienceRounded,
  HubRounded,
  ChecklistRounded,
  SettingsRounded,
  PublicRounded,
  Palette as PaletteIcon,
} from '@mui/icons-material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useHotkeys } from 'react-hotkeys-hook';
import { DndContext, useDraggable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';

// Firebase
import { db, auth, isFirebaseConfigured } from './src/firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  getDocs,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

// Components
import AIAvatar from './src/components/AIAvatar';
import CommandPalette from './src/components/CommandPalette';
import VoiceInput from './src/components/VoiceInput';
import FloatingActionButton from './src/components/FloatingActionButton';
import Game from './src/game/Game';

// Styles
import './App.css';
import './src/enhancements.css';

const baseTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#00ffff' },
    background: { default: '#000', paper: 'rgba(8, 10, 24, 0.8)' },
  },
  typography: { fontFamily: '"Inter", "Segoe UI", -apple-system, sans-serif' },
});

const THEMES = [
  { id: 'cyan', label: 'Cyan Matrix', accent: '#00ffff', glow: '#00fff2', sub: '#00ff88' },
  { id: 'green', label: 'Neon Green', accent: '#00ff00', glow: '#00ff00', sub: '#00dd00' },
  { id: 'purple', label: 'Purple Haze', accent: '#c084fc', glow: '#a855f7', sub: '#7c3aed' },
  { id: 'blue', label: 'Electric Blue', accent: '#5ad7ff', glow: '#4ba3ff', sub: '#3b82f6' },
  { id: 'pink', label: 'Cyber Pink', accent: '#ff6ad5', glow: '#ff8bd7', sub: '#ff4db8' },
  { id: 'orange', label: 'Solar Flare', accent: '#ff8800', glow: '#ff9933', sub: '#ff6600' },
  { id: 'red', label: 'Blood Moon', accent: '#ff0044', glow: '#ff3366', sub: '#cc0033' },
  { id: 'gold', label: 'Golden Hour', accent: '#ffd700', glow: '#ffed4e', sub: '#ffb700' },
  { id: 'ice', label: 'Arctic Frost', accent: '#e0f7ff', glow: '#b3e5fc', sub: '#81d4fa' },
  { id: 'teal', label: 'Deep Ocean', accent: '#00d9ff', glow: '#00bcd4', sub: '#0097a7' },
  { id: 'violet', label: 'Midnight Violet', accent: '#9d00ff', glow: '#b24bf3', sub: '#7b00cc' },
  { id: 'lime', label: 'Toxic Waste', accent: '#c0ff00', glow: '#d4ff33', sub: '#a8cc00' },
];

const NAV = [
  { id: 'chat', label: 'Neural Chat', icon: HubRounded },
  { id: 'research', label: 'Research Tools', icon: ScienceRounded },
  { id: 'memory', label: 'Memory Core', icon: StorageRounded },
  { id: 'tasks', label: 'Task Matrix', icon: ChecklistRounded },
  { id: 'settings', label: 'Settings', icon: SettingsRounded },
];

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [thinking, setThinking] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const safeStorageGet = (key, fallback) => {
    if (typeof window === 'undefined') return fallback;
    try {
      return window.localStorage.getItem(key) || fallback;
    } catch (error) {
      console.warn('Storage read failed', error);
      return fallback;
    }
  };

  const [gameMode, setGameMode] = useState(false);
  const [activeSection, setActiveSection] = useState(() => safeStorageGet('vesper_active_section', 'chat'));
  const [activeTheme, setActiveTheme] = useState(() => {
    const storedId = safeStorageGet('vesper_theme', THEMES[0].id);
    return THEMES.find((t) => t.id === storedId) || THEMES[0];
  });
  const [researchItems, setResearchItems] = useState([]);
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchForm, setResearchForm] = useState({ title: '', summary: '' });
  const [memoryItems, setMemoryItems] = useState([]);
  const [memoryCategory, setMemoryCategory] = useState(() => safeStorageGet('vesper_memory_category', 'notes'));
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [memoryText, setMemoryText] = useState('');
  const [tasks, setTasks] = useState([]);
  const [themeMenuAnchor, setThemeMenuAnchor] = useState(null);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', status: 'inbox' });
  const [toast, setToast] = useState('');
  
  // Draggable board positions - load from localStorage
  const [boardPositions, setBoardPositions] = useState(() => {
    const saved = safeStorageGet('vesper_board_positions', null);
    return saved ? JSON.parse(saved) : {
      research: { x: 50, y: 50 },
      memory: { x: 100, y: 100 },
      tasks: { x: 150, y: 150 },
      settings: { x: 200, y: 200 },
    };
  });

  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Drag-and-drop sensor setup
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag (prevents accidental drags)
      },
    })
  );

  // Handle drag end - save new position
  const handleDragEnd = useCallback((event) => {
    const { active, delta } = event;
    if (!delta) return;
    
    setBoardPositions((prev) => {
      const newPositions = {
        ...prev,
        [active.id]: {
          x: (prev[active.id]?.x || 0) + delta.x,
          y: (prev[active.id]?.y || 0) + delta.y,
        },
      };
      // Save to localStorage
      try {
        localStorage.setItem('vesper_board_positions', JSON.stringify(newPositions));
      } catch (e) {
        console.warn('Failed to save board positions', e);
      }
      return newPositions;
    });
  }, []);

  const apiBase = useMemo(() => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL.replace(/\/$/, '');
    if (typeof window !== 'undefined' && window.location.origin.includes('localhost')) return 'http://localhost:8000';
    return '';
  }, []);

  const disableFirebaseAuth = useMemo(
    () => String(import.meta.env.VITE_DISABLE_FIREBASE_AUTH).toLowerCase() === 'true',
    []
  );

  const chatBase = useMemo(() => {
    if (import.meta.env.VITE_CHAT_API_URL) return import.meta.env.VITE_CHAT_API_URL.replace(/\/$/, '');
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL.replace(/\/$/, '');
    if (typeof window !== 'undefined' && window.location.origin.includes('localhost')) return 'http://localhost:8000';
    return '';
  }, []);

  const addLocalMessage = async (role, content) => {
    const message = {
      id: `${Date.now()}-${Math.random()}`,
      userId: userId || 'local',
      role,
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, message]);

    if (
      isFirebaseConfigured &&
      db &&
      userId &&
      userId !== 'local' &&
      typeof addDoc === 'function' &&
      typeof collection === 'function'
    ) {
      try {
        await addDoc(collection(db, 'chat_messages'), {
          ...message,
          timestamp: serverTimestamp(),
        });
      } catch (error) {
        console.error('Failed to persist message:', error);
      }
    }
  };

  useHotkeys('ctrl+k, cmd+k', (e) => {
    e.preventDefault();
    setCommandPaletteOpen(true);
  });

  useHotkeys('c', (e) => {
    e.preventDefault();
    setGameMode((prev) => !prev);
  });

  useEffect(() => {
    if (disableFirebaseAuth || !isFirebaseConfigured || !auth || typeof signInAnonymously !== 'function') {
      setUserId('local');
      return;
    }
    const initAuth = async () => {
      try {
        const result = await signInAnonymously(auth);
        setUserId(result.user.uid);
      } catch (error) {
        console.error('Auth error:', error);
        setUserId('local');
      }
    };
    initAuth();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('vesper_theme', activeTheme.id);
      window.localStorage.setItem('vesper_active_section', activeSection);
      window.localStorage.setItem('vesper_memory_category', memoryCategory);
    } catch (error) {
      console.warn('Storage write failed', error);
    }
  }, [activeTheme, activeSection, memoryCategory]);

  useEffect(() => {
    if (
      !isFirebaseConfigured ||
      !db ||
      !userId ||
      userId === 'local' ||
      typeof query !== 'function' ||
      typeof collection !== 'function' ||
      typeof orderBy !== 'function' ||
      typeof onSnapshot !== 'function'
    )
      return;

    const q = query(collection(db, 'chat_messages'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedMessages = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.userId === userId) {
          loadedMessages.push({
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : data.timestamp,
          });
        }
      });
      setMessages(loadedMessages);
    });
    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput('');
    setLoading(true);
    setThinking(true);
    addLocalMessage('user', userMessage);
    try {
      const response = await fetch(`${chatBase}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });
      if (!response.ok) throw new Error('Backend call failed');
      const data = await response.json();
      addLocalMessage('assistant', data.response);
    } catch (error) {
      console.error('Error:', error);
      addLocalMessage(
        'assistant',
        "I'm having trouble connecting right now, but I'm still here! Press C to jump into the world and I'll keep watch."
      );
    } finally {
      setLoading(false);
      setThinking(false);
    }
  };

  const clearHistory = async () => {
    if (!userId) return;
    if (
      !isFirebaseConfigured ||
      !db ||
      userId === 'local' ||
      typeof query !== 'function' ||
      typeof collection !== 'function' ||
      typeof getDocs !== 'function' ||
      typeof deleteDoc !== 'function'
    ) {
      setMessages([]);
      return;
    }
    const q = query(collection(db, 'chat_messages'));
    const snapshot = await getDocs(q);
    const deletePromises = [];
    snapshot.forEach((doc) => {
      if (doc.data().userId === userId) deletePromises.push(deleteDoc(doc.ref));
    });
    await Promise.all(deletePromises);
    setMessages([]);
  };

  const fetchResearch = useCallback(async () => {
    if (!apiBase) return;
    setResearchLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/research`);
      const data = await res.json();
      setResearchItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Research fetch failed:', error);
    } finally {
      setResearchLoading(false);
    }
  }, [apiBase]);

  const addResearchEntry = async () => {
    if (!researchForm.title.trim() || !apiBase) return;
    try {
      await fetch(`${apiBase}/api/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: researchForm.title,
          summary: researchForm.summary,
          timestamp: new Date().toISOString(),
        }),
      });
      setResearchForm({ title: '', summary: '' });
      fetchResearch();
      setToast('Research saved');
    } catch (error) {
      console.error('Research save failed:', error);
    }
  };

  const fetchMemory = useCallback(
    async (category) => {
      if (!apiBase || !category) return;
      setMemoryLoading(true);
      try {
        const res = await fetch(`${apiBase}/api/memory/${category}`);
        const data = await res.json();
        setMemoryItems(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Memory fetch failed:', error);
      } finally {
        setMemoryLoading(false);
      }
    },
    [apiBase]
  );

  const addMemoryEntry = async () => {
    if (!memoryText.trim() || !apiBase) return;
    try {
      await fetch(`${apiBase}/api/memory/${memoryCategory}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: memoryText, meta: { category: memoryCategory } }),
      });
      setMemoryText('');
      fetchMemory(memoryCategory);
      setToast('Memory stored');
    } catch (error) {
      console.error('Memory save failed:', error);
    }
  };

  const fetchTasks = useCallback(async () => {
    if (!apiBase) return;
    setTasksLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/tasks`);
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Tasks fetch failed:', error);
    } finally {
      setTasksLoading(false);
    }
  }, [apiBase]);

  const addTask = async () => {
    if (!taskForm.title.trim() || !apiBase) return;
    try {
      await fetch(`${apiBase}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...taskForm, createdAt: new Date().toISOString() }),
      });
      setTaskForm({ title: '', status: 'inbox' });
      fetchTasks();
      setToast('Task added');
    } catch (error) {
      console.error('Add task failed:', error);
    }
  };

  const updateTaskStatus = async (idx, status) => {
    if (!apiBase) return;
    try {
      await fetch(`${apiBase}/api/tasks/${idx}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      fetchTasks();
    } catch (error) {
      console.error('Update task failed:', error);
    }
  };

  const deleteTask = async (idx) => {
    if (!apiBase) return;
    try {
      await fetch(`${apiBase}/api/tasks/${idx}`, { method: 'DELETE' });
      fetchTasks();
    } catch (error) {
      console.error('Delete task failed:', error);
    }
  };

  useEffect(() => {
    fetchResearch();
    fetchTasks();
  }, [fetchResearch, fetchTasks]);

  useEffect(() => {
    fetchMemory(memoryCategory);
  }, [fetchMemory, memoryCategory]);

  const handleCommand = (command) => {
    switch (command) {
      case 'newChat':
      case 'clearHistory':
        clearHistory();
        break;
      case 'settings':
        setActiveSection('settings');
        break;
      case 'mindmap':
        setActiveSection('research');
        break;
      case 'suggestions':
        setInput('Can you give me some suggestions?');
        break;
      case 'enterWorld':
        setGameMode(true);
        break;
      default:
        break;
    }
  };

  const handleVoiceTranscript = (transcript) => setInput(transcript);

  const handleFileShare = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const isImage = file.type.startsWith('image/');
    const fileName = file.name;

    // Add file reference to input
    const fileRef = isImage ? `📎 [Image: ${fileName}]` : `📎 [File: ${fileName}]`;
    setInput((prev) => (prev ? prev + ' ' + fileRef : fileRef));

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatTime = (d) => {
    try {
      return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const renderMessage = (message) => {
    const isUser = message.role === 'user';
    const ts = formatTime(message.timestamp || Date.now());
    return (
      <motion.div
        initial={{ opacity: 0, x: isUser ? 20 : -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25 }}
        style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: '16px' }}
      >
        <Box
          className="message-bubble glass-card"
          sx={{
            maxWidth: '70%',
            padding: '12px 16px',
            borderRadius: '16px',
            background: isUser
              ? 'linear-gradient(135deg, rgba(0, 255, 255, 0.18), rgba(0, 136, 255, 0.12))'
              : 'rgba(10, 14, 30, 0.8)',
            border: `1px solid ${isUser ? 'rgba(0, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.12)'}`,
            boxShadow: isUser
              ? '0 0 24px rgba(0, 255, 255, 0.35)'
              : '0 8px 32px rgba(0, 0, 0, 0.35)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
            {!isUser && <AIAvatar thinking={thinking} mood={thinking ? 'thinking' : 'neutral'} />}
            <Typography variant="caption" sx={{ color: isUser ? 'rgba(255,255,255,0.8)' : 'var(--accent)', fontWeight: 700 }}>
              {isUser ? 'You' : 'Vesper'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
              {ts}
            </Typography>
            {!isUser && thinking && (
              <Chip
                label="thinking"
                size="small"
                sx={{
                  height: 20,
                  color: 'var(--accent)',
                  borderColor: 'rgba(0,255,255,0.4)',
                  borderStyle: 'solid',
                  borderWidth: 1,
                  background: 'rgba(0,255,255,0.08)',
                }}
              />
            )}
          </Box>
          <ReactMarkdown
            components={{
              code: ({ inline, className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || '');
                const codeString = String(children).replace(/\n$/, '');
                const copy = async () => {
                  try {
                    await navigator.clipboard.writeText(codeString);
                  } catch (e) {
                    console.error(e);
                  }
                };
                return !inline && match ? (
                  <Box
                    sx={{
                      position: 'relative',
                      background: 'rgba(0, 0, 0, 0.35)',
                      p: 2,
                      borderRadius: '10px',
                      fontFamily: 'monospace',
                      color: 'var(--accent)',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    <IconButton size="small" onClick={copy} sx={{ position: 'absolute', top: 4, right: 4, color: 'var(--accent)' }}>
                      <ContentCopyRounded fontSize="small" />
                    </IconButton>
                    <code className={className}>{codeString}</code>
                  </Box>
                ) : (
                  <code
                    className={className}
                    style={{
                      background: 'rgba(0, 0, 0, 0.35)',
                      padding: '2px 6px',
                      borderRadius: '6px',
                      fontFamily: 'monospace',
                      color: 'var(--accent)',
                    }}
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </Box>
      </motion.div>
    );
  };

  const themeVars = {
    '--accent': activeTheme.accent,
    '--accent-2': activeTheme.sub,
    '--glow': activeTheme.glow,
  };

  const STATUS_ORDER = ['inbox', 'doing', 'done'];

  // Draggable Board Wrapper Component
  const DraggableBoard = ({ id, children }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
      id,
    });

    const position = boardPositions[id] || { x: 0, y: 0 };

    const style = {
      position: 'fixed',
      top: '80px',
      left: '280px',
      zIndex: isDragging ? 1000 : 10,
      cursor: 'grab',
      transform: `translate3d(${position.x + (transform?.x || 0)}px, ${position.y + (transform?.y || 0)}px, 0)`,
      transition: isDragging ? 'none' : 'transform 0.2s ease',
      width: 'calc(100vw - 320px)',
      maxWidth: '1000px',
      maxHeight: 'calc(100vh - 120px)',
      overflow: 'auto',
      touchAction: 'none',
    };

    return (
      <div 
        ref={setNodeRef} 
        style={style} 
        {...listeners} 
        {...attributes}
        data-draggable={id}
      >
        {children}
      </div>
    );
  };

  const renderActiveBoard = () => {
    switch (activeSection) {
      case 'research':
        return (
          <DraggableBoard id="research">
            <Paper className="intel-board glass-card">
              <Box className="board-header">
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Research Feed</Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    Fetches from /api/research. Add notes, summaries, and citations.
                  </Typography>
                </Box>
                <Chip label={researchLoading ? 'Syncing…' : 'Synced'} size="small" className="chip-soft" />
              </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Stack spacing={1}>
                  <TextField
                    label="Title"
                    value={researchForm.title}
                    onChange={(e) => setResearchForm((f) => ({ ...f, title: e.target.value }))}
                    fullWidth
                    variant="filled"
                    size="small"
                    InputProps={{ sx: { color: '#fff' } }}
                  />
                  <TextField
                    label="Summary / findings"
                    multiline
                    minRows={3}
                    value={researchForm.summary}
                    onChange={(e) => setResearchForm((f) => ({ ...f, summary: e.target.value }))}
                    fullWidth
                    variant="filled"
                    size="small"
                    InputProps={{ sx: { color: '#fff' } }}
                  />
                  <Button variant="contained" onClick={addResearchEntry} disabled={!researchForm.title.trim()}>
                    Save Research
                  </Button>
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box className="board-list">
                  {(researchItems || []).slice().reverse().map((item, idx) => (
                    <Box key={`${item.title}-${idx}`} className="board-row">
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {item.title || 'Untitled entry'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                          {item.summary || item.content || 'No summary yet.'}
                        </Typography>
                      </Box>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                        {formatTime(item.timestamp || Date.now())}
                      </Typography>
                    </Box>
                  ))}
                  {!researchItems?.length && !researchLoading && (
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                      No research logged yet.
                    </Typography>
                  )}
                </Box>
              </Grid>
            </Grid>
          </Paper>
          </DraggableBoard>
        );
      case 'memory':
        return (
          <DraggableBoard id="memory">
            <Paper className="intel-board glass-card">
              <Box className="board-header">
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Memory Core</Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    Uses /api/memory/{memoryCategory}. Fast, file-backed store.
                </Typography>
              </Box>
              <Chip label={memoryLoading ? 'Syncing…' : 'Synced'} size="small" className="chip-soft" />
            </Box>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {['notes', 'conversations', 'sensory_experiences', 'creative_moments', 'emotional_bonds'].map((cat) => (
                <Chip
                  key={cat}
                  label={cat.replace(/_/g, ' ')}
                  onClick={() => setMemoryCategory(cat)}
                  color={memoryCategory === cat ? 'primary' : 'default'}
                  variant={memoryCategory === cat ? 'filled' : 'outlined'}
                  size="small"
                />
              ))}
            </Stack>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Stack spacing={1}>
                  <TextField
                    label="New memory"
                    multiline
                    minRows={3}
                    value={memoryText}
                    onChange={(e) => setMemoryText(e.target.value)}
                    fullWidth
                    variant="filled"
                    size="small"
                    InputProps={{ sx: { color: '#fff' } }}
                  />
                  <Button variant="contained" onClick={addMemoryEntry} disabled={!memoryText.trim()}>
                    Save Memory
                  </Button>
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box className="board-list">
                  {(memoryItems || []).slice().reverse().map((item, idx) => (
                    <Box key={`${item.timestamp}-${idx}`} className="board-row">
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                        {item.content}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                        {formatTime(item.timestamp || Date.now())}
                      </Typography>
                    </Box>
                  ))}
                  {!memoryItems?.length && !memoryLoading && (
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                      Nothing stored for this category yet.
                    </Typography>
                  )}
                </Box>
              </Grid>
            </Grid>
          </Paper>
          </DraggableBoard>
        );
      case 'tasks':
        return (
          <DraggableBoard id="tasks">
            <Paper className="intel-board glass-card">
              <Box className="board-header">
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Task Matrix</Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    Connected to /api/tasks with quick status hops.
                </Typography>
              </Box>
              <Chip label={tasksLoading ? 'Syncing…' : 'Synced'} size="small" className="chip-soft" />
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Stack spacing={1}>
                  <TextField
                    label="Task title"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
                    fullWidth
                    variant="filled"
                    size="small"
                    InputProps={{ sx: { color: '#fff' } }}
                  />
                  <Button variant="contained" onClick={addTask} disabled={!taskForm.title.trim()}>
                    Add Task
                  </Button>
                </Stack>
              </Grid>
              <Grid item xs={12} md={8}>
                <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 1 }}>
                  {STATUS_ORDER.map((status) => (
                    <Box key={status} className="task-column glass-card">
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'capitalize' }}>
                        {status}
                      </Typography>
                      <Stack spacing={1}>
                        {(tasks || []).map((task, idx) => {
                          if ((task.status || 'inbox') !== status) return null;
                          return (
                            <Box key={`${task.title}-${idx}`} className="task-row">
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {task.title || 'Untitled task'}
                              </Typography>
                              <Stack direction="row" spacing={1}>
                                <Tooltip title="Advance status">
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      const nextIndex = Math.min(STATUS_ORDER.length - 1, STATUS_ORDER.indexOf(status) + 1);
                                      updateTaskStatus(idx, STATUS_ORDER[nextIndex]);
                                    }}
                                  >
                                    <BoltRounded fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete task">
                                  <IconButton size="small" onClick={() => deleteTask(idx)}>
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </Box>
                          );
                        })}
                        {!tasks?.some((t) => (t.status || 'inbox') === status) && (
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            Empty
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </Grid>
            </Grid>
          </Paper>
          </DraggableBoard>
        );
      case 'settings':
        return (
          <DraggableBoard id="settings">
            <Paper className="intel-board glass-card">
              <Box className="board-header">
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Settings</Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    Control themes, interface density, AI models, and system preferences.
                </Typography>
              </Box>
              <Chip label={isFirebaseConfigured ? 'Firebase ready' : 'Offline mode'} size="small" className="chip-soft" />
            </Box>
            <Stack spacing={3}>
              {/* Theme Selection */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Theme Color</Typography>
                  <IconButton 
                    size="small" 
                    onClick={(e) => setThemeMenuAnchor(e.currentTarget)}
                    sx={{ color: 'var(--accent)' }}
                  >
                    <PaletteIcon fontSize="small" />
                  </IconButton>
                  <Chip 
                    label={activeTheme.label} 
                    size="small" 
                    sx={{ 
                      bgcolor: activeTheme.accent, 
                      color: '#000', 
                      fontWeight: 700,
                      boxShadow: `0 0 15px ${activeTheme.accent}`
                    }} 
                  />
                </Box>
                <Menu
                  anchorEl={themeMenuAnchor}
                  open={Boolean(themeMenuAnchor)}
                  onClose={() => setThemeMenuAnchor(null)}
                  PaperProps={{
                    sx: {
                      bgcolor: 'rgba(10, 14, 30, 0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      backdropFilter: 'blur(20px)',
                      maxHeight: 400,
                    }
                  }}
                >
                  {THEMES.map((t) => (
                    <MenuItem
                      key={t.id}
                      onClick={() => {
                        setActiveTheme(t);
                        setThemeMenuAnchor(null);
                      }}
                      selected={activeTheme.id === t.id}
                      sx={{
                        gap: 1.5,
                        borderLeft: activeTheme.id === t.id ? `3px solid ${t.accent}` : '3px solid transparent',
                        '&.Mui-selected': {
                          bgcolor: `${t.accent}15`,
                        }
                      }}
                    >
                      <Box 
                        sx={{ 
                          width: 24, 
                          height: 24, 
                          borderRadius: '50%', 
                          bgcolor: t.accent,
                          boxShadow: `0 0 10px ${t.accent}`
                        }} 
                      />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{t.label}</Typography>
                    </MenuItem>
                  ))}
                </Menu>
              </Box>
              
              {/* Interface Density */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Interface Density</Typography>
                <Stack direction="row" spacing={1.5}>
                  <Button variant="outlined" size="small" sx={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>Compact</Button>
                  <Button variant="contained" size="small">Normal</Button>
                  <Button variant="outlined" size="small" sx={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>Spacious</Button>
                </Stack>
              </Box>

              {/* AI Model Selection */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>AI Model</Typography>
                <Stack spacing={1}>
                  <Paper className="glass-card" sx={{ p: 1.5, border: '2px solid var(--accent)' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>Claude 3.5 Sonnet</Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>Fast, balanced reasoning • Current</Typography>
                  </Paper>
                  <Paper className="glass-card" sx={{ p: 1.5, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>GPT-4 Turbo</Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>OpenAI flagship model</Typography>
                  </Paper>
                  <Paper className="glass-card" sx={{ p: 1.5, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>Claude 3 Opus</Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>Maximum intelligence</Typography>
                  </Paper>
                </Stack>
              </Box>

              {/* Animation & Effects */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Visual Effects</Typography>
                <Stack spacing={1.5}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2">Hex Grid Animation</Typography>
                    <Chip label="ON" size="small" sx={{ bgcolor: 'var(--accent)', color: '#000' }} />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2">Scanline Effect</Typography>
                    <Chip label="ON" size="small" sx={{ bgcolor: 'var(--accent)', color: '#000' }} />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2">Particle System</Typography>
                    <Chip label="ON" size="small" sx={{ bgcolor: 'var(--accent)', color: '#000' }} />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2">Hologram Flicker</Typography>
                    <Chip label="ON" size="small" sx={{ bgcolor: 'var(--accent)', color: '#000' }} />
                  </Box>
                </Stack>
              </Box>

              {/* Voice & Audio */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Voice & Audio</Typography>
                <Stack spacing={1.5}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2">Voice Input (Hold V)</Typography>
                    <Chip label="Enabled" size="small" className="chip-soft" />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2">UI Sound Effects</Typography>
                    <Chip label="OFF" size="small" className="chip-soft" />
                  </Box>
                </Stack>
              </Box>

              {/* Data & Storage */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Data & Storage</Typography>
                <Stack spacing={1}>
                  <Button variant="outlined" fullWidth sx={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
                    Export All Data (JSON)
                  </Button>
                  <Button variant="outlined" fullWidth sx={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
                    Clear Chat History
                  </Button>
                  <Button variant="outlined" fullWidth color="error">
                    Reset All Settings
                  </Button>
                </Stack>
              </Box>
            </Stack>
          </Paper>
          </DraggableBoard>
        );
      default:
        return null;
    }
  };

  return (
    <ThemeProvider theme={baseTheme}>
      <CssBaseline />
      <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} onCommand={handleCommand} />
      <FloatingActionButton onAction={handleCommand} />

      {/* Background layers */}
      <div className="bg-layer gradient-background" />
      <div className="bg-layer hex-grid" />
      <div className="bg-layer scanlines" />
      
      {/* Subtle Matrix binary - vertical stacked digits, each column different speed */}
      {[...Array(8)].map((_, i) => {
        const digits = Array.from({ length: 60 }, () => Math.random() > 0.5 ? '1' : '0');
        return (
          <div 
            key={i} 
            className="binary-column-stack" 
            style={{
              left: `${15 + (i * 10)}%`,
              animationDuration: `${12 + Math.random() * 12}s`,
              animationDelay: `${Math.random() * 5}s`,
              fontSize: `${9 + Math.random() * 6}px`,
            }}
          >
            {digits.map((digit, idx) => (
              <div key={idx} className="single-digit">{digit}</div>
            ))}
          </div>
        );
      })}

      <Box className="app-shell" style={themeVars}>
        <aside className="sidebar glass-panel">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', letterSpacing: 2 }}>
                VESPER AI
              </Typography>
              <Typography variant="h6" sx={{ color: 'var(--accent)', fontWeight: 800 }}>
                Ops Console
              </Typography>
            </Box>
            <Badge
              overlap="circular"
              variant="dot"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              sx={{
                '& .MuiBadge-dot': {
                  backgroundColor: 'var(--accent)',
                  boxShadow: '0 0 12px var(--accent)',
                },
              }}
            >
              <Box className="status-pill">LIVE</Box>
            </Badge>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
            {NAV.map(({ id, label, icon: Icon }) => (
              <Box
                key={id}
                className={`nav-item ${activeSection === id ? 'active' : ''}`}
                onClick={() => setActiveSection(id)}
              >
                <Icon fontSize="small" />
                <span>{label}</span>
              </Box>
            ))}
          </Box>


        </aside>

        <main className="content-grid">
          <section className="chat-panel glass-panel">
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--accent)' }}>
                Neural Chat
              </Typography>
              <Box className="status-dot" />
            </Box>

            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
              {['Summarize the scene', 'Generate a quest', 'Give me a hint', 'Explain controls'].map((label) => (
                <Chip key={label} label={label} onClick={() => setInput(label)} className="chip-ghost" />
              ))}
              <Chip label="Cmd/Ctrl+K" className="chip-ghost" />
              <Chip label="Hold V to speak" className="chip-ghost" />
            </Stack>

            <Paper ref={chatContainerRef} className="chat-window glass-card" sx={{ mb: 2 }}>
              <AnimatePresence>
                {messages.map((message) => (
                  <div key={message.id}>{renderMessage(message)}</div>
                ))}
              </AnimatePresence>
              {loading && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 2 }}>
                  <Box className="typing-indicator">
                    <span />
                    <span />
                    <span />
                  </Box>
                </Box>
              )}
              <div ref={messagesEndRef} />
            </Paper>

            <Paper
              component="form"
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="input-bar glass-card"
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileShare}
                style={{ display: 'none' }}
                accept="image/*,.pdf,.doc,.docx,.txt,.json,.csv"
              />
              <Tooltip title="Share file or image" placement="top">
                <IconButton
                  onClick={() => fileInputRef.current?.click()}
                  className="ghost-button"
                  size="small"
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <VoiceInput onTranscript={handleVoiceTranscript} />
              <TextField
                fullWidth
                multiline
                maxRows={3}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Ask Vesper…"
                disabled={loading}
                variant="standard"
                InputProps={{
                  disableUnderline: true,
                  sx: {
                    color: '#fff',
                    fontSize: '14px',
                    '& textarea::placeholder': {
                      color: 'rgba(255, 255, 255, 0.35)',
                    },
                  },
                }}
                size="small"
              />
              <Tooltip title="Send (Enter)" placement="top">
                <span>
                  <IconButton onClick={sendMessage} disabled={loading || !input.trim()} className="cta-button" size="small">
                    {loading ? <CircularProgress size={20} /> : <SendIcon />}
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Clear chat" placement="top">
                <IconButton onClick={clearHistory} className="ghost-button" size="small">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Paper>
          </section>

          <section className="ops-panel">
            <Box className="panel-grid">
              <Paper className="ops-card glass-card">
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Research Tools</Typography>
                  <Chip icon={<ScienceRounded />} label="Ready" size="small" className="chip-soft" />
                </Box>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
                  Web scraping, DB access, file processing, code execution, multi-source synthesis.
                </Typography>
                <Stack spacing={0.8}>
                  <div className="list-row">Web Scraper · Deep + shallow crawl</div>
                  <div className="list-row">Database Manager · SQLite / Postgres / MySQL / Mongo</div>
                  <div className="list-row">File Processor · PDFs, docs, images</div>
                  <div className="list-row">Code Executor · Python / JS / SQL sandbox</div>
                  <div className="list-row">Synthesizer · Blend sources with AI</div>
                </Stack>
              </Paper>

              <Paper className="ops-card glass-card">
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Memory Core</Typography>
                  <Chip icon={<HistoryRounded />} label="Sync" size="small" className="chip-soft" />
                </Box>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
                  Long-term context, vectors, and recall-ready notes.
                </Typography>
                <Stack spacing={0.8}>
                  <div className="list-row">Pinned facts · Rapid recall</div>
                  <div className="list-row">Context stitching · Auto-augment prompts</div>
                  <div className="list-row">Exportable knowledge graph</div>
                </Stack>
              </Paper>

              <Paper className="ops-card glass-card">
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Task Matrix</Typography>
                  <Chip icon={<ChecklistRounded />} label="Tracked" size="small" className="chip-soft" />
                </Box>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
                  Multi-panel tasks, status chips, and action history.
                </Typography>
                <Stack spacing={0.8}>
                  <div className="list-row">Inbox · capture quick asks</div>
                  <div className="list-row">Doing · current focus</div>
                  <div className="list-row">Done · audit log</div>
                </Stack>
              </Paper>

              <Paper className="ops-card glass-card">
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Settings</Typography>
                  <Chip icon={<SettingsRounded />} label="Theming" size="small" className="chip-soft" />
                </Box>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
                  Themes, layout density, AI models, and system preferences configured in full settings.
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                  📋 Click the gear in the Settings section for all options
                </Typography>
              </Paper>
            </Box>

            <Paper className="world-panel glass-card">
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Vesper World</Typography>
                <Stack direction="row" spacing={1}>
                  <Chip label="Press C" size="small" className="chip-soft" />
                  <Chip label="Right rail" size="small" className="chip-soft" />
                </Stack>
              </Box>
              {gameMode ? (
                <Game onExitGame={() => setGameMode(false)} onChatWithNPC={() => {}} />
              ) : (
                <Box className="world-placeholder">
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>World viewport is ready.</Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    Chat stays slim on the left. Toggle the world to explore and keep talking.
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <button className="primary-btn" onClick={() => setGameMode(true)}>Enter World</button>
                    <button className="ghost-btn" onClick={() => setActiveSection('research')}>Open Research</button>
                  </Box>
                </Box>
              )}
            </Paper>

            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              {renderActiveBoard()}
            </DndContext>
          </section>
        </main>
      </Box>
      <Snackbar
        open={!!toast}
        autoHideDuration={2200}
        onClose={() => setToast('')}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      />
    </ThemeProvider>
  );
}

export default App;
