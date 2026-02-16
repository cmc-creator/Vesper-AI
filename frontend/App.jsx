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
  Button,
  Grid,
  Snackbar,
  Menu,
  MenuItem,
  Dialog,
  Switch,
  FormControlLabel,
  LinearProgress,
  Checkbox,
  Select,
} from '@mui/material';
import {
  Send as SendIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Download as DownloadIcon,
  AutoFixHigh,
  PushPin as PinIcon,
  PushPinOutlined as PinOutlinedIcon,
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
  VolumeUp as VolumeUpIcon,
  VolumeOff as VolumeOffIcon,
  BarChart,
  Person,
  AutoStories,
  Checkroom,
  Speed as SpeedIcon,
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
// FloatingActionButton removed - actions now in tools grid
import Canvas from './src/components/Canvas';
import DeepResearch from './src/components/DeepResearch';
import ImageGenerator from './src/components/ImageGenerator';
import VideoCreator from './src/components/VideoCreator';
import KnowledgeGraph from './src/components/KnowledgeGraph';
import GuidedLearning from './src/components/GuidedLearning';
import ChartComponent from './src/components/ChartComponent';
// Game is lazy-loaded when user enters the world
const GameLazy = React.lazy(() => import('./src/game/Game'));
import SystemDiagnostics from './src/components/SystemDiagnostics';
import SystemStatusCard from './src/components/SystemStatusCard';
import WeatherWidget from './src/components/WeatherWidget';
import NyxShift from './src/components/NyxShift';
import Sassy from './src/components/Sassy';

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
  { id: 'documents', label: 'Documents', icon: DownloadIcon },
  { id: 'memory', label: 'Memory Core', icon: StorageRounded },
  { id: 'tasks', label: 'Task Matrix', icon: ChecklistRounded },
  { id: 'nyxshift', label: 'Creative Suite', icon: AutoStories },
  { id: 'sassy', label: 'Vesper\'s Wardrobe', icon: Checkroom },
  { id: 'analytics', label: 'Analytics', icon: BarChart },
  { id: 'personality', label: 'Personality', icon: Person },
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
  const [memoryView, setMemoryView] = useState('history'); // 'history' or 'notes'
  const [threads, setThreads] = useState([]);
  const [selectedThreadIds, setSelectedThreadIds] = useState([]); // Array of IDs for bulk operations
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // Controls the confirmation dialog
  const [deleteTargetId, setDeleteTargetId] = useState(null); // 'bulk' or specific ID when confirm dialog is open
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState(null);
  const [currentThreadTitle, setCurrentThreadTitle] = useState('');
  const [editingThreadId, setEditingThreadId] = useState(null);
  const [editingThreadTitle, setEditingThreadTitle] = useState('');
  const [threadSearchQuery, setThreadSearchQuery] = useState('');
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);
  const [exportThreadData, setExportThreadData] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [themeMenuAnchor, setThemeMenuAnchor] = useState(null);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', status: 'inbox', priority: 'medium', dueDate: '' });
  const [toast, setToast] = useState('');
  const [ttsEnabled, setTtsEnabled] = useState(() => safeStorageGet('vesper_tts_enabled', 'true') === 'true');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState(() => safeStorageGet('vesper_tts_voice', ''));
  const [showVoiceSelector, setShowVoiceSelector] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [abortController, setAbortController] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(() => safeStorageGet('vesper_sound_enabled', 'true') === 'true');
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [uiScale, setUiScale] = useState(() => parseFloat(safeStorageGet('vesper_ui_scale', '1')));
  const [showSystemStatus, setShowSystemStatus] = useState(true);

  // Tools
  const [canvasOpen, setCanvasOpen] = useState(false);
  const [canvasAppCode, setCanvasAppCode] = useState(`import React, { useState } from "react";
import { Button, Container } from "react-bootstrap";
import { MoveRight } from "lucide-react";

export default function App() {
  const [count, setCount] = useState(0);
  return (
    <Container className="p-5 text-white bg-dark min-vh-100 d-flex flex-column align-items-center justify-content-center">
      <h1 className="mb-4 display-4 fw-bold">Built with Vesper</h1>
      <p className="lead mb-4">I can build real React apps for you.</p>
      <Button variant="info" size="lg" onClick={() => setCount(c => c + 1)}>
        Count is {count}
      </Button>
    </Container>
  );
}`);
  const [canvasActiveTab, setCanvasActiveTab] = useState(0); // 0=Drawing, 1=AppBuilder
  const [researchOpen, setResearchOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [graphOpen, setGraphOpen] = useState(false);
  const [learningOpen, setLearningOpen] = useState(false);
  const TOOLS = [
    { id: 'research', label: 'Deep Research', icon: '🔬' },
    { id: 'graph', label: 'Knowledge Graph', icon: '🕸️' },
    { id: 'videos', label: 'Create videos', icon: '🎬' },
    { id: 'images', label: 'Create images', icon: '🎨' },
    { id: 'canvas', label: 'Canvas', icon: '📐' },
    { id: 'learning', label: 'Guided Learning', icon: '📚' },
    { id: 'enterWorld', label: 'Enter World', icon: '🏰' },
    { id: 'newChat', label: 'New Chat', icon: '💬' },
    { id: 'clearHistory', label: 'Clear History', icon: '🗑️' },
    { id: 'mindmap', label: 'Mind Map', icon: '🧠', description: 'Explore your research visually' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];
  
  // Smart Memory Tags
  const [memoryTags, setMemoryTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [newMemoryTags, setNewMemoryTags] = useState('');
  
  // PDF & Document Upload
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [documentTags, setDocumentTags] = useState('');
  
  // Analytics Dashboard
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsDays, setAnalyticsDays] = useState(30);
  
  // Personality Customization
  const [personality, setPersonality] = useState(null);
  const [personalities, setPersonalities] = useState([]);
  const [personalityLoading, setPersonalityLoading] = useState(false);
  const [personalityForm, setPersonalityForm] = useState({ name: '', systemPrompt: '', tone: '', responseStyle: '' });
  
  // Enhanced Research
  const [researchSearch, setResearchSearch] = useState('');
  const [researchSearchResults, setResearchSearchResults] = useState([]);
  const [researchFilter, setResearchFilter] = useState('all'); // 'all', 'web', 'file', 'manual'
  const [selectedResearchId, setSelectedResearchId] = useState(null);
  const [citationFormat, setCitationFormat] = useState('APA');
  
  // Better Export Options
  const [exportSelection, setExportSelection] = useState({
    memories: true,
    tasks: true,
    research: true,
    documents: true,
    conversations: true,
  });
  
  // Advanced Customization Options
  const [customizations, setCustomizations] = useState({
    sidebarWidth: localStorage.getItem('vesper_sidebar_width') || '300px',
    fontSize: localStorage.getItem('vesper_font_size') || 'medium', // small, medium, large
    compactMode: localStorage.getItem('vesper_compact_mode') === 'true',
    analyticsCharts: localStorage.getItem('vesper_analytics_charts') || 'all', // all, summary, detailed
    memoryCategories: JSON.parse(localStorage.getItem('vesper_memory_categories') || '["notes", "personal", "emotional_bonds", "work", "milestones", "sensory_experiences", "creative_moments"]'),
    researchSources: JSON.parse(localStorage.getItem('vesper_research_sources') || '["web", "file", "manual", "database"]'),
    chatBoxHeight: localStorage.getItem('vesper_chat_box_height') || '35vh', // Resizable chat height
  });
  
  const [newMemoryCategory, setNewMemoryCategory] = useState('');
  const [newResearchSource, setNewResearchSource] = useState('');
    
    // Audio context for UI sounds
  const audioContextRef = useRef(null);
  
  // Initialize Web Audio API (lazy — only created once, never closed until unmount)
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        return null;
      }
    }
    // Resume if suspended (Chrome autoplay policy)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(() => {});
    }
    return audioContextRef.current;
  }, []);
  
  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);
  
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
  const inputRef = useRef(null);

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

  // Chat box resize handler
  const startResizeChat = useCallback((e) => {
    e.preventDefault();
    const startHeight = chatContainerRef.current?.offsetHeight || 300;
    const startY = e.clientY;

    const handleMouseMove = (moveEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const newHeight = Math.max(150, Math.min(600, startHeight + deltaY)); // Min 150px, max 600px
      
      if (chatContainerRef.current) {
        chatContainerRef.current.style.maxHeight = `${newHeight}px`;
        // Update customizations and localStorage
        setCustomizations((prev) => ({
          ...prev,
          chatBoxHeight: `${newHeight}px`,
        }));
        try {
          localStorage.setItem('vesper_chat_box_height', `${newHeight}px`);
        } catch (e) {
          console.warn('Failed to save chat height', e);
        }
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  // Apply saved chat height on mount
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.style.maxHeight = customizations.chatBoxHeight;
    }
  }, [customizations.chatBoxHeight]);

  const apiBase = useMemo(() => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL.replace(/\/$/, '');
    if (typeof window !== 'undefined' && window.location.origin.includes('localhost')) return 'http://localhost:8000';
    return 'https://vesper-backend-production-b486.up.railway.app';
  }, []);

  const firebaseAuthEnabled = useMemo(
    () => String(import.meta.env.VITE_FIREBASE_AUTH_ENABLED).toLowerCase() === 'true',
    []
  );
  const disableFirebaseAuth = useMemo(
    () => !firebaseAuthEnabled || String(import.meta.env.VITE_DISABLE_FIREBASE_AUTH).toLowerCase() === 'true',
    [firebaseAuthEnabled]
  );

  const chatBase = useMemo(() => {
    if (import.meta.env.VITE_CHAT_API_URL) return import.meta.env.VITE_CHAT_API_URL.replace(/\/$/, '');
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL.replace(/\/$/, '');
    if (typeof window !== 'undefined' && window.location.origin.includes('localhost')) return 'http://localhost:8000';
    return 'https://vesper-backend-production-b486.up.railway.app';
  }, []);

  const addLocalMessage = async (role, content, extras = {}) => {
    const message = {
      id: `${Date.now()}-${Math.random()}`,
      userId: userId || 'local',
      role,
      content,
      timestamp: new Date().toISOString(),
      ...extras
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages]);

  // Auto-focus input after sending message or loading thread
  useEffect(() => {
    inputRef.current?.focus();
  }, [messages, currentThreadId]);

  const saveMessageToThread = async (role, content) => {
    if (!apiBase) return null;
    try {
      let threadId = currentThreadId;
      
      // If no thread, create one
      if (!threadId) {
        const firstWords = content.slice(0, 50).trim();
        const title = firstWords.length === 50 ? `${firstWords}...` : firstWords;
        
        console.log('📝 Creating new thread with title:', title);
        
        const createRes = await fetch(`${apiBase}/api/threads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            messages: [{ role, content, timestamp: Date.now() }],
          }),
        });
        
        if (!createRes.ok) throw new Error(`HTTP ${createRes.status}: ${createRes.statusText}`);
        
        const createData = await createRes.json();
        if (createData.error) throw new Error(createData.error);
        
        threadId = createData.id;
        setCurrentThreadId(threadId);
        setCurrentThreadTitle(title);
        
        // CRITICAL: Refresh thread list after creating
        fetchThreads();
        console.log('✅ Thread created:', threadId);
        return threadId;
      } else {
        // Add message to existing thread
        console.log('💬 Adding message to thread:', threadId);
        
        const addRes = await fetch(`${apiBase}/api/threads/${threadId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role, content, timestamp: Date.now() }),
        });
        
        if (!addRes.ok) throw new Error(`HTTP ${addRes.status}: ${addRes.statusText}`);
        return threadId;
      }
    } catch (error) {
      console.error('❌ Failed to save message to thread:', error);
      setToast(`Memory save failed: ${error.message}`);
      return currentThreadId;
    }
  };

  const stopGeneration = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setLoading(false);
      setThinking(false);
      setToast('Generation stopped');
    }
  };

  const fetchSuggestions = async () => {
    setSuggestionsLoading(true);
    try {
      const response = await fetch(`${apiBase}/api/suggestions?thread_id=${currentThreadId || ''}`);
      if (!response.ok) throw new Error('Failed to fetch suggestions');
      const data = await response.json();
      if (data.suggestions) {
        setSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setToast('⚠️ Could not load suggestions');
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const sendMessage = async () => {
    if ((!input.trim() && uploadedImages.length === 0) || loading) return;
    const userMessage = input.trim();
    const currentImages = [...uploadedImages]; // Capture images
    
    setInput('');
    setUploadedImages([]); // Clear UI immediately
    setLoading(true);
    setThinking(true);
    
    try {
      playSound('click'); // Sound on send
    } catch(e) { /* ignore sound errors */ }
    
    // Create new abort controller for this request
    const controller = new AbortController();
    setAbortController(controller);
    
    console.log('📤 Sending message:', userMessage.substring(0, 50));
    
    // Add local message with images
    const localMsg = { role: 'user', content: userMessage };
    if (currentImages.length > 0) {
      localMsg.images = currentImages.map(img => img.dataUrl);
      localMsg.content = userMessage || '[Image Attached]';
    }
    
    addLocalMessage('user', localMsg.content, localMsg); // Pass full obj as metadata if needed
    
    let savedThreadId;
    try {
      savedThreadId = await saveMessageToThread('user', userMessage);
    } catch(e) {
      console.warn('Thread save failed, continuing:', e);
      savedThreadId = currentThreadId;
    }
    
    try {
      const payload = { 
        message: userMessage,
        thread_id: savedThreadId || currentThreadId || 'default',
        images: currentImages.length > 0 ? currentImages.map(img => img.dataUrl) : []
      };

      const response = await fetch(`${chatBase}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      
      if (!response.ok) throw new Error('Backend call failed');
      
      const data = await response.json();
      console.log('🤖 Received response:', data.response?.substring(0, 50));
      
      addLocalMessage('assistant', data.response);
      
      // Save assistant response to the same thread using the valid ID
      await saveMessageToThread('assistant', data.response, savedThreadId);
      
      speak(data.response);
      playSound('notification'); // Sound on response received

      // Handle Visualizations (Charts)
      if (data.visualizations && data.visualizations.length > 0) {
        data.visualizations.forEach(viz => {
          if (viz.type === 'chart_visualization') {
            const chartMsg = {
               role: 'assistant',
               content: 'Generated Chart', // Hidden content, just for structure
               type: 'chart',
               chartData: viz
            };
            addLocalMessage(chartMsg.role, chartMsg.content, chartMsg);
            // We don't save charts to thread DB yet, simpler to keep ephemeral or enhance DB schema later
          }
        });
      }
      
      // CRITICAL: Refetch threads to update sidebar with new messages
      fetchThreads();
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('🛑 Generation stopped by user');
        return; // Don't show error message for user-initiated stops
      }
      console.error('❌ Chat error:', error);
      playSound('error'); // Error sound
      const errorMsg = "I'm having trouble connecting right now, but I'm still here! Press C to jump into the world and I'll keep watch.";
      addLocalMessage('assistant', errorMsg);
      await saveMessageToThread('assistant', errorMsg);
      speak(errorMsg);
    } finally {
      setAbortController(null);
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
      playSound('success');
      setToast('Chat cleared');
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
    playSound('success');
    setToast('Chat cleared');
  };

  const exportAllData = () => {
    try {
      const exportData = {
        version: '1.0',
        exported_at: new Date().toISOString(),
        threads: threads.map(t => ({
          id: t.id,
          title: t.title,
          pinned: t.pinned,
          messages: t.messages || [],
          created_at: t.created_at
        })),
        current_messages: messages,
        settings: {
          theme: activeTheme.id,
          tts_enabled: ttsEnabled,
          sound_enabled: soundEnabled,
          active_section: activeSection,
          memory_category: memoryCategory
        },
        tasks: tasks,
        research: researchItems,
        memory: memoryItems
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vesper-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      playSound('success');
      setToast('Data exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      playSound('error');
      setToast('Export failed');
    }
  };

  const playSound = useCallback((type) => {
    if (!soundEnabled) return;
    
    const ctx = getAudioContext();
    if (!ctx || ctx.state === 'closed') return;
    
    try {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Different sounds for different actions
    switch (type) {
      case 'click':
        oscillator.frequency.value = 800;
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.1);
        break;
      case 'success':
        oscillator.frequency.value = 1200;
        gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.2);
        break;
      case 'error':
        oscillator.frequency.value = 400;
        gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
        break;
      case 'notification':
        oscillator.frequency.value = 1000;
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.15);
        break;
      default:
        oscillator.frequency.value = 600;
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.1);
    }
    } catch (e) {
      // Silently handle audio errors (context closed, etc.)
    }
  }, [soundEnabled, getAudioContext]);

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

  // ===== Enhanced Research Functions =====
  const searchResearch = async (query) => {
    if (!apiBase || !query.trim()) {
      setResearchSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`${apiBase}/api/research/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResearchSearchResults(data.results || []);
    } catch (error) {
      console.error('Research search failed:', error);
    }
  };

  const filterResearchBySource = async (source) => {
    if (!apiBase) return;
    try {
      const res = await fetch(`${apiBase}/api/research/by-source?source=${source}`);
      const data = await res.json();
      if (source === 'all') {
        fetchResearch();
      } else {
        setResearchItems(data.results || []);
      }
    } catch (error) {
      console.error('Research filter failed:', error);
    }
  };

  const generateCitations = (research) => {
    if (!research) return {};
    
    const citations = {};
    
    // APA Format
    citations.apa = `[${research.id}] "${research.title}". Accessed: ${research.created_at?.split('T')[0] || 'Unknown date'}.`;
    
    // MLA Format
    citations.mla = `"${research.title}." Last modified: ${research.updated_at?.split('T')[0] || 'Unknown date'}.`;
    
    // Chicago Format
    citations.chicago = `${research.title}. [Online]. Available: ${research.url || 'N/A'}. [Accessed: ${research.created_at?.split('T')[0] || 'Unknown date'}].`;
    
    return citations;
  };

  // ===== Advanced Export Functions =====
  const generateMarkdownReport = () => {
    let report = `# Vesper AI Knowledge Export\n\n`;
    report += `**Generated:** ${new Date().toLocaleString()}\n\n`;
    
    if (exportSelection.memories && memoryItems?.length > 0) {
      report += `## Memories (${memoryItems.length})\n\n`;
      memoryItems.forEach(m => {
        report += `### ${m.title || m.content?.substring(0, 50)}\n`;
        report += `- **Category:** ${memoryCategory}\n`;
        report += `- **Importance:** ${m.importance || 'N/A'}\n`;
        report += `- **Date:** ${new Date(m.created_at).toLocaleDateString()}\n\n`;
        report += `${m.content}\n\n`;
      });
    }
    
    if (exportSelection.tasks && tasks?.length > 0) {
      report += `## Tasks (${tasks.length})\n\n`;
      tasks.forEach(t => {
        report += `- [${t.status === 'done' ? 'x' : ' '}] **${t.title}** (${t.priority || 'medium'} priority)\n`;
        if (t.description) report += `  - ${t.description}\n`;
        if (t.due_date) report += `  - Due: ${new Date(t.due_date).toLocaleDateString()}\n`;
      });
      report += `\n`;
    }
    
    if (exportSelection.research && researchItems?.length > 0) {
      report += `## Research (${researchItems.length})\n\n`;
      researchItems.forEach(r => {
        report += `### ${r.title}\n`;
        report += `- **Source:** ${r.source || 'N/A'}\n`;
        report += `- **URL:** ${r.url || 'N/A'}\n`;
        if (r.tags?.length > 0) report += `- **Tags:** ${r.tags.join(', ')}\n`;
        report += `\n${r.content || r.summary || 'No content'}\n\n`;
      });
    }
    
    if (exportSelection.documents && documents?.length > 0) {
      report += `## Documents (${documents.length})\n\n`;
      documents.forEach(d => {
        report += `### ${d.filename}\n`;
        report += `- **Type:** ${d.file_type}\n`;
        report += `- **Size:** ${(d.file_size / 1024).toFixed(2)} KB\n`;
        if (d.summary) report += `- **Summary:** ${d.summary}\n`;
        report += `\n`;
      });
    }
    
    return report;
  };

  const exportAsMarkdown = () => {
    const content = generateMarkdownReport();
    const element = document.createElement('a');
    element.setAttribute('href', `data:text/markdown;charset=utf-8,${encodeURIComponent(content)}`);
    element.setAttribute('download', `Vesper-Export-${new Date().toISOString().split('T')[0]}.md`);
    element.click();
    setToast('📥 Exported as Markdown');
    playSound('success');
  };

  const exportAsJSON = () => {
    const data = {};
    if (exportSelection.memories) data.memories = memoryItems;
    if (exportSelection.tasks) data.tasks = tasks;
    if (exportSelection.research) data.research = researchItems;
    if (exportSelection.documents) data.documents = documents;
    if (exportSelection.conversations) data.conversations = threads;
    
    const element = document.createElement('a');
    element.setAttribute('href', `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`);
    element.setAttribute('download', `Vesper-Export-${new Date().toISOString().split('T')[0]}.json`);
    element.click();
    setToast('📥 Exported as JSON');
    playSound('success');
  };

  const exportAsCSV = () => {
    let csv = '';
    
    if (exportSelection.memories && memoryItems?.length > 0) {
      csv += 'TYPE,CATEGORY,TITLE,CONTENT,DATE\n';
      memoryItems.forEach(m => {
        const content = (m.content || '').replace(/"/g, '""');
        csv += `"Memory","${memoryCategory}","${m.title || ''}","${content.substring(0, 100)}","${new Date(m.created_at).toISOString()}"\n`;
      });
    }
    
    if (exportSelection.tasks && tasks?.length > 0) {
      csv += 'TYPE,TITLE,STATUS,PRIORITY,DUE_DATE\n';
      tasks.forEach(t => {
        csv += `"Task","${t.title}","${t.status}","${t.priority || 'medium'}","${t.due_date || ''}"\n`;
      });
    }
    
    const element = document.createElement('a');
    element.setAttribute('href', `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`);
    element.setAttribute('download', `Vesper-Export-${new Date().toISOString().split('T')[0]}.csv`);
    element.click();
    setToast('📥 Exported as CSV');
    playSound('success');
  };

  // ===== Advanced Customization Functions =====
  const updateCustomization = (key, value) => {
    const updated = { ...customizations, [key]: value };
    setCustomizations(updated);
    localStorage.setItem(`vesper_${key}`, typeof value === 'object' ? JSON.stringify(value) : value);
    setToast(`✨ ${key} updated`);
    playSound('success');
  };

  const addMemoryCategory = () => {
    if (!newMemoryCategory.trim() || customizations.memoryCategories.includes(newMemoryCategory)) return;
    const updated = [...customizations.memoryCategories, newMemoryCategory];
    updateCustomization('memoryCategories', updated);
    setNewMemoryCategory('');
  };

  const removeMemoryCategory = (cat) => {
    const updated = customizations.memoryCategories.filter(c => c !== cat);
    updateCustomization('memoryCategories', updated);
  };

  const addResearchSource = () => {
    if (!newResearchSource.trim() || customizations.researchSources.includes(newResearchSource)) return;
    const updated = [...customizations.researchSources, newResearchSource];
    updateCustomization('researchSources', updated);
    setNewResearchSource('');
  };

  const removeResearchSource = (src) => {
    const updated = customizations.researchSources.filter(s => s !== src);
    updateCustomization('researchSources', updated);
  };

  const applyFontSize = (size) => {
    document.documentElement.style.fontSize = size === 'small' ? '14px' : size === 'large' ? '18px' : '16px';
    updateCustomization('fontSize', size);
  };

  const toggleCompactMode = () => {
    const newCompact = !customizations.compactMode;
    updateCustomization('compactMode', newCompact);
    if (newCompact) {
      document.documentElement.style.setProperty('--spacing-multiplier', '0.75');
    } else {
      document.documentElement.style.setProperty('--spacing-multiplier', '1');
    }
  };

  const fetchMemory = useCallback(
    async (category) => {
      if (!apiBase || !category) return;
      setMemoryLoading(true);
      try {
        const res = await fetch(`${apiBase}/api/memories?category=${category}&limit=100`);
        const data = await res.json();
        if (data.status === 'success') {
          setMemoryItems(Array.isArray(data.memories) ? data.memories : []);
        } else {
          setMemoryItems([]);
        }
        // Also fetch tags for this category
        fetchMemoryTags();
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
      // Parse tags from input
      const tags = newMemoryTags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);
      
      const res = await fetch(`${apiBase}/api/memories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          category: memoryCategory, 
          content: memoryText,
          importance: 5,
          tags: tags
        }),
      });
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      setMemoryText('');
      setNewMemoryTags('');
      fetchMemory(memoryCategory);
      fetchMemoryTags();
      setToast('Memory stored!');
      playSound('success');
    } catch (error) {
      console.error('Memory save failed:', error);
      setToast('Failed to save memory');
      playSound('error');
    }
  };

  const fetchMemoryTags = useCallback(async () => {
    if (!apiBase) return;
    try {
      const res = await fetch(`${apiBase}/api/memories/tags?category=${memoryCategory}`);
      const data = await res.json();
      if (data.status === 'success') {
        setMemoryTags(data.tags || []);
      }
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  }, [apiBase, memoryCategory]);

  const searchByTag = async (tags) => {
    if (!apiBase || tags.length === 0) return;
    setMemoryLoading(true);
    try {
      const tagsQuery = tags.join(',');
      const res = await fetch(`${apiBase}/api/memories/search/by-tag?tags=${encodeURIComponent(tagsQuery)}`);
      const data = await res.json();
      if (data.status === 'success') {
        // Filter by category if we're in a specific category view
        const filtered = memoryCategory 
          ? data.memories.filter(m => m.category === memoryCategory)
          : data.memories;
        setMemoryItems(filtered);
      }
    } catch (error) {
      console.error('Tag search failed:', error);
    } finally {
      setMemoryLoading(false);
    }
  };

  const toggleTagFilter = (tag) => {
    if (selectedTags.includes(tag)) {
      const newTags = selectedTags.filter(t => t !== tag);
      setSelectedTags(newTags);
      if (newTags.length > 0) {
        searchByTag(newTags);
      } else {
        fetchMemory(memoryCategory);
      }
    } else {
      const newTags = [...selectedTags, tag];
      setSelectedTags(newTags);
      searchByTag(newTags);
    }
  };

  const fetchDocuments = useCallback(async () => {
    if (!apiBase) return;
    try {
      const res = await fetch(`${apiBase}/api/documents?limit=50`);
      const data = await res.json();
      if (data.status === 'success') {
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  }, [apiBase]);

  const uploadDocument = async (e) => {
    if (!apiBase) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tags', documentTags);

      const res = await fetch(`${apiBase}/api/documents/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.status === 'success') {
        setToast(`📄 ${file.name} uploaded!`);
        playSound('success');
        setDocumentTags('');
        e.target.value = '';
        fetchDocuments();
      } else {
        setToast(`Upload failed: ${data.error}`);
        playSound('error');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setToast('Failed to upload document');
      playSound('error');
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (docId) => {
    if (!apiBase || !confirm('Delete this document?')) return;
    try {
      const res = await fetch(`${apiBase}/api/documents/${docId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.status === 'success') {
        setToast('Document deleted');
        fetchDocuments();
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  // ===== Analytics Functions =====
  const fetchAnalytics = useCallback(async (days = 30) => {
    if (!apiBase) return;
    setAnalyticsLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/analytics/summary?days=${days}`);
      const data = await res.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [apiBase]);

  // ===== Personality Functions =====
  const fetchPersonality = useCallback(async () => {
    if (!apiBase) return;
    try {
      const res = await fetch(`${apiBase}/api/personality`);
      const data = await res.json();
      setPersonality(data);
      if (data.name && data.system_prompt && data.tone && data.response_style) {
        setPersonalityForm({
          name: data.name,
          systemPrompt: data.system_prompt,
          tone: data.tone,
          responseStyle: data.response_style,
        });
      }
    } catch (error) {
      console.error('Failed to fetch personality:', error);
    }
  }, [apiBase]);

  const fetchPersonalityPresets = useCallback(async () => {
    if (!apiBase) return;
    try {
      const res = await fetch(`${apiBase}/api/personality/presets`);
      const data = await res.json();
      if (data.presets) {
        setPersonalities(data.presets);
      }
    } catch (error) {
      console.error('Failed to fetch personality presets:', error);
    }
  }, [apiBase]);

  const applyPersonality = async (preset) => {
    if (!apiBase) return;
    setPersonalityLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/personality`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: preset.name,
          system_prompt: preset.system_prompt,
          tone: preset.tone,
          response_style: preset.response_style,
        }),
      });
      const data = await res.json();
      setPersonality(data);
      setToast(`✨ Personality set to ${preset.name}`);
      playSound('success');
      setPersonalityForm({
        name: preset.name,
        systemPrompt: preset.system_prompt,
        tone: preset.tone,
        responseStyle: preset.response_style,
      });
    } catch (error) {
      console.error('Failed to set personality:', error);
      setToast('Failed to set personality');
      playSound('error');
    } finally {
      setPersonalityLoading(false);
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

  const fetchThreads = useCallback(async () => {
    if (!apiBase) return;
    setThreadsLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/threads`);
      const data = await res.json();
      setThreads(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Threads fetch failed:', error);
    } finally {
      setThreadsLoading(false);
    }
  }, [apiBase]);

  const togglePinThread = async (threadId) => {
    if (!apiBase) return;
    try {
      const res = await fetch(`${apiBase}/api/threads/${threadId}/pin`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.status === 'success') {
        setThreads(prev => 
          prev.map(t => t.id === threadId ? { ...t, pinned: data.pinned } : t)
            .sort((a, b) => {
              if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
              return new Date(b.updated_at) - new Date(a.updated_at);
            })
        );
        setToast(data.pinned ? 'Pinned!' : 'Unpinned');
      }
    } catch (error) {
      console.error('Pin failed:', error);
    }
  };

  const loadThread = async (threadId) => {
    if (!apiBase) return;
    try {
      const res = await fetch(`${apiBase}/api/threads/${threadId}`);
      const data = await res.json();
      if (data && data.messages) {
        // Convert backend message format to frontend format
        const formattedMessages = data.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp || Date.now()
        }));
        setMessages(formattedMessages);
        setCurrentThreadId(threadId);
        setCurrentThreadTitle(data.title || 'Untitled Conversation');
        setActiveSection('chat');
        setToast(`Loaded: ${data.title || 'Conversation'}`);
      }
    } catch (error) {
      console.error('Thread load failed:', error);
      setToast('Failed to load conversation');
    }
  };

  const startNewChat = () => {
    setMessages([]);
    // Reset thread ID - let first message create the thread
    setCurrentThreadId(null);
    setCurrentThreadTitle('New Conversation');
    playSound('click');
    setToast('New conversation started');
  };

  const deleteThread = async (threadId, skipConfirm = false) => {
    if (!apiBase) return;
    if (!skipConfirm) {
      // Use custom dialog instead of window.confirm
      setDeleteTargetId(threadId);
      setShowDeleteConfirm(true);
      return;
    }
    
    try {
      const res = await fetch(`${apiBase}/api/threads/${threadId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.status === 'success') {
        setThreads(prev => prev.filter(t => t.id !== threadId));
        if (currentThreadId === threadId) {
          startNewChat();
        }
        setToast('Conversation deleted');
      }
    } catch (error) {
      console.error('Delete failed:', error);
      setToast('Failed to delete conversation');
    }
  };

  const executeDelete = async () => {
    if (deleteTargetId === 'bulk') {
      let count = 0;
      for (const id of selectedThreadIds) {
        // Direct delete call without confirm
        try {
          const res = await fetch(`${apiBase}/api/threads/${id}`, { method: 'DELETE' });
          if (res.ok) {
            setThreads(prev => prev.filter(t => t.id !== id));
            count++;
          }
        } catch (e) { console.error(e); }
      }
      setToast(`Deleted ${count} conversations`);
      setSelectedThreadIds([]);
      if (selectedThreadIds.includes(currentThreadId)) startNewChat();
    } else {
      await deleteThread(deleteTargetId, true);
    }
    setShowDeleteConfirm(false);
    setDeleteTargetId(null);
  };

  const handleSelectThread = (id) => {
    setSelectedThreadIds(prev => {
      if (prev.includes(id)) return prev.filter(tid => tid !== id);
      return [...prev, id];
    });
  };

  const startRenameThread = (threadId, currentTitle) => {
    setEditingThreadId(threadId);
    setEditingThreadTitle(currentTitle);
  };

  const cancelRenameThread = () => {
    setEditingThreadId(null);
    setEditingThreadTitle('');
  };

  const renameThread = async (threadId) => {
    if (!apiBase || !editingThreadTitle.trim()) return;
    try {
      const res = await fetch(`${apiBase}/api/threads/${threadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingThreadTitle.trim() }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setThreads(prev => 
          prev.map(t => t.id === threadId ? { ...t, title: data.title } : t)
        );
        if (currentThreadId === threadId) {
          setCurrentThreadTitle(data.title);
        }
        setToast('Title updated');
        cancelRenameThread();
      }
    } catch (error) {
      console.error('Rename failed:', error);
      setToast('Failed to rename conversation');
    }
  };

  // Filter threads based on search query
  const filteredThreads = useMemo(() => {
    if (!threadSearchQuery.trim()) return threads;
    const query = threadSearchQuery.toLowerCase();
    return threads.filter(thread => 
      thread.title.toLowerCase().includes(query) ||
      (thread.message_count && thread.message_count.toString().includes(query))
    );
  }, [threads, threadSearchQuery]);

  const downloadThreadMD = async (threadId, title) => {
    if (!apiBase) return;
    try {
      const res = await fetch(`${apiBase}/api/threads/${threadId}`);
      const data = await res.json();
      if (!data || !data.messages) return;
      
      let markdown = `# ${title}\n\n`;
      markdown += `*Exported: ${new Date().toLocaleString()}*\n\n`;
      markdown += `---\n\n`;
      
      data.messages.forEach((msg, idx) => {
        const role = msg.role === 'user' ? '**You**' : '**Vesper**';
        const time = msg.timestamp ? new Date(msg.timestamp).toLocaleString() : '';
        markdown += `### ${role} ${time ? `_(${time})_` : ''}\n\n`;
        markdown += `${msg.content}\n\n`;
        if (idx < data.messages.length - 1) markdown += `---\n\n`;
      });
      
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]/gi, '_')}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setToast('Exported as Markdown');
    } catch (error) {
      console.error('Export failed:', error);
      setToast('Export failed');
    }
  };

  const downloadThreadJSON = async (threadId, title) => {
    if (!apiBase) return;
    try {
      const res = await fetch(`${apiBase}/api/threads/${threadId}`);
      const data = await res.json();
      if (!data) return;
      
      const exportData = {
        title: data.title,
        id: data.id,
        created_at: data.created_at,
        updated_at: data.updated_at,
        pinned: data.pinned,
        message_count: data.message_count,
        messages: data.messages,
        exported_at: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]/gi, '_')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setToast('Exported as JSON');
    } catch (error) {
      console.error('Export failed:', error);
      setToast('Export failed');
    }
  };

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
      setToast('Task deleted');
    } catch (error) {
      console.error('Delete task failed:', error);
    }
  };

  const breakdownTask = async (idx, task) => {
    if (!apiBase) return;
    setThinking(true);
    setToast('Analyzing task structure...');
    try {
      const res = await fetch(`${apiBase}/api/tasks/${idx}/breakdown`, { method: 'POST' });
      const data = await res.json();
      if (data.status === 'success') {
        fetchTasks();
        setToast('Subtasks created!');
      } else {
        setToast('AI Breakdown failed');
      }
    } catch (error) {
      console.error('Breakdown task failed:', error);
      setToast('Error connecting to AI');
    } finally {
      setThinking(false);
    }
  };

  useEffect(() => {
    fetchResearch();
    fetchTasks();
    fetchThreads(); // CRITICAL FIX: Load chat history on startup
    fetchDocuments(); // Load documents on startup
    fetchPersonalityPresets(); // Load personality presets on startup
  }, [fetchResearch, fetchTasks, fetchThreads, fetchDocuments, fetchPersonalityPresets]);

  useEffect(() => {
    fetchMemory(memoryCategory);
  }, [fetchMemory, memoryCategory]);

  // Fetch analytics when analytics section is viewed
  useEffect(() => {
    if (activeSection === 'analytics' && !analytics) {
      fetchAnalytics(analyticsDays);
    }
  }, [activeSection, analyticsDays, analytics, fetchAnalytics]);

  // Fetch personality when personality section is viewed
  useEffect(() => {
    if (activeSection === 'personality' && !personality) {
      fetchPersonality();
    }
  }, [activeSection, personality, fetchPersonality]);

  // Debug: Log Thread System Status
  useEffect(() => {
    console.log('🔍 THREAD SYSTEM DEBUG:', {
      threadsCount: threads.length,
      apiBase,
      threads: threads.slice(0, 3)
    });
  }, [threads, apiBase]);

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

  const handleFileShare = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const isImage = file.type.startsWith('image/');
    const fileName = file.name;

    if (isImage) {
      // Modern: Attach image for true multimodal chat
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImages(prev => [...prev, {
          name: fileName,
          dataUrl: e.target.result,
          type: 'image'
        }]);
        setToast('Image attached');
      };
      reader.readAsDataURL(file);
    } else {
      // Non-image file - just add reference
      const fileRef = `📎 [File: ${fileName}]`;
      setInput((prev) => (prev ? prev + ' ' + fileRef : fileRef));
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const blob = item.getAsFile();
        if (blob) {
          const fileName = `pasted-image-${Date.now()}.png`;
          const reader = new FileReader();
          reader.onload = (e) => {
            setUploadedImages(prev => [...prev, {
              name: fileName,
              dataUrl: e.target.result,
              type: 'image'
            }]);
            setToast('Image attached from clipboard');
          };
          reader.readAsDataURL(blob);
        }
        break;
      }
    }
  };

  const formatTime = (d) => {
    try {
      return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Load available voices (must wait for voiceschanged event on Chromium)
  useEffect(() => {
    if (!window.speechSynthesis) return;
    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) setAvailableVoices(v);
    };
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  // ─── Natural Text-to-Speech Engine ───────────────────────────────────
  // Splits text into sentence-sized chunks to avoid Chrome's ~15s cutoff bug,
  // prioritizes high-quality "Online"/"Natural" voices, and keeps a resume
  // timer alive so speech never stalls mid-paragraph.

  const speechQueueRef = useRef([]);
  const speechTimerRef = useRef(null);

  const getBestVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;

    // 1. User's explicit choice
    if (selectedVoiceName) {
      const saved = voices.find(v => v.name === selectedVoiceName);
      if (saved) return saved;
    }

    // 2. Prefer high-quality "Online" / "Natural" neural voices (sound human)
    //    NOTE: Google Chrome voices ("Google US English" etc.) sound choppy and robotic — EXCLUDED.
    const premiumKeywords = [
      'Jenny Online', 'Aria Online', 'Jenny Natural', 'Aria Natural',
      'Ana Online', 'Sonia Online', 'Libby Online',
      'Microsoft Jenny', 'Microsoft Aria',
    ];
    for (const kw of premiumKeywords) {
      const v = voices.find(v => v.name.includes(kw));
      if (v) return v;
    }

    // 3. Good-quality local voices (still decent on Windows 11)
    //    Avoid Google voices — they're the choppy robotic ones.
    const goodLocal = [
      'Microsoft Ana', 'Samantha', 'Karen', 'Moira', 'Tessa', 'Victoria',
      'Microsoft Zira', 'Microsoft Eva', 'Microsoft Elsa',
    ];
    for (const name of goodLocal) {
      const v = voices.find(v => v.name.includes(name));
      if (v) return v;
    }

    // 4. Any English female-sounding voice, but EXCLUDE Google voices (they're the robotic ones)
    const female = voices.find(v => v.lang.startsWith('en') && !v.name.startsWith('Google') && (/female|girl|woman|zira|jenny|aria|samantha|karen/i).test(v.name));
    if (female) return female;
    // 5. Any non-Google English voice, then absolutely any English as last resort
    const nonGoogle = voices.find(v => v.lang.startsWith('en-US') && !v.name.startsWith('Google'));
    if (nonGoogle) return nonGoogle;
    return voices.find(v => v.lang.startsWith('en-US')) || voices.find(v => v.lang.startsWith('en')) || null;
  };

  // Split text into natural sentence chunks (keeps punctuation pauses natural)
  const splitIntoChunks = (text) => {
    // Clean markdown / code artifacts
    let clean = text
      .replace(/```[\s\S]*?```/g, ' ... code block ... ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, ', ')
      .trim();

    // Split on sentence boundaries but keep chunks a comfortable size
    const raw = clean.match(/[^.!?]+[.!?]+[\s]*/g) || [clean];
    const chunks = [];
    let buf = '';

    for (const seg of raw) {
      if ((buf + seg).length > 200) {
        if (buf) chunks.push(buf.trim());
        buf = seg;
      } else {
        buf += seg;
      }
    }
    if (buf.trim()) chunks.push(buf.trim());
    return chunks.filter(c => c.length > 0);
  };

  const speak = (text) => {
    if (!ttsEnabled || !window.speechSynthesis) return;

    // Cancel anything in-flight
    window.speechSynthesis.cancel();
    clearInterval(speechTimerRef.current);
    speechQueueRef.current = [];

    const voice = getBestVoice();
    const chunks = splitIntoChunks(text);
    if (!chunks.length) return;

    speechQueueRef.current = [...chunks];
    setIsSpeaking(true);

    const speakNext = () => {
      if (speechQueueRef.current.length === 0) {
        setIsSpeaking(false);
        clearInterval(speechTimerRef.current);
        return;
      }

      const chunk = speechQueueRef.current.shift();
      const utt = new SpeechSynthesisUtterance(chunk);
      if (voice) utt.voice = voice;

      // Natural-sounding settings — slightly slower for clarity
      utt.rate = 0.95;
      utt.pitch = 1.02;
      utt.volume = 0.92;

      utt.onend = () => speakNext();
      utt.onerror = () => {
        // If one chunk errors, skip to the next
        speakNext();
      };

      window.speechSynthesis.speak(utt);
    };

    speakNext();

    // Chrome workaround: Chrome pauses synthesis after ~15s of a single
    // utterance. We keep a watchdog that pokes resume() every 5s to
    // prevent stalling even on shorter chunks that somehow freeze.
    speechTimerRef.current = setInterval(() => {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        // Pause-resume trick keeps Chrome alive
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
      if (!window.speechSynthesis.speaking && speechQueueRef.current.length === 0) {
        setIsSpeaking(false);
        clearInterval(speechTimerRef.current);
      }
    }, 5000);
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    speechQueueRef.current = [];
    clearInterval(speechTimerRef.current);
    setIsSpeaking(false);
  };

  const toggleTTS = () => {
    const newValue = !ttsEnabled;
    setTtsEnabled(newValue);
    try {
      localStorage.setItem('vesper_tts_enabled', String(newValue));
    } catch (e) {
      console.warn('Failed to save TTS preference', e);
    }
    if (!newValue) stopSpeaking();
  };

  const handleVoiceChange = (voiceName) => {
    setSelectedVoiceName(voiceName);
    try {
      localStorage.setItem('vesper_tts_voice', voiceName);
    } catch (e) {}
    // Preview the voice with natural settings
    if (window.speechSynthesis && voiceName) {
      window.speechSynthesis.cancel();
      clearInterval(speechTimerRef.current);
      speechQueueRef.current = [];
      const utt = new SpeechSynthesisUtterance("Hey CC. This is how I sound now... pretty nice, right?");
      const voice = availableVoices.find(v => v.name === voiceName);
      if (voice) utt.voice = voice;
      utt.rate = 0.95;
      utt.pitch = 1.02;
      utt.volume = 0.92;
      utt.onstart = () => setIsSpeaking(true);
      utt.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utt);
    }
  };

  const renderMessage = (message) => {
    const isUser = message.role === 'user';
    const ts = formatTime(message.timestamp || Date.now());

    // Extract thoughts
    let thoughts = null;
    let content = message.content;
    
    if (!isUser && content && typeof content === 'string') {
      const thoughtMatch = content.match(/<thought>([\s\S]*?)<\/thought>/);
      if (thoughtMatch) {
        thoughts = thoughtMatch[1].trim();
        content = content.replace(/<thought>[\s\S]*?<\/thought>/, '').trim();
      }
    }

    // Handle Charts
    if (message.type === 'chart' && message.chartData) {
      return (
        <motion.div
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.3 }}
           style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }} // Centered
           key={message.id}
        >
           <Box sx={{ width: '90%', maxWidth: '800px' }}>
              <ChartComponent
                 type={message.chartData.chart_type}
                 title={message.chartData.title}
                 data={message.chartData.data}
                 xKey={message.chartData.keys.x}
                 yKey={message.chartData.keys.y}
              />
           </Box>
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, x: isUser ? 20 : -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25 }}
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: isUser ? 'flex-end' : 'flex-start', 
          marginBottom: '16px' 
        }}
      >
        {/* Render Thoughts if present */}
        {thoughts && (
          <Box 
            sx={{ 
              maxWidth: '80%', 
              mb: 1, 
              borderLeft: '2px solid rgba(0,255,255,0.3)', 
              pl: 1.5, 
              py: 0.5
            }}
          >
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'rgba(255,255,255,0.5)', 
                fontStyle: 'italic', 
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace'
              }}
            >
              {thoughts}
            </Typography>
          </Box>
        )}

        <Box
          className="message-bubble glass-card"
          sx={{
            maxWidth: '85%',
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

          {/* Render Attached Images */}
          {message.images && message.images.length > 0 && (
            <Box sx={{ mb: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {message.images.map((img, idx) => (
                <img 
                  key={idx} 
                  src={img} 
                  alt="Attachment" 
                  style={{ 
                    maxHeight: 200, 
                    borderRadius: 8, 
                    border: '1px solid rgba(255,255,255,0.2)',
                    objectFit: 'contain',
                    cursor: 'pointer'
                  }} 
                  onClick={() => window.open(img)}
                />
              ))}
            </Box>
          )}

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
                const isReact = match && ['js', 'jsx', 'javascript', 'tsx', 'ts', 'react'].includes(match[1]);
                
                const openInAppBuilder = () => {
                   setCanvasAppCode(codeString);
                   setCanvasActiveTab(1); // Switch to App Builder tab
                   setCanvasOpen(true);
                   setToast('Code loaded into App Builder');
                   playSound('click');
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
                    <Stack direction="row" spacing={1} sx={{ position: 'absolute', top: 4, right: 4 }}>
                        {isReact && (
                            <Tooltip title="Preview in App Builder">
                                <IconButton size="small" onClick={openInAppBuilder} sx={{ color: 'var(--accent)', bgcolor: 'rgba(0, 255, 255, 0.1)', '&:hover': { bgcolor: 'rgba(0, 255, 255, 0.2)' } }}>
                                    <BoltRounded fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                        <Tooltip title="Copy Code">
                            <IconButton size="small" onClick={copy} sx={{ color: 'var(--accent)' }}>
                                <ContentCopyRounded fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Stack>
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
            {content}
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
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Research Tools</Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    Multi-source research with auto-citations and cross-referencing
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Chip label={researchLoading ? 'Syncing…' : 'Synced'} size="small" className="chip-soft" />
                  <IconButton size="small" onClick={() => setActiveSection('chat')} sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            <Grid container spacing={2}>
              {/* Add Research */}
              <Grid item xs={12} md={4}>
                <Stack spacing={1.5}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--accent)' }}>Add Research</Typography>
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
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {['web', 'file', 'manual', 'database'].map(source => (
                      <Chip
                        key={source}
                        label={source}
                        size="small"
                        variant="outlined"
                        onClick={() => setResearchForm(f => ({ ...f, source: f.source === source ? 'manual' : source }))}
                        sx={{ borderColor: researchForm.source === source ? 'var(--accent)' : 'rgba(255,255,255,0.2)' }}
                      />
                    ))}
                  </Box>
                  <Button variant="contained" onClick={addResearchEntry} disabled={!researchForm.title.trim()}>
                    Save Research
                  </Button>
                </Stack>
              </Grid>

              {/* Search & Filter */}
              <Grid item xs={12} md={8}>
                <Stack spacing={1.5}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--accent)' }}>Search & Filter</Typography>
                  <TextField
                    label="Search research..."
                    value={researchSearch}
                    onChange={(e) => {
                      setResearchSearch(e.target.value);
                      searchResearch(e.target.value);
                    }}
                    fullWidth
                    variant="filled"
                    size="small"
                    InputProps={{ sx: { color: '#fff' } }}
                    placeholder="Search by title or content..."
                  />
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      label="All Sources"
                      onClick={() => { setResearchFilter('all'); filterResearchBySource('all'); }}
                      variant={researchFilter === 'all' ? 'filled' : 'outlined'}
                      color={researchFilter === 'all' ? 'primary' : 'default'}
                      size="small"
                    />
                    {['web', 'file', 'manual'].map(source => (
                      <Chip
                        key={source}
                        label={source}
                        onClick={() => { setResearchFilter(source); filterResearchBySource(source); }}
                        variant={researchFilter === source ? 'filled' : 'outlined'}
                        color={researchFilter === source ? 'primary' : 'default'}
                        size="small"
                      />
                    ))}
                  </Box>

                  {/* Display Results */}
                  <Box className="board-list" sx={{ maxHeight: 400, overflow: 'auto' }}>
                    {(researchSearch ? researchSearchResults : researchItems || []).map((item, idx) => {
                      const citations = generateCitations(item);
                      return (
                        <Box 
                          key={`${item.title}-${idx}`} 
                          className="board-row"
                          onClick={() => setSelectedResearchId(selectedResearchId === item.id ? null : item.id)}
                          sx={{ cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                              {item.title || 'Untitled'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mt: 0.5 }}>
                              {item.source && `📍 ${item.source}`}
                            </Typography>
                            {item.tags && item.tags.length > 0 && (
                              <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                                {item.tags.map(tag => (
                                  <Chip key={tag} label={tag} size="small" className="chip-soft" />
                                ))}
                              </Box>
                            )}
                          </Box>
                          {selectedResearchId === item.id && (
                            <Box sx={{ mt: 1, p: 1, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1, width: '100%' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>Citation:</Typography>
                                {['APA', 'MLA', 'Chicago'].map(fmt => (
                                  <Chip
                                    key={fmt}
                                    label={fmt}
                                    size="small"
                                    onClick={() => setCitationFormat(fmt)}
                                    sx={{
                                      fontSize: '0.65rem',
                                      height: 20,
                                      bgcolor: citationFormat === fmt ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                                      color: citationFormat === fmt ? '#000' : 'rgba(255,255,255,0.7)',
                                      cursor: 'pointer',
                                      '&:hover': { bgcolor: citationFormat === fmt ? 'var(--accent)' : 'rgba(255,255,255,0.2)' },
                                    }}
                                  />
                                ))}
                              </Box>
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', display: 'block', wordBreak: 'break-word' }}>
                                {citations[citationFormat.toLowerCase()] || 'N/A'}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      );
                    })}
                    {!researchItems?.length && !researchSearch && (
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                        No research logged yet.
                      </Typography>
                    )}
                  </Box>
                </Stack>
              </Grid>
            </Grid>
          </Paper>
          </DraggableBoard>
        );
      case 'documents':
        return (
          <DraggableBoard id="documents">
            <Paper className="intel-board glass-card">
              <Box className="board-header">
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>📄 Document Library</Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    Upload PDFs and docs - Vesper learns from them
                  </Typography>
                </Box>
                <IconButton size="small" onClick={() => setActiveSection('chat')} sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
              <Stack spacing={2}>
                {/* Upload Section */}
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'var(--accent)' }}>Upload Document</Typography>
                  <Stack spacing={1.5}>
                    <input 
                      type="file" 
                      accept=".pdf,.txt,.md"
                      onChange={uploadDocument}
                      disabled={uploading}
                      style={{ display: 'block' }}
                    />
                    <TextField
                      label="Tags for this document"
                      value={documentTags}
                      onChange={(e) => setDocumentTags(e.target.value)}
                      placeholder="documentation, reference"
                      fullWidth
                      size="small"
                      variant="filled"
                      disabled={uploading}
                      InputProps={{ sx: { color: '#fff' } }}
                    />
                    {uploading && <LinearProgress />}
                  </Stack>
                </Box>

                {/* Documents List */}
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'rgba(255,255,255,0.7)' }}>
                    {documents.length > 0 ? `${documents.length} Document${documents.length !== 1 ? 's' : ''}` : 'No documents yet'}
                  </Typography>
                  <Box className="board-list">
                    {(documents || []).map((doc) => (
                      <Box key={doc.id} className="board-row">
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            📄 {doc.filename}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block', mt: 0.5 }}>
                            {(doc.file_size / 1024).toFixed(1)} KB • {doc.file_type.toUpperCase()}
                          </Typography>
                          {doc.tags && doc.tags.length > 0 && (
                            <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
                              {doc.tags.map((tag) => (
                                <Chip key={tag} label={tag} size="small" variant="outlined" sx={{ height: 24, fontSize: '0.75rem' }} />
                              ))}
                            </Box>
                          )}
                          {doc.summary && (
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', mt: 1, display: 'block' }}>
                              {doc.summary}
                            </Typography>
                          )}
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', mt: 0.5, display: 'block' }}>
                            {formatTime(doc.created_at)}
                          </Typography>
                        </Box>
                        <IconButton size="small" onClick={() => deleteDocument(doc.id)} sx={{ color: 'rgba(255,255,255,0.5)' }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                    {!documents?.length && (
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                        No documents uploaded yet. Start by uploading a PDF or text file!
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Stack>
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
                    {memoryView === 'history' ? 'Chat history with pinning' : 'Fast, file-backed memory store'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Chip label={memoryView === 'history' ? (threadsLoading ? 'Loading…' : 'Loaded') : (memoryLoading ? 'Syncing…' : 'Synced')} size="small" className="chip-soft" />
                <IconButton size="small" onClick={() => setActiveSection('chat')} sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Chip
                label="History"
                onClick={() => { setMemoryView('history'); fetchThreads(); }}
                color={memoryView === 'history' ? 'primary' : 'default'}
                variant={memoryView === 'history' ? 'filled' : 'outlined'}
                size="small"
              />
              <Chip
                label="Notes"
                onClick={() => setMemoryView('notes')}
                color={memoryView === 'notes' ? 'primary' : 'default'}
                variant={memoryView === 'notes' ? 'filled' : 'outlined'}
                size="small"
              />
            </Stack>
            {memoryView === 'notes' && (
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
            )}
            {memoryView === 'history' && (
              <TextField
                placeholder="Search conversations..."
                value={threadSearchQuery}
                onChange={(e) => setThreadSearchQuery(e.target.value)}
                size="small"
                fullWidth
                variant="filled"
                sx={{ mb: 2 }}
                InputProps={{
                  sx: { color: '#fff' },
                  endAdornment: threadSearchQuery && (
                    <IconButton size="small" onClick={() => setThreadSearchQuery('')} sx={{ color: 'rgba(255,255,255,0.5)' }}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  )
                }}
              />
            )}
            {memoryView === 'history' ? (
              <Box className="board-list">
                {selectedThreadIds.length > 0 && (
                  <Box sx={{ p: 1, mb: 1, bgcolor: 'rgba(255, 68, 68, 0.1)', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="caption" sx={{ color: 'white' }}>{selectedThreadIds.length} selected</Typography>
                    <Button 
                      size="small" 
                      color="error" 
                      startIcon={<DeleteIcon />} 
                      onClick={() => {
                        setDeleteTargetId('bulk');
                        setShowDeleteConfirm(true);
                      }}
                      sx={{ textTransform: 'none', py: 0 }}
                    >
                      Delete Selected
                    </Button>
                  </Box>
                )}
                {/* Select All Checkbox */}
                <Box sx={{ display: 'flex', alignItems: 'center', px: 1, mb: 1, borderBottom: '1px solid rgba(255,255,255,0.1)', pb: 1 }}>
                  <Checkbox 
                    size="small" 
                    checked={filteredThreads.length > 0 && selectedThreadIds.length === filteredThreads.length}
                    indeterminate={selectedThreadIds.length > 0 && selectedThreadIds.length < filteredThreads.length}
                    onChange={() => {
                      if (selectedThreadIds.length === filteredThreads.length) {
                        setSelectedThreadIds([]);
                      } else {
                        setSelectedThreadIds(filteredThreads.map(t => t.id));
                      }
                    }}
                    sx={{ p: 0.5, mr: 1, color: 'rgba(255,255,255,0.5)' }} 
                  />
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>Select All ({filteredThreads.length})</Typography>
                </Box>
                {threadsLoading ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {[1, 2, 3, 4].map((i) => (
                      <Box key={i} className="board-row" sx={{ opacity: 0.6 }}>
                        <Box sx={{ flex: 1 }}>
                          <Box className="skeleton" sx={{ height: 20, width: '70%', mb: 0.5 }} />
                          <Box className="skeleton" sx={{ height: 16, width: '40%' }} />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Box className="skeleton" sx={{ width: 32, height: 32, borderRadius: '50%' }} />
                          <Box className="skeleton" sx={{ width: 32, height: 32, borderRadius: '50%' }} />
                          <Box className="skeleton" sx={{ width: 32, height: 32, borderRadius: '50%' }} />
                          <Box className="skeleton" sx={{ width: 32, height: 32, borderRadius: '50%' }} />
                        </Box>
                      </Box>
                    ))}
                  </Box>
                ) : filteredThreads.length > 0 ? (
                  filteredThreads.map((thread) => (
                    <Box 
                      key={thread.id} 
                      className="board-row" 
                      sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        gap: 1, 
                        '&:hover': { bgcolor: 'rgba(0,255,255,0.05)' },
                        borderLeft: selectedThreadIds.includes(thread.id) ? '2px solid var(--accent)' : 'none',
                        pl: selectedThreadIds.includes(thread.id) ? 1.75 : 2
                      }}
                    >
                      <Checkbox 
                        size="small" 
                        checked={selectedThreadIds.includes(thread.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectThread(thread.id);
                        }}
                        sx={{ p: 0.5, mr: 0.5, color: 'rgba(255,255,255,0.3)' }}
                      />
                      {editingThreadId === thread.id ? (
                        <TextField
                          value={editingThreadTitle}
                          onChange={(e) => setEditingThreadTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') renameThread(thread.id);
                            if (e.key === 'Escape') cancelRenameThread();
                          }}
                          autoFocus
                          size="small"
                          variant="standard"
                          sx={{ flex: 1, input: { color: '#fff' } }}
                        />
                      ) : (
                        <Box sx={{ flex: 1, cursor: 'pointer' }} onClick={() => loadThread(thread.id)}>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: thread.pinned ? 700 : 400 }}>
                            {thread.pinned && '📌 '}{thread.title}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            {thread.message_count || 0} messages • {formatTime(thread.updated_at)}
                          </Typography>
                        </Box>
                      )}
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {editingThreadId === thread.id ? (
                          <>
                            <IconButton size="small" onClick={() => renameThread(thread.id)} sx={{ color: 'var(--accent)' }}>
                              <ChecklistRounded fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={cancelRenameThread} sx={{ color: 'rgba(255,255,255,0.5)' }}>
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          </>
                        ) : (
                          <>
                            <IconButton
                              size="small"
                              onClick={(e) => { e.stopPropagation(); startRenameThread(thread.id, thread.title); }}
                              sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: 'var(--accent)' } }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={(e) => { e.stopPropagation(); togglePinThread(thread.id); }}
                              sx={{ color: thread.pinned ? 'var(--accent)' : 'rgba(255,255,255,0.5)' }}
                            >
                              {thread.pinned ? <PinIcon fontSize="small" /> : <PinOutlinedIcon fontSize="small" />}
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setExportThreadData({ id: thread.id, title: thread.title });
                                setExportMenuAnchor(e.currentTarget);
                              }}
                              sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: 'var(--accent)' } }}
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={(e) => { 
                        e.stopPropagation(); 
                        deleteThread(thread.id);
                        playSound('click');
                      }}
                              sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#ff4444' } }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </>
                        )}
                      </Box>
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                    {threadSearchQuery ? `No conversations matching "${threadSearchQuery}"` : 'No chat history yet.'}
                  </Typography>
                )}
              </Box>
            ) : (
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'var(--accent)' }}>Add Memory</Typography>
                  <Stack spacing={1.5}>
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
                    <TextField
                      label="Tags (comma-separated)"
                      value={newMemoryTags}
                      onChange={(e) => setNewMemoryTags(e.target.value)}
                      placeholder="code, idea, project"
                      fullWidth
                      variant="filled"
                      size="small"
                      InputProps={{ sx: { color: '#fff' } }}
                    />
                    <Button variant="contained" onClick={addMemoryEntry} disabled={!memoryText.trim()}>
                      Save Memory
                    </Button>
                  </Stack>
                </Box>

                {/* Tag Filter */}
                {memoryTags.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'rgba(255,255,255,0.7)' }}>Filter by Tag</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {memoryTags.map((tag) => (
                        <Chip
                          key={tag}
                          label={tag}
                          onClick={() => toggleTagFilter(tag)}
                          variant={selectedTags.includes(tag) ? 'filled' : 'outlined'}
                          color={selectedTags.includes(tag) ? 'primary' : 'default'}
                          size="small"
                          sx={{ cursor: 'pointer' }}
                        />
                      ))}
                      {selectedTags.length > 0 && (
                        <Chip
                          label="Clear filters"
                          onClick={() => { setSelectedTags([]); fetchMemory(memoryCategory); }}
                          size="small"
                          variant="outlined"
                          sx={{ color: 'rgba(255,255,255,0.7)' }}
                        />
                      )}
                    </Box>
                  </Box>
                )}

                {/* Memory Items */}
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'rgba(255,255,255,0.7)' }}>
                    Memories {selectedTags.length > 0 && `(filtered by: ${selectedTags.join(', ')})`}
                  </Typography>
                  <Box className="board-list">
                    {(memoryItems || []).slice().reverse().map((item, idx) => (
                      <Box key={`${item.id || item.timestamp}-${idx}`} className="board-row">
                        <Box>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                            {item.content}
                          </Typography>
                          {item.tags && item.tags.length > 0 && (
                            <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
                              {item.tags.map((tag) => (
                                <Chip
                                  key={tag}
                                  label={tag}
                                  size="small"
                                  variant="outlined"
                                  sx={{ height: 24, fontSize: '0.75rem' }}
                                  onClick={() => toggleTagFilter(tag)}
                                />
                              ))}
                            </Box>
                          )}
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', mt: 1, display: 'block' }}>
                            {formatTime(item.timestamp || item.created_at || Date.now())}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                    {!memoryItems?.length && !memoryLoading && (
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                        {selectedTags.length > 0 ? `No memories with tags: ${selectedTags.join(', ')}` : 'Nothing stored for this category yet.'}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Stack>
            )}
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
                    Track tasks by status, priority, and deadline.
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Chip label={tasksLoading ? 'Syncing…' : 'Synced'} size="small" className="chip-soft" />
                <IconButton size="small" onClick={() => setActiveSection('chat')} sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
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
                  <TextField
                    label="Description"
                    value={taskForm.description || ''}
                    onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))}
                    multiline
                    minRows={2}
                    fullWidth
                    variant="filled"
                    size="small"
                    InputProps={{ sx: { color: '#fff' } }}
                  />
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                    <TextField
                      label="Priority"
                      select
                      value={taskForm.priority || 'medium'}
                      onChange={(e) => setTaskForm((f) => ({ ...f, priority: e.target.value }))}
                      variant="filled"
                      size="small"
                      InputProps={{ sx: { color: '#fff' } }}
                    >
                      <MenuItem value="low">Low</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                      <MenuItem value="urgent">Urgent</MenuItem>
                    </TextField>
                    <TextField
                      label="Due Date"
                      type="date"
                      value={taskForm.dueDate || ''}
                      onChange={(e) => setTaskForm((f) => ({ ...f, dueDate: e.target.value }))}
                      variant="filled"
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      InputProps={{ sx: { color: '#fff' } }}
                    />
                  </Box>
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
                          const isPriority = (task.priority || 'medium') === 'urgent' || (task.priority || 'medium') === 'high';
                          const isOverdue = task.due_date && new Date(task.due_date) < new Date();
                          return (
                            <Box 
                              key={`${task.id || task.title}-${idx}`} 
                              className="task-row"
                              sx={{
                                borderLeft: isPriority ? '3px solid var(--accent)' : '3px solid transparent',
                                opacity: isOverdue ? 0.7 : 1,
                              }}
                            >
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {task.title || 'Untitled task'}
                                </Typography>
                                {task.description && (
                                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mt: 0.5 }}>
                                    {task.description}
                                  </Typography>
                                )}
                                <Box sx={{ display: 'flex', gap: 0.5, mt: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                                  {task.priority && task.priority !== 'medium' && (
                                    <Chip 
                                      label={task.priority} 
                                      size="small" 
                                      sx={{
                                        height: 20,
                                        bgcolor: task.priority === 'urgent' ? '#ff4444' : task.priority === 'high' ? '#ff8844' : 'rgba(255,255,255,0.1)',
                                        color: '#fff',
                                        fontSize: '0.7rem'
                                      }}
                                    />
                                  )}
                                  {task.due_date && (
                                    <Typography 
                                      variant="caption" 
                                      sx={{
                                        color: isOverdue ? '#ff4444' : 'rgba(255,255,255,0.5)',
                                        fontWeight: isOverdue ? 700 : 400
                                      }}
                                    >
                                      📅 {new Date(task.due_date).toLocaleDateString()}
                                    </Typography>
                                  )}
                                </Box>
                                {task.subtasks && task.subtasks.length > 0 && (
                                  <Box sx={{ mt: 1, pl: 1, borderLeft: '2px solid rgba(255,255,255,0.1)' }}>
                                    {task.subtasks.map((st, i) => (
                                      <Typography key={i} variant="caption" sx={{ display: 'block', color: 'rgba(255,255,255,0.6)' }}>
                                        • {st.title}
                                      </Typography>
                                    ))}
                                  </Box>
                                )}
                              </Box>
                              <Stack direction="row" spacing={1}>
                                <Tooltip title="AI Breakdown">
                                  <IconButton 
                                    size="small" 
                                    onClick={() => breakdownTask(idx, task)}
                                    sx={{ color: 'var(--accent)' }}
                                  >
                                    <AutoFixHigh fontSize="small" />
                                  </IconButton>
                                </Tooltip>
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
      case 'nyxshift':
        return (
          <DraggableBoard id="nyxshift">
            <NyxShift apiBase={apiBase} onClose={() => setActiveSection('chat')} />
          </DraggableBoard>
        );
      case 'sassy':
        return (
          <DraggableBoard id="sassy">
            <Sassy apiBase={apiBase} onClose={() => setActiveSection('chat')} />
          </DraggableBoard>
        );
      case 'analytics':
        return (
          <DraggableBoard id="analytics">
            <Paper className="intel-board glass-card">
              <Box className="board-header">
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Analytics Dashboard</Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    Track AI interactions, token usage, and provider distribution
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    label="Days"
                    type="number"
                    value={analyticsDays}
                    onChange={(e) => {
                      setAnalyticsDays(parseInt(e.target.value));
                      fetchAnalytics(parseInt(e.target.value));
                    }}
                    variant="filled"
                    size="small"
                    sx={{ width: 80 }}
                    InputProps={{ sx: { color: '#fff' } }}
                  />
                  <IconButton size="small" onClick={() => setActiveSection('chat')} sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
              {analyticsLoading ? (
                <CircularProgress sx={{ color: 'var(--accent)', mt: 2 }} />
              ) : analytics ? (
                <Stack spacing={2}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box className="glass-card" sx={{ p: 1.5 }}>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>Total Events</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>{analytics.total_events || 0}</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box className="glass-card" sx={{ p: 1.5 }}>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>Success Rate</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>{(analytics.success_rate || 0).toFixed(1)}%</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box className="glass-card" sx={{ p: 1.5 }}>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>Avg Response Time</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>{(analytics.avg_response_time_ms || 0).toFixed(0)}ms</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box className="glass-card" sx={{ p: 1.5 }}>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>Total Tokens</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>{(analytics.total_tokens || 0).toLocaleString()}</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                  
                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                  
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Top Topics</Typography>
                    <Stack spacing={0.5}>
                      {Object.entries(analytics.topics || {})
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([topic, count]) => (
                          <Box key={topic} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2">{topic}</Typography>
                            <Chip label={count} size="small" className="chip-soft" />
                          </Box>
                        ))}
                    </Stack>
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>AI Providers</Typography>
                    <Stack spacing={0.5}>
                      {Object.entries(analytics.providers || {})
                        .map(([provider, count]) => (
                          <Box key={provider} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{provider}</Typography>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                              <LinearProgress variant="determinate" value={(count / (analytics.total_events || 1)) * 100} sx={{ width: 100 }} />
                              <Typography variant="caption">{count}</Typography>
                            </Box>
                          </Box>
                        ))}
                    </Stack>
                  </Box>
                </Stack>
              ) : (
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mt: 2 }}>No analytics data available yet</Typography>
              )}
            </Paper>
          </DraggableBoard>
        );
      case 'personality':
        return (
          <DraggableBoard id="personality">
            <Paper className="intel-board glass-card">
              <Box className="board-header">
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Personality Configuration</Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    Customize Vesper's tone and response style
                  </Typography>
                </Box>
                <IconButton size="small" onClick={() => setActiveSection('chat')} sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
              
              {personalityLoading ? (
                <CircularProgress sx={{ color: 'var(--accent)', mt: 2 }} />
              ) : (
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'var(--accent)' }}>Quick Presets</Typography>
                    <Grid container spacing={1}>
                      {personalities.map((preset) => (
                        <Grid item xs={12} sm={6} key={preset.name}>
                          <Button
                            fullWidth
                            variant={personality?.name === preset.name ? 'contained' : 'outlined'}
                            onClick={() => applyPersonality(preset)}
                            sx={{
                              p: 1.5,
                              textAlign: 'left',
                              borderColor: 'rgba(255,255,255,0.2)',
                              '&:hover': { borderColor: 'var(--accent)' }
                            }}
                          >
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>{preset.name}</Typography>
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block', mt: 0.5 }}>
                                {preset.tone}
                              </Typography>
                            </Box>
                          </Button>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>

                  {personality && (
                    <Box>
                      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 2 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'var(--accent)' }}>Current Personality</Typography>
                      <Stack spacing={1}>
                        <Typography variant="body2"><strong>Name:</strong> {personality.name}</Typography>
                        <Typography variant="body2"><strong>Tone:</strong> {personality.tone}</Typography>
                        <Typography variant="body2"><strong>Response Style:</strong> {personality.response_style}</Typography>
                        <Box sx={{ mt: 1, p: 1, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1 }}>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                            <strong>System Prompt:</strong>
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block', color: 'rgba(255,255,255,0.5)', mt: 0.5, maxHeight: 150, overflow: 'auto' }}>
                            {personality.system_prompt}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>
                  )}

                  {/* Custom Personality Form */}
                  <Box>
                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 2 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'var(--accent)' }}>Custom Personality</Typography>
                    <Stack spacing={1.5}>
                      <TextField
                        size="small"
                        label="Name"
                        value={personalityForm.name}
                        onChange={(e) => setPersonalityForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g. Scholarly Mentor"
                        InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }}
                        sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}
                      />
                      <TextField
                        size="small"
                        label="Tone"
                        value={personalityForm.tone}
                        onChange={(e) => setPersonalityForm(prev => ({ ...prev, tone: e.target.value }))}
                        placeholder="e.g. warm, encouraging, analytical"
                        InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }}
                        sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}
                      />
                      <TextField
                        size="small"
                        label="Response Style"
                        value={personalityForm.responseStyle}
                        onChange={(e) => setPersonalityForm(prev => ({ ...prev, responseStyle: e.target.value }))}
                        placeholder="e.g. detailed with examples"
                        InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }}
                        sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}
                      />
                      <TextField
                        size="small"
                        label="System Prompt"
                        value={personalityForm.systemPrompt}
                        onChange={(e) => setPersonalityForm(prev => ({ ...prev, systemPrompt: e.target.value }))}
                        placeholder="Custom instructions for Vesper..."
                        multiline
                        rows={3}
                        InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }}
                        sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}
                      />
                      <Button
                        variant="contained"
                        disabled={!personalityForm.name.trim() || personalityLoading}
                        onClick={() => applyPersonality({
                          name: personalityForm.name,
                          system_prompt: personalityForm.systemPrompt,
                          tone: personalityForm.tone,
                          response_style: personalityForm.responseStyle,
                        })}
                        sx={{ bgcolor: 'var(--accent)', color: '#000', fontWeight: 700, '&:hover': { bgcolor: 'var(--accent)', opacity: 0.9 } }}
                      >
                        {personalityLoading ? <CircularProgress size={18} /> : 'Apply Custom Personality'}
                      </Button>
                    </Stack>
                  </Box>
                </Stack>
              )}
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
                    Customize your Vesper AI experience
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => setActiveSection('chat')} sx={{ color: 'rgba(255,255,255,0.7)' }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
            <Stack spacing={2.5}>
              {/* Appearance */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'var(--accent)' }}>Appearance</Typography>
                <Stack spacing={1.5}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>Theme Color</Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>{activeTheme.label}</Typography>
                    </Box>
                    <IconButton 
                      onClick={(e) => setThemeMenuAnchor(e.currentTarget)}
                      sx={{ 
                        bgcolor: activeTheme.accent, 
                        color: '#000',
                        boxShadow: `0 0 15px ${activeTheme.accent}`,
                        '&:hover': { bgcolor: activeTheme.accent, transform: 'scale(1.1)' }
                      }}
                    >
                      <PaletteIcon fontSize="small" />
                    </IconButton>
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
                </Stack>
              </Box>
              
              {/* Audio & Voice */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'var(--accent)' }}>Audio & Voice</Typography>
                <Stack spacing={1.5}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>Text-to-Speech</Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                        {ttsEnabled ? 'Pick a voice in the chat panel (gear icon)' : 'AI responses read aloud'}
                      </Typography>
                    </Box>
                    <Switch 
                      checked={ttsEnabled} 
                      onChange={(e) => {
                        const newVal = e.target.checked;
                        setTtsEnabled(newVal);
                        try { localStorage.setItem('vesper_tts_enabled', String(newVal)); } catch(err) {}
                        if (!newVal) stopSpeaking();
                        playSound('click');
                      }}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: 'var(--accent)',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: 'var(--accent)',
                        },
                      }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>System Diagnostics</Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>Check health & performance</Typography>
                    </Box>
                    <Button 
                      onClick={() => setDiagnosticsOpen(true)}
                      size="small"
                      variant="outlined"
                      sx={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
                      startIcon={<SpeedIcon />}
                    >
                      Run Check
                    </Button>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>UI Sound Effects</Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>Button clicks and notifications</Typography>
                    </Box>
                    <Switch 
                      checked={soundEnabled} 
                      onChange={(e) => {
                        const newValue = e.target.checked;
                        setSoundEnabled(newValue);
                        localStorage.setItem('vesper_sound_enabled', newValue.toString());
                        if (newValue) playSound('success');
                      }}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: 'var(--accent)',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: 'var(--accent)',
                        },
                      }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>Voice Input</Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>Hold V to speak</Typography>
                    </Box>
                    <Chip label="Always On" size="small" sx={{ bgcolor: 'rgba(0,255,255,0.2)', color: 'var(--accent)' }} />
                  </Box>
                </Stack>
              </Box>

              {/* AI Models */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'var(--accent)' }}>AI Models</Typography>
                <Stack spacing={1}>
                  <Box sx={{ p: 1.5, border: '2px solid #4ade80', borderRadius: '8px', bgcolor: 'rgba(74, 222, 128, 0.05)' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>Ollama (Local)</Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>Free • Private • Fast</Typography>
                      </Box>
                      <Chip label="PRIMARY" size="small" sx={{ bgcolor: '#4ade80', color: '#000', fontWeight: 700 }} />
                    </Box>
                  </Box>
                  <Box sx={{ p: 1.5, border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>Cloud Models</Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>Claude, GPT, Gemini</Typography>
                      </Box>
                      <Chip label="Fallback" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: '#fff' }} />
                    </Box>
                  </Box>
                </Stack>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', mt: 1, display: 'block' }}>
                  Auto-routes to best available model. Ollama runs locally for privacy.
                </Typography>
              </Box>

              {/* System Info */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'var(--accent)' }}>System Status</Typography>
                <Stack spacing={1.5}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Memory Database</Typography>
                    <Chip label="Connected" size="small" sx={{ bgcolor: 'rgba(74, 222, 128, 0.2)', color: '#4ade80', fontWeight: 600 }} />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Conversations</Typography>
                    <Chip label={`${threads.length} saved`} size="small" sx={{ bgcolor: 'rgba(0,255,255,0.2)', color: 'var(--accent)', fontWeight: 600 }} />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Storage</Typography>
                    <Chip label="Auto-Save" size="small" sx={{ bgcolor: 'rgba(0,255,255,0.2)', color: 'var(--accent)', fontWeight: 600 }} />
                  </Box>
                </Stack>
              </Box>

              {/* Actions */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'var(--accent)' }}>Data Management</Typography>
                <Stack spacing={1}>
                  <Button 
                    variant="outlined" 
                    fullWidth 
                    size="small"
                    onClick={() => {
                      exportAllData();
                      playSound('click');
                    }}
                    sx={{ 
                      borderColor: 'var(--accent)', 
                      color: 'var(--accent)',
                      textTransform: 'none',
                      '&:hover': { bgcolor: 'rgba(0,255,255,0.1)', borderColor: 'var(--accent)' }
                    }}
                  >
                    Export All Data
                  </Button>
                  <Button 
                    variant="outlined" 
                    fullWidth 
                    size="small"
                    onClick={() => {
                      clearHistory();
                      playSound('click');
                    }}
                    sx={{ 
                      borderColor: 'rgba(255,255,255,0.2)', 
                      color: '#fff',
                      textTransform: 'none',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.3)' }
                    }}
                  >
                    Clear Current Chat
                  </Button>
                </Stack>
              </Box>

              {/* Advanced Customization */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'var(--accent)' }}>⚙️ Advanced Customization</Typography>
                <Stack spacing={1.5}>
                  {/* Font Size */}
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Font Size</Typography>
                    <Stack direction="row" spacing={0.5}>
                      {['small', 'medium', 'large'].map(size => (
                        <Chip
                          key={size}
                          label={size}
                          onClick={() => applyFontSize(size)}
                          variant={customizations.fontSize === size ? 'filled' : 'outlined'}
                          color={customizations.fontSize === size ? 'primary' : 'default'}
                          size="small"
                        />
                      ))}
                    </Stack>
                  </Box>

                  {/* Compact Mode */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>Compact Mode</Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>Reduce spacing and padding</Typography>
                    </Box>
                    <Switch
                      checked={customizations.compactMode}
                      onChange={toggleCompactMode}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--accent)' },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: 'var(--accent)' },
                      }}
                    />
                  </Box>

                  {/* Analytics Display */}
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Analytics Display</Typography>
                    <Select
                      value={customizations.analyticsCharts}
                      onChange={(e) => updateCustomization('analyticsCharts', e.target.value)}
                      size="small"
                      fullWidth
                      sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: '#fff' }}
                    >
                      <MenuItem value="all">All Charts</MenuItem>
                      <MenuItem value="summary">Summary Only</MenuItem>
                      <MenuItem value="detailed">Detailed Only</MenuItem>
                    </Select>
                  </Box>

                  {/* Custom Memory Categories */}
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Memory Categories</Typography>
                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', mb: 1 }}>
                      {customizations.memoryCategories.map(cat => (
                        <Chip
                          key={cat}
                          label={cat}
                          onDelete={() => removeMemoryCategory(cat)}
                          size="small"
                          className="chip-soft"
                        />
                      ))}
                    </Stack>
                    <Stack direction="row" spacing={0.5}>
                      <TextField
                        value={newMemoryCategory}
                        onChange={(e) => setNewMemoryCategory(e.target.value)}
                        placeholder="New category..."
                        size="small"
                        variant="filled"
                        onKeyPress={(e) => e.key === 'Enter' && addMemoryCategory()}
                        InputProps={{ sx: { color: '#fff' } }}
                        sx={{ flex: 1 }}
                      />
                      <Button onClick={addMemoryCategory} size="small" variant="outlined">Add</Button>
                    </Stack>
                  </Box>

                  {/* Custom Research Sources */}
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Research Sources</Typography>
                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', mb: 1 }}>
                      {customizations.researchSources.map(src => (
                        <Chip
                          key={src}
                          label={src}
                          onDelete={() => removeResearchSource(src)}
                          size="small"
                          className="chip-soft"
                        />
                      ))}
                    </Stack>
                    <Stack direction="row" spacing={0.5}>
                      <TextField
                        value={newResearchSource}
                        onChange={(e) => setNewResearchSource(e.target.value)}
                        placeholder="New source..."
                        size="small"
                        variant="filled"
                        onKeyPress={(e) => e.key === 'Enter' && addResearchSource()}
                        InputProps={{ sx: { color: '#fff' } }}
                        sx={{ flex: 1 }}
                      />
                      <Button onClick={addResearchSource} size="small" variant="outlined">Add</Button>
                    </Stack>
                  </Box>
                </Stack>
              </Box>

              {/* Advanced Export */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'var(--accent)' }}>📥 Advanced Export</Typography>
                <Stack spacing={1.5}>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>Select what to export:</Typography>
                  <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
                    {['memories', 'tasks', 'research', 'documents', 'conversations'].map(item => (
                      <FormControlLabel
                        key={item}
                        control={
                          <Checkbox
                            checked={exportSelection[item]}
                            onChange={(e) => setExportSelection(s => ({ ...s, [item]: e.target.checked }))}
                            size="small"
                          />
                        }
                        label={<Typography variant="caption" sx={{ textTransform: 'capitalize' }}>{item}</Typography>}
                        sx={{ m: 0, mr: 1 }}
                      />
                    ))}
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <Button 
                      variant="outlined" 
                      size="small" 
                      onClick={exportAsMarkdown}
                      sx={{ flex: 1 }}
                    >
                      📄 Markdown
                    </Button>
                    <Button 
                      variant="outlined" 
                      size="small" 
                      onClick={exportAsJSON}
                      sx={{ flex: 1 }}
                    >
                      {} JSON
                    </Button>
                    <Button 
                      variant="outlined" 
                      size="small" 
                      onClick={exportAsCSV}
                      sx={{ flex: 1 }}
                    >
                      📊 CSV
                    </Button>
                  </Stack>
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
      <Box sx={{ 
        transform: `scale(${uiScale})`,
        transformOrigin: 'top left',
        width: `${100 / uiScale}%`,
        minHeight: `${100 / uiScale}vh`,
        overflowX: 'hidden',
        overflowY: 'auto'
      }}>
      <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} onCommand={handleCommand} />


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
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', letterSpacing: 2 }}>
                VESPER AI
              </Typography>
              <Typography variant="h6" sx={{ color: 'var(--accent)', fontWeight: 800 }}>
                Ops Console
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2, mb: 3 }}>
            {NAV.map(({ id, label, icon: Icon }) => (
              <Box
                key={id}
                className={`nav-item ${activeSection === id ? 'active' : ''}`}
                onClick={() => {
                  setActiveSection(id);
                  playSound('click');
                }}
              >
                <Icon fontSize="small" />
                <span>{label}</span>
              </Box>
            ))}
          </Box>

          {/* Chat Sessions List - Gemini Style */}
          <Box sx={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column',
            minHeight: 0,
            borderTop: '1px solid rgba(255,255,255,0.1)',
            pt: 1.5
          }}>
            {/* Thread List - Gemini Style */}
            <Box sx={{ 
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              gap: 0.3,
              pr: 0.3,
              '&::-webkit-scrollbar': {
                width: '4px',
              },
              '&::-webkit-scrollbar-track': {
                background: 'transparent',
              },
              '&::-webkit-scrollbar-thumb': {
                background: 'rgba(0, 255, 255, 0.3)',
                borderRadius: '3px',
              },
              '&::-webkit-scrollbar-thumb:hover': {
                background: 'rgba(0, 255, 255, 0.5)',
              }
            }}>
              {threadsLoading ? (
                <Box sx={{ py: 2, textAlign: 'center' }}>
                  <CircularProgress size={20} sx={{ color: 'var(--accent)' }} />
                </Box>
              ) : threads && threads.length > 0 ? (
                threads.map((thread) => (
                  <Box
                    key={thread.id}
                    sx={{
                      p: '8px 10px',
                      borderRadius: '8px',
                      bgcolor: currentThreadId === thread.id ? 'rgba(0,255,255,0.15)' : 'transparent',
                      border: currentThreadId === thread.id ? '1px solid rgba(0,255,255,0.4)' : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 0.5,
                      '&:hover': {
                        bgcolor: 'rgba(0,255,255,0.1)',
                        borderColor: 'rgba(0,255,255,0.3)',
                      },
                      group: 'hover'
                    }}
                    onClick={() => !editingThreadId && loadThread(thread.id)}
                  >
                    <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {thread.pinned && (
                        <PinIcon sx={{ fontSize: '0.75rem', color: 'var(--accent)', flexShrink: 0 }} />
                      )}
                      {editingThreadId === thread.id ? (
                        <TextField
                          value={editingThreadTitle}
                          onChange={(e) => setEditingThreadTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') renameThread(thread.id);
                            if (e.key === 'Escape') cancelRenameThread();
                          }}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                          size="small"
                          variant="standard"
                          sx={{ 
                            flex: 1,
                            input: { 
                              color: '#fff', 
                              fontSize: '0.85rem',
                              padding: '4px 0'
                            }
                          }}
                        />
                      ) : (
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: thread.pinned ? 600 : 400,
                            color: thread.pinned ? 'var(--accent)' : '#fff',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontSize: '0.85rem'
                          }}
                          title={thread.title}
                        >
                          {thread.title}
                        </Typography>
                      )}
                    </Box>
                    {editingThreadId === thread.id ? (
                      <Box sx={{ display: 'flex', gap: 0.25, flexShrink: 0 }}>
                        <Tooltip title="Save">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              renameThread(thread.id);
                            }}
                            sx={{ 
                              p: 0.2,
                              color: 'var(--accent)',
                              '&:hover': { color: '#00ff88' }
                            }}
                          >
                            <ChecklistRounded fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Cancel">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              cancelRenameThread();
                            }}
                            sx={{ 
                              p: 0.2,
                              color: 'rgba(255,255,255,0.5)',
                              '&:hover': { color: '#ff4444' }
                            }}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ) : (
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          gap: 0.25,
                          opacity: 0,
                          transition: 'opacity 0.2s',
                          flexShrink: 0,
                          '&:has(> button:hover)': { opacity: 1 },
                          '.MuiBox-root:hover &': { opacity: 1 }
                        }}
                      >
                        <Tooltip title="Share">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Share thread - export as JSON
                              const threadData = {
                                title: thread.title,
                                timestamp: thread.created_at,
                                messages: thread.messages || [],
                              };
                              const json = JSON.stringify(threadData, null, 2);
                              const link = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
                              
                              // Download the thread
                              const downloadLink = document.createElement('a');
                              downloadLink.href = link;
                              downloadLink.download = `vesper-thread-${thread.id}.json`;
                              downloadLink.click();
                              setToast(`📥 Thread exported as JSON`);
                            }}
                            sx={{ 
                              p: 0.2,
                              color: 'rgba(255,255,255,0.5)',
                              '&:hover': { color: 'var(--accent)' }
                            }}
                          >
                            <span style={{ fontSize: '0.9rem' }}>↗</span>
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={thread.pinned ? 'Unpin' : 'Pin'}>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePinThread(thread.id);
                            }}
                            sx={{ 
                              p: 0.2,
                              color: thread.pinned ? 'var(--accent)' : 'rgba(255,255,255,0.5)',
                              '&:hover': { color: 'var(--accent)' }
                            }}
                          >
                            {thread.pinned ? <PinIcon fontSize="small" /> : <PinOutlinedIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Rename">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              startRenameThread(thread.id, thread.title);
                            }}
                            sx={{ 
                              p: 0.2,
                              color: 'rgba(255,255,255,0.5)',
                              '&:hover': { color: 'var(--accent)' }
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteThread(thread.id);
                            }}
                            sx={{ 
                              p: 0.2,
                              color: 'rgba(255,255,255,0.5)',
                              '&:hover': { color: '#ff4444' }
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                  </Box>
                ))
              ) : !threadsLoading && (
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'rgba(255,255,255,0.5)',
                    textAlign: 'center',
                    py: 2
                  }}
                >
                  No chats yet
                </Typography>
              )}
            </Box>
          </Box>

          {/* New Chat Button - Bottom */}
          <Button
            fullWidth
            variant="outlined"
            onClick={startNewChat}
            startIcon={<AddIcon />}
            sx={{
              color: 'var(--accent)',
              borderColor: 'var(--accent)',
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 600,
              py: 1,
              mt: 1,
              '&:hover': {
                bgcolor: 'rgba(0,255,255,0.1)',
                borderColor: 'var(--accent)',
              }
            }}
          >
            New Chat
          </Button>
        </aside>

        <main className="content-grid">
          <section className="chat-panel glass-panel">
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexShrink: 0 }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--accent)' }}>
                  Neural Chat
                </Typography>
                {currentThreadId && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                      💬 {currentThreadTitle}
                    </Typography>
                    <Button 
                      size="small" 
                      variant="outlined"
                      onClick={startNewChat}
                      sx={{ 
                        fontSize: '0.7rem', 
                        py: 0.25, 
                        px: 1,
                        borderColor: 'var(--accent)',
                        color: 'var(--accent)',
                        '&:hover': { bgcolor: 'rgba(0,255,255,0.1)', borderColor: 'var(--accent)' }
                      }}
                    >
                      New Chat
                    </Button>
                  </Box>
                )}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {/* Voice ON/OFF Toggle */}
                <Tooltip title={ttsEnabled ? "Turn voice OFF" : "Turn voice ON"} placement="left">
                  <IconButton 
                    size="small" 
                    onClick={toggleTTS}
                    sx={{ 
                      color: ttsEnabled ? 'var(--accent)' : 'rgba(255,255,255,0.3)',
                      bgcolor: ttsEnabled ? 'rgba(0,255,255,0.1)' : 'transparent',
                      border: ttsEnabled ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.15)',
                      '&:hover': { color: 'var(--accent)', bgcolor: 'rgba(0,255,255,0.15)' },
                      width: 32, height: 32,
                    }}
                  >
                    {ttsEnabled ? <VolumeUpIcon sx={{ fontSize: 18 }} /> : <VolumeOffIcon sx={{ fontSize: 18 }} />}
                  </IconButton>
                </Tooltip>

                {/* Voice Picker Button (only when TTS is on) */}
                {ttsEnabled && (
                  <Tooltip title="Choose voice" placement="top">
                    <IconButton
                      size="small"
                      onClick={() => setShowVoiceSelector(!showVoiceSelector)}
                      sx={{
                        color: showVoiceSelector ? '#000' : 'rgba(255,255,255,0.6)',
                        bgcolor: showVoiceSelector ? 'var(--accent)' : 'transparent',
                        border: '1px solid rgba(255,255,255,0.15)',
                        '&:hover': { bgcolor: 'rgba(0,255,255,0.15)', color: 'var(--accent)' },
                        width: 32, height: 32,
                        fontSize: '0.85rem',
                      }}
                    >
                      🎙
                    </IconButton>
                  </Tooltip>
                )}

                {isSpeaking && (
                  <Chip 
                    label="Speaking..." 
                    size="small"
                    onClick={stopSpeaking}
                    sx={{ 
                      height: 24,
                      bgcolor: 'rgba(0,255,255,0.15)',
                      color: 'var(--accent)',
                      borderColor: 'var(--accent)',
                      borderWidth: 1,
                      borderStyle: 'solid',
                      animation: 'pulse 1.5s ease-in-out infinite',
                      cursor: 'pointer'
                    }}
                  />
                )}
                <Box className="status-dot" />
              </Box>
            </Box>

            {/* Voice Selector Dropdown */}
            {showVoiceSelector && ttsEnabled && (
              <Box sx={{
                mb: 1, p: 1.5,
                background: 'rgba(10,10,30,0.95)',
                border: '1px solid var(--accent)',
                borderRadius: 2,
                maxHeight: 200,
                overflowY: 'auto',
                '&::-webkit-scrollbar': { width: 4 },
                '&::-webkit-scrollbar-thumb': { background: 'var(--accent)', borderRadius: 2 },
              }}>
                <Typography variant="caption" sx={{ color: 'var(--accent)', fontWeight: 700, mb: 1, display: 'block' }}>
                  VESPER'S VOICE — pick "Online" or "Natural" voices for best quality
                </Typography>
                {availableVoices
                  .filter(v => v.lang.startsWith('en') && !v.name.startsWith('Google'))
                  .sort((a, b) => {
                    // Sort: Online/Natural voices first, then alphabetical
                    const aHQ = /online|natural/i.test(a.name) ? 0 : 1;
                    const bHQ = /online|natural/i.test(b.name) ? 0 : 1;
                    return aHQ - bHQ || a.name.localeCompare(b.name);
                  })
                  .map((v) => {
                    const isNeural = /online|natural/i.test(v.name);
                    return (
                    <Box
                      key={v.name}
                      onClick={() => { handleVoiceChange(v.name); setShowVoiceSelector(false); }}
                      sx={{
                        p: 0.75, px: 1,
                        cursor: 'pointer',
                        borderRadius: 1,
                        mb: 0.25,
                        background: selectedVoiceName === v.name ? 'rgba(0,255,136,0.15)' : isNeural ? 'rgba(0,255,255,0.04)' : 'transparent',
                        borderLeft: selectedVoiceName === v.name ? '2px solid #00ff88' : isNeural ? '2px solid rgba(0,255,255,0.3)' : '2px solid transparent',
                        '&:hover': { background: 'rgba(255,255,255,0.08)' },
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Typography variant="caption" sx={{ 
                          color: selectedVoiceName === v.name ? '#00ff88' : isNeural ? '#00ddff' : 'rgba(255,255,255,0.7)',
                          fontWeight: selectedVoiceName === v.name ? 700 : isNeural ? 600 : 400,
                          fontSize: '0.75rem',
                        }}>
                          {v.name}
                        </Typography>
                        {isNeural && (
                          <Typography variant="caption" sx={{
                            fontSize: '0.6rem', px: 0.5, py: 0.1,
                            borderRadius: 0.5,
                            background: 'rgba(0,255,255,0.15)',
                            color: '#00ffff',
                            fontWeight: 700,
                          }}>
                            HD
                          </Typography>
                        )}
                      </Box>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem', ml: 1 }}>
                        {v.lang}
                      </Typography>
                    </Box>
                    );
                  })}
                {availableVoices.filter(v => v.lang.startsWith('en') && !v.name.startsWith('Google')).length === 0 && (
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                    No voices loaded yet. Try toggling TTS off and on.
                  </Typography>
                )}
              </Box>
            )}

            <Stack direction="row" spacing={0.5} sx={{ mb: 1, flexWrap: 'wrap', gap: 0.5, flexShrink: 0 }}>
              {['Summarize the scene', 'Generate a quest', 'Give me a hint', 'Explain controls'].map((label) => (
                <Chip key={label} label={label} onClick={() => setInput(label)} className="chip-ghost" />
              ))}
              <Chip label="Cmd/Ctrl+K" className="chip-ghost" />
              <Chip label="Hold V to speak" className="chip-ghost" />
            </Stack>

            <Paper ref={chatContainerRef} className="chat-window glass-card">
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

            {/* Chat Box Resize Handle */}
            <Box
              onMouseDown={startResizeChat}
              className="chat-resize-handle"
              sx={{
                height: '8px',
                cursor: 'ns-resize',
                background: 'linear-gradient(to bottom, rgba(0,255,255,0.3), rgba(0,255,255,0.1))',
                borderRadius: '0 0 8px 8px',
                transition: 'all 0.2s ease',
                '&:hover': {
                  background: 'linear-gradient(to bottom, rgba(0,255,255,0.6), rgba(0,255,255,0.3))',
                  boxShadow: '0 0 10px rgba(0,255,255,0.4)',
                },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none',
              }}
              title="Drag to resize chat window"
            >
              <Box sx={{ width: '30px', height: '2px', bgcolor: 'rgba(0,255,255,0.4)' }} />
            </Box>

            {/* Image Preview Area */}
            {uploadedImages.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, p: 1, overflowX: 'auto', mb: 1, bgcolor: 'rgba(0,0,0,0.3)', borderRadius: 2 }}>
                {uploadedImages.map((img, index) => (
                  <Box key={index} sx={{ position: 'relative', width: 60, height: 60, flexShrink: 0 }}>
                    <img 
                      src={img.dataUrl} 
                      alt={img.name} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--accent)' }} 
                    />
                    <IconButton
                      size="small"
                      onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== index))}
                      sx={{ 
                        position: 'absolute', 
                        top: -8, 
                        right: -8, 
                        width: 20, 
                        height: 20, 
                        bgcolor: '#ff4444', 
                        color: '#fff', 
                        '&:hover': { bgcolor: '#cc0000' } 
                      }}
                    >
                      <CloseIcon sx={{ fontSize: 12 }} />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}

            {/* Proactive Suggestions */}
            {suggestions.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, mb: 1, overflowX: 'auto', px: 1 }}>
                {suggestions.map((s, i) => (
                  <Chip 
                    key={i} 
                    label={s} 
                    onClick={() => {
                        setInput(s);
                        setSuggestions([]); // Clear after selection
                    }}
                    onDelete={() => setSuggestions(prev => prev.filter((_, idx) => idx !== i))}
                    sx={{ 
                      bgcolor: 'rgba(0,255,255,0.1)', 
                      backdropFilter: 'blur(5px)',
                      border: '1px solid rgba(0,255,255,0.3)',
                      color: 'var(--accent)',
                      '&:hover': { bgcolor: 'rgba(0,255,255,0.2)' }
                    }} 
                  />
                ))}
              </Box>
            )}

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
                  disabled={analyzingImage}
                >
                  {analyzingImage ? <CircularProgress size={20} sx={{ color: 'var(--accent)' }} /> : <AddIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Get Proactive Suggestions" placement="top">
                <IconButton
                  onClick={fetchSuggestions}
                  className="ghost-button"
                  size="small"
                  disabled={suggestionsLoading}
                >
                  {suggestionsLoading ? <CircularProgress size={20} sx={{ color: 'var(--accent)' }} /> : <AutoFixHigh fontSize="small" />}
                </IconButton>
              </Tooltip>
              <VoiceInput onTranscript={handleVoiceTranscript} />
              <TextField
                inputRef={inputRef}
                fullWidth
                multiline
                maxRows={3}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPaste={handlePaste}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Ask Vesper… (paste images supported)"
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
              {loading ? (
                <Tooltip title="Stop generation" placement="top">
                  <IconButton onClick={stopGeneration} className="cta-button" size="small" sx={{ bgcolor: '#ff4444', '&:hover': { bgcolor: '#cc0000' } }}>
                    <CloseIcon />
                  </IconButton>
                </Tooltip>
              ) : (
                <Tooltip title="Send (Enter)" placement="top">
                  <span>
                    <IconButton type="submit" disabled={!input.trim()} className="cta-button" size="small">
                      <SendIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              )}
              <Tooltip title="Clear chat" placement="top">
                <IconButton onClick={clearHistory} className="ghost-button" size="small">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Paper>

            {/* Tools Section - Below Input */}
            <Box sx={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))',
              gap: 0.8,
              mt: 1
            }}>
              {TOOLS.map((tool) => (
                <Box
                  key={tool.id}
                  onClick={() => {
                    if (tool.id === 'canvas') {
                      setCanvasOpen(true);
                    } else if (tool.id === 'research') {
                      setResearchOpen(true);
                    } else if (tool.id === 'graph') {
                      setGraphOpen(true);
                    } else if (tool.id === 'images') {
                      setImageOpen(true);
                    } else if (tool.id === 'videos') {
                      setVideoOpen(true);
                    } else if (tool.id === 'learning') {
                      setLearningOpen(true);
                    } else if (tool.id === 'enterWorld') {
                      setGameMode(true);
                    } else if (tool.id === 'newChat') {
                      startNewChat();
                    } else if (tool.id === 'clearHistory') {
                      clearHistory();
                    } else if (tool.id === 'mindmap') {
                      setGraphOpen(true);
                    } else if (tool.id === 'settings') {
                      setActiveSection('settings');
                    } else {
                      setToast(`${tool.label} feature coming soon`);
                    }
                  }}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 0.5,
                    padding: '8px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '0.75rem',
                    transition: 'all 0.2s ease',
                    border: '1px solid rgba(0,255,255,0.2)',
                    '&:hover': {
                      bgcolor: 'rgba(0,255,255,0.1)',
                      color: '#fff',
                      borderColor: 'var(--accent)',
                    }
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>{tool.icon}</span>
                  <Typography variant="caption" sx={{ fontSize: '0.7rem', textAlign: 'center', lineHeight: 1 }}>
                    {tool.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </section>

          <section className="ops-panel">
            {/* Cool Dashboard - Statistics & Quick Actions */}
            <Box className="panel-grid" sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 2 }}>
              
              {/* Weather Widget (Replaces AI Stats) */}
              <WeatherWidget />

              {/* System Status Card */}
              {showSystemStatus && (
                <div 
                  onClick={(e) => {
                    // Only open diagnostics if not interacting with the slider or hide button
                    const target = e.target;
                    if (target.closest('.MuiSlider-root') || target.closest('button')) {
                      return;
                    }
                    setDiagnosticsOpen(true);
                  }} 
                  style={{ cursor: 'pointer' }}
                >
                  <SystemStatusCard 
                    apiBase={apiBase} 
                    currentScale={uiScale} 
                    onScaleChange={(val) => {
                      setUiScale(val);
                      localStorage.setItem('vesper_ui_scale', val.toString());
                    }} 
                    onHide={() => setShowSystemStatus(false)}
                  />
                </div>
              )}
              {!showSystemStatus && (
                <Button 
                  variant="outlined" 
                  size="small" 
                  onClick={() => setShowSystemStatus(true)}
                  sx={{ borderColor: 'var(--accent)', color: 'var(--accent)', width: '100%', height: '50px' }}
                >
                  Show System Widget
                </Button>
              )}

              {/* Quick Actions and Active Session removed — these are accessible from sidebar and tools grid */}

            </Box>

            {/* Vesper World - Entry Card */}
            <Box sx={{ 
              mt: 2, 
              width: '100%',
              position: 'relative',
              borderRadius: '16px',
              overflow: 'hidden',
              border: '1px solid rgba(0, 255, 255, 0.2)',
              boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)'
            }}>
              <Box sx={{
                width: '100%',
                minHeight: 180,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, rgba(20,10,40,0.95) 0%, rgba(10,5,30,0.98) 100%)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                py: 3,
                '&:hover': {
                  background: 'linear-gradient(135deg, rgba(30,15,60,0.95) 0%, rgba(15,8,40,0.98) 100%)',
                  '& .enter-icon': { transform: 'scale(1.1)', filter: 'drop-shadow(0 0 20px var(--accent))' },
                },
              }}
              onClick={() => setGameMode(true)}
              >
                <Box className="enter-icon" sx={{
                  width: 64, height: 64, borderRadius: '50%',
                  border: '2px solid var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  mb: 1.5, transition: 'all 0.3s ease',
                  boxShadow: '0 0 30px rgba(0,255,255,0.15)',
                }}>
                  <Typography sx={{ fontSize: 28 }}>🌐</Typography>
                </Box>
                <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 700, mb: 0.5 }}>
                  Enter Vesper World
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                  Explore the 3D world
                </Typography>
              </Box>
            </Box>

            {/* Fullscreen 3D World Overlay */}
            {gameMode && (
              <Box sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 9999,
                background: '#000',
              }}>
                <React.Suspense fallback={
                  <Box sx={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,5,30,1)' }}>
                    <CircularProgress sx={{ color: 'var(--accent)' }} />
                    <Typography sx={{ ml: 2, color: 'rgba(255,255,255,0.6)' }}>Loading world...</Typography>
                  </Box>
                }>
                  <GameLazy 
                    onExitGame={() => setGameMode(false)} 
                    onChatWithNPC={() => {}} 
                  />
                </React.Suspense>
              </Box>
            )}

            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <div key={activeSection} className="page-transition">
                {renderActiveBoard()}
              </div>
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
        ContentProps={{
          className: 'toast-enter',
          sx: {
            background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.15), rgba(0, 136, 255, 0.15))',
            border: '1px solid rgba(0, 255, 255, 0.3)',
            borderRadius: '12px',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 0 30px rgba(0, 255, 255, 0.3), 0 8px 32px rgba(0, 0, 0, 0.4)',
            color: '#fff',
            fontWeight: 600,
          }
        }}
      />
      <Menu
        anchorEl={exportMenuAnchor}
        open={Boolean(exportMenuAnchor)}
        onClose={() => { setExportMenuAnchor(null); setExportThreadData(null); }}
      >
        <MenuItem onClick={() => {
          if (exportThreadData) downloadThreadMD(exportThreadData.id, exportThreadData.title);
          setExportMenuAnchor(null);
          setExportThreadData(null);
        }}>
          <DownloadIcon fontSize="small" sx={{ mr: 1 }} /> Export as Markdown
        </MenuItem>
        <MenuItem onClick={() => {
          if (exportThreadData) downloadThreadJSON(exportThreadData.id, exportThreadData.title);
          setExportMenuAnchor(null);
          setExportThreadData(null);
        }}>
          <DownloadIcon fontSize="small" sx={{ mr: 1 }} /> Export as JSON
        </MenuItem>
      </Menu>
      
      {/* Canvas Modal */}
      <Dialog open={canvasOpen} onClose={() => setCanvasOpen(false)} maxWidth="lg" fullWidth fullScreen>
        <Canvas 
            onClose={() => setCanvasOpen(false)} 
            onShare={() => setToast('Canvas shared!')} 
            initialCode={canvasAppCode}
            initialTab={canvasActiveTab}
        />
      </Dialog>

      {/* Knowledge Graph Modal */}
      <Dialog 
        open={graphOpen} 
        onClose={() => setGraphOpen(false)} 
        maxWidth="xl" 
        fullWidth 
        fullScreen
        PaperProps={{
          style: {
            backgroundColor: 'rgba(0,0,0,0.92)',
          },
        }}
      >
        <Box sx={{ position: 'relative', width: '100vw', height: '100vh' }}>
            <KnowledgeGraph apiBase={apiBase} />
            <IconButton
              onClick={() => setGraphOpen(false)}
              sx={{
                position: 'absolute',
                top: 20,
                right: 20,
                color: '#fff',
                bgcolor: 'rgba(0,0,0,0.5)',
                '&:hover': { bgcolor: 'rgba(255,0,0,0.5)' },
                zIndex: 1000
              }}
            >
              <CloseIcon />
            </IconButton>
        </Box>
      </Dialog>

      {/* Deep Research Modal */}
      <Dialog open={researchOpen} onClose={() => setResearchOpen(false)} maxWidth="md" fullWidth sx={{ height: '90vh' }}>
        <DeepResearch apiBase={apiBase} onClose={() => setResearchOpen(false)} />
      </Dialog>

      {/* Image Generator Modal */}
      <Dialog open={imageOpen} onClose={() => setImageOpen(false)} maxWidth="md" fullWidth>
        <ImageGenerator apiBase={apiBase} onClose={() => setImageOpen(false)} />
      </Dialog>

      {/* Video Creator Modal */}
      <Dialog open={videoOpen} onClose={() => setVideoOpen(false)} maxWidth="md" fullWidth>
        <VideoCreator apiBase={apiBase} onClose={() => setVideoOpen(false)} />
      </Dialog>

      {/* Guided Learning Modal */}
      <Dialog open={learningOpen} onClose={() => setLearningOpen(false)} maxWidth="md" fullWidth>
        <GuidedLearning apiBase={apiBase} onClose={() => setLearningOpen(false)} />
      </Dialog>
      
      {/* System Diagnostics Modal */}
      <SystemDiagnostics 
        open={diagnosticsOpen} 
        onClose={() => setDiagnosticsOpen(false)} 
        apiBase={apiBase} 
      />

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={showDeleteConfirm} 
        onClose={() => setShowDeleteConfirm(false)}
        PaperProps={{
          style: {
            backgroundColor: 'rgba(10, 10, 20, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 68, 68, 0.3)',
            borderRadius: '16px',
            minWidth: '300px'
          },
        }}
      >
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <DeleteIcon sx={{ fontSize: 48, color: '#ff4444', mb: 2, opacity: 0.8 }} />
          <Typography variant="h6" sx={{ color: '#fff', mb: 1, fontWeight: 700 }}>
            {deleteTargetId === 'bulk' 
              ? `Delete ${selectedThreadIds.length} Conversations?` 
              : 'Delete Conversation?'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 3 }}>
            This action cannot be undone. All messages and data will be permanently removed.
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button 
              onClick={() => setShowDeleteConfirm(false)}
              sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: '#fff' } }}
            >
              Cancel
            </Button>
            <Button 
              variant="contained" 
              color="error" 
              onClick={executeDelete}
              startIcon={<DeleteIcon />}
              sx={{ bgcolor: '#ff4444', '&:hover': { bgcolor: '#ff0000' } }}
            >
              Delete
            </Button>
          </Stack>
        </Box>
      </Dialog>
      </Box>
    </ThemeProvider>
  );
}

export default App;
