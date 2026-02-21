import React, { useState, useEffect, useRef, useMemo, useCallback, startTransition } from 'react';
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
  DialogTitle,
  DialogContent,
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
  PlayArrow as PlayArrowIcon,
  SaveAlt as SaveAltIcon,
  RecordVoiceOver as RecordVoiceOverIcon,
  PhotoLibrary,
  ArrowBack as ArrowBackIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  MoreVert as MoreVertIcon,
  Menu as MenuIcon,
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
import CockpitPanel from './src/components/CockpitPanel';
import CreativeSuite from './src/components/CreativeSuite';
import Sassy from './src/components/Sassy';
import MediaGallery from './src/components/MediaGallery';
import AvatarStudio from './src/components/AvatarStudio';
import VesperAvatar3D from './src/components/VesperAvatar3D';
import IntegrationsHub from './src/components/IntegrationsHub';
import BackgroundStudio from './src/components/BackgroundStudio';

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

// ─── Slash Command Definitions ───────────────────────────────────────────────
const SLASH_CMD_LIST = [
  { cmd: '/task',    icon: '📋', desc: 'Quick add a task',          hint: '/task Plan sprint review' },
  { cmd: '/remember',icon: '🧠', desc: 'Save something to memory',  hint: '/remember Standup is 9am' },
  { cmd: '/search',  icon: '🔍', desc: 'Jump to research + search', hint: '/search quantum computing' },
  { cmd: '/focus',   icon: '🎯', desc: 'Start Focus / Pomodoro mode', hint: '/focus' },
  { cmd: '/export',  icon: '📦', desc: 'Export current chat',        hint: '/export' },
  { cmd: '/stats',   icon: '📊', desc: 'View your stats',             hint: '/stats' },
];

// ─── Vesper Personality Quips ────────────────────────────────────────────────
const VESPER_QUIPS = {
  taskDone:    ['⚡ Task obliterated. You\'re on fire.', '✅ Done deal. Vesper approves.', '💫 Check! Another one bites the dust.', '🔥 That\'s how it\'s done. Boom.', '🎯 Mission accomplished.', '✨ Tick. You magnificent human.'],
  taskAdded:   ['📋 Task locked and loaded.', '⚙️ Added to the matrix. Let\'s get it.', '🎯 New target acquired.', '📌 Pinned. Don\'t ghost it.'],
  memoryAdded: ['🧠 Locked in. Vesper won\'t forget.', '💾 Stored in the vault.', '🗝️ Memory crystal archived.', '✨ Remembered. Forever.'],
  focusStart:  ['🎯 Focus mode: ACTIVATED. No distractions.', '⏲️ 25 minutes. You\'ve got this.', '🔥 All systems focused. Let\'s GO.', '🧠 Deep work mode. Vesper is watching over you.'],
  focusDone:   ['🎉 Work session complete! Take your break.', '✨ Pomodoro CRUSHED. Rest up.', '🔥 Session done. Vesper is proud.', '💫 That\'s 25 focused minutes. Beautiful.'],
  breakDone:   ['🎯 Break over — back to domination.', '⚡ Recharged. Let\'s go again.', '💫 Back in the zone.', '🔥 Break\'s done. Finish what you started.'],
};

// ─── Theme Helpers ─────────────────────────────────────────────────────────
const hexToRgb = (hex) => {
  if (!hex || !hex.startsWith('#')) return '0, 255, 255';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
};

// ─── Theme Categories & Massive Theme Catalog ─────────────────────────────
const THEME_CATEGORIES = [
  { id: 'packages', label: '✨ Theme Packages', desc: 'Full immersive visual worlds — textures, fonts, animations & all' },
  { id: 'tech', label: '⚡ Tech & Cyber', desc: 'High-tech neon vibes' },
  { id: 'soft', label: '🌸 Soft & Minimal', desc: 'Clean, gentle aesthetics' },
  { id: 'dark', label: '🖤 Dark & Moody', desc: 'Deep shadows, rich tones' },
  { id: 'nature', label: '🌿 Nature & Landscape', desc: 'Earthy, organic hues' },
  { id: 'season', label: '🍂 Seasons', desc: 'Seasonal color palettes' },
  { id: 'holiday', label: '🎄 Holidays', desc: 'Festive celebrations' },
  { id: 'retro', label: '📼 Retro & Vintage', desc: 'Nostalgic throwbacks' },
  { id: 'cosmic', label: '🌌 Cosmic & Fantasy', desc: 'Otherworldly dreamscapes' },
];

const THEMES = [
  // ── THEME PACKAGES ─ Full immersive visual worlds ──────────────────────────
  { id: 'oak-workshop',    label: '🪵 Oak Workshop',    accent: '#d4a855', glow: '#e8b84b', sub: '#a07828', category: 'packages', bg: 'linear-gradient(160deg, #1c0d04 0%, #2a1508 45%, #1a0b03 100%)', panelBg: 'rgba(58,30,10,0.97)',  sound: 'ambient',  scanlines: false, style: 'wood'     },
  { id: 'iron-forge',      label: '⚙️ Iron Forge',      accent: '#a8c4d8', glow: '#c0d8f0', sub: '#6090b0', category: 'packages', bg: 'linear-gradient(160deg, #080d14 0%, #0d1828 50%, #080d14 100%)', panelBg: 'rgba(18,24,38,0.98)', sound: 'digital',  scanlines: false, style: 'metal'    },
  { id: 'deep-rainforest', label: '🌴 Deep Rainforest', accent: '#34d058', glow: '#22bb44', sub: '#16803a', category: 'packages', bg: 'linear-gradient(160deg, #030d05 0%, #061508 45%, #030b04 100%)', panelBg: 'rgba(10,32,14,0.97)',  sound: 'nature',   scanlines: false, style: 'forest'   },
  { id: 'ocean-abyss',     label: '🌊 Ocean Abyss',     accent: '#38bdf8', glow: '#0ea5e9', sub: '#0369a1', category: 'packages', bg: 'linear-gradient(180deg, #010610 0%, #000b1e 50%, #000814 100%)', panelBg: 'rgba(6,16,40,0.97)',   sound: 'ambient',  scanlines: false, style: 'ocean'    },
  { id: 'volcanic-forge',  label: '🌋 Volcanic Forge',  accent: '#f97316', glow: '#ea580c', sub: '#b91c1c', category: 'packages', bg: 'linear-gradient(160deg, #0d0200 0%, #1a0300 50%, #0d0100 100%)', panelBg: 'rgba(44,14,4,0.98)',   sound: 'dark',     scanlines: false, style: 'volcanic' },
  { id: 'arctic-glass',    label: '🧊 Arctic Glass',    accent: '#bae6fd', glow: '#e0f2fe', sub: '#7dd3fc', category: 'packages', bg: 'linear-gradient(180deg, #030c18 0%, #051020 50%, #030c18 100%)', panelBg: 'rgba(12,24,46,0.88)',  sound: 'ambient',  scanlines: false, style: 'arctic'   },

  // ── TECH & CYBER ──────────────────────────────────
  { id: 'cyan', label: 'Cyan Matrix', accent: '#00ffff', glow: '#00fff2', sub: '#00ff88', category: 'tech', bg: 'linear-gradient(135deg, #000a0f, #001a1a)', panelBg: 'rgba(0,0,0,0.75)', sound: 'digital', scanlines: true },
  { id: 'green', label: 'Neon Green', accent: '#00ff00', glow: '#00ff00', sub: '#00dd00', category: 'tech', bg: 'linear-gradient(135deg, #000800, #001a00)', panelBg: 'rgba(0,5,0,0.75)', sound: 'digital', scanlines: true },
  { id: 'purple', label: 'Purple Haze', accent: '#c084fc', glow: '#a855f7', sub: '#7c3aed', category: 'tech', bg: 'linear-gradient(135deg, #0a0015, #150025)', panelBg: 'rgba(10,0,20,0.75)', sound: 'synth' },
  { id: 'blue', label: 'Electric Blue', accent: '#5ad7ff', glow: '#4ba3ff', sub: '#3b82f6', category: 'tech', bg: 'linear-gradient(135deg, #000a1a, #001030)', panelBg: 'rgba(0,5,15,0.75)', sound: 'digital' },
  { id: 'pink', label: 'Cyber Pink', accent: '#ff6ad5', glow: '#ff8bd7', sub: '#ff4db8', category: 'tech', bg: 'linear-gradient(135deg, #1a0012, #200018)', panelBg: 'rgba(15,0,10,0.75)', sound: 'synth' },
  { id: 'orange', label: 'Solar Flare', accent: '#ff8800', glow: '#ff9933', sub: '#ff6600', category: 'tech', bg: 'linear-gradient(135deg, #1a0c00, #201000)', panelBg: 'rgba(10,5,0,0.75)', sound: 'digital' },
  { id: 'red', label: 'Blood Moon', accent: '#ff0044', glow: '#ff3366', sub: '#cc0033', category: 'tech', bg: 'linear-gradient(135deg, #1a0008, #200010)', panelBg: 'rgba(15,0,5,0.75)', sound: 'dark' },
  { id: 'lime', label: 'Toxic Waste', accent: '#c0ff00', glow: '#d4ff33', sub: '#a8cc00', category: 'tech', bg: 'linear-gradient(135deg, #0a0d00, #141a00)', panelBg: 'rgba(5,8,0,0.75)', sound: 'digital', scanlines: true },
  { id: 'hacker', label: 'Hacker Terminal', accent: '#33ff33', glow: '#00ff00', sub: '#009900', category: 'tech', bg: '#000000', panelBg: 'rgba(0,0,0,0.9)', sound: 'digital', scanlines: true },
  { id: 'vaporwave', label: 'Vaporwave', accent: '#ff71ce', glow: '#01cdfe', sub: '#b967ff', category: 'tech', bg: 'linear-gradient(180deg, #1a0033, #000033, #330033)', panelBg: 'rgba(10,0,20,0.7)', sound: 'synth' },

  // ── SOFT & MINIMAL ────────────────────────────────
  { id: 'rose', label: 'Rose Quartz', accent: '#f4a4b8', glow: '#f9c4d2', sub: '#e8849c', category: 'soft', bg: 'linear-gradient(135deg, #1a0f12, #1a1015)', panelBg: 'rgba(20,10,14,0.8)', sound: 'ambient', scanlines: false },
  { id: 'lavender', label: 'Lavender Dream', accent: '#b8a9e8', glow: '#d1c4f0', sub: '#9b8bd4', category: 'soft', bg: 'linear-gradient(135deg, #100d18, #15102a)', panelBg: 'rgba(12,8,20,0.8)', sound: 'ambient', scanlines: false },
  { id: 'cream', label: 'Warm Cream', accent: '#e8c99b', glow: '#f0dab8', sub: '#d4aa70', category: 'soft', bg: 'linear-gradient(135deg, #18140c, #1a150d)', panelBg: 'rgba(18,14,8,0.8)', sound: 'ambient', scanlines: false },
  { id: 'sage', label: 'Sage Mist', accent: '#8fb89a', glow: '#a8d0b3', sub: '#6a9c78', category: 'soft', bg: 'linear-gradient(135deg, #0c140e, #0e180f)', panelBg: 'rgba(8,14,10,0.8)', sound: 'nature', scanlines: false },
  { id: 'peach', label: 'Peach Blossom', accent: '#ffb399', glow: '#ffc8b3', sub: '#ff9977', category: 'soft', bg: 'linear-gradient(135deg, #1a120c, #1e1410)', panelBg: 'rgba(16,10,8,0.8)', sound: 'ambient', scanlines: false },
  { id: 'cloud', label: 'Cloud Nine', accent: '#b8d4e3', glow: '#d0e8f5', sub: '#90b8d0', category: 'soft', bg: 'linear-gradient(135deg, #0c1218, #101820)', panelBg: 'rgba(8,12,18,0.8)', sound: 'ambient', scanlines: false },
  { id: 'blush', label: 'Blush Pink', accent: '#e89bb0', glow: '#f0b8c8', sub: '#d47890', category: 'soft', bg: 'linear-gradient(135deg, #180c10, #1c1014)', panelBg: 'rgba(16,8,12,0.8)', sound: 'ambient', scanlines: false },

  // ── DARK & MOODY ──────────────────────────────────
  { id: 'gold', label: 'Golden Hour', accent: '#ffd700', glow: '#ffed4e', sub: '#ffb700', category: 'dark', bg: 'linear-gradient(135deg, #0d0a00, #1a1400)', panelBg: 'rgba(8,6,0,0.8)', sound: 'ambient' },
  { id: 'ice', label: 'Arctic Frost', accent: '#e0f7ff', glow: '#b3e5fc', sub: '#81d4fa', category: 'dark', bg: 'linear-gradient(135deg, #060a0f, #0a1018)', panelBg: 'rgba(4,8,12,0.85)', sound: 'wind' },
  { id: 'teal', label: 'Deep Ocean', accent: '#00d9ff', glow: '#00bcd4', sub: '#0097a7', category: 'dark', bg: 'linear-gradient(135deg, #000d12, #001418)', panelBg: 'rgba(0,8,12,0.85)', sound: 'ocean' },
  { id: 'violet', label: 'Midnight Violet', accent: '#9d00ff', glow: '#b24bf3', sub: '#7b00cc', category: 'dark', bg: 'linear-gradient(135deg, #0a0018, #120024)', panelBg: 'rgba(8,0,16,0.85)', sound: 'dark' },
  { id: 'obsidian', label: 'Obsidian', accent: '#888888', glow: '#aaaaaa', sub: '#666666', category: 'dark', bg: '#050505', panelBg: 'rgba(8,8,8,0.9)', sound: 'dark', scanlines: false },
  { id: 'ember', label: 'Dying Ember', accent: '#ff4400', glow: '#ff6633', sub: '#cc3300', category: 'dark', bg: 'linear-gradient(135deg, #0d0200, #1a0500)', panelBg: 'rgba(10,2,0,0.85)', sound: 'fire' },
  { id: 'abyss', label: 'Abyss', accent: '#4466ff', glow: '#6688ff', sub: '#2244cc', category: 'dark', bg: 'linear-gradient(135deg, #000008, #000012)', panelBg: 'rgba(0,0,8,0.9)', sound: 'dark' },
  { id: 'noir', label: 'Film Noir', accent: '#d4c5a0', glow: '#e8dcc0', sub: '#b8a880', category: 'dark', bg: '#080808', panelBg: 'rgba(6,6,6,0.9)', sound: 'jazz', scanlines: false },

  // ── NATURE & LANDSCAPE ────────────────────────────
  { id: 'forest', label: 'Forest Canopy', accent: '#4caf50', glow: '#66cc6a', sub: '#388e3c', category: 'nature', bg: 'linear-gradient(180deg, #020d02, #041a04, #021002)', panelBg: 'rgba(2,10,2,0.8)', sound: 'forest', scanlines: false },
  { id: 'ocean', label: 'Pacific Depths', accent: '#0288d1', glow: '#29b6f6', sub: '#0277bd', category: 'nature', bg: 'linear-gradient(180deg, #000a14, #001828, #000a14)', panelBg: 'rgba(0,6,14,0.8)', sound: 'ocean', scanlines: false },
  { id: 'desert', label: 'Desert Sand', accent: '#e6a855', glow: '#f0c478', sub: '#cc8833', category: 'nature', bg: 'linear-gradient(180deg, #1a1000, #201808, #1a1000)', panelBg: 'rgba(16,10,0,0.8)', sound: 'wind', scanlines: false },
  { id: 'aurora', label: 'Northern Lights', accent: '#00e676', glow: '#69f0ae', sub: '#00c853', category: 'nature', bg: 'linear-gradient(180deg, #000510, #001020, #050018)', panelBg: 'rgba(0,4,10,0.75)', sound: 'wind', scanlines: false },
  { id: 'volcano', label: 'Volcanic', accent: '#ff5722', glow: '#ff7043', sub: '#e64a19', category: 'nature', bg: 'linear-gradient(180deg, #100200, #1a0500, #0d0100)', panelBg: 'rgba(10,2,0,0.85)', sound: 'fire', scanlines: false },
  { id: 'meadow', label: 'Spring Meadow', accent: '#7cb342', glow: '#9ccc65', sub: '#558b2f', category: 'nature', bg: 'linear-gradient(135deg, #040a02, #081004)', panelBg: 'rgba(4,8,2,0.8)', sound: 'nature', scanlines: false },
  { id: 'mountain', label: 'Mountain Peak', accent: '#90a4ae', glow: '#b0bec5', sub: '#607d8b', category: 'nature', bg: 'linear-gradient(180deg, #060810, #0a0e16, #060810)', panelBg: 'rgba(6,8,12,0.85)', sound: 'wind', scanlines: false },

  // ── SEASONS ───────────────────────────────────────
  { id: 'springbloom', label: 'Spring Bloom', accent: '#ff80ab', glow: '#ff99bb', sub: '#ff4081', category: 'season', bg: 'linear-gradient(135deg, #120810, #180c14)', panelBg: 'rgba(12,6,10,0.8)', sound: 'nature', scanlines: false },
  { id: 'summersky', label: 'Summer Sky', accent: '#00b0ff', glow: '#40c4ff', sub: '#0091ea', category: 'season', bg: 'linear-gradient(180deg, #000814, #001028, #000814)', panelBg: 'rgba(0,6,14,0.75)', sound: 'ocean', scanlines: false },
  { id: 'autumn', label: 'Autumn Harvest', accent: '#ff9800', glow: '#ffb74d', sub: '#f57c00', category: 'season', bg: 'linear-gradient(135deg, #140a00, #1a0e02)', panelBg: 'rgba(14,8,0,0.8)', sound: 'wind', scanlines: false },
  { id: 'winter', label: 'Winter Frost', accent: '#b3e5fc', glow: '#e1f5fe', sub: '#81d4fa', category: 'season', bg: 'linear-gradient(180deg, #080c10, #0e1218, #080c10)', panelBg: 'rgba(6,8,12,0.85)', sound: 'wind', scanlines: false },
  { id: 'monsoon', label: 'Monsoon', accent: '#5c6bc0', glow: '#7986cb', sub: '#3f51b5', category: 'season', bg: 'linear-gradient(180deg, #060810, #0a0e1a, #060810)', panelBg: 'rgba(4,6,12,0.85)', sound: 'rain', scanlines: false },

  // ── HOLIDAYS ──────────────────────────────────────
  { id: 'christmas', label: 'Christmas', accent: '#ff1744', glow: '#ff5252', sub: '#00c853', category: 'holiday', bg: 'linear-gradient(135deg, #0a0000, #000a04)', panelBg: 'rgba(8,2,2,0.85)', sound: 'bells', scanlines: false },
  { id: 'halloween', label: 'Halloween', accent: '#ff9100', glow: '#ffab40', sub: '#9c27b0', category: 'holiday', bg: 'linear-gradient(135deg, #0d0600, #100008)', panelBg: 'rgba(10,4,0,0.85)', sound: 'spooky', scanlines: false },
  { id: 'valentine', label: 'Valentine', accent: '#ff1744', glow: '#ff5252', sub: '#ff80ab', category: 'holiday', bg: 'linear-gradient(135deg, #180008, #200010)', panelBg: 'rgba(16,0,6,0.85)', sound: 'ambient', scanlines: false },
  { id: 'newyear', label: 'New Year\'s Eve', accent: '#ffd740', glow: '#ffe57f', sub: '#ffc400', category: 'holiday', bg: 'linear-gradient(180deg, #080600, #0a0800, #060400)', panelBg: 'rgba(6,4,0,0.85)', sound: 'bells' },
  { id: 'stpatricks', label: 'St. Patrick\'s', accent: '#00e676', glow: '#69f0ae', sub: '#00c853', category: 'holiday', bg: 'linear-gradient(135deg, #001a06, #002a0a)', panelBg: 'rgba(0,12,4,0.85)', sound: 'nature', scanlines: false },
  { id: 'fourthjuly', label: '4th of July', accent: '#ff1744', glow: '#2979ff', sub: '#e0e0e0', category: 'holiday', bg: 'linear-gradient(180deg, #0a0000, #000010, #0a0000)', panelBg: 'rgba(6,0,6,0.85)', sound: 'ambient' },
  { id: 'easter', label: 'Easter', accent: '#ab47bc', glow: '#ce93d8', sub: '#80cbc4', category: 'holiday', bg: 'linear-gradient(135deg, #0e0814, #080e10)', panelBg: 'rgba(10,6,12,0.8)', sound: 'nature', scanlines: false },
  { id: 'thanksgiving', label: 'Thanksgiving', accent: '#d4a056', glow: '#e8b870', sub: '#c08040', category: 'holiday', bg: 'linear-gradient(135deg, #140c04, #1a1008)', panelBg: 'rgba(14,10,4,0.85)', sound: 'ambient', scanlines: false },

  // ── RETRO & VINTAGE ───────────────────────────────
  { id: 'synthwave', label: 'Synthwave', accent: '#ff2a6d', glow: '#ff6b9d', sub: '#05d9e8', category: 'retro', bg: 'linear-gradient(180deg, #0d0021, #1a0035, #0d0021)', panelBg: 'rgba(10,0,18,0.8)', sound: 'synth' },
  { id: 'retrogame', label: 'Retro Arcade', accent: '#ffeb3b', glow: '#fff176', sub: '#f44336', category: 'retro', bg: '#050005', panelBg: 'rgba(5,0,5,0.9)', sound: 'retro', scanlines: true },
  { id: 'terminal', label: 'Amber Terminal', accent: '#ffb000', glow: '#ffc844', sub: '#cc8800', category: 'retro', bg: '#000000', panelBg: 'rgba(0,0,0,0.9)', sound: 'digital', scanlines: true },
  { id: 'crt', label: 'CRT Green', accent: '#33ff33', glow: '#66ff66', sub: '#00cc00', category: 'retro', bg: '#000200', panelBg: 'rgba(0,2,0,0.9)', sound: 'digital', scanlines: true },
  { id: 'sepia', label: 'Sepia Film', accent: '#c8a874', glow: '#d8c098', sub: '#b08850', category: 'retro', bg: 'linear-gradient(135deg, #0e0a04, #140e08)', panelBg: 'rgba(10,8,4,0.85)', sound: 'jazz', scanlines: false },

  // ── COSMIC & FANTASY ──────────────────────────────
  { id: 'nebula', label: 'Nebula', accent: '#e040fb', glow: '#ea80fc', sub: '#aa00ff', category: 'cosmic', bg: 'linear-gradient(135deg, #08001a, #1a0030, #08001a)', panelBg: 'rgba(6,0,14,0.8)', sound: 'cosmic' },
  { id: 'stardust', label: 'Stardust', accent: '#e0e0e0', glow: '#fafafa', sub: '#9e9e9e', category: 'cosmic', bg: 'linear-gradient(180deg, #000004, #020208, #000004)', panelBg: 'rgba(2,2,6,0.85)', sound: 'cosmic', scanlines: false },
  { id: 'galaxy', label: 'Galaxy Core', accent: '#7c4dff', glow: '#b388ff', sub: '#651fff', category: 'cosmic', bg: 'linear-gradient(135deg, #040010, #0a0020, #040010)', panelBg: 'rgba(4,0,10,0.8)', sound: 'cosmic' },
  { id: 'enchanted', label: 'Enchanted Forest', accent: '#69f0ae', glow: '#b9f6ca', sub: '#00e676', category: 'cosmic', bg: 'linear-gradient(180deg, #000a04, #001a0a, #000a04)', panelBg: 'rgba(0,8,4,0.8)', sound: 'forest', scanlines: false },
  { id: 'dragonfire', label: 'Dragon Fire', accent: '#ff6e40', glow: '#ff9e80', sub: '#dd2c00', category: 'cosmic', bg: 'linear-gradient(180deg, #0a0200, #140400, #0a0200)', panelBg: 'rgba(8,2,0,0.85)', sound: 'fire' },
  { id: 'twilight', label: 'Twilight Zone', accent: '#7e57c2', glow: '#b39ddb', sub: '#512da8', category: 'cosmic', bg: 'linear-gradient(180deg, #06040e, #0e0818, #06040e)', panelBg: 'rgba(6,4,10,0.85)', sound: 'dark', scanlines: false },
];

const NAV = [
  { id: 'chat', label: 'Neural Chat', icon: HubRounded },
  { id: 'research', label: 'Research Tools', icon: ScienceRounded },
  { id: 'documents', label: 'Documents', icon: DownloadIcon },
  { id: 'memory', label: 'Memory Core', icon: StorageRounded },
  { id: 'tasks', label: 'Task Matrix', icon: ChecklistRounded },
  { id: 'nyxshift', label: 'Creative Suite', icon: AutoStories },
  { id: 'gallery', label: 'Media Gallery', icon: PhotoLibrary },
  { id: 'sassy', label: 'Vesper\'s Wardrobe', icon: Checkroom },
  { id: 'integrations', label: 'Command Center', icon: BoltRounded },
  { id: 'analytics', label: 'Analytics', icon: BarChart },
  { id: 'personality', label: 'Personality', icon: Person },
  { id: 'settings', label: 'Settings', icon: SettingsRounded },
];

// ─── Voice Persona Assigner Component ──────────────────────────────────
function PersonaAssigner({ apiBase, cloudVoices, setToast, playVoicePreview }) {
  const [personas, setPersonas] = React.useState(null);
  const [saving, setSaving] = React.useState('');
  const [personasError, setPersonasError] = React.useState(false);

  const loadPersonas = React.useCallback(async () => {
    setPersonas(null);
    setPersonasError(false);
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const r = await fetch(`${apiBase}/api/voice/personas`);
        const d = await r.json();
        setPersonas(d.personas || {});
        return;
      } catch (e) {
        if (attempt < 3) await new Promise(r => setTimeout(r, 2000 * attempt));
      }
    }
    setPersonasError(true);
  }, [apiBase]);

  React.useEffect(() => { loadPersonas(); }, [apiBase]);

  const assignVoice = async (personaId, voiceId) => {
    setSaving(personaId);
    try {
      const res = await fetch(`${apiBase}/api/voice/personas`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona_id: personaId, voice_id: voiceId }),
      });
      const data = await res.json();
      if (data.success) {
        setPersonas(prev => ({ ...prev, [personaId]: { ...prev[personaId], voice_id: voiceId } }));
        const voiceName = voiceId ? (cloudVoices.find(v => v.id === voiceId)?.name || voiceId) : 'Default';
        setToast(`✅ ${personas[personaId]?.label}: ${voiceName}`);
      } else {
        setToast('Failed: ' + (data.error || 'Unknown'));
      }
    } catch (e) { setToast('Error: ' + e.message); }
    setSaving('');
  };

  if (personasError) return (
    <Box>
      <Typography variant="caption" sx={{ color: 'rgba(255,100,100,0.7)' }}>⚠️ Could not load personas</Typography>
      <Box onClick={loadPersonas} sx={{ mt: 0.5, cursor: 'pointer', color: 'var(--accent)', fontSize: '0.7rem', textDecoration: 'underline' }}>↻ Retry</Box>
    </Box>
  );
  if (!personas) return <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>⏳ Loading personas...</Typography>;

  return (
    <Stack spacing={1}>
      {Object.entries(personas).map(([id, p]) => {
        const currentVoice = cloudVoices.find(v => v.id === p.voice_id);
        return (
          <Box key={id} sx={{
            p: 1.5, borderRadius: 2,
            border: p.voice_id ? '1px solid rgba(0,255,136,0.3)' : '1px solid rgba(255,255,255,0.1)',
            bgcolor: p.voice_id ? 'rgba(0,255,136,0.04)' : 'rgba(255,255,255,0.02)',
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: p.voice_id ? '#00ff88' : 'rgba(255,255,255,0.7)' }}>
                {p.icon} {p.label}
              </Typography>
              {saving === id && <CircularProgress size={14} sx={{ color: 'var(--accent)' }} />}
            </Box>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', display: 'block', mb: 1 }}>
              {p.description}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              <select
                value={p.voice_id || ''}
                onChange={(e) => assignVoice(id, e.target.value)}
                style={{
                  flex: 1,
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(0,255,255,0.3)',
                  borderRadius: 6,
                  padding: '6px 10px',
                  color: currentVoice ? '#00ff88' : 'rgba(255,255,255,0.5)',
                  fontSize: '0.8rem',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="" style={{ background: '#111', color: '#999' }}>Default (uses main voice)</option>
                {cloudVoices.map(v => (
                  <option key={v.id} value={v.id} style={{ background: '#111', color: '#ffbb44' }}>
                    {v.name} — {v.locale || 'American'} • {v.style || 'neural'}
                  </option>
                ))}
              </select>
              {currentVoice?.preview_url && playVoicePreview && (
                <button
                  onClick={() => playVoicePreview(currentVoice.preview_url)}
                  title="Preview voice"
                  style={{
                    background: 'rgba(0,255,255,0.1)',
                    border: '1px solid rgba(0,255,255,0.3)',
                    borderRadius: 6, padding: '4px 8px',
                    color: 'var(--accent)', cursor: 'pointer', fontSize: '0.9rem',
                  }}
                >▶</button>
              )}
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}

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
  const [threadMenuAnchor, setThreadMenuAnchor] = useState(null);
  const [threadMenuThread, setThreadMenuThread] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [themeMenuAnchor, setThemeMenuAnchor] = useState(null);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', status: 'inbox', priority: 'medium', dueDate: '' });
  const [toast, setToast] = useState('');
  const [toastVariant, setToastVariant] = useState('default'); // 'default' | 'success' | 'celebrate' | 'warn'
  // Stats & Insights
  const [vesperStats, setVesperStats] = useState(() => {
    try {
      const s = localStorage.getItem('vesper_stats');
      return s ? JSON.parse(s) : { messages: 0, tasksCompleted: 0, memories: 0, daysActive: 0, lastActive: null, streak: 0 };
    } catch { return { messages: 0, tasksCompleted: 0, memories: 0, daysActive: 0, lastActive: null, streak: 0 }; }
  });
  // Focus Mode
  const [focusMode, setFocusMode] = useState(false);
  const [focusTask, setFocusTask] = useState(null); // task object | null
  const [focusTimeLeft, setFocusTimeLeft] = useState(25 * 60); // seconds
  const [focusPhase, setFocusPhase] = useState('work'); // 'work' | 'break'
  const [focusRunning, setFocusRunning] = useState(false);
  // Slash commands
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashIdx, setSlashIdx] = useState(0);
  // Keyboard shortcuts modal
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(() => safeStorageGet('vesper_tts_enabled', 'true') === 'true');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedVoiceName, setSelectedVoiceName] = useState(() => safeStorageGet('vesper_tts_voice', ''));
  const [showVoiceSelector, setShowVoiceSelector] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [abortController, setAbortController] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(() => safeStorageGet('vesper_sound_enabled', 'true') === 'true');
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [uiScale, setUiScale] = useState(() => parseFloat(safeStorageGet('vesper_ui_scale', '1')));
  const [showSystemStatus, setShowSystemStatus] = useState(true);

  // ── New features: Model Picker, Auto-speak, Export ─────────────
  const [selectedModel, setSelectedModel] = useState(() => safeStorageGet('vesper_model', 'auto'));
  const [availableModels, setAvailableModels] = useState([]);
  const [autoSpeak, setAutoSpeak] = useState(() => safeStorageGet('vesper_auto_speak', 'true') === 'true');
  const [streamingMessageId, setStreamingMessageId] = useState(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [thinkingStatus, setThinkingStatus] = useState('');
  const previewAudioRef = useRef(null);

  // ── Vesper Autonomy: Daily Identity + Proactive Initiative ─────
  const [vesperIdentity, setVesperIdentity] = useState(null);
  const [vesperGreeting, setVesperGreeting] = useState('');
  const [vesperInitiatives, setVesperInitiatives] = useState([]);
  const [identityOptions, setIdentityOptions] = useState(null);

  // 3D Avatar System
  const [avatarStudioOpen, setAvatarStudioOpen] = useState(false);
  const [activeAvatarData, setActiveAvatarData] = useState(null);

  // Background Studio
  const [backgroundStudioOpen, setBackgroundStudioOpen] = useState(false);
  const [customBackground, setCustomBackground] = useState(() => {
    try { const s = localStorage.getItem('vesper_custom_bg'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [backgroundGallery, setBackgroundGallery] = useState([]);
  const [backgroundSettings, setBackgroundSettings] = useState(() => {
    try { const s = localStorage.getItem('vesper_bg_settings'); return s ? JSON.parse(s) : { opacity: 0.3, blur: 0, overlay: true }; } catch { return { opacity: 0.3, blur: 0, overlay: true }; }
  });

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
  const [voiceLabOpen, setVoiceLabOpen] = useState(false);
  const [voiceLabTab, setVoiceLabTab] = useState('sfx');
  const TOOLS = [
    { id: 'research', label: 'Deep Research', icon: '🔬' },
    { id: 'graph', label: 'Knowledge Graph', icon: '🕸️' },
    { id: 'videos', label: 'Create videos', icon: '🎬' },
    { id: 'images', label: 'Create images', icon: '🎨' },
    { id: 'canvas', label: 'Canvas', icon: '📐' },
    { id: 'learning', label: 'Guided Learning', icon: '📚' },
    { id: 'enterWorld', label: 'Enter World', icon: '🏰' },
    { id: 'sfx', label: 'Sound Effects', icon: '🔊' },
    { id: 'voiceClone', label: 'Voice Clone', icon: '🎙️' },
    { id: 'voiceIsolate', label: 'Voice Isolate', icon: '🎛️' },
    { id: 'voicePersonas', label: 'Voice Personas', icon: '🎭' },
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
    chatBoxHeight: localStorage.getItem('vesper_chat_box_height') || '55vh', // Resizable chat height
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

  // ── Global keyboard shortcuts ─────────────────────────────────────────────
  useEffect(() => {
    const NAV_SECTIONS = ['chat', 'research', 'memory', 'tasks', 'settings'];
    const handler = (e) => {
      // Ignore if any input focused (except Escape)
      const tag = document.activeElement?.tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable;
      if (e.key === 'Escape') {
        setShortcutsOpen(false);
        setSlashMenuOpen(false);
        setFocusMode(false);
        return;
      }
      if (inInput) return;
      if (e.ctrlKey && !e.shiftKey && !e.altKey) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 5) { e.preventDefault(); setActiveSection(NAV_SECTIONS[num - 1]); return; }
        if (e.key === '/') { e.preventDefault(); setShortcutsOpen(p => !p); return; }
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'F') { e.preventDefault(); setFocusMode(p => !p); return; }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Apply theme background to body when theme changes
  useEffect(() => {
    document.body.style.background = activeTheme.bg || '#000';
    // Set data-style on body and html for global CSS targeting
    document.body.dataset.style = activeTheme.style || 'cyber';
    document.documentElement.dataset.style = activeTheme.style || 'cyber';
    // Also set CSS vars on :root for elements outside app-shell (modals, popovers)
    const root = document.documentElement;
    root.style.setProperty('--accent-rgb', hexToRgb(activeTheme.accent));
    root.style.setProperty('--glow-rgb', hexToRgb(activeTheme.glow));
    root.style.setProperty('--accent', activeTheme.accent);
    root.style.setProperty('--glow', activeTheme.glow);
    root.style.setProperty('--panel-bg', activeTheme.panelBg || 'rgba(0,0,0,0.75)');
  }, [activeTheme]);
  
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
  // ── Vesper react helper + stat tracker ──────────────────────────────────
  const showToast = useCallback((msg, variant = 'default') => {
    setToastVariant(variant);
    setToast(msg);
  }, []);

  const vesperReact = useCallback((type, override) => {
    const quips = VESPER_QUIPS[type];
    const msg = override || (quips ? quips[Math.floor(Math.random() * quips.length)] : null);
    if (msg) showToast(msg, type === 'taskDone' ? 'celebrate' : type === 'focusDone' ? 'celebrate' : 'success');
  }, [showToast]);

  const bumpStat = useCallback((key) => {
    setVesperStats(prev => {
      const today = new Date().toDateString();
      const isNewDay = prev.lastActive !== today;
      const updated = {
        ...prev,
        [key]: (prev[key] || 0) + 1,
        lastActive: today,
        daysActive: isNewDay ? (prev.daysActive || 0) + 1 : (prev.daysActive || 0),
        streak: isNewDay ? (prev.streak || 0) + 1 : (prev.streak || 0),
      };
      try { localStorage.setItem('vesper_stats', JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  // ── Focus mode timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!focusRunning) return;
    const tick = setInterval(() => {
      setFocusTimeLeft(t => {
        if (t <= 1) {
          clearInterval(tick);
          setFocusRunning(false);
          if (focusPhase === 'work') {
            bumpStat('tasksCompleted');
            vesperReact('focusDone');
            setFocusPhase('break');
            setFocusTimeLeft(5 * 60);
          } else {
            vesperReact('breakDone');
            setFocusPhase('work');
            setFocusTimeLeft(25 * 60);
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [focusRunning, focusPhase, bumpStat, vesperReact]);

  const exportTasks = useCallback(async () => {
    const done  = tasks.filter(t => t.status === 'done');
    const doing = tasks.filter(t => t.status === 'doing');
    const inbox = tasks.filter(t => t.status === 'inbox');
    let md = `# Vesper Task Export\n_${new Date().toLocaleString()}_\n\n`;
    if (doing.length) { md += `## 🔥 In Progress (${doing.length})\n`; doing.forEach(t => { md += `- [ ] **${t.title}**\n`; }); md += '\n'; }
    if (inbox.length) { md += `## 📥 Inbox (${inbox.length})\n`; inbox.forEach(t => { md += `- [ ] ${t.title}\n`; }); md += '\n'; }
    if (done.length)  { md += `## ✅ Done (${done.length})\n`;  done.forEach(t  => { md += `- [x] ${t.title}\n`; }); }
    try {
      await navigator.clipboard.writeText(md);
      showToast(`📦 ${tasks.length} tasks copied to clipboard!`, 'success');
    } catch { showToast('⚠️ Clipboard access denied'); }
  }, [tasks, showToast]);

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
      const newHeight = Math.max(150, Math.min(window.innerHeight - 240, startHeight + deltaY)); // Min 150px, max viewport - 240px
      
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
    // Relative to current origin — works with Vercel rewrites, nginx proxy, and any host
    return typeof window !== 'undefined' ? window.location.origin : '';
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
    // Relative to current origin — works with Vercel rewrites, nginx proxy, and any host
    return typeof window !== 'undefined' ? window.location.origin : '';
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

  // ── Background auto-rotation ──
  useEffect(() => {
    try {
      const saved = localStorage.getItem('vesper_bg_rotate');
      if (!saved) return;
      const { enabled, interval } = JSON.parse(saved);
      if (!enabled || !interval || backgroundGallery.length === 0) return;
      
      const timer = setInterval(() => {
        const all = backgroundGallery.length > 0 ? backgroundGallery : [];
        if (all.length === 0) return;
        const pick = all[Math.floor(Math.random() * all.length)];
        setCustomBackground({ id: pick.id, url: pick.url, name: pick.name, category: pick.category || 'custom' });
        try { localStorage.setItem('vesper_custom_bg', JSON.stringify({ id: pick.id, url: pick.url, name: pick.name, category: pick.category })); } catch (e) {}
      }, (interval || 30) * 60 * 1000);
      
      return () => clearInterval(timer);
    } catch (e) {}
  }, [backgroundGallery]);

  // ── Vesper Autonomy: Fetch daily identity + proactive greeting on load ──
  useEffect(() => {
    const loadVesperIdentity = async () => {
      let identity = null;
      let optionsLoaded = false;

      // Fetch identity options FIRST so the dialog has data when it opens
      try {
        const optRes = await fetch(`${apiBase}/api/vesper/identity/options`);
        if (optRes.ok) {
          setIdentityOptions(await optRes.json());
          optionsLoaded = true;
        }
      } catch (e) { console.log('Identity options fetch skipped:', e.message); }

      try {
        // Fetch daily identity
        const idRes = await fetch(`${apiBase}/api/vesper/identity`);
        if (idRes.ok) {
          identity = await idRes.json();
          setVesperIdentity(identity);
          // Only show identity dialog once options are loaded to prevent crash
          // Identity loads silently — user can adjust in Settings
          void 0;
        }
      } catch (e) { console.log('Identity fetch skipped:', e.message); }
      
      try {
        // Fetch proactive greeting + initiatives
        const initRes = await fetch(`${apiBase}/api/vesper/initiative`);
        if (initRes.ok) {
          const data = await initRes.json();
          if (data.greeting) setVesperGreeting(data.greeting);
          if (data.initiatives?.length) setVesperInitiatives(data.initiatives);
        }
      } catch (e) { console.log('Initiative fetch skipped:', e.message); }

      try {
        // Fetch active avatar data  
        const avRes = await fetch(`${apiBase}/api/avatars`);
        if (avRes.ok) {
          const avData = await avRes.json();
          const active = (avData.avatars || []).find(a => a.id === avData.active);
          if (active) setActiveAvatarData(active);
        }
      } catch (e) {}
    };
    loadVesperIdentity();
  }, [apiBase]);

  // ── Keepalive: ping backend every 4 min to prevent Railway cold starts ──
  useEffect(() => {
    if (!apiBase) return;
    const ping = () => fetch(`${apiBase}/health`, { method: 'GET' }).catch(() => {});
    ping(); // warm it up immediately on mount
    const keepaliveInterval = setInterval(ping, 4 * 60 * 1000);
    return () => clearInterval(keepaliveInterval);
  }, [apiBase]);

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

  const lastMessageCountRef = useRef(0);
  useEffect(() => {
    // Only auto-scroll when messages are ADDED, not when content updates (streaming)
    if (messages.length !== lastMessageCountRef.current) {
      lastMessageCountRef.current = messages.length;
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [messages]);

  // Auto-focus input when switching threads (not on every message update)
  useEffect(() => {
    inputRef.current?.focus();
  }, [currentThreadId]);

  const saveMessageToThread = async (role, content, overrideThreadId) => {
    if (!apiBase) return null;
    try {
      let threadId = overrideThreadId || currentThreadId;
      
      // If no thread, create one
      if (!threadId) {
        // Generate a meaningful initial title from the first message
        const cleanContent = content
          .replace(/\[File:.*?\]/g, '')  // Remove file references
          .replace(/```[\s\S]*?```/g, '') // Remove code blocks
          .replace(/https?:\/\/\S+/g, '') // Remove URLs
          .replace(/\s+/g, ' ')
          .trim();
        // Try to get first sentence
        const sentenceMatch = cleanContent.match(/^(.+?[.?!])\s/);
        let title;
        if (sentenceMatch && sentenceMatch[1].length <= 70) {
          title = sentenceMatch[1];
        } else {
          // Take first ~60 chars, break at word boundary
          const words = cleanContent.split(' ');
          let t = '';
          for (const w of words) {
            if ((t + ' ' + w).length > 60) break;
            t = t ? t + ' ' + w : w;
          }
          title = t || cleanContent.slice(0, 60);
        }
        if (!title || title.length < 3) title = `Chat ${new Date().toLocaleDateString()}`;
        
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

  // ── Vesper Identity Handlers ──
  const handleConfirmIdentity = async (overrides = {}) => {
    try {
      const res = await fetch(`${apiBase}/api/vesper/identity/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed: true, ...overrides }),
      });
      if (res.ok) {
        const data = await res.json();
        setVesperIdentity(data.identity || data);
        setToast(`✨ Vesper locked in today's vibe!`);
      }
    } catch (e) { console.error('Confirm identity failed:', e); }
  };

  const handleRerollIdentity = async () => {
    try {
      const res = await fetch(`${apiBase}/api/vesper/identity/reroll`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setVesperIdentity(data.identity || data);
        setToast('🎲 Vesper rerolled her vibe!');
      }
    } catch (e) { console.error('Reroll identity failed:', e); }
  };

  const sendMessage = async () => {
    if ((!input.trim() && uploadedImages.length === 0) || loading) return;
    const userMessage = input.trim();
    const currentImages = [...uploadedImages]; // Capture images
    
    setInput('');
    setUploadedImages([]); // Clear UI immediately
    setLoading(true);
    setThinking(true);
    setThinkingStatus('Thinking...');
    bumpStat('messages');
    
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
    
    addLocalMessage('user', localMsg.content, localMsg);
    
    let savedThreadId;
    try {
      savedThreadId = await saveMessageToThread('user', userMessage);
    } catch(e) {
      console.warn('Thread save failed, continuing:', e);
      savedThreadId = currentThreadId;
    }
    
    // Create a placeholder assistant message for streaming
    const streamMsgId = `stream-${Date.now()}-${Math.random()}`;
    setStreamingMessageId(streamMsgId);
    let lastStreamUpdate = 0;
    const STREAM_THROTTLE = 50; // ms — throttle DOM updates during streaming
    
    try {
      const payload = { 
        message: userMessage,
        thread_id: savedThreadId || currentThreadId || 'default',
        images: currentImages.length > 0 ? currentImages.map(img => img.dataUrl) : [],
        model: selectedModel !== 'auto' ? selectedModel : null,
      };

      // ── Use SSE streaming endpoint (with retry for Railway cold starts) ──
      let response;
      let _fetchAttempts = 0;
      while (true) {
        try {
          response = await fetch(`${chatBase}/api/chat/stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });
          if (!response.ok) throw new Error(`Backend returned ${response.status}`);
          break; // success
        } catch (fetchErr) {
          if (fetchErr.name === 'AbortError') throw fetchErr; // user stopped — don't retry
          _fetchAttempts++;
          if (_fetchAttempts >= 3) throw fetchErr; // give up after 3 attempts
          console.warn(`⚡ Connection attempt ${_fetchAttempts} failed, retrying in 3s...`, fetchErr.message);
          setThinkingStatus(`Reconnecting... (${_fetchAttempts}/2)`);
          await new Promise(r => setTimeout(r, 3000));
        }
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedText = '';
      let messageAdded = false;
      let currentProvider = '';
      let currentModel = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // Keep incomplete chunk
        
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            
            if (data.type === 'status') {
              setThinkingStatus(data.content || 'Thinking...');
            } else if (data.type === 'provider') {
              currentProvider = data.provider;
              currentModel = data.model;
            } else if (data.type === 'chunk') {
              accumulatedText += data.content;
              if (!messageAdded) {
                // Add the message on first chunk
                addLocalMessage('assistant', accumulatedText, { id: streamMsgId });
                messageAdded = true;
                setThinking(false);
                setThinkingStatus('');
                lastStreamUpdate = Date.now();
              } else {
                // Throttle DOM updates during streaming to prevent twitching
                const now = Date.now();
                if (now - lastStreamUpdate >= STREAM_THROTTLE) {
                  lastStreamUpdate = now;
                  setMessages(prev => prev.map(m => 
                    m.id === streamMsgId ? { ...m, content: accumulatedText } : m
                  ));
                }
              }
            } else if (data.type === 'visualizations' && data.data) {
              data.data.forEach(viz => {
                if (viz.type === 'chart_visualization') {
                  addLocalMessage('assistant', 'Generated Chart', { type: 'chart', chartData: viz });
                }
              });
            } else if (data.type === 'done') {
              currentProvider = data.provider || currentProvider;
              currentModel = data.model || currentModel;
            } else if (data.type === 'error') {
              if (!messageAdded) {
                addLocalMessage('assistant', data.content || 'Something went wrong.');
                messageAdded = true;
              }
            }
          } catch (parseErr) {
            // Skip malformed SSE chunks
          }
        }
      }
      
      // Finalize — flush last streaming content
      if (messageAdded && accumulatedText) {
        setMessages(prev => prev.map(m => 
          m.id === streamMsgId ? { ...m, content: accumulatedText } : m
        ));
      }
      if (!messageAdded && accumulatedText) {
        addLocalMessage('assistant', accumulatedText);
      }
      
      console.log(`🤖 Streamed response from ${currentProvider} (${accumulatedText.length} chars)`);
      
      // Save assistant response to thread
      if (accumulatedText) {
        await saveMessageToThread('assistant', accumulatedText, savedThreadId);
      }
      
      // Auto-generate a proper topic title for new threads
      const threadToTitle = savedThreadId || currentThreadId;
      if (threadToTitle && accumulatedText) {
        try {
          const titleRes = await fetch(`${apiBase}/api/threads/${threadToTitle}/auto-title`, { method: 'POST' });
          const titleData = await titleRes.json();
          if (titleData.status === 'success' && titleData.title) {
            setCurrentThreadTitle(titleData.title);
            setThreads(prev => prev.map(t => t.id === threadToTitle ? { ...t, title: titleData.title } : t));
          }
        } catch (e) {
          // Auto-title is best-effort, don't block on failure
          console.warn('Auto-title skipped:', e.message);
        }
      }
      
      // Auto-speak the complete response
      if (autoSpeak && accumulatedText) {
        speak(accumulatedText, activeSection === 'chat' ? 'chat' : activeSection === 'research' ? 'research' : 'default');
      }
      playSound('notification');
      
      fetchThreads();
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('🛑 Generation stopped by user');
        return;
      }
      console.error('❌ Chat error:', error);
      playSound('error');
      const errorMsg = "Connection failed after 3 attempts — Railway might still be waking up. Give it a moment and try again!";
      addLocalMessage('assistant', errorMsg);
      await saveMessageToThread('assistant', errorMsg);
      if (autoSpeak) speak(errorMsg);
    } finally {
      setAbortController(null);
      setStreamingMessageId(null);
      setLoading(false);
      setThinking(false);
      setThinkingStatus('');
    }
  };

  // ── Chat Export (Markdown / Copy) ──────────────────────────────────
  const exportChat = async (format = 'markdown') => {
    try {
      const threadId = currentThreadId || 'default';
      const response = await fetch(`${apiBase}/api/chat/export?thread_id=${threadId}&format=${format}`);
      const data = await response.json();
      if (data.error) { setToast('⚠️ ' + data.error); return; }
      
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vesper-chat-${threadId}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setToast('📄 Chat exported as JSON');
      } else {
        // Markdown — copy to clipboard and also download
        const md = data.markdown || '';
        await navigator.clipboard.writeText(md);
        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vesper-chat-${threadId}.md`;
        a.click();
        URL.revokeObjectURL(url);
        setToast(`📋 Chat exported (${data.message_count} messages) & copied to clipboard`);
      }
    } catch (e) {
      console.error('Export error:', e);
      setToast('⚠️ Export failed');
    }
  };

  // ── Voice Preview ─────────────────────────────────────────────────
  const playVoicePreview = (previewUrl) => {
    if (!previewUrl) { setToast('No preview available'); return; }
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    const audio = new Audio(previewUrl);
    previewAudioRef.current = audio;
    audio.onended = () => { previewAudioRef.current = null; };
    audio.play().catch(() => setToast('Preview playback failed'));
  };

  // ── Drag & Drop File Handler ──────────────────────────────────────
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingFile(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingFile(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setUploadedImages(prev => [...prev, { name: file.name, dataUrl: ev.target.result }]);
          setToast(`📎 ${file.name} attached`);
        };
        reader.readAsDataURL(file);
      } else if (file.type === 'text/plain' || file.type === 'application/json' || file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.json') || file.name.endsWith('.csv') || file.name.endsWith('.log') || file.name.endsWith('.xml') || file.name.endsWith('.yaml') || file.name.endsWith('.yml')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const content = ev.target.result;
          setInput(prev => prev + (prev ? '\n\n' : '') + `[File: ${file.name}]\n${content.slice(0, 5000)}`);
          setToast(`📎 ${file.name} added to message`);
        };
        reader.readAsText(file);
      } else {
        setToast(`⚠️ Unsupported file type: ${file.type || file.name}`);
      }
    });
  };

  // ── Toggle Auto-speak ─────────────────────────────────────────────
  const toggleAutoSpeak = () => {
    const newVal = !autoSpeak;
    setAutoSpeak(newVal);
    try { localStorage.setItem('vesper_auto_speak', String(newVal)); } catch(e) {}
    setToast(newVal ? '🔊 Auto-speak ON' : '🔇 Auto-speak OFF');
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

  // ── Themed Ambient Sound System ──────────────────────────────────────
  const ambientRef = useRef(null);
  const [ambientEnabled, setAmbientEnabled] = useState(() => safeStorageGet('vesper_ambient', 'false') === 'true');

  const startAmbientSound = useCallback((soundType) => {
    // Stop existing ambient
    if (ambientRef.current) {
      try { ambientRef.current.forEach(n => { try { n.stop?.(); n.disconnect?.(); } catch(e){} }); } catch(e){}
      ambientRef.current = null;
    }
    if (!ambientEnabled || !soundType) return;

    const ctx = getAudioContext();
    if (!ctx || ctx.state === 'closed') return;

    const nodes = [];
    try {
      // Master gain for ambient volume
      const master = ctx.createGain();
      master.gain.value = 0.03; // Very quiet background
      master.connect(ctx.destination);

      const createNoise = (frequency, type = 'sine', gain = 0.5) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type;
        osc.frequency.value = frequency;
        g.gain.value = gain;
        osc.connect(g);
        g.connect(master);
        osc.start();
        nodes.push(osc);
        return osc;
      };

      const AMBIENT_PRESETS = {
        digital: () => {
          createNoise(55, 'sine', 0.3);
          createNoise(110, 'sine', 0.15);
          createNoise(220, 'sine', 0.05);
        },
        synth: () => {
          createNoise(65, 'triangle', 0.3);
          createNoise(130, 'sine', 0.15);
          createNoise(195, 'triangle', 0.08);
        },
        ambient: () => {
          createNoise(80, 'sine', 0.25);
          createNoise(120, 'sine', 0.15);
          createNoise(160, 'sine', 0.08);
        },
        nature: () => {
          createNoise(100, 'sine', 0.2);
          createNoise(150, 'sine', 0.1);
          createNoise(200, 'triangle', 0.05);
        },
        ocean: () => {
          createNoise(60, 'sine', 0.3);
          createNoise(90, 'sine', 0.2);
          createNoise(45, 'sine', 0.15);
        },
        forest: () => {
          createNoise(120, 'sine', 0.15);
          createNoise(180, 'triangle', 0.1);
          createNoise(250, 'sine', 0.05);
        },
        wind: () => {
          createNoise(50, 'sine', 0.25);
          createNoise(75, 'sine', 0.15);
          createNoise(100, 'triangle', 0.08);
        },
        rain: () => {
          createNoise(200, 'triangle', 0.1);
          createNoise(300, 'triangle', 0.08);
          createNoise(150, 'sine', 0.12);
        },
        fire: () => {
          createNoise(80, 'sawtooth', 0.08);
          createNoise(120, 'sine', 0.15);
          createNoise(60, 'triangle', 0.1);
        },
        dark: () => {
          createNoise(40, 'sine', 0.3);
          createNoise(55, 'sine', 0.15);
          createNoise(30, 'triangle', 0.1);
        },
        cosmic: () => {
          createNoise(70, 'sine', 0.2);
          createNoise(140, 'sine', 0.1);
          createNoise(210, 'triangle', 0.05);
        },
        bells: () => {
          createNoise(440, 'sine', 0.05);
          createNoise(550, 'sine', 0.03);
          createNoise(330, 'triangle', 0.04);
        },
        spooky: () => {
          createNoise(35, 'sine', 0.3);
          createNoise(48, 'sawtooth', 0.06);
          createNoise(70, 'triangle', 0.08);
        },
        jazz: () => {
          createNoise(110, 'sine', 0.15);
          createNoise(165, 'triangle', 0.08);
          createNoise(220, 'sine', 0.05);
        },
        retro: () => {
          createNoise(55, 'square', 0.04);
          createNoise(110, 'square', 0.02);
          createNoise(82.5, 'sine', 0.1);
        },
      };

      const preset = AMBIENT_PRESETS[soundType] || AMBIENT_PRESETS.ambient;
      preset();

    } catch (e) {
      console.log('Ambient sound error:', e.message);
    }

    ambientRef.current = nodes;
  }, [ambientEnabled, getAudioContext]);

  // Start/stop ambient when theme or toggle changes
  useEffect(() => {
    if (ambientEnabled && activeTheme.sound) {
      startAmbientSound(activeTheme.sound);
    } else {
      if (ambientRef.current) {
        try { ambientRef.current.forEach(n => { try { n.stop?.(); n.disconnect?.(); } catch(e){} }); } catch(e){}
        ambientRef.current = null;
      }
    }
    return () => {
      if (ambientRef.current) {
        try { ambientRef.current.forEach(n => { try { n.stop?.(); n.disconnect?.(); } catch(e){} }); } catch(e){}
        ambientRef.current = null;
      }
    };
  }, [ambientEnabled, activeTheme.sound, startAmbientSound]);

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
      vesperReact('memoryAdded');
      bumpStat('memories');
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

  const executeSlashCommand = useCallback((cmd, rawArgs = '') => {
    const args = rawArgs.trim();
    setSlashMenuOpen(false);
    setInput('');
    if (cmd === '/task') {
      if (args) {
        fetch(`${apiBase}/api/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: args, status: 'inbox', priority: 'medium', createdAt: new Date().toISOString() }),
        }).then(() => { fetchTasks(); vesperReact('taskAdded'); }).catch(() => {});
      } else {
        setActiveSection('tasks');
        showToast('📋 Tasks tab — add what needs doing', 'success');
      }
    } else if (cmd === '/remember') {
      setActiveSection('memory');
      if (args) { setMemoryText(args); showToast('🧠 Pre-filled — hit Save to lock it in', 'success'); }
    } else if (cmd === '/search') {
      setActiveSection('research');
      if (args) { setResearchSearch(args); showToast(`🔍 Searching for "${args}"`, 'success'); }
    } else if (cmd === '/focus') {
      setFocusMode(true);
      vesperReact('focusStart');
    } else if (cmd === '/export') {
      exportChat('markdown');
    } else if (cmd === '/stats') {
      setActiveSection('settings');
      showToast('📊 Stats are in your Settings tab', 'success');
    }
  }, [apiBase, fetchTasks, vesperReact, exportChat, showToast]);


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
        const formattedMessages = data.messages.map((msg, idx) => ({
          id: msg.id || `thread-${threadId}-${idx}-${Date.now()}`,
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
    setCurrentThreadId(null);
    setCurrentThreadTitle('New Conversation');
    setStreamingMessageId(null);
    setLoading(false);
    setThinking(false);
    setThinkingStatus('');
    if (abortController) { abortController.abort(); setAbortController(null); }
    playSound('click');
    setToast('New conversation started');
    // Focus input after clearing
    setTimeout(() => inputRef.current?.focus(), 100);
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
    let result = threads;
    if (threadSearchQuery.trim()) {
      const query = threadSearchQuery.toLowerCase();
      result = result.filter(thread => 
        thread.title.toLowerCase().includes(query) ||
        (thread.summary && thread.summary.toLowerCase().includes(query)) ||
        (thread.message_count && thread.message_count.toString().includes(query))
      );
    }
    // Sort: pinned first, then newest first
    return [...result].sort((a, b) => {
      if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
      return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
    });
  }, [threads, threadSearchQuery]);

  const pinnedThreads = useMemo(() => filteredThreads.filter(t => t.pinned), [filteredThreads]);
  const unpinnedThreads = useMemo(() => filteredThreads.filter(t => !t.pinned), [filteredThreads]);

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
      vesperReact('taskAdded');
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
      if (status === 'done') { vesperReact('taskDone'); bumpStat('tasksCompleted'); }
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
      case 'backgrounds':
      case 'backgroundStudio':
        setBackgroundStudioOpen(true);
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
    } else if (fileName.endsWith('.txt') || fileName.endsWith('.md') || fileName.endsWith('.json') || fileName.endsWith('.csv') || fileName.endsWith('.log') || fileName.endsWith('.xml') || fileName.endsWith('.yaml') || fileName.endsWith('.yml') || file.type === 'text/plain') {
      // Read text-based files and paste content into chat
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target.result;
        setInput(prev => prev + (prev ? '\n\n' : '') + `[File: ${fileName}]\n${content.slice(0, 5000)}`);
        setToast(`📎 ${fileName} added to message`);
      };
      reader.readAsText(file);
    } else {
      // Other file types - add reference
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

  // Load available ElevenLabs voices from backend (no browser voices — they sound robotic)
  const [cloudVoices, setCloudVoices] = useState([]);
  const [defaultVoiceId, setDefaultVoiceId] = useState('');
  const [voicesLoading, setVoicesLoading] = useState(false);

  const fetchVoices = useCallback(async () => {
    if (!apiBase || voicesLoading) return;
    setVoicesLoading(true);
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const r = await fetch(`${apiBase}/api/tts/voices`);
        const data = await r.json();
        if (data.voices) {
          setCloudVoices(data.voices);
          if (data.default && !selectedVoiceName) setDefaultVoiceId(data.default);
          break;
        }
      } catch (e) {
        if (attempt < 3) await new Promise(r => setTimeout(r, 2000 * attempt));
      }
    }
    setVoicesLoading(false);
  // selectedVoiceName intentionally omitted — only read once at mount
  }, [apiBase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch on mount
  useEffect(() => { fetchVoices(); }, [apiBase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch when Voice Lab opens if voices still empty (e.g. Railway was cold at page load)
  useEffect(() => {
    if (voiceLabOpen && cloudVoices.length === 0) fetchVoices();
  }, [voiceLabOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch available AI models for model picker
  useEffect(() => {
    fetch(`${apiBase}/api/models/available`)
      .then(r => r.json())
      .then(data => {
        if (data.models) setAvailableModels(data.models);
      })
      .catch(() => {});
  }, [apiBase]);

  // ─── Cloud Neural TTS Engine (Streaming + Personas) ───────────────────
  // ElevenLabs voices stream in real-time (starts speaking instantly).
  // Falls back to full-download for Edge voices, then browser SpeechSynthesis.

  const ttsAudioRef = useRef(null);
  const ttsAbortRef = useRef(null);
  const speechQueueRef = useRef([]);
  const mediaSourceRef = useRef(null);

  // Clean markdown artifacts from text
  const cleanTextForSpeech = (text) => {
    return text
      .replace(/```[\s\S]*?```/g, ' ... code block ... ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, ', ')
      .trim();
  };

  // Resolve voice for a context (game, chat, task, etc.)
  const resolveVoiceForContext = async (context) => {
    try {
      const res = await fetch(`${apiBase}/api/voice/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context }),
      });
      const data = await res.json();
      if (data.voice_id) return data.voice_id;
    } catch (e) { /* fall through */ }
    return null;
  };

  const speak = async (text, context = 'chat') => {
    if (!ttsEnabled) return;

    stopSpeaking();
    const clean = cleanTextForSpeech(text);
    if (!clean) return;

    setIsSpeaking(true);

    // Resolve voice: persona context → user selection → default (ElevenLabs only, never robotic)
    let voice = selectedVoiceName || defaultVoiceId || (cloudVoices.length > 0 ? cloudVoices[0].id : '');
    if (!selectedVoiceName) {
      const contextVoice = await resolveVoiceForContext(context);
      if (contextVoice) voice = contextVoice;
    }

    const isElevenLabs = voice.startsWith('eleven:');

    // ── Streaming path (ElevenLabs – starts speaking instantly) ──────
    if (isElevenLabs) {
      try {
        const controller = new AbortController();
        ttsAbortRef.current = controller;

        const response = await fetch(`${apiBase}/api/tts/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: clean, voice }),
          signal: controller.signal,
        });

        if (!response.ok) throw new Error('Stream TTS failed');

        // Collect streaming chunks into a blob then play
        const reader = response.body.getReader();
        const chunks = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        const audioBlob = new Blob(chunks, { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        ttsAudioRef.current = audio;

        audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(audioUrl); ttsAudioRef.current = null; };
        audio.onerror = () => { setIsSpeaking(false); URL.revokeObjectURL(audioUrl); ttsAudioRef.current = null; };
        await audio.play();
        return;
      } catch (e) {
        if (e.name === 'AbortError') { setIsSpeaking(false); return; }
        console.warn('[TTS] Streaming failed, trying full download:', e.message);
      }
    }

    // ── Full-download path (Edge-TTS or ElevenLabs fallback) ─────────
    try {
      const controller = new AbortController();
      ttsAbortRef.current = controller;

      const response = await fetch(`${apiBase}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean, voice }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error('Cloud TTS failed');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      ttsAudioRef.current = audio;

      audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(audioUrl); ttsAudioRef.current = null; };
      audio.onerror = () => { setIsSpeaking(false); URL.revokeObjectURL(audioUrl); ttsAudioRef.current = null; };
      await audio.play();
      return;
    } catch (e) {
      if (e.name === 'AbortError') { setIsSpeaking(false); return; }
      console.warn('[TTS] Cloud TTS unavailable:', e.message);
    }

    // No browser fallback — ElevenLabs only (robotic voices are banned)
    setIsSpeaking(false);
  };

  const stopSpeaking = () => {
    // Stop cloud TTS audio
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
    }
    if (ttsAbortRef.current) {
      ttsAbortRef.current.abort();
      ttsAbortRef.current = null;
    }

    speechQueueRef.current = [];
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

  const handleVoiceChange = async (voiceName) => {
    setSelectedVoiceName(voiceName);
    try {
      localStorage.setItem('vesper_tts_voice', voiceName);
    } catch (e) {}
    // Preview the voice via ElevenLabs (never use browser SpeechSynthesis)
    if (voiceName) {
      stopSpeaking();
      setIsSpeaking(true);
      try {
        const response = await fetch(`${apiBase}/api/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: "Hey CC. This is how I sound now... pretty nice, right?", voice: voiceName }),
        });
        if (!response.ok) throw new Error('Preview failed');
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        ttsAudioRef.current = audio;
        audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(audioUrl); ttsAudioRef.current = null; };
        audio.onerror = () => { setIsSpeaking(false); URL.revokeObjectURL(audioUrl); ttsAudioRef.current = null; };
        await audio.play();
      } catch (e) {
        console.warn('[TTS] Voice preview failed:', e.message);
        setIsSpeaking(false);
      }
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
              a: ({ href, children, ...props }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }} {...props}>{children}</a>
              ),
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
    '--panel-bg': activeTheme.panelBg || 'rgba(0,0,0,0.75)',
    '--bg': activeTheme.bg || '#000',
    '--accent-rgb': hexToRgb(activeTheme.accent),
    '--glow-rgb': hexToRgb(activeTheme.glow),
  };

  const STATUS_ORDER = ['inbox', 'doing', 'done'];

  // Context for passing drag-handle ref/listeners down to board headers only
  const DragHandleContext = React.createContext(null);

  // Draggable Board Wrapper Component
  // Drag is activated ONLY via the board-header (DragHandleArea) — not the whole panel.
  // This means scroll and button clicks inside the panel work correctly.
  const DraggableBoard = ({ id, children }) => {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } = useDraggable({ id });
    const position = boardPositions[id] || { x: 0, y: 0 };

    const style = {
      position: 'fixed',
      top: '80px',
      left: '280px',
      zIndex: isDragging ? 1000 : 10,
      cursor: 'default',
      transform: `translate3d(${position.x + (transform?.x || 0)}px, ${position.y + (transform?.y || 0)}px, 0)`,
      transition: isDragging ? 'none' : 'transform 0.2s ease',
      width: 'calc(100vw - 320px)',
      maxWidth: '1000px',
      maxHeight: 'calc(100vh - 120px)',
      overflow: 'auto',
      // No touchAction here — allows trackpad/touch scroll in the panel content
    };

    return (
      <DragHandleContext.Provider value={{ setActivatorNodeRef, listeners, attributes, isDragging }}>
        <div ref={setNodeRef} style={style} data-draggable={id}>
          {children}
        </div>
      </DragHandleContext.Provider>
    );
  };

  // Apply to every <DragHandleArea className="board-header"> — makes ONLY the header draggable
  const DragHandleArea = ({ className, children }) => {
    const ctx = React.useContext(DragHandleContext);
    if (!ctx) return <Box className={className}>{children}</Box>;
    return (
      <Box
        ref={ctx.setActivatorNodeRef}
        {...ctx.listeners}
        {...ctx.attributes}
        className={className}
        sx={{ cursor: ctx.isDragging ? 'grabbing' : 'grab', touchAction: 'none', userSelect: 'none' }}
      >
        {children}
      </Box>
    );
  };

  const renderActiveBoard = () => {
    switch (activeSection) {
      case 'research':
        return (
          <DraggableBoard id="research">
            <Paper className="intel-board glass-card">
              <DragHandleArea className="board-header">
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Research Tools</Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    Multi-source research with auto-citations and cross-referencing
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Chip label={researchLoading ? 'Syncing…' : 'Synced'} size="small" className="chip-soft" />
                  <Tooltip title="Back to Chat">
                    <IconButton size="small" onClick={() => setActiveSection('chat')} sx={{ color: 'var(--accent)', '&:hover': { bgcolor: 'rgba(0,255,255,0.1)' } }}>
                      <ArrowBackIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </DragHandleArea>
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
              <DragHandleArea className="board-header">
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>📄 Document Library</Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    Upload PDFs and docs - Vesper learns from them
                  </Typography>
                </Box>
                <Tooltip title="Back to Chat">
                  <IconButton size="small" onClick={() => setActiveSection('chat')} sx={{ color: 'var(--accent)', '&:hover': { bgcolor: 'rgba(0,255,255,0.1)' } }}>
                    <ArrowBackIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </DragHandleArea>
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
              <DragHandleArea className="board-header">
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Memory Core</Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    {memoryView === 'history' ? 'Chat history with pinning' : 'Fast, file-backed memory store'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Chip label={memoryView === 'history' ? (threadsLoading ? 'Loading…' : 'Loaded') : (memoryLoading ? 'Syncing…' : 'Synced')} size="small" className="chip-soft" />
                <Tooltip title="Back to Chat">
                  <IconButton size="small" onClick={() => setActiveSection('chat')} sx={{ color: 'var(--accent)', '&:hover': { bgcolor: 'rgba(0,255,255,0.1)' } }}>
                    <ArrowBackIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </DragHandleArea>
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
                  <>
                    {/* Pinned Section */}
                    {pinnedThreads.length > 0 && (
                      <>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.5, mb: 0.5 }}>
                          <PinIcon sx={{ fontSize: '0.85rem', color: 'var(--accent)' }} />
                          <Typography variant="caption" sx={{ color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                            Pinned ({pinnedThreads.length})
                          </Typography>
                        </Box>
                        {pinnedThreads.map((thread) => (
                    <Box 
                      key={thread.id} 
                      className="board-row" 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1, 
                        py: 1.2,
                        px: 1.5,
                        '&:hover': { bgcolor: 'rgba(0,255,255,0.05)' },
                        borderLeft: selectedThreadIds.includes(thread.id) ? '2px solid var(--accent)' : 'none',
                      }}
                    >
                      <Checkbox 
                        size="small" 
                        checked={selectedThreadIds.includes(thread.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectThread(thread.id);
                        }}
                        sx={{ p: 0.5, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}
                      />
                      {editingThreadId === thread.id ? (
                        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
                            sx={{ flex: 1, input: { color: '#fff', fontSize: '0.9rem' } }}
                          />
                          <IconButton size="small" onClick={() => renameThread(thread.id)} sx={{ color: 'var(--accent)' }}>
                            <ChecklistRounded fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={cancelRenameThread} sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ) : (
                        <>
                          <Box sx={{ flex: 1, cursor: 'pointer', minWidth: 0, overflow: 'hidden' }} onClick={() => loadThread(thread.id)}>
                            <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.4 }}>
                              📌 {thread.title}
                            </Typography>
                            <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', mt: 0.3, lineHeight: 1.3 }}>
                              {thread.message_count || 0} {(thread.message_count === 1) ? 'message' : 'messages'} · {formatTime(thread.updated_at)}
                            </Typography>
                          </Box>
                          <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); setThreadMenuAnchor(e.currentTarget); setThreadMenuThread(thread); }}
                            sx={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0, '&:hover': { color: 'var(--accent)' } }}
                          >
                            <MoreVertIcon fontSize="small" />
                          </IconButton>
                        </>
                      )}
                    </Box>
                  ))}
                        <Box sx={{ borderBottom: '1px solid rgba(0,255,255,0.15)', my: 1 }} />
                      </>
                    )}
                    {/* Recent Conversations Section */}
                    {unpinnedThreads.length > 0 && (
                      <>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.5, mb: 0.5 }}>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                            Recent ({unpinnedThreads.length})
                          </Typography>
                        </Box>
                        {unpinnedThreads.map((thread) => (
                    <Box 
                      key={thread.id} 
                      className="board-row" 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1, 
                        py: 1.2,
                        px: 1.5,
                        '&:hover': { bgcolor: 'rgba(0,255,255,0.05)' },
                        borderLeft: selectedThreadIds.includes(thread.id) ? '2px solid var(--accent)' : 'none',
                      }}
                    >
                      <Checkbox 
                        size="small" 
                        checked={selectedThreadIds.includes(thread.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectThread(thread.id);
                        }}
                        sx={{ p: 0.5, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}
                      />
                      {editingThreadId === thread.id ? (
                        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
                            sx={{ flex: 1, input: { color: '#fff', fontSize: '0.9rem' } }}
                          />
                          <IconButton size="small" onClick={() => renameThread(thread.id)} sx={{ color: 'var(--accent)' }}>
                            <ChecklistRounded fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={cancelRenameThread} sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ) : (
                        <>
                          <Box sx={{ flex: 1, cursor: 'pointer', minWidth: 0, overflow: 'hidden' }} onClick={() => loadThread(thread.id)}>
                            <Typography sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 400, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.4 }}>
                              {thread.title}
                            </Typography>
                            <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', mt: 0.3, lineHeight: 1.3 }}>
                              {thread.message_count || 0} {(thread.message_count === 1) ? 'message' : 'messages'} · {formatTime(thread.updated_at)}
                            </Typography>
                          </Box>
                          <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); setThreadMenuAnchor(e.currentTarget); setThreadMenuThread(thread); }}
                            sx={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0, '&:hover': { color: 'var(--accent)' } }}
                          >
                            <MoreVertIcon fontSize="small" />
                          </IconButton>
                        </>
                      )}
                    </Box>
                  ))}
                      </>
                    )}
                  </>
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
              <DragHandleArea className="board-header">
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Task Matrix</Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    Track tasks by status, priority, and deadline.
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Chip label={tasksLoading ? 'Syncing…' : 'Synced'} size="small" className="chip-soft" />
                <Tooltip title="Back to Chat">
                  <IconButton size="small" onClick={() => setActiveSection('chat')} sx={{ color: 'var(--accent)', '&:hover': { bgcolor: 'rgba(0,255,255,0.1)' } }}>
                    <ArrowBackIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </DragHandleArea>
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
          <CreativeSuite apiBase={apiBase} onBack={() => setActiveSection('chat')} />
        );
      case 'integrations':
        return (
          <IntegrationsHub apiBase={apiBase} onBack={() => setActiveSection('chat')} />
        );
      case 'gallery':
        return (
          <DraggableBoard id="gallery">
            <MediaGallery apiBase={apiBase} onClose={() => setActiveSection('chat')} />
          </DraggableBoard>
        );
      case 'sassy':
        return (
          <DraggableBoard id="sassy">
            {avatarStudioOpen ? (
              <AvatarStudio 
                apiBase={apiBase} 
                onClose={() => setAvatarStudioOpen(false)} 
                accentColor={activeTheme.accent} 
                vesperIdentity={vesperIdentity}
                setToast={setToast}
              />
            ) : (
              <Box sx={{ position: 'relative' }}>
                <Sassy apiBase={apiBase} onClose={() => setActiveSection('chat')} />
                <Button
                  onClick={() => setAvatarStudioOpen(true)}
                  sx={{
                    position: 'absolute', top: 12, right: 48,
                    color: 'var(--accent)', fontSize: '0.7rem',
                    textTransform: 'none', fontWeight: 700,
                    border: '1px solid rgba(0,255,255,0.2)',
                    borderRadius: 2, px: 1.5, py: 0.5,
                    backdropFilter: 'blur(10px)',
                    bgcolor: 'rgba(0,255,255,0.05)',
                    '&:hover': { bgcolor: 'rgba(0,255,255,0.12)' },
                  }}
                >
                  🧬 Avatar Studio
                </Button>
              </Box>
            )}
          </DraggableBoard>
        );
      case 'analytics':
        return (
          <DraggableBoard id="analytics">
            <Paper className="intel-board glass-card">
              <DragHandleArea className="board-header">
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
                  <Tooltip title="Back to Chat">
                    <IconButton size="small" onClick={() => setActiveSection('chat')} sx={{ color: 'var(--accent)', '&:hover': { bgcolor: 'rgba(0,255,255,0.1)' } }}>
                      <ArrowBackIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </DragHandleArea>
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
              <DragHandleArea className="board-header">
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Personality Configuration</Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    Customize Vesper's tone and response style
                  </Typography>
                </Box>
                <Tooltip title="Back to Chat">
                  <IconButton size="small" onClick={() => setActiveSection('chat')} sx={{ color: 'var(--accent)', '&:hover': { bgcolor: 'rgba(0,255,255,0.1)' } }}>
                    <ArrowBackIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </DragHandleArea>
              
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
              <DragHandleArea className="board-header">
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Settings</Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    Customize your Vesper AI experience
                </Typography>
              </Box>
              <Tooltip title="Back to Chat">
                <IconButton size="small" onClick={() => setActiveSection('chat')} sx={{ color: 'var(--accent)', '&:hover': { bgcolor: 'rgba(0,255,255,0.1)' } }}>
                  <ArrowBackIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </DragHandleArea>
            <Stack spacing={2.5}>
              {/* Appearance */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'var(--accent)' }}>Appearance — Theme Catalog</Typography>
                <Stack spacing={1.5}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>Active Theme</Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>{activeTheme.label} ({THEME_CATEGORIES.find(c => c.id === activeTheme.category)?.label || '⚡ Tech'})</Typography>
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
                  
                  {/* Theme Catalog - Categorized Grid */}
                  <Dialog
                    open={Boolean(themeMenuAnchor)}
                    onClose={() => setThemeMenuAnchor(null)}
                    maxWidth="md"
                    fullWidth
                    PaperProps={{
                      sx: {
                        bgcolor: 'rgba(8, 8, 18, 0.97)',
                        backdropFilter: 'blur(30px)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '20px',
                        maxHeight: '80vh',
                      }
                    }}
                  >
                    <Box sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                        <Box>
                          <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--accent)' }}>
                            🎨 Theme Catalog
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mt: 0.5 }}>
                            {THEMES.length} themes across {THEME_CATEGORIES.length} categories
                          </Typography>
                        </Box>
                        <IconButton onClick={() => setThemeMenuAnchor(null)} sx={{ color: 'rgba(255,255,255,0.5)' }}>
                          <CloseIcon />
                        </IconButton>
                      </Box>

                      <Box sx={{ overflowY: 'auto', maxHeight: '60vh', pr: 1 }}>
                        {THEME_CATEGORIES.map((cat) => {
                          const catThemes = THEMES.filter(t => t.category === cat.id);
                          if (catThemes.length === 0) return null;
                          return (
                            <Box key={cat.id} sx={{ mb: 3 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--accent)', mb: 0.5, fontSize: '0.85rem' }}>
                                {cat.label}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', mb: 1.5, display: 'block' }}>
                                {cat.desc}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {catThemes.map((t) => (
                                  <Box
                                    key={t.id}
                                    onClick={() => {
                                      setActiveTheme(t);
                                      // Don't close — let user browse
                                    }}
                                    sx={{
                                      width: 100,
                                      cursor: 'pointer',
                                      borderRadius: 2,
                                      p: 1,
                                      textAlign: 'center',
                                      border: activeTheme.id === t.id 
                                        ? `2px solid ${t.accent}` 
                                        : '2px solid rgba(255,255,255,0.06)',
                                      bgcolor: activeTheme.id === t.id 
                                        ? `${t.accent}15` 
                                        : 'rgba(255,255,255,0.02)',
                                      transition: 'all 0.2s ease',
                                      '&:hover': { 
                                        bgcolor: `${t.accent}20`,
                                        borderColor: `${t.accent}66`,
                                        transform: 'translateY(-2px)',
                                      },
                                    }}
                                  >
                                    {/* Color preview */}
                                    <Box sx={{
                                      width: '100%',
                                      height: 32,
                                      borderRadius: 1.5,
                                      mb: 0.75,
                                      background: t.bg || '#000',
                                      border: `2px solid ${t.accent}`,
                                      boxShadow: activeTheme.id === t.id ? `0 0 12px ${t.accent}` : 'none',
                                      position: 'relative',
                                      overflow: 'hidden',
                                    }}>
                                      {/* Accent dot */}
                                      <Box sx={{
                                        position: 'absolute', 
                                        top: '50%', left: '50%',
                                        transform: 'translate(-50%,-50%)',
                                        width: 12, height: 12,
                                        borderRadius: '50%',
                                        bgcolor: t.accent,
                                        boxShadow: `0 0 8px ${t.accent}`,
                                      }} />
                                      {/* Sub color dot */}
                                      <Box sx={{
                                        position: 'absolute',
                                        bottom: 3, right: 5,
                                        width: 6, height: 6,
                                        borderRadius: '50%',
                                        bgcolor: t.sub,
                                      }} />
                                    </Box>
                                    <Typography variant="caption" sx={{ 
                                      color: activeTheme.id === t.id ? t.accent : 'rgba(255,255,255,0.7)',
                                      fontWeight: activeTheme.id === t.id ? 700 : 500,
                                      fontSize: '0.65rem',
                                      lineHeight: 1.2,
                                      display: 'block',
                                    }}>
                                      {t.label}
                                    </Typography>
                                    {t.sound && (
                                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.55rem' }}>
                                        🔊 {t.sound}
                                      </Typography>
                                    )}
                                  </Box>
                                ))}
                              </Box>
                            </Box>
                          );
                        })}
                      </Box>

                      <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)' }}>
                          Active: {activeTheme.label} • Sound: {activeTheme.sound || 'default'} • {activeTheme.scanlines !== false ? 'Scanlines ON' : 'Scanlines OFF'}
                        </Typography>
                        <Button 
                          onClick={() => setThemeMenuAnchor(null)} 
                          sx={{ color: 'var(--accent)', fontWeight: 700, textTransform: 'none' }}
                        >
                          Done
                        </Button>
                      </Box>
                    </Box>
                  </Dialog>
                </Stack>
              </Box>

              {/* Stats & Insights */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, color: 'var(--accent)' }}>📊 Your Vesper Stats</Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', display: 'block', mb: 1.5 }}>Tracked across sessions</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                  {[
                    { label: 'Messages Sent',   value: vesperStats.messages,       icon: '💬' },
                    { label: 'Tasks Completed', value: vesperStats.tasksCompleted, icon: '✅' },
                    { label: 'Memories Saved',  value: vesperStats.memories,       icon: '🧠' },
                    { label: 'Days Active',     value: vesperStats.daysActive,     icon: '📅' },
                    { label: 'Day Streak',      value: `${vesperStats.streak || 0}d`, icon: '🔥' },
                  ].map(({ label, value, icon }) => (
                    <Box key={label} sx={{ bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2, p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ fontSize: '1.2rem', width: 28, textAlign: 'center', flexShrink: 0 }}>{icon}</Box>
                      <Box>
                        <Typography sx={{ color: 'var(--accent)', fontWeight: 700, fontSize: '1.1rem', lineHeight: 1 }}>{value ?? 0}</Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.62rem' }}>{label}</Typography>
                      </Box>
                    </Box>
                  ))}
                  <Box
                    onClick={exportTasks}
                    sx={{ bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2, p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', '&:hover': { borderColor: 'rgba(var(--accent-rgb),0.3)', bgcolor: 'rgba(var(--accent-rgb),0.06)' }, transition: 'all 0.2s' }}
                  >
                    <Box sx={{ fontSize: '1.2rem', width: 28, textAlign: 'center', flexShrink: 0 }}>📦</Box>
                    <Box>
                      <Typography sx={{ color: '#bbb', fontWeight: 700, fontSize: '0.9rem', lineHeight: 1 }}>Export Tasks</Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.62rem' }}>Copy all tasks → clipboard</Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>

              {/* Vesper Identity */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#ff66ff' }}>✨ Vesper Identity</Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mb: 1.5 }}>
                  Customize Vesper's mood, vibe, look, and voice for today
                </Typography>
                <Stack spacing={1} sx={{ mb: 2 }}>
                  {[
                    { label: 'Mood', value: vesperIdentity?.mood?.label || vesperIdentity?.mood?.id, idValue: vesperIdentity?.mood?.id, emoji: vesperIdentity?.mood?.emoji, color: vesperIdentity?.mood?.color, key: 'mood_override', options: identityOptions?.moods },
                    { label: 'Vibe', value: vesperIdentity?.gender?.label || vesperIdentity?.gender?.id, idValue: vesperIdentity?.gender?.id, emoji: vesperIdentity?.gender?.emoji || (vesperIdentity?.gender?.id === 'feminine' ? '♀️' : vesperIdentity?.gender?.id === 'masculine' ? '♂️' : '⚧️'), color: '#ff66ff', key: 'gender_override', options: identityOptions?.genders },
                    { label: 'Look', value: vesperIdentity?.look, idValue: vesperIdentity?.look, emoji: '👁️', color: '#66ffcc', key: 'look_override', options: identityOptions?.looks },
                    { label: 'Voice', value: vesperIdentity?.voice_vibe?.label || vesperIdentity?.voice_vibe?.id, idValue: vesperIdentity?.voice_vibe?.id, emoji: vesperIdentity?.voice_vibe?.emoji || '🎤', color: '#ffaa00', key: 'voice_vibe_override', options: identityOptions?.voice_vibes },
                  ].map((item) => (
                    <Box key={item.label} sx={{
                      display: 'flex', alignItems: 'center', gap: 1.5,
                      bgcolor: 'rgba(255,255,255,0.03)',
                      borderRadius: 2,
                      p: 1.5,
                      border: `1px solid ${item.color || 'var(--accent)'}22`,
                    }}>
                      <Box sx={{ fontSize: '1.4rem', width: 36, textAlign: 'center', flexShrink: 0 }}>{item.emoji}</Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 1, display: 'block' }}>
                          {item.label}
                        </Typography>
                        {item.options ? (
                          <Select
                            value={item.idValue || ''}
                            onChange={(e) => {
                              const selectedOpt = (Array.isArray(item.options) ? item.options : []).find(o => (typeof o === 'string' ? o : o.id) === e.target.value);
                              setVesperIdentity(prev => ({ ...prev, [item.label.toLowerCase()]: selectedOpt || e.target.value }));
                            }}
                            size="small"
                            fullWidth
                            sx={{
                              color: item.color || '#fff',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              '.MuiOutlinedInput-notchedOutline': { border: 'none' },
                              '.MuiSelect-select': { py: 0.25, px: 0 },
                              '.MuiSvgIcon-root': { color: 'rgba(255,255,255,0.3)' },
                            }}
                            MenuProps={{
                              PaperProps: {
                                sx: {
                                  bgcolor: 'rgba(10,10,25,0.95)',
                                  backdropFilter: 'blur(20px)',
                                  border: '1px solid rgba(0,255,255,0.15)',
                                  '& .MuiMenuItem-root': { color: '#fff', fontSize: '0.85rem' },
                                  '& .MuiMenuItem-root:hover': { bgcolor: 'rgba(0,255,255,0.1)' },
                                }
                              }
                            }}
                          >
                            {(Array.isArray(item.options) ? item.options : []).map((opt) => {
                              const optId = typeof opt === 'string' ? opt : opt.id;
                              const optDisplay = typeof opt === 'string' ? opt : `${opt.emoji || ''} ${opt.label || opt.id}`;
                              return <MenuItem key={optId} value={optId}>{optDisplay}</MenuItem>;
                            })}
                          </Select>
                        ) : (
                          <Typography variant="body2" sx={{ color: item.color || '#fff', fontWeight: 600, fontSize: '0.85rem', textTransform: 'capitalize' }}>
                            {item.value || '—'}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Stack>
                <Stack direction="row" spacing={1.5}>
                  <Button
                    onClick={handleRerollIdentity}
                    size="small"
                    sx={{
                      color: '#ff66ff',
                      borderColor: 'rgba(255,102,255,0.3)',
                      border: '1px solid',
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      flex: 1,
                      '&:hover': { bgcolor: 'rgba(255,102,255,0.1)', borderColor: '#ff66ff' },
                    }}
                  >
                    🎲 Reroll
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleConfirmIdentity({
                      mood_override: vesperIdentity?.mood?.id || vesperIdentity?.mood,
                      gender_override: vesperIdentity?.gender?.id || vesperIdentity?.gender,
                      voice_vibe_override: vesperIdentity?.voice_vibe?.id || vesperIdentity?.voice_vibe,
                    })}
                    sx={{
                      bgcolor: 'var(--accent)',
                      color: '#000',
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 700,
                      flex: 1,
                      '&:hover': { bgcolor: 'var(--accent)', filter: 'brightness(1.2)' },
                    }}
                  >
                    ✨ Confirm Vibe
                  </Button>
                </Stack>
              </Box>

              {/* Background Studio */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#ff88ff' }}>🖼️ Background Studio</Typography>
                <Box sx={{
                  p: 2, border: '1px solid rgba(255,136,255,0.2)', borderRadius: 2, bgcolor: 'rgba(255,136,255,0.03)',
                  position: 'relative', overflow: 'hidden',
                }}>
                  {/* Mini preview of current background */}
                  {customBackground?.url && (
                    <Box sx={{
                      position: 'absolute', inset: 0, opacity: 0.15,
                      backgroundImage: `url(${customBackground.url})`,
                      backgroundSize: 'cover', backgroundPosition: 'center',
                      filter: 'blur(4px)',
                    }} />
                  )}
                  <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: '#ff88ff' }}>
                      Custom Backgrounds
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mb: 1.5 }}>
                      {customBackground
                        ? `Active: ${customBackground.name}`
                        : 'Set custom wallpapers, upload images, or pick from curated collections'
                      }
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setBackgroundStudioOpen(true)}
                        sx={{ borderColor: '#ff88ff', color: '#ff88ff', textTransform: 'none', fontWeight: 600, flex: 1 }}
                      >
                        Open Studio
                      </Button>
                      {customBackground && (
                        <Button
                          size="small"
                          onClick={() => {
                            setCustomBackground(null);
                            try { localStorage.removeItem('vesper_custom_bg'); } catch (e) {}
                            setToast('Background cleared');
                          }}
                          sx={{ color: 'rgba(255,255,255,0.4)', textTransform: 'none', fontSize: '0.75rem' }}
                        >
                          Clear
                        </Button>
                      )}
                    </Stack>
                  </Box>
                </Box>
              </Box>
              
              {/* Audio & Voice */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'var(--accent)' }}>Audio & Voice</Typography>
                <Stack spacing={1.5}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>Text-to-Speech</Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                        {ttsEnabled ? 'Vesper speaks responses aloud' : 'AI responses read aloud'}
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

                  {/* ── Ambient Sounds Toggle ── */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>Ambient Sounds</Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                        {ambientEnabled ? `🔊 Playing: ${activeTheme.sound || 'ambient'}` : 'Theme-matched background soundscape'}
                      </Typography>
                    </Box>
                    <Switch
                      checked={ambientEnabled}
                      onChange={(e) => {
                        const newVal = e.target.checked;
                        setAmbientEnabled(newVal);
                        try { localStorage.setItem('vesper_ambient', String(newVal)); } catch(err) {}
                        playSound('click');
                      }}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--accent)' },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: 'var(--accent)' },
                      }}
                    />
                  </Box>

                  {/* ── Default Voice Picker ── */}
                  {ttsEnabled && (
                    <Box sx={{ p: 1.5, border: '1px solid rgba(0,255,136,0.2)', borderRadius: 2, bgcolor: 'rgba(0,255,136,0.03)' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: '#00ff88' }}>
                        🎙️ Default Voice
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', display: 'block', mb: 1 }}>
                        Choose Vesper's voice for all speech
                      </Typography>

                      <Box sx={{
                        maxHeight: 200, overflowY: 'auto', borderRadius: 1,
                        border: '1px solid rgba(0,255,136,0.15)', p: 0.5,
                        '&::-webkit-scrollbar': { width: 4 },
                        '&::-webkit-scrollbar-thumb': { background: '#00ff88', borderRadius: 2 },
                      }}>
                        {cloudVoices.length > 0 ? cloudVoices.map((v) => {
                          const isActive = selectedVoiceName === v.id || (!selectedVoiceName && v.id === defaultVoiceId);
                          return (
                            <Box
                              key={v.id}
                              onClick={() => {
                                setSelectedVoiceName(v.id);
                                try { localStorage.setItem('vesper_tts_voice', v.id); } catch(e) {}
                                setToast(`🎙️ Voice set: ${v.name}`);
                                if (v.preview_url) playVoicePreview(v.preview_url);
                              }}
                              sx={{
                                p: 0.75, px: 1, cursor: 'pointer', borderRadius: 1, mb: 0.25,
                                background: isActive ? 'rgba(0,255,136,0.15)' : 'rgba(0,0,0,0.2)',
                                borderLeft: isActive ? '3px solid #00ff88' : '3px solid transparent',
                                '&:hover': { background: 'rgba(255,255,255,0.08)' },
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                {isActive && <Typography sx={{ fontSize: '0.65rem', color: '#00ff88' }}>✓</Typography>}
                                <Typography variant="caption" sx={{
                                  color: isActive ? '#00ff88' : 'rgba(255,255,255,0.7)', fontWeight: isActive ? 700 : 500, fontSize: '0.75rem',
                                }}>
                                  {v.name}
                                </Typography>
                                {v.gender && (
                                  <Typography variant="caption" sx={{
                                    fontSize: '0.55rem', px: 0.5, py: 0.1, borderRadius: 0.5,
                                    background: v.gender === 'Female' ? 'rgba(255,100,255,0.15)' : 'rgba(100,200,255,0.15)',
                                    color: v.gender === 'Female' ? '#ff88ff' : '#88ccff', fontWeight: 700,
                                  }}>
                                    {v.gender === 'Female' ? '♀' : '♂'}
                                  </Typography>
                                )}
                              </Box>
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem' }}>
                                {v.locale || ''}{v.style ? ` · ${v.style}` : ''}
                              </Typography>
                            </Box>
                          );
                        }) : (
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', p: 1 }}>
                            No voices loaded — check that the backend is reachable
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  )}

                  {/* ── Auto-Speak Toggle ── */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>Auto-Speak Replies</Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>Automatically read AI responses aloud</Typography>
                    </Box>
                    <Switch
                      checked={autoSpeak}
                      onChange={(e) => {
                        const newVal = e.target.checked;
                        setAutoSpeak(newVal);
                        try { localStorage.setItem('vesper_auto_speak', String(newVal)); } catch(err) {}
                        playSound('click');
                      }}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--accent)' },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: 'var(--accent)' },
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

              {/* Voice Lab (ElevenLabs Premium) */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#ffbb44' }}>
                  ★ Voice Lab
                </Typography>
                <Stack spacing={1.5}>
                  {/* Sound Effects Generator */}
                  <Box sx={{ p: 1.5, border: '1px solid rgba(255,180,50,0.3)', borderRadius: 2, bgcolor: 'rgba(255,180,50,0.05)' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: '#ffcc55' }}>Sound Effects AI</Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mb: 1 }}>
                      Generate any sound from a text description
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <input
                        type="text"
                        placeholder="e.g. cyberpunk door opening..."
                        id="sfx-prompt-input"
                        style={{
                          flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: 6, padding: '6px 10px', color: '#fff', fontSize: '0.8rem', outline: 'none',
                        }}
                      />
                      <Button
                        size="small"
                        variant="contained"
                        onClick={async () => {
                          const input = document.getElementById('sfx-prompt-input');
                          if (!input?.value.trim()) return;
                          setToast('Generating sound effect...');
                          try {
                            const res = await fetch('http://localhost:8000/api/sfx/generate', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ prompt: input.value.trim(), duration: 5 }),
                            });
                            if (!res.ok) throw new Error((await res.json()).error || 'Failed');
                            const blob = await res.blob();
                            const url = URL.createObjectURL(blob);
                            const audio = new Audio(url);
                            audio.play();
                            audio.onended = () => URL.revokeObjectURL(url);
                            setToast('Playing sound effect!');
                          } catch (e) {
                            setToast('SFX Error: ' + e.message);
                          }
                        }}
                        sx={{ bgcolor: '#ffbb44', color: '#000', fontWeight: 700, minWidth: 60, '&:hover': { bgcolor: '#ffcc66' } }}
                      >
                        Generate
                      </Button>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
                      {['Spaceship engine hum', 'Magical spell cast', 'Rain on cyberpunk city', 'Level up chime', 'Dramatic reveal'].map(p => (
                        <Chip key={p} label={p} size="small"
                          onClick={() => { const i = document.getElementById('sfx-prompt-input'); if (i) i.value = p; }}
                          sx={{ fontSize: '0.65rem', height: 22, bgcolor: 'rgba(255,180,50,0.1)', color: '#ffbb44', cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,180,50,0.2)' } }}
                        />
                      ))}
                    </Box>
                  </Box>

                  {/* Voice Personas — inline assignment */}
                  <Box sx={{ p: 1.5, border: '1px solid rgba(0,255,255,0.2)', borderRadius: 2, bgcolor: 'rgba(0,255,255,0.03)' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: 'var(--accent)' }}>Voice Personas</Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mb: 1 }}>
                      Assign different voices for different contexts — Vesper adapts automatically
                    </Typography>
                    <PersonaAssigner apiBase={apiBase} cloudVoices={cloudVoices} setToast={setToast} playVoicePreview={playVoicePreview} />
                  </Box>

                  {/* Voice Cloning */}
                  <Box sx={{ p: 1.5, border: '1px solid rgba(200,100,255,0.3)', borderRadius: 2, bgcolor: 'rgba(200,100,255,0.05)' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: '#cc88ff' }}>Voice Cloning</Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mb: 1 }}>
                      Clone any voice from audio samples — make Vesper sound like anyone
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      component="label"
                      fullWidth
                      sx={{ borderColor: '#cc88ff', color: '#cc88ff', textTransform: 'none' }}
                    >
                      Upload Voice Samples
                      <input type="file" hidden multiple accept="audio/*"
                        onChange={async (e) => {
                          const files = e.target.files;
                          if (!files?.length) return;
                          setToast('Cloning voice... this takes a moment');
                          const formData = new FormData();
                          formData.append('name', 'Vesper Custom');
                          formData.append('description', 'Custom cloned voice');
                          Array.from(files).forEach(f => formData.append('files', f));
                          try {
                            const res = await fetch(`${apiBase}/api/voice/clone?name=VesperCustom`, {
                              method: 'POST', body: formData,
                            });
                            const data = await res.json();
                            if (data.success) {
                              setToast('Voice cloned! It\'s now in your voice picker.');
                              // Refresh voices
                              const vRes = await fetch(`${apiBase}/api/tts/voices`);
                              const vData = await vRes.json();
                              if (vData.voices) setCloudVoices(vData.voices);
                            } else {
                              setToast('Clone failed: ' + (data.error || 'Unknown error'));
                            }
                          } catch (err) { setToast('Clone error: ' + err.message); }
                        }}
                      />
                    </Button>
                  </Box>

                  {/* Voice Isolation */}
                  <Box sx={{ p: 1.5, border: '1px solid rgba(100,255,200,0.3)', borderRadius: 2, bgcolor: 'rgba(100,255,200,0.05)' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: '#66ffbb' }}>Voice Isolation</Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mb: 1 }}>
                      Remove background noise from any audio file
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      component="label"
                      fullWidth
                      sx={{ borderColor: '#66ffbb', color: '#66ffbb', textTransform: 'none' }}
                    >
                      Upload Audio to Clean
                      <input type="file" hidden accept="audio/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setToast('Isolating voice... removing background noise');
                          const formData = new FormData();
                          formData.append('file', file);
                          try {
                            const res = await fetch(`${apiBase}/api/voice/isolate`, {
                              method: 'POST', body: formData,
                            });
                            if (!res.ok) throw new Error((await res.json()).error || 'Failed');
                            const blob = await res.blob();
                            const url = URL.createObjectURL(blob);
                            const audio = new Audio(url);
                            audio.play();
                            audio.onended = () => URL.revokeObjectURL(url);
                            setToast('Playing isolated voice!');
                          } catch (err) { setToast('Isolation error: ' + err.message); }
                        }}
                      />
                    </Button>
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
      
      {/* Background layers — absolute positioned in a full-page wrapper */}
      <Box sx={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div className="bg-layer gradient-background" style={{ background: activeTheme.bg || '#000', position: 'absolute', inset: 0, ...(customBackground ? { opacity: backgroundSettings?.overlay !== false ? (backgroundSettings?.opacity ?? 0.3) : 0 } : {}) }} />
        {/* Custom background image layer */}
        {customBackground?.url && (
          <div className="bg-layer custom-background" style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${customBackground.url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: (backgroundSettings?.blur || 0) > 0 ? `blur(${backgroundSettings.blur}px)` : 'none',
            zIndex: -1,
          }} />
        )}
        <div className="bg-layer hex-grid" style={{ position: 'absolute', inset: 0, ...(activeTheme.bgImage && !customBackground ? { backgroundImage: activeTheme.bgImage, backgroundSize: activeTheme.bgSize || 'cover', backgroundPosition: 'center' } : {}) }} />
        <div className="bg-layer scanlines" style={{ position: 'absolute', inset: 0, ...(activeTheme.scanlines === false ? { display: 'none' } : {}) }} />
      </Box>
      
      <Box sx={{ 
        transform: `scale(${uiScale})`,
        transformOrigin: 'top left',
        width: `${100 / uiScale}%`,
        minHeight: `${100 / uiScale}vh`,
        overflowX: 'hidden',
        overflowY: 'auto',
        position: 'relative',
        zIndex: 1,
      }}>
      <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} onCommand={handleCommand} />


      {/* Background layers removed from here — they're now above the transform Box */}
      
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

      <Box className="app-shell" style={themeVars} data-style={activeTheme.style || 'cyber'}>
        {/* Scanlines overlay - renders when theme has scanlines enabled */}
        {activeTheme.scanlines && (
          <div className="scanlines" style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 9999,
          }} />
        )}
        <aside className={`sidebar glass-panel${mobileSidebarOpen ? ' mobile-open' : ''}`}>
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
                  setMobileSidebarOpen(false);
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
                (() => {
                  const sortedThreads = [...threads].sort((a, b) => {
                    if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
                    return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
                  });
                  const sidebarPinned = sortedThreads.filter(t => t.pinned);
                  const sidebarRecent = sortedThreads.filter(t => !t.pinned);

                  const renderSidebarThread = (thread) => (
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
                  );

                  return (
                    <>
                      {sidebarPinned.length > 0 && (
                        <>
                          <Typography variant="caption" sx={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 1.5, px: 1, pt: 0.5 }}>
                            📌 Pinned
                          </Typography>
                          {sidebarPinned.map(renderSidebarThread)}
                          <Box sx={{ borderBottom: '1px solid rgba(0,255,255,0.15)', my: 0.5, mx: 1 }} />
                        </>
                      )}
                      {sidebarRecent.length > 0 && (
                        <>
                          {sidebarPinned.length > 0 && (
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 1.5, px: 1, pt: 0.5 }}>
                              Recent
                            </Typography>
                          )}
                          {sidebarRecent.map(renderSidebarThread)}
                        </>
                      )}
                    </>
                  );
                })()
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

        {/* Mobile backdrop – closes sidebar when tapped */}
        {mobileSidebarOpen && (
          <div
            className="mobile-sidebar-backdrop"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        <main className="content-grid">
          <section className="chat-panel glass-panel">
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexShrink: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {/* Hamburger – mobile only */}
                <IconButton
                  className="mobile-menu-btn"
                  size="small"
                  onClick={() => setMobileSidebarOpen(o => !o)}
                  sx={{ color: 'var(--accent)', '&:hover': { bgcolor: 'rgba(0,255,255,0.1)' } }}
                >
                  <MenuIcon fontSize="small" />
                </IconButton>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--accent)' }}>
                    Neural Chat
                  </Typography>
                  {vesperIdentity?.mood && (
                    <Chip
                      label={`${vesperIdentity.mood?.emoji || '✨'} ${vesperIdentity.mood?.label || vesperIdentity.mood?.id || ''}`}
                      size="small"
                      onClick={() => setActiveSection('settings')}
                      sx={{
                        bgcolor: vesperIdentity.mood?.color ? `${vesperIdentity.mood.color}22` : 'rgba(0,255,255,0.1)',
                        color: vesperIdentity.mood?.color || 'var(--accent)',
                        border: `1px solid ${vesperIdentity.mood?.color || 'var(--accent)'}44`,
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        height: 24,
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          bgcolor: vesperIdentity.mood?.color ? `${vesperIdentity.mood.color}44` : 'rgba(0,255,255,0.2)',
                          transform: 'scale(1.05)',
                        },
                      }}
                    />
                  )}
                </Box>
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
              </Box>{/* end mobile-menu-btn + title wrapper */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {/* Model Picker */}
                {availableModels.length > 0 && (
                  <Select
                    size="small"
                    value={selectedModel}
                    onChange={(e) => {
                      setSelectedModel(e.target.value);
                      try { localStorage.setItem('vesper_model', e.target.value); } catch(ex) {}
                    }}
                    sx={{
                      height: 32,
                      minWidth: 100,
                      fontSize: '0.75rem',
                      color: 'var(--accent)',
                      '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,255,255,0.25)' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--accent)' },
                      '.MuiSvgIcon-root': { color: 'var(--accent)', fontSize: 16 },
                      bgcolor: 'rgba(0,0,0,0.2)',
                    }}
                  >
                    <MenuItem value="auto" sx={{ fontSize: '0.8rem' }}>🔄 Auto</MenuItem>
                    {availableModels.map(m => (
                      <MenuItem key={m.id} value={m.id} sx={{ fontSize: '0.8rem' }}>
                        {m.icon} {m.label}
                      </MenuItem>
                    ))}
                  </Select>
                )}

                {/* Auto-speak Toggle */}
                <Tooltip title={autoSpeak ? "Auto-speak ON (click to disable)" : "Auto-speak OFF (click to enable)"} placement="left">
                  <IconButton
                    size="small"
                    onClick={toggleAutoSpeak}
                    sx={{
                      color: autoSpeak ? '#00ff88' : 'rgba(255,255,255,0.3)',
                      bgcolor: autoSpeak ? 'rgba(0,255,136,0.1)' : 'transparent',
                      border: autoSpeak ? '1px solid rgba(0,255,136,0.4)' : '1px solid rgba(255,255,255,0.15)',
                      '&:hover': { color: '#00ff88', bgcolor: 'rgba(0,255,136,0.15)' },
                      width: 32, height: 32,
                    }}
                  >
                    <RecordVoiceOverIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>

                {/* Export Chat */}
                <Tooltip title="Export chat" placement="left">
                  <IconButton
                    size="small"
                    onClick={() => exportChat('markdown')}
                    sx={{
                      color: 'rgba(255,255,255,0.4)',
                      '&:hover': { color: 'var(--accent)', bgcolor: 'rgba(0,255,255,0.1)' },
                      width: 32, height: 32,
                    }}
                  >
                    <SaveAltIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>

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

                {/* Voice picker moved to Voice Lab > Personas tab */}

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

            {/* Voice selector moved to Voice Lab > Personas tab */}

            <Stack direction="row" spacing={0.5} sx={{ mb: 1, flexWrap: 'wrap', gap: 0.5, flexShrink: 0 }}>
              {['Summarize the scene', 'Generate a quest', 'Give me a hint', 'Explain controls'].map((label) => (
                <Chip key={label} label={label} onClick={() => setInput(label)} className="chip-ghost" />
              ))}
              <Chip label="Cmd/Ctrl+K" className="chip-ghost" />
              <Chip label="Hold V to speak" className="chip-ghost" />
            </Stack>

            <Paper 
              ref={chatContainerRef} 
              className="chat-window glass-card"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              sx={{ position: 'relative' }}
            >
              {/* Drag overlay */}
              {isDraggingFile && (
                <Box sx={{
                  position: 'absolute', inset: 0, zIndex: 10,
                  bgcolor: 'rgba(0,255,255,0.08)', border: '2px dashed var(--accent)',
                  borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backdropFilter: 'blur(4px)',
                }}>
                  <Typography sx={{ color: 'var(--accent)', fontWeight: 700, fontSize: '1.1rem' }}>
                    📎 Drop files here
                  </Typography>
                </Box>
              )}
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
                  {thinkingStatus && (
                    <Typography variant="caption" sx={{ color: 'var(--accent)', opacity: 0.7, fontStyle: 'italic' }}>
                      {thinkingStatus}
                    </Typography>
                  )}
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

            {/* Vesper Proactive Greeting */}
            {vesperGreeting && messages.length === 0 && (
              <Box sx={{ 
                mb: 1, px: 1.5, py: 1, 
                bgcolor: 'rgba(0,255,255,0.06)', 
                borderRadius: 2,
                border: '1px solid rgba(0,255,255,0.15)',
                animation: 'fadeIn 0.5s ease',
              }}>
                <Typography variant="body2" sx={{ color: 'var(--accent)', fontStyle: 'italic', fontWeight: 500, fontSize: '0.85rem' }}>
                  {vesperGreeting}
                </Typography>
              </Box>
            )}

            {/* Vesper Initiative Bubbles */}
            {vesperInitiatives.length > 0 && messages.length === 0 && (
              <Box sx={{ display: 'flex', gap: 0.75, mb: 1, overflowX: 'auto', px: 1, flexWrap: 'wrap' }}>
                {vesperInitiatives.map((init, i) => (
                  <Chip
                    key={`init-${i}`}
                    label={`💡 ${init}`}
                    onClick={() => {
                      setInput(init);
                      setVesperInitiatives([]);
                    }}
                    onDelete={() => setVesperInitiatives(prev => prev.filter((_, idx) => idx !== i))}
                    sx={{
                      bgcolor: 'rgba(255,0,255,0.08)',
                      backdropFilter: 'blur(5px)',
                      border: '1px solid rgba(255,0,255,0.25)',
                      color: '#ff66ff',
                      fontWeight: 500,
                      fontSize: '0.75rem',
                      '&:hover': { bgcolor: 'rgba(255,0,255,0.18)', transform: 'scale(1.02)' },
                      transition: 'all 0.2s ease',
                    }}
                  />
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
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className="input-bar glass-card"
              sx={{ display: 'flex', alignItems: 'center', gap: 1, position: 'relative' }}
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
              {/* Slash command menu */}
              {slashMenuOpen && (() => {
                const filtered = SLASH_CMD_LIST.filter(c => c.cmd.startsWith('/' + slashQuery));
                return filtered.length > 0 ? (
                  <Box sx={{
                    position: 'absolute', bottom: '100%', left: 0, right: 0, mb: 0.75,
                    bgcolor: 'rgba(5,10,20,0.97)', border: '1px solid rgba(var(--accent-rgb),0.35)',
                    borderRadius: 2, overflow: 'hidden', boxShadow: '0 -8px 30px rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(16px)', zIndex: 100,
                  }}>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', px: 1.5, py: 0.5, display: 'block', fontSize: '0.6rem', letterSpacing: 2, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      Slash Commands — ↑↓ navigate · Enter execute
                    </Typography>
                    {filtered.map((c, i) => (
                      <Box
                        key={c.cmd}
                        onClick={() => executeSlashCommand(c.cmd, input.slice(c.cmd.length))}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1,
                          cursor: 'pointer', transition: 'all 0.15s',
                          bgcolor: i === slashIdx ? 'rgba(var(--accent-rgb),0.12)' : 'transparent',
                          borderLeft: i === slashIdx ? '2px solid var(--accent)' : '2px solid transparent',
                          '&:hover': { bgcolor: 'rgba(var(--accent-rgb),0.08)' },
                        }}
                      >
                        <Box sx={{ fontSize: '1.1rem', width: 24, textAlign: 'center', flexShrink: 0 }}>{c.icon}</Box>
                        <Box>
                          <Typography sx={{ fontFamily: 'monospace', fontSize: '0.82rem', color: i === slashIdx ? 'var(--accent)' : '#e0e0e0', fontWeight: 600 }}>{c.cmd}</Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>{c.desc}</Typography>
                        </Box>
                        <Typography variant="caption" sx={{ ml: 'auto', color: 'rgba(255,255,255,0.2)', fontSize: '0.65rem', fontStyle: 'italic' }}>{c.hint}</Typography>
                      </Box>
                    ))}
                  </Box>
                ) : null;
              })()}
              <TextField
                inputRef={inputRef}
                fullWidth
                multiline
                maxRows={3}
                value={input}
                onChange={(e) => {
                  const val = e.target.value;
                  setInput(val);
                  if (val.match(/^\//)) {
                    const q = val.slice(1).split(' ')[0].toLowerCase();
                    setSlashQuery(q);
                    setSlashMenuOpen(true);
                    setSlashIdx(0);
                  } else {
                    setSlashMenuOpen(false);
                  }
                }}
                onPaste={handlePaste}
                onKeyDown={(e) => {
                  if (slashMenuOpen) {
                    const filtered = SLASH_CMD_LIST.filter(c => c.cmd.startsWith('/' + slashQuery));
                    if (e.key === 'ArrowDown') { e.preventDefault(); setSlashIdx(p => Math.min(p + 1, filtered.length - 1)); return; }
                    if (e.key === 'ArrowUp')   { e.preventDefault(); setSlashIdx(p => Math.max(p - 1, 0)); return; }
                    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); if (filtered[slashIdx]) executeSlashCommand(filtered[slashIdx].cmd, input.slice(filtered[slashIdx].cmd.length)); else setSlashMenuOpen(false); return; }
                    if (e.key === 'Escape')     { e.preventDefault(); setSlashMenuOpen(false); return; }
                  }
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
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
                    } else if (tool.id === 'sfx') {
                      setVoiceLabOpen(true); setVoiceLabTab('sfx');
                    } else if (tool.id === 'voiceClone') {
                      setVoiceLabOpen(true); setVoiceLabTab('clone');
                    } else if (tool.id === 'voiceIsolate') {
                      setVoiceLabOpen(true); setVoiceLabTab('isolate');
                    } else if (tool.id === 'voicePersonas') {
                      setVoiceLabOpen(true); setVoiceLabTab('personas');
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

            {/* ── Voice Lab Panel (ElevenLabs Tools) ───────────────────── */}
            {voiceLabOpen && (
              <Box sx={{
                mt: 1, p: 2,
                background: 'rgba(10,10,30,0.95)',
                border: '1px solid rgba(255,180,50,0.4)',
                borderRadius: 2,
                backdropFilter: 'blur(12px)',
                position: 'relative',
              }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#ffbb44', display: 'flex', alignItems: 'center', gap: 1 }}>
                    ★ Voice Lab — ElevenLabs
                  </Typography>
                  <IconButton size="small" onClick={() => setVoiceLabOpen(false)} sx={{ color: 'rgba(255,255,255,0.5)' }}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>

                {/* Tab Row */}
                <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5, flexWrap: 'wrap' }}>
                  {[
                    { key: 'sfx', label: '🔊 Sound FX', color: '#ffcc55' },
                    { key: 'clone', label: '🎙️ Clone Voice', color: '#cc88ff' },
                    { key: 'isolate', label: '🎛️ Isolate Voice', color: '#66ffbb' },
                    { key: 'personas', label: '🎭 Personas', color: 'var(--accent)' },
                  ].map(t => (
                    <Chip
                      key={t.key}
                      label={t.label}
                      size="small"
                      onClick={() => setVoiceLabTab(t.key)}
                      sx={{
                        bgcolor: voiceLabTab === t.key ? `${t.color}22` : 'rgba(255,255,255,0.05)',
                        color: voiceLabTab === t.key ? t.color : 'rgba(255,255,255,0.5)',
                        border: voiceLabTab === t.key ? `1px solid ${t.color}` : '1px solid rgba(255,255,255,0.1)',
                        fontWeight: voiceLabTab === t.key ? 700 : 500,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: `${t.color}15` },
                      }}
                    />
                  ))}
                </Box>

                {/* ── SFX Tab ── */}
                {voiceLabTab === 'sfx' && (
                  <Box>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mb: 1 }}>
                      Generate any sound effect from a text description using ElevenLabs AI
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                      <input
                        type="text"
                        placeholder="e.g. cyberpunk door opening, laser blast, rain on a tin roof..."
                        id="voicelab-sfx-input"
                        style={{
                          flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,180,50,0.3)',
                          borderRadius: 6, padding: '8px 12px', color: '#fff', fontSize: '0.85rem', outline: 'none',
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') document.getElementById('voicelab-sfx-go')?.click(); }}
                      />
                      <Button
                        id="voicelab-sfx-go"
                        size="small"
                        variant="contained"
                        onClick={async () => {
                          const input = document.getElementById('voicelab-sfx-input');
                          if (!input?.value.trim()) return;
                          setToast('⏳ Generating sound effect...');
                          try {
                            const res = await fetch(`${apiBase}/api/sfx/generate`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ prompt: input.value.trim(), duration: 5 }),
                            });
                            if (!res.ok) throw new Error((await res.json()).error || 'Failed');
                            const blob = await res.blob();
                            const url = URL.createObjectURL(blob);
                            const audio = new Audio(url);
                            audio.play();
                            audio.onended = () => URL.revokeObjectURL(url);
                            setToast('🔊 Playing sound effect!');
                          } catch (e) {
                            setToast('SFX Error: ' + e.message);
                          }
                        }}
                        sx={{ bgcolor: '#ffbb44', color: '#000', fontWeight: 700, minWidth: 80, '&:hover': { bgcolor: '#ffcc66' } }}
                      >
                        Generate
                      </Button>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {['Spaceship engine hum', 'Magical spell cast', 'Rain on cyberpunk city', 'Level up chime', 'Dramatic reveal', 'Laser beam charging', 'Digital glitch noise', 'Thunder rumble'].map(p => (
                        <Chip key={p} label={p} size="small"
                          onClick={() => { const i = document.getElementById('voicelab-sfx-input'); if (i) i.value = p; }}
                          sx={{ fontSize: '0.65rem', height: 22, bgcolor: 'rgba(255,180,50,0.1)', color: '#ffbb44', cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,180,50,0.2)' } }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                {/* ── Clone Voice Tab ── */}
                {voiceLabTab === 'clone' && (
                  <Box>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mb: 1 }}>
                      Upload audio samples to clone any voice. The cloned voice will appear in your voice picker.
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <input
                        type="text"
                        placeholder="Voice name (e.g. My Custom Voice)"
                        id="voicelab-clone-name"
                        defaultValue="VesperCustom"
                        style={{
                          flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(200,100,255,0.3)',
                          borderRadius: 6, padding: '8px 12px', color: '#fff', fontSize: '0.85rem', outline: 'none',
                        }}
                      />
                    </Box>
                    <Button
                      size="small"
                      variant="contained"
                      component="label"
                      fullWidth
                      sx={{ bgcolor: '#cc88ff', color: '#fff', fontWeight: 700, mb: 1, '&:hover': { bgcolor: '#dd99ff' } }}
                    >
                      🎙️ Upload Voice Samples (audio files)
                      <input type="file" hidden multiple accept="audio/*"
                        onChange={async (e) => {
                          const files = e.target.files;
                          if (!files?.length) return;
                          const name = document.getElementById('voicelab-clone-name')?.value || 'VesperCustom';
                          setToast('⏳ Cloning voice... this takes a moment');
                          const formData = new FormData();
                          formData.append('name', name);
                          formData.append('description', 'Custom cloned voice via Voice Lab');
                          Array.from(files).forEach(f => formData.append('files', f));
                          try {
                            const res = await fetch(`${apiBase}/api/voice/clone?name=${encodeURIComponent(name)}`, {
                              method: 'POST', body: formData,
                            });
                            const data = await res.json();
                            if (data.success) {
                              setToast('✅ Voice cloned! Check the voice picker.');
                              const vRes = await fetch(`${apiBase}/api/tts/voices`);
                              const vData = await vRes.json();
                              if (vData.voices) setCloudVoices(vData.voices);
                            } else {
                              setToast('Clone failed: ' + (data.error || 'Unknown error'));
                            }
                          } catch (err) { setToast('Clone error: ' + err.message); }
                        }}
                      />
                    </Button>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem' }}>
                      Tip: Upload at least 1 minute of clear speech for best results. Multiple files OK.
                    </Typography>
                  </Box>
                )}

                {/* ── Voice Isolation Tab ── */}
                {voiceLabTab === 'isolate' && (
                  <Box>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mb: 1 }}>
                      Remove background noise, music, and other sounds — isolate just the voice from any audio.
                    </Typography>
                    <Button
                      size="small"
                      variant="contained"
                      component="label"
                      fullWidth
                      sx={{ bgcolor: '#66ffbb', color: '#000', fontWeight: 700, mb: 1, '&:hover': { bgcolor: '#88ffcc' } }}
                    >
                      🎛️ Upload Audio to Clean
                      <input type="file" hidden accept="audio/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setToast('⏳ Isolating voice... removing background noise');
                          const formData = new FormData();
                          formData.append('file', file);
                          try {
                            const res = await fetch(`${apiBase}/api/voice/isolate`, {
                              method: 'POST', body: formData,
                            });
                            if (!res.ok) throw new Error((await res.json()).error || 'Failed');
                            const blob = await res.blob();
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `isolated_${file.name}`;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            const audio = new Audio(url);
                            audio.play();
                            audio.onended = () => URL.revokeObjectURL(url);
                            setToast('🎛️ Playing isolated voice! (also downloaded)');
                          } catch (err) { setToast('Isolation error: ' + err.message); }
                        }}
                      />
                    </Button>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem' }}>
                      Supported: MP3, WAV, M4A, OGG. The cleaned audio will auto-play and download.
                    </Typography>
                  </Box>
                )}

                {/* ── Voice Personas Tab (now includes main voice selector) ── */}
                {voiceLabTab === 'personas' && (
                  <Box>
                    {/* Main Voice Selector */}
                    <Typography variant="caption" sx={{ color: '#ffbb44', fontWeight: 700, display: 'block', mb: 0.5 }}>
                      🎙️ VESPER’S VOICE
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', display: 'block', mb: 1 }}>
                      Choose the default voice for all speech
                    </Typography>
                    <Box sx={{
                      maxHeight: 180, overflowY: 'auto', mb: 2, borderRadius: 1,
                      border: '1px solid rgba(255,180,50,0.2)', p: 1,
                      '&::-webkit-scrollbar': { width: 4 },
                      '&::-webkit-scrollbar-thumb': { background: '#ffbb44', borderRadius: 2 },
                    }}>
                      {cloudVoices.length > 0 ? cloudVoices.map((v) => {
                        const isActive = selectedVoiceName === v.id || (!selectedVoiceName && v.id === defaultVoiceId);
                        return (
                          <Box
                            key={v.id}
                            onClick={() => handleVoiceChange(v.id)}
                            sx={{
                              p: 0.75, px: 1, cursor: 'pointer', borderRadius: 1, mb: 0.25,
                              background: isActive ? 'rgba(0,255,136,0.15)' : 'rgba(255,180,50,0.04)',
                              borderLeft: isActive ? '3px solid #00ff88' : '3px solid rgba(255,180,50,0.3)',
                              '&:hover': { background: 'rgba(255,255,255,0.08)' },
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                              <Typography variant="caption" sx={{
                                color: isActive ? '#00ff88' : '#ffbb44', fontWeight: isActive ? 700 : 600, fontSize: '0.75rem',
                              }}>
                                {v.name}
                              </Typography>
                              {v.gender && (
                                <Typography variant="caption" sx={{
                                  fontSize: '0.55rem', px: 0.5, py: 0.1, borderRadius: 0.5,
                                  background: v.gender === 'Female' ? 'rgba(255,100,255,0.15)' : 'rgba(100,200,255,0.15)',
                                  color: v.gender === 'Female' ? '#ff88ff' : '#88ccff', fontWeight: 700,
                                }}>
                                  {v.gender === 'Female' ? '♀' : '♂'}
                                </Typography>
                              )}
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem' }}>
                                {v.locale || ''}{v.style ? ` • ${v.style}` : ''}
                              </Typography>
                              {v.preview_url && (
                                <IconButton
                                  size="small"
                                  onClick={(e) => { e.stopPropagation(); playVoicePreview(v.preview_url); }}
                                  sx={{ p: 0.25, color: 'rgba(255,180,50,0.5)', '&:hover': { color: '#ffbb44' } }}
                                >
                                  <PlayArrowIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                              )}
                            </Box>
                          </Box>
                        );
                      }) : (
                        <Box>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                            {voicesLoading ? '⏳ Loading voices...' : '⚠️ Could not load voices'}
                          </Typography>
                          {!voicesLoading && (
                            <Box onClick={() => fetchVoices()} sx={{ mt: 0.5, cursor: 'pointer', color: 'var(--accent)', fontSize: '0.7rem', textDecoration: 'underline' }}>↻ Retry</Box>
                          )}
                        </Box>
                      )}
                    </Box>

                    {/* Persona Assignments */}
                    <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.08)', pt: 1.5 }}>
                      <Typography variant="caption" sx={{ color: 'var(--accent)', fontWeight: 700, display: 'block', mb: 0.5 }}>
                        🎭 PERSONA VOICES
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', display: 'block', mb: 1 }}>
                        Override the voice for specific contexts (optional)
                      </Typography>
                      <PersonaAssigner apiBase={apiBase} cloudVoices={cloudVoices} setToast={setToast} playVoicePreview={playVoicePreview} />
                    </Box>
                  </Box>
                )}
              </Box>
            )}
          </section>

          <section className="ops-panel">
            {/* ═══ COCKPIT COMMAND CENTER ═══ */}
            <CockpitPanel />

            {/* Dashboard widgets row */}
            <Box className="panel-grid" sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 2, mt: 1 }}>
              <WeatherWidget />
              {showSystemStatus && (
                <div 
                  onClick={(e) => {
                    const target = e.target;
                    if (target.closest('.MuiSlider-root') || target.closest('button')) return;
                    setDiagnosticsOpen(true);
                  }} 
                  style={{ cursor: 'pointer' }}
                >
                  <SystemStatusCard apiBase={apiBase} onHide={() => setShowSystemStatus(false)} />
                </div>
              )}
              {!showSystemStatus && (
                <Button 
                  variant="outlined" size="small" 
                  onClick={() => setShowSystemStatus(true)}
                  sx={{ borderColor: 'var(--accent)', color: 'var(--accent)', width: '100%', height: '50px' }}
                >
                  Show System Widget
                </Button>
              )}
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

      {/* ─── FOCUS MODE OVERLAY ──────────────────────────────────────── */}
      {focusMode && (
        <Box sx={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(0,0,0,0.94)',
          backdropFilter: 'blur(14px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
        }}>
          <Typography sx={{ color: 'var(--accent)', fontSize: '0.7rem', letterSpacing: 5, textTransform: 'uppercase', opacity: 0.65 }}>
            {focusPhase === 'work' ? '⚡ FOCUS SESSION' : '☕ BREAK TIME'}
          </Typography>
          <Typography sx={{
            fontFamily: 'monospace', fontSize: '5.5rem', fontWeight: 100, color: '#fff', letterSpacing: '-3px',
            textShadow: '0 0 60px var(--accent), 0 0 20px var(--accent)',
            lineHeight: 1,
          }}>
            {String(Math.floor(focusTimeLeft / 60)).padStart(2, '0')}:{String(focusTimeLeft % 60).padStart(2, '0')}
          </Typography>
          {/* Task selector */}
          {!focusTask ? (
            <Select
              value=""
              displayEmpty
              size="small"
              onChange={(e) => { const t = tasks.find(x => x.title === e.target.value); if (t) setFocusTask(t); }}
              sx={{ minWidth: 260, color: 'rgba(255,255,255,0.6)', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.15)' }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--accent)' } }}
            >
              <MenuItem value="" disabled sx={{ color: 'rgba(255,255,255,0.3)' }}>🎯 Pick a task to focus on…</MenuItem>
              {tasks.filter(t => t.status !== 'done').map((t, i) => (
                <MenuItem key={i} value={t.title} sx={{ color: '#fff' }}>{t.title}</MenuItem>
              ))}
            </Select>
          ) : (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', letterSpacing: 3, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>Current Task</Typography>
              <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '1.1rem', maxWidth: 400, textAlign: 'center' }}>{focusTask.title}</Typography>
              <Button size="small" onClick={() => setFocusTask(null)} sx={{ color: 'rgba(255,255,255,0.3)', mt: 0.5, fontSize: '0.65rem' }}>change task</Button>
            </Box>
          )}
          {/* Progress bar */}
          <Box sx={{ width: 300, height: 2, bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 1, overflow: 'hidden', mt: 1 }}>
            <Box sx={{
              height: '100%', bgcolor: 'var(--accent)',
              width: `${(1 - focusTimeLeft / (focusPhase === 'work' ? 25*60 : 5*60)) * 100}%`,
              transition: 'width 1s linear',
              boxShadow: '0 0 8px var(--accent)',
            }} />
          </Box>
          {/* Controls */}
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="contained"
              onClick={() => { setFocusRunning(p => !p); if (!focusRunning && focusPhase === 'work') vesperReact('focusStart'); }}
              sx={{ bgcolor: 'var(--accent)', color: '#000', fontWeight: 700, minWidth: 110, '&:hover': { filter: 'brightness(1.15)', bgcolor: 'var(--accent)' } }}
            >
              {focusRunning ? '⏸ Pause' : '▶ Start'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => { setFocusRunning(false); setFocusTimeLeft(focusPhase === 'work' ? 25*60 : 5*60); }}
              sx={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.55)', '&:hover': { borderColor: 'rgba(255,255,255,0.35)' } }}
            >
              Reset
            </Button>
            <Button
              variant="text"
              onClick={() => { setFocusMode(false); setFocusRunning(false); setFocusPhase('work'); setFocusTimeLeft(25*60); }}
              sx={{ color: 'rgba(255,255,255,0.3)', '&:hover': { color: 'rgba(255,255,255,0.6)' } }}
            >
              Exit
            </Button>
          </Box>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>Ctrl+Shift+F to toggle</Typography>
        </Box>
      )}

      {/* ─── KEYBOARD SHORTCUTS MODAL ────────────────────────────────── */}
      <Dialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)}
        PaperProps={{ sx: { bgcolor: 'rgba(4,8,20,0.98)', border: '1px solid rgba(var(--accent-rgb),0.35)', borderRadius: 3, minWidth: 400 } }}
      >
        <DialogTitle sx={{ color: 'var(--accent)', fontWeight: 700, pb: 1 }}>⌨️ Keyboard Shortcuts</DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          {[
            { key: 'Ctrl + 1 – 5',       desc: 'Switch Chat / Research / Memory / Tasks / Settings' },
            { key: 'Ctrl + K',          desc: 'Open command palette' },
            { key: 'Ctrl + /',           desc: 'Toggle this shortcuts panel' },
            { key: 'Ctrl + Shift + F',   desc: 'Enter / exit Focus (Pomodoro) mode' },
            { key: 'Enter',              desc: 'Send chat message' },
            { key: 'Shift + Enter',      desc: 'New line in chat' },
            { key: '/ (in chat)',        desc: 'Slash commands: /task /remember /search /focus /export /stats' },
            { key: '↑ ↓ + Enter',         desc: 'Navigate and execute slash commands' },
            { key: 'Esc',                desc: 'Close any overlay' },
          ].map(({ key, desc }) => (
            <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: '1px solid rgba(255,255,255,0.05)', gap: 2 }}>
              <Box sx={{ fontFamily: 'monospace', bgcolor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', px: 1.5, py: 0.4, borderRadius: 1, fontSize: '0.78rem', color: 'var(--accent)', whiteSpace: 'nowrap', flexShrink: 0 }}>{key}</Box>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem' }}>{desc}</Typography>
            </Box>
          ))}
        </DialogContent>
      </Dialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={2800}
        onClose={() => { setToast(''); setToastVariant('default'); }}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        ContentProps={{
          className: 'toast-enter',
          sx: {
            background: toastVariant === 'celebrate'
              ? 'linear-gradient(135deg, rgba(255,200,0,0.22), rgba(255,100,0,0.15))'
              : toastVariant === 'success'
              ? `linear-gradient(135deg, rgba(var(--accent-rgb),0.2), rgba(0,180,80,0.12))`
              : toastVariant === 'warn'
              ? 'linear-gradient(135deg, rgba(255,150,0,0.2), rgba(200,80,0,0.12))'
              : `linear-gradient(135deg, rgba(var(--accent-rgb),0.15), rgba(0,136,255,0.15))`,
            border: toastVariant === 'celebrate'
              ? '1px solid rgba(255,200,0,0.45)'
              : `1px solid rgba(var(--accent-rgb),0.3)`,
            borderRadius: '12px',
            backdropFilter: 'blur(20px)',
            boxShadow: toastVariant === 'celebrate'
              ? '0 0 30px rgba(255,200,0,0.35), 0 8px 32px rgba(0,0,0,0.4)'
              : `0 0 30px rgba(var(--accent-rgb),0.3), 0 8px 32px rgba(0,0,0,0.4)`,
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

      {/* Thread Actions Context Menu */}
      <Menu
        anchorEl={threadMenuAnchor}
        open={Boolean(threadMenuAnchor)}
        onClose={() => { setThreadMenuAnchor(null); setThreadMenuThread(null); }}
        PaperProps={{ sx: { bgcolor: 'rgba(15,18,35,0.95)', border: '1px solid rgba(0,255,255,0.15)', backdropFilter: 'blur(12px)', minWidth: 180 } }}
      >
        {threadMenuThread && [
          <MenuItem key="rename" onClick={() => {
            startRenameThread(threadMenuThread.id, threadMenuThread.title);
            setThreadMenuAnchor(null); setThreadMenuThread(null);
          }} sx={{ color: '#fff', fontSize: '0.875rem', '&:hover': { bgcolor: 'rgba(0,255,255,0.1)' } }}>
            <EditIcon fontSize="small" sx={{ mr: 1.5, color: 'var(--accent)' }} /> Rename
          </MenuItem>,
          <MenuItem key="pin" onClick={() => {
            togglePinThread(threadMenuThread.id);
            setThreadMenuAnchor(null); setThreadMenuThread(null);
          }} sx={{ color: '#fff', fontSize: '0.875rem', '&:hover': { bgcolor: 'rgba(0,255,255,0.1)' } }}>
            {threadMenuThread.pinned
              ? <><PinIcon fontSize="small" sx={{ mr: 1.5, color: 'var(--accent)' }} /> Unpin</>
              : <><PinOutlinedIcon fontSize="small" sx={{ mr: 1.5, color: 'rgba(255,255,255,0.6)' }} /> Pin</>
            }
          </MenuItem>,
          <MenuItem key="export" onClick={(e) => {
            setExportThreadData({ id: threadMenuThread.id, title: threadMenuThread.title });
            setExportMenuAnchor(e.currentTarget);
            setThreadMenuAnchor(null); setThreadMenuThread(null);
          }} sx={{ color: '#fff', fontSize: '0.875rem', '&:hover': { bgcolor: 'rgba(0,255,255,0.1)' } }}>
            <DownloadIcon fontSize="small" sx={{ mr: 1.5, color: 'rgba(255,255,255,0.6)' }} /> Export
          </MenuItem>,
          <Divider key="divider" sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />,
          <MenuItem key="delete" onClick={() => {
            deleteThread(threadMenuThread.id);
            playSound('click');
            setThreadMenuAnchor(null); setThreadMenuThread(null);
          }} sx={{ color: '#ff4444', fontSize: '0.875rem', '&:hover': { bgcolor: 'rgba(255,68,68,0.1)' } }}>
            <DeleteIcon fontSize="small" sx={{ mr: 1.5 }} /> Delete
          </MenuItem>,
        ]}
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

      {/* Background Studio */}
      <BackgroundStudio
        open={backgroundStudioOpen}
        onClose={() => setBackgroundStudioOpen(false)}
        apiBase={apiBase}
        setToast={setToast}
        activeTheme={activeTheme}
        customBackground={customBackground}
        setCustomBackground={setCustomBackground}
        backgroundGallery={backgroundGallery}
        setBackgroundGallery={setBackgroundGallery}
        backgroundSettings={backgroundSettings}
        setBackgroundSettings={setBackgroundSettings}
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

      {/* Floating Zoom Control — bottom-right of screen */}
      <Box sx={{
        position: 'fixed', bottom: 16, right: 16, zIndex: 9999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5,
        bgcolor: 'rgba(8, 12, 24, 0.85)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2,
        p: 0.5, opacity: 0.6, transition: 'opacity 0.2s ease',
        '&:hover': { opacity: 1 },
      }}>
        <IconButton
          size="small"
          onClick={() => { const v = Math.min(uiScale + 0.1, 1.5); setUiScale(v); localStorage.setItem('vesper_ui_scale', v.toString()); }}
          sx={{ color: 'var(--accent)', width: 28, height: 28, '&:hover': { bgcolor: 'rgba(0,255,255,0.1)' } }}
        >
          <ZoomInIcon sx={{ fontSize: 16 }} />
        </IconButton>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.55rem', lineHeight: 1, userSelect: 'none' }}>
          {Math.round(uiScale * 100)}%
        </Typography>
        <IconButton
          size="small"
          onClick={() => { const v = Math.max(uiScale - 0.1, 0.5); setUiScale(v); localStorage.setItem('vesper_ui_scale', v.toString()); }}
          sx={{ color: 'var(--accent)', width: 28, height: 28, '&:hover': { bgcolor: 'rgba(0,255,255,0.1)' } }}
        >
          <ZoomOutIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      </Box>
    </ThemeProvider>
  );
}

export default App;
