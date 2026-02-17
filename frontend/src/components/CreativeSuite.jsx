import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  AutoAwesome as AutoAwesomeIcon,
  Folder as FolderIcon,
  OpenInNew as OpenIcon,
} from '@mui/icons-material';
import NyxShift from './NyxShift';

const DEFAULT_PROJECTS = [
  {
    id: 'nyxshift',
    name: 'NyxShift',
    description: 'Characters, worlds, stories, and moodboards for creative worldbuilding.',
    icon: '✨',
    color: '#9d00ff',
    builtIn: true,
  },
];

export default function CreativeSuite({ apiBase, onBack }) {
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', icon: '📁', color: '#00d0ff' });
  const [editIndex, setEditIndex] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('vesper_creative_projects');
    if (saved) {
      try {
        const custom = JSON.parse(saved);
        setProjects([...DEFAULT_PROJECTS, ...custom]);
      } catch {
        setProjects([...DEFAULT_PROJECTS]);
      }
    } else {
      setProjects([...DEFAULT_PROJECTS]);
    }
  }, []);

  const saveCustom = (list) => {
    const custom = list.filter(p => !p.builtIn);
    localStorage.setItem('vesper_creative_projects', JSON.stringify(custom));
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    const entry = { ...form, id: form.name.toLowerCase().replace(/\s+/g, '-'), builtIn: false };
    let updated;
    if (editIndex !== null) {
      updated = [...projects];
      updated[editIndex] = { ...updated[editIndex], ...entry };
    } else {
      updated = [...projects, entry];
    }
    setProjects(updated);
    saveCustom(updated);
    setDialogOpen(false);
    setForm({ name: '', description: '', icon: '📁', color: '#00d0ff' });
    setEditIndex(null);
  };

  const handleDelete = (idx) => {
    const updated = projects.filter((_, i) => i !== idx);
    setProjects(updated);
    saveCustom(updated);
  };

  // ── If a project is open, show it ──
  if (activeProject === 'nyxshift') {
    return <NyxShift apiBase={apiBase} onClose={() => setActiveProject(null)} />;
  }

  // ── Custom project detail (placeholder workspace) ──
  if (activeProject) {
    const proj = projects.find(p => p.id === activeProject);
    return (
      <Paper
        sx={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 1300, bgcolor: '#080a18', display: 'flex', flexDirection: 'column',
        }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(0,255,255,0.2)', display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'rgba(0,0,0,0.5)' }}>
          <IconButton onClick={() => setActiveProject(null)} sx={{ color: 'var(--accent)' }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" sx={{ fontFamily: 'Orbitron, sans-serif', color: '#fff', letterSpacing: 2 }}>
            {proj?.icon} {proj?.name}
          </Typography>
        </Box>
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
          <Box sx={{ textAlign: 'center', maxWidth: 420 }}>
            <Typography sx={{ fontSize: 64, mb: 2 }}>{proj?.icon || '📁'}</Typography>
            <Typography variant="h5" sx={{ color: '#fff', mb: 1 }}>{proj?.name}</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.5)', mb: 3 }}>{proj?.description}</Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.3)' }}>
              Project workspace coming soon — use NyxShift for full creative tools.
            </Typography>
          </Box>
        </Box>
      </Paper>
    );
  }

  // ── Main hub ──
  const ICONS = ['📁', '🎮', '🎬', '📖', '🎵', '🖼️', '🏰', '🚀', '🌌', '💎', '🐉', '⚔️'];

  return (
    <Paper
      sx={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 1300, bgcolor: '#080a18', display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(0,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'rgba(0,0,0,0.5)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={onBack} sx={{ color: 'var(--accent)' }}>
            <ArrowBackIcon />
          </IconButton>
          <AutoAwesomeIcon sx={{ color: 'var(--accent)', fontSize: 32 }} />
          <Typography variant="h5" sx={{ fontFamily: 'Orbitron, sans-serif', color: '#fff', letterSpacing: 2 }}>
            CREATIVE SUITE
          </Typography>
          <Chip label={`${projects.length} projects`} size="small" sx={{ bgcolor: 'rgba(0,255,255,0.12)', color: 'var(--accent)' }} />
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => { setForm({ name: '', description: '', icon: '📁', color: '#00d0ff' }); setEditIndex(null); setDialogOpen(true); }}
          sx={{ bgcolor: 'var(--accent)', color: '#000', fontWeight: 700 }}
        >
          New Project
        </Button>
      </Box>

      {/* Project Grid */}
      <Box sx={{ flex: 1, p: 4, overflowY: 'auto' }}>
        <Grid container spacing={3}>
          {projects.map((proj, idx) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={proj.id}>
              <Card
                sx={{
                  bgcolor: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${proj.color || 'rgba(255,255,255,0.1)'}30`,
                  color: '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  '&:hover': {
                    borderColor: proj.color || 'var(--accent)',
                    transform: 'translateY(-4px)',
                    boxShadow: `0 8px 30px ${proj.color || 'rgba(0,255,255,0.2)'}40`,
                  },
                }}
                onClick={() => setActiveProject(proj.id)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Box sx={{
                      width: 48, height: 48, borderRadius: 2,
                      bgcolor: `${proj.color || '#00d0ff'}20`,
                      border: `1px solid ${proj.color || '#00d0ff'}40`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 24,
                    }}>
                      {proj.icon || '📁'}
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem', color: proj.color || 'var(--accent)' }}>
                        {proj.name}
                      </Typography>
                      {proj.builtIn && (
                        <Chip label="Built-in" size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }} />
                      )}
                    </Box>
                  </Box>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
                    {proj.description || 'No description'}
                  </Typography>
                </CardContent>
                <CardActions sx={{ px: 2, pb: 1.5, justifyContent: 'space-between' }}>
                  <Button
                    size="small"
                    startIcon={<OpenIcon fontSize="small" />}
                    onClick={(e) => { e.stopPropagation(); setActiveProject(proj.id); }}
                    sx={{ color: proj.color || 'var(--accent)', fontWeight: 600 }}
                  >
                    Open
                  </Button>
                  {!proj.builtIn && (
                    <Box>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); setForm(proj); setEditIndex(idx); setDialogOpen(true); }} sx={{ color: 'rgba(255,255,255,0.4)' }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDelete(idx); }} sx={{ color: '#ff6b6b' }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* New / Edit Project Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#1a1b26', color: '#fff' } }}>
        <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          {editIndex !== null ? 'Edit Project' : 'New Project'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Project Name"
              fullWidth
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              sx={{ input: { color: '#fff' }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' } }}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              sx={{ '& .MuiInputBase-input': { color: '#fff' }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' } }}
            />
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'rgba(255,255,255,0.5)' }}>Icon</Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                {ICONS.map(ic => (
                  <Box
                    key={ic}
                    onClick={() => setForm({ ...form, icon: ic })}
                    sx={{
                      width: 40, height: 40, borderRadius: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, cursor: 'pointer',
                      bgcolor: form.icon === ic ? 'rgba(0,255,255,0.15)' : 'rgba(255,255,255,0.04)',
                      border: form.icon === ic ? '1px solid var(--accent)' : '1px solid transparent',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                    }}
                  >
                    {ic}
                  </Box>
                ))}
              </Stack>
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'rgba(255,255,255,0.5)' }}>Color</Typography>
              <Stack direction="row" spacing={1}>
                {['#00d0ff', '#9d00ff', '#ff6b35', '#00ff88', '#ff2d55', '#ffcc00'].map(c => (
                  <Box
                    key={c}
                    onClick={() => setForm({ ...form, color: c })}
                    sx={{
                      width: 32, height: 32, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                      border: form.color === c ? '3px solid #fff' : '2px solid transparent',
                      boxShadow: form.color === c ? `0 0 12px ${c}` : 'none',
                      transition: 'all 0.2s',
                    }}
                  />
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: 'rgba(255,255,255,0.5)' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} sx={{ bgcolor: 'var(--accent)', color: '#000' }}>
            {editIndex !== null ? 'Save Changes' : 'Create Project'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
