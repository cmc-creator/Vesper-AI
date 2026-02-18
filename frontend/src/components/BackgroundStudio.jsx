import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Stack, Button, IconButton, TextField, Dialog,
  Chip, Tooltip, CircularProgress, Slider, Switch, Tab, Tabs,
  Grid, Paper, Menu, MenuItem,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  PhotoLibrary,
  Wallpaper,
  CloudUpload,
  Link as LinkIcon,
  Shuffle as ShuffleIcon,
  Visibility,
  VisibilityOff,
  Download as DownloadIcon,
  AutoFixHigh,
  Palette,
  Opacity as OpacityIcon,
  BlurOn,
  Refresh,
  Star,
  StarBorder,
  Category,
} from '@mui/icons-material';

// ─── Preset Background Collections ────────────────────────────
const BACKGROUND_PRESETS = {
  cyberpunk: {
    label: '🌆 Cyberpunk',
    desc: 'Neon-lit cityscapes & digital aesthetics',
    backgrounds: [
      { id: 'cyber-1', name: 'Neon Alley', url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1920&q=80', tags: ['neon', 'gradient'] },
      { id: 'cyber-2', name: 'Night City', url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1920&q=80', tags: ['city', 'night'] },
      { id: 'cyber-3', name: 'Digital Rain', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80', tags: ['tech', 'data'] },
      { id: 'cyber-4', name: 'Neon Grid', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1920&q=80', tags: ['retro', 'grid'] },
    ],
  },
  nature: {
    label: '🌿 Nature',
    desc: 'Forests, mountains & organic landscapes',
    backgrounds: [
      { id: 'nat-1', name: 'Misty Forest', url: 'https://images.unsplash.com/photo-1440342359743-84fcb8c21c38?w=1920&q=80', tags: ['forest', 'mist'] },
      { id: 'nat-2', name: 'Mountain Lake', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80', tags: ['mountain', 'lake'] },
      { id: 'nat-3', name: 'Northern Lights', url: 'https://images.unsplash.com/photo-1483347756197-71ef80e95f73?w=1920&q=80', tags: ['aurora', 'sky'] },
      { id: 'nat-4', name: 'Ocean Waves', url: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1920&q=80', tags: ['ocean', 'water'] },
    ],
  },
  liminal: {
    label: '🚪 Liminal Spaces',
    desc: 'Eerie, dreamlike transitional spaces',
    backgrounds: [
      { id: 'lim-1', name: 'Empty Mall', url: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=1920&q=80', tags: ['interior', 'empty'] },
      { id: 'lim-2', name: 'Long Corridor', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&q=80', tags: ['hallway', 'perspective'] },
      { id: 'lim-3', name: 'Foggy Road', url: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=1920&q=80', tags: ['fog', 'path'] },
      { id: 'lim-4', name: 'Stairwell', url: 'https://images.unsplash.com/photo-1520209759809-a9bcb6cb3241?w=1920&q=80', tags: ['stairs', 'abstract'] },
    ],
  },
  cosmic: {
    label: '🌌 Cosmic',
    desc: 'Space, nebulae & celestial wonders',
    backgrounds: [
      { id: 'cos-1', name: 'Deep Space', url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1920&q=80', tags: ['space', 'stars'] },
      { id: 'cos-2', name: 'Nebula', url: 'https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?w=1920&q=80', tags: ['nebula', 'color'] },
      { id: 'cos-3', name: 'Galaxy', url: 'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=1920&q=80', tags: ['galaxy', 'spiral'] },
      { id: 'cos-4', name: 'Moon Surface', url: 'https://images.unsplash.com/photo-1522030299830-16b8d3d049fe?w=1920&q=80', tags: ['moon', 'surface'] },
    ],
  },
  abstract: {
    label: '🎨 Abstract',
    desc: 'Artistic gradients & patterns',
    backgrounds: [
      { id: 'abs-1', name: 'Fluid Art', url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1920&q=80', tags: ['fluid', 'art'] },
      { id: 'abs-2', name: 'Smoke Waves', url: 'https://images.unsplash.com/photo-1553356084-58ef4a67b2a7?w=1920&q=80', tags: ['smoke', 'dark'] },
      { id: 'abs-3', name: 'Color Splash', url: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=1920&q=80', tags: ['color', 'paint'] },
      { id: 'abs-4', name: 'Geometric', url: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=1920&q=80', tags: ['geo', 'pattern'] },
    ],
  },
  dark: {
    label: '🖤 Dark & Moody',
    desc: 'Shadow-rich atmospheric scenes',
    backgrounds: [
      { id: 'drk-1', name: 'Dark Concrete', url: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1920&q=80', tags: ['texture', 'minimal'] },
      { id: 'drk-2', name: 'Rainy Window', url: 'https://images.unsplash.com/photo-1501691223387-dd0500403074?w=1920&q=80', tags: ['rain', 'mood'] },
      { id: 'drk-3', name: 'Shadow Play', url: 'https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=1920&q=80', tags: ['shadow', 'contrast'] },
      { id: 'drk-4', name: 'Eclipse', url: 'https://images.unsplash.com/photo-1532693322450-2cb5c511067d?w=1920&q=80', tags: ['eclipse', 'dark'] },
    ],
  },
};

// ─── Background Studio Component ──────────────────────────────
export default function BackgroundStudio({ 
  open, onClose, apiBase, setToast, activeTheme,
  customBackground, setCustomBackground,
  backgroundGallery, setBackgroundGallery,
  backgroundSettings, setBackgroundSettings,
}) {
  const [activeTab, setActiveTab] = useState(0);
  const [urlInput, setUrlInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('cyberpunk');
  const [rotateEnabled, setRotateEnabled] = useState(false);
  const [rotateInterval, setRotateInterval] = useState(30); // minutes
  const fileInputRef = useRef(null);

  // Load gallery from backend on open
  useEffect(() => {
    if (open) loadGallery();
  }, [open]);

  // Load rotation settings from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('vesper_bg_rotate');
      if (saved) {
        const parsed = JSON.parse(saved);
        setRotateEnabled(parsed.enabled || false);
        setRotateInterval(parsed.interval || 30);
      }
    } catch (e) {}
  }, []);

  const loadGallery = async () => {
    try {
      const res = await fetch(`${apiBase}/api/backgrounds`);
      if (res.ok) {
        const data = await res.json();
        setBackgroundGallery(data.backgrounds || []);
      }
    } catch (e) { console.log('Gallery load skipped'); }
  };

  const saveToGallery = async (bg) => {
    try {
      const res = await fetch(`${apiBase}/api/backgrounds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bg),
      });
      if (res.ok) {
        const data = await res.json();
        setBackgroundGallery(prev => [...prev, data.background || bg]);
        setToast(`🖼️ "${bg.name}" saved to gallery!`);
      }
    } catch (e) { setToast('Failed to save — backend may be offline'); }
  };

  const deleteFromGallery = async (bgId) => {
    try {
      await fetch(`${apiBase}/api/backgrounds/${bgId}`, { method: 'DELETE' });
      setBackgroundGallery(prev => prev.filter(b => b.id !== bgId));
      if (customBackground?.id === bgId) setCustomBackground(null);
      setToast('🗑️ Background removed');
    } catch (e) { setToast('Delete failed'); }
  };

  const applyBackground = (bg) => {
    setCustomBackground({
      id: bg.id,
      url: bg.url,
      name: bg.name,
      category: bg.category || 'custom',
    });
    try {
      localStorage.setItem('vesper_custom_bg', JSON.stringify({
        id: bg.id, url: bg.url, name: bg.name, category: bg.category || 'custom',
      }));
    } catch (e) {}
    setToast(`✨ Background: ${bg.name}`);
  };

  const clearBackground = () => {
    setCustomBackground(null);
    try { localStorage.removeItem('vesper_custom_bg'); } catch (e) {}
    setToast('🔄 Background cleared — using theme default');
  };

  const handleUrlAdd = async () => {
    const url = urlInput.trim();
    if (!url) return;
    const name = nameInput.trim() || 'Web Image';
    const bg = {
      id: `web-${Date.now()}`,
      name,
      url,
      category: 'web',
      source: 'url',
      addedAt: new Date().toISOString(),
    };
    await saveToGallery(bg);
    applyBackground(bg);
    setUrlInput('');
    setNameInput('');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    
    try {
      // Convert to base64 data URL for local storage
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target.result;
        const bg = {
          id: `upload-${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          url: dataUrl,
          category: 'upload',
          source: 'file',
          addedAt: new Date().toISOString(),
        };
        await saveToGallery(bg);
        applyBackground(bg);
        setLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setToast('Upload failed: ' + err.message);
      setLoading(false);
    }
  };

  const handlePresetApply = (preset, category) => {
    const bg = {
      ...preset,
      category,
      source: 'preset',
    };
    applyBackground(bg);
  };

  const handlePresetSave = async (preset, category) => {
    const bg = {
      ...preset,
      category,
      source: 'preset',
      addedAt: new Date().toISOString(),
    };
    await saveToGallery(bg);
  };

  const randomBackground = () => {
    const allPresets = Object.entries(BACKGROUND_PRESETS).flatMap(
      ([cat, data]) => data.backgrounds.map(bg => ({ ...bg, category: cat }))
    );
    const saved = backgroundGallery || [];
    const all = [...allPresets, ...saved];
    if (all.length === 0) return;
    const pick = all[Math.floor(Math.random() * all.length)];
    applyBackground(pick);
  };

  const toggleRotation = (enabled) => {
    setRotateEnabled(enabled);
    try {
      localStorage.setItem('vesper_bg_rotate', JSON.stringify({ enabled, interval: rotateInterval }));
    } catch (e) {}
    if (enabled) {
      setToast(`🔄 Background rotation ON — every ${rotateInterval} min`);
    } else {
      setToast('⏸️ Background rotation OFF');
    }
  };

  const updateSettings = (key, value) => {
    const updated = { ...(backgroundSettings || {}), [key]: value };
    setBackgroundSettings(updated);
    try { localStorage.setItem('vesper_bg_settings', JSON.stringify(updated)); } catch (e) {}
  };

  const opacity = backgroundSettings?.opacity ?? 0.3;
  const blur = backgroundSettings?.blur ?? 0;
  const overlay = backgroundSettings?.overlay ?? true;

  // ─── Background Card ─────────────────────────────
  const BgCard = ({ bg, category, isSaved, isActive }) => (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        paddingTop: '56.25%', // 16:9 aspect
        borderRadius: 2,
        overflow: 'hidden',
        cursor: 'pointer',
        border: isActive ? '2px solid var(--accent)' : '2px solid rgba(255,255,255,0.06)',
        boxShadow: isActive ? '0 0 15px rgba(0,255,255,0.3)' : 'none',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: 'var(--accent)',
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        },
        '&:hover .bg-card-actions': { opacity: 1 },
      }}
      onClick={() => handlePresetApply(bg, category)}
    >
      <Box
        sx={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${bg.url})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      {/* Overlay */}
      <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 40%, rgba(0,0,0,0.8))' }} />
      
      {/* Active badge */}
      {isActive && (
        <Box sx={{
          position: 'absolute', top: 6, left: 6,
          bgcolor: 'var(--accent)', color: '#000',
          fontSize: '0.55rem', fontWeight: 800,
          px: 0.75, py: 0.25, borderRadius: 1,
        }}>
          ACTIVE
        </Box>
      )}

      {/* Name */}
      <Typography sx={{
        position: 'absolute', bottom: 6, left: 8, right: 8,
        color: '#fff', fontSize: '0.7rem', fontWeight: 600,
        textShadow: '0 1px 3px rgba(0,0,0,0.8)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {bg.name}
      </Typography>

      {/* Actions overlay */}
      <Box className="bg-card-actions" sx={{
        position: 'absolute', top: 4, right: 4,
        display: 'flex', gap: 0.25, opacity: 0,
        transition: 'opacity 0.2s',
      }}>
        {!isSaved && (
          <Tooltip title="Save to gallery">
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); handlePresetSave(bg, category); }}
              sx={{ bgcolor: 'rgba(0,0,0,0.6)', color: '#fff', width: 24, height: 24, '&:hover': { bgcolor: 'rgba(0,255,255,0.3)' } }}
            >
              <StarBorder sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        )}
        {isSaved && (
          <Tooltip title="Remove from gallery">
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); deleteFromGallery(bg.id); }}
              sx={{ bgcolor: 'rgba(0,0,0,0.6)', color: '#ff4444', width: 24, height: 24, '&:hover': { bgcolor: 'rgba(255,0,0,0.3)' } }}
            >
              <DeleteIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'rgba(8, 8, 18, 0.97)',
          backdropFilter: 'blur(30px)',
          border: '1px solid rgba(0,255,255,0.15)',
          borderRadius: '20px',
          maxHeight: '85vh',
          overflow: 'hidden',
        }
      }}
    >
      <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Wallpaper /> Background Studio
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mt: 0.25 }}>
              {customBackground
                ? `Active: ${customBackground.name}`
                : 'Using theme default — pick a background to customize'
              }
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Random background">
              <IconButton onClick={randomBackground} sx={{ color: 'var(--accent)' }}>
                <ShuffleIcon />
              </IconButton>
            </Tooltip>
            {customBackground && (
              <Button
                size="small"
                onClick={clearBackground}
                sx={{ color: '#ff6666', textTransform: 'none', fontSize: '0.75rem' }}
              >
                Clear
              </Button>
            )}
            <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.5)' }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Current background preview */}
        {customBackground && (
          <Box sx={{
            mb: 2, borderRadius: 2, overflow: 'hidden',
            height: 120, position: 'relative',
            border: '1px solid rgba(0,255,255,0.15)',
          }}>
            <Box sx={{
              position: 'absolute', inset: 0,
              backgroundImage: `url(${customBackground.url})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
              filter: blur > 0 ? `blur(${blur}px)` : 'none',
              opacity: 1 - opacity,
            }} />
            {overlay && (
              <Box sx={{ position: 'absolute', inset: 0, background: activeTheme?.bg || '#000', opacity: opacity }} />
            )}
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography sx={{ color: '#fff', fontWeight: 700, textShadow: '0 2px 8px rgba(0,0,0,0.8)', fontSize: '0.85rem' }}>
                Preview — {customBackground.name}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            mb: 2, minHeight: 36,
            '& .MuiTab-root': { minHeight: 36, textTransform: 'none', fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)' },
            '& .Mui-selected': { color: 'var(--accent) !important' },
            '& .MuiTabs-indicator': { bgcolor: 'var(--accent)' },
          }}
        >
          <Tab label="🌆 Presets" />
          <Tab label="⭐ My Gallery" />
          <Tab label="🔗 From URL" />
          <Tab label="📁 Upload" />
          <Tab label="⚙️ Settings" />
        </Tabs>

        {/* Tab Content */}
        <Box sx={{ flex: 1, overflowY: 'auto', pr: 0.5, '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { background: 'var(--accent)', borderRadius: 2 } }}>
          
          {/* ─── Presets Tab ─── */}
          {activeTab === 0 && (
            <Box>
              {/* Category chips */}
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
                {Object.entries(BACKGROUND_PRESETS).map(([catId, cat]) => (
                  <Chip
                    key={catId}
                    label={cat.label}
                    size="small"
                    onClick={() => setSelectedCategory(catId)}
                    sx={{
                      bgcolor: selectedCategory === catId ? 'rgba(0,255,255,0.15)' : 'rgba(255,255,255,0.04)',
                      color: selectedCategory === catId ? 'var(--accent)' : 'rgba(255,255,255,0.6)',
                      border: selectedCategory === catId ? '1px solid var(--accent)' : '1px solid transparent',
                      fontWeight: 600, fontSize: '0.75rem',
                      '&:hover': { bgcolor: 'rgba(0,255,255,0.1)' },
                    }}
                  />
                ))}
              </Box>

              {/* Background grid for selected category */}
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', mb: 1, display: 'block' }}>
                {BACKGROUND_PRESETS[selectedCategory]?.desc}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 1.5 }}>
                {(BACKGROUND_PRESETS[selectedCategory]?.backgrounds || []).map((bg) => {
                  const isSaved = backgroundGallery.some(g => g.id === bg.id);
                  const isActive = customBackground?.id === bg.id;
                  return <BgCard key={bg.id} bg={bg} category={selectedCategory} isSaved={isSaved} isActive={isActive} />;
                })}
              </Box>
            </Box>
          )}

          {/* ─── Gallery Tab ─── */}
          {activeTab === 1 && (
            <Box>
              {backgroundGallery.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6, color: 'rgba(255,255,255,0.3)' }}>
                  <PhotoLibrary sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
                  <Typography variant="body2">No saved backgrounds yet</Typography>
                  <Typography variant="caption">Save presets, upload images, or add URLs to build your gallery</Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 1.5 }}>
                  {backgroundGallery.map((bg) => (
                    <BgCard key={bg.id} bg={bg} category={bg.category} isSaved isActive={customBackground?.id === bg.id} />
                  ))}
                </Box>
              )}
            </Box>
          )}

          {/* ─── URL Tab ─── */}
          {activeTab === 2 && (
            <Stack spacing={2}>
              <Box sx={{ p: 2, border: '1px solid rgba(0,255,255,0.15)', borderRadius: 2, bgcolor: 'rgba(0,255,255,0.03)' }}>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 1.5, color: 'var(--accent)' }}>
                  🔗 Add from URL
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', display: 'block', mb: 1.5 }}>
                  Paste any image URL — Unsplash, Pinterest, or direct image links
                </Typography>
                <Stack spacing={1}>
                  <TextField
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    size="small"
                    fullWidth
                    InputProps={{
                      startAdornment: <LinkIcon sx={{ color: 'rgba(255,255,255,0.3)', mr: 0.5, fontSize: 18 }} />,
                      sx: { color: '#fff', bgcolor: 'rgba(0,0,0,0.3)', borderRadius: 1 },
                    }}
                  />
                  <TextField
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Background name (optional)"
                    size="small"
                    fullWidth
                    InputProps={{
                      sx: { color: '#fff', bgcolor: 'rgba(0,0,0,0.3)', borderRadius: 1 },
                    }}
                  />
                  <Button
                    variant="contained"
                    onClick={handleUrlAdd}
                    disabled={!urlInput.trim()}
                    sx={{ bgcolor: 'var(--accent)', color: '#000', fontWeight: 700, '&:hover': { bgcolor: 'var(--accent)', filter: 'brightness(1.2)' } }}
                  >
                    Add & Apply
                  </Button>
                </Stack>

                {/* URL Preview */}
                {urlInput.trim() && (
                  <Box sx={{ mt: 1.5, borderRadius: 1, overflow: 'hidden', height: 120, position: 'relative' }}>
                    <Box sx={{
                      position: 'absolute', inset: 0,
                      backgroundImage: `url(${urlInput.trim()})`,
                      backgroundSize: 'cover', backgroundPosition: 'center',
                    }} />
                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', p: 1, background: 'linear-gradient(transparent 50%, rgba(0,0,0,0.7))' }}>
                      <Typography sx={{ color: '#fff', fontSize: '0.65rem', opacity: 0.6 }}>Preview</Typography>
                    </Box>
                  </Box>
                )}
              </Box>

              {/* Quick Unsplash suggestions */}
              <Box>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', mb: 1, display: 'block' }}>
                  💡 Try Unsplash — just search on unsplash.com, copy image URL, and paste above
                </Typography>
              </Box>
            </Stack>
          )}

          {/* ─── Upload Tab ─── */}
          {activeTab === 3 && (
            <Stack spacing={2}>
              <Box
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  p: 4, textAlign: 'center', cursor: 'pointer',
                  border: '2px dashed rgba(0,255,255,0.2)',
                  borderRadius: 3, bgcolor: 'rgba(0,255,255,0.02)',
                  transition: 'all 0.2s',
                  '&:hover': { borderColor: 'var(--accent)', bgcolor: 'rgba(0,255,255,0.05)' },
                }}
              >
                {loading ? (
                  <CircularProgress size={36} sx={{ color: 'var(--accent)' }} />
                ) : (
                  <>
                    <CloudUpload sx={{ fontSize: 48, color: 'var(--accent)', mb: 1, opacity: 0.6 }} />
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                      Click to upload an image
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)' }}>
                      JPG, PNG, WebP — any resolution
                    </Typography>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleFileUpload}
                />
              </Box>

              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
                Images are stored as base64 data URLs for instant loading
              </Typography>
            </Stack>
          )}

          {/* ─── Settings Tab ─── */}
          {activeTab === 4 && (
            <Stack spacing={2.5}>
              {/* Overlay opacity */}
              <Box sx={{ p: 2, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, bgcolor: 'rgba(255,255,255,0.02)' }}>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: 'var(--accent)' }}>
                  Theme Overlay Opacity
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', display: 'block', mb: 1 }}>
                  How much the theme gradient covers the background image
                </Typography>
                <Slider
                  value={opacity}
                  onChange={(_, v) => updateSettings('opacity', v)}
                  min={0} max={0.9} step={0.05}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(v) => `${Math.round(v * 100)}%`}
                  sx={{
                    color: 'var(--accent)',
                    '& .MuiSlider-valueLabel': { bgcolor: 'var(--accent)', color: '#000' },
                  }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)' }}>Image visible</Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)' }}>Theme dominant</Typography>
                </Box>
              </Box>

              {/* Blur */}
              <Box sx={{ p: 2, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, bgcolor: 'rgba(255,255,255,0.02)' }}>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: 'var(--accent)' }}>
                  Background Blur
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', display: 'block', mb: 1 }}>
                  Soften the background image for readability
                </Typography>
                <Slider
                  value={blur}
                  onChange={(_, v) => updateSettings('blur', v)}
                  min={0} max={20} step={1}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(v) => `${v}px`}
                  sx={{
                    color: 'var(--accent)',
                    '& .MuiSlider-valueLabel': { bgcolor: 'var(--accent)', color: '#000' },
                  }}
                />
              </Box>

              {/* Theme overlay toggle */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2 }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>Theme Color Overlay</Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                    Blend theme gradient over the background
                  </Typography>
                </Box>
                <Switch
                  checked={overlay}
                  onChange={(e) => updateSettings('overlay', e.target.checked)}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--accent)' },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: 'var(--accent)' },
                  }}
                />
              </Box>

              {/* Rotation */}
              <Box sx={{ p: 2, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, bgcolor: 'rgba(255,255,255,0.02)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#ffaa00' }}>🔄 Auto-Rotate</Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                      Automatically cycle through gallery backgrounds
                    </Typography>
                  </Box>
                  <Switch
                    checked={rotateEnabled}
                    onChange={(e) => toggleRotation(e.target.checked)}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': { color: '#ffaa00' },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#ffaa00' },
                    }}
                  />
                </Box>
                {rotateEnabled && (
                  <>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', display: 'block', mb: 0.5 }}>
                      Change every {rotateInterval} minutes
                    </Typography>
                    <Slider
                      value={rotateInterval}
                      onChange={(_, v) => {
                        setRotateInterval(v);
                        try { localStorage.setItem('vesper_bg_rotate', JSON.stringify({ enabled: true, interval: v })); } catch (e) {}
                      }}
                      min={5} max={120} step={5}
                      valueLabelDisplay="auto"
                      valueLabelFormat={(v) => `${v}m`}
                      sx={{ color: '#ffaa00' }}
                    />
                  </>
                )}
              </Box>
            </Stack>
          )}
        </Box>
      </Box>
    </Dialog>
  );
}
