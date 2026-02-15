import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Typography, TextField, Button, Grid, IconButton, 
  Chip, Card, CardContent, CardActions, Divider, Tabs, Tab,
  Dialog, DialogTitle, DialogContent, DialogActions, Fab, Stack
} from '@mui/material';
import { 
  Add as AddIcon, 
  Delete as DeleteIcon, 
  Edit as EditIcon,
  Close as CloseIcon,
  AutoAwesome as AutoAwesomeIcon,
  Bolt as BoltIcon,
  SportsEsports,
  RecordVoiceOver
} from '@mui/icons-material';

const SECTIONS = [
  { id: 'style', label: 'Style & Vibe', icon: <AutoAwesomeIcon />, fields: ['outfit_description', 'vibe', 'occasion'] },
  { id: 'comebacks', label: 'Comebacks', icon: <RecordVoiceOver />, fields: ['line', 'context', 'savage_level'] },
  { id: 'boosts', label: 'Confidence Boosts', icon: <BoltIcon />, fields: ['boost', 'trigger', 'intensity'] },
  { id: 'entertainment', label: 'Entertainment', icon: <SportsEsports />, fields: ['game_or_challenge', 'rules', 'difficulty'] }
];

export default function Sassy({ apiBase, onClose }) {
  const [activeTab, setActiveTab] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [form, setForm] = useState({});
  const [editingIdx, setEditingIdx] = useState(null);

  const activeSection = SECTIONS[activeTab];

  useEffect(() => {
    fetchItems();
  }, [activeTab]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/sassy/${activeSection.id}`);
      if (res.ok) setItems(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const method = editingIdx !== null ? 'PUT' : 'POST';
      const url = editingIdx !== null 
        ? `${apiBase}/api/sassy/${activeSection.id}/${editingIdx}`
        : `${apiBase}/api/sassy/${activeSection.id}`;
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        setDetailsOpen(false);
        fetchItems();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (idx) => {
    if (!window.confirm('Trash this?')) return;
    try {
      await fetch(`${apiBase}/api/sassy/${activeSection.id}/${idx}`, { method: 'DELETE' });
      fetchItems();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Paper className="intel-board glass-card" sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 0 }}>
      {/* Header */}
      <Box className="board-header" sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Digital Wardrobe</Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            Manage Vesper's style, comebacks, and entertainment modules.
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: 'rgba(255,255,255,0.7)' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Tabs */}
      <Tabs 
        value={activeTab} 
        onChange={(_, v) => setActiveTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ 
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          '& .MuiTab-root': { color: 'rgba(255,255,255,0.6)', minHeight: 48 },
          '& .Mui-selected': { color: 'var(--accent)' },
          '& .MuiTabs-indicator': { bgcolor: 'var(--accent)' }
        }}
      >
        {SECTIONS.map((section, idx) => (
          <Tab 
            key={section.id} 
            icon={section.icon} 
            iconPosition="start" 
            label={section.label} 
          />
        ))}
      </Tabs>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 3, bgcolor: 'rgba(0,0,0,0.2)' }}>
        <Grid container spacing={2}>
          {items.map((item, idx) => (
            <Grid item xs={12} sm={6} md={4} key={idx}>
              <Card sx={{ 
                bgcolor: 'rgba(255,255,255,0.05)', 
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.2s',
                '&:hover': { transform: 'translateY(-2px)', borderColor: 'var(--accent)' }
              }}>
                <CardContent sx={{ flex: 1 }}>
                  {Object.keys(item).filter(k => k !== 'timestamp').slice(0, 3).map(key => (
                    <Box key={key} sx={{ mb: 1 }}>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
                        {key.replace(/_/g, ' ')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {item[key]}
                      </Typography>
                    </Box>
                  ))}
                </CardContent>
                <CardActions sx={{ borderTop: '1px solid rgba(255,255,255,0.05)', justifyContent: 'flex-end' }}>
                  <IconButton size="small" onClick={() => { setForm(item); setEditingIdx(idx); setDetailsOpen(true); }} sx={{ color: 'var(--accent)' }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(idx)} sx={{ color: '#ff4444' }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
          {items.length === 0 && !loading && (
            <Box sx={{ width: '100%', textAlign: 'center', py: 8, opacity: 0.5 }}>
              <Typography>No items in this collection yet. Time to style it up!</Typography>
            </Box>
          )}
        </Grid>
      </Box>

      {/* FAB */}
      <Fab 
        color="primary" 
        onClick={() => { setForm({}); setEditingIdx(null); setDetailsOpen(true); }}
        sx={{ 
          position: 'absolute', 
          bottom: 24, 
          right: 24,
          bgcolor: 'var(--accent)',
          '&:hover': { bgcolor: 'var(--glow)' }
        }}
      >
        <AddIcon />
      </Fab>

      {/* Edit/Create Dialog */}
      <Dialog 
        open={detailsOpen} 
        onClose={() => setDetailsOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#1a1a1a',
            color: '#fff',
            border: '1px solid var(--accent)',
            backgroundImage: 'none'
          }
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          {editingIdx !== null ? 'Remix' : 'New'} {activeSection.label} Item
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2} sx={{ mt: 2 }}>
            {activeSection.fields.map(field => (
              <TextField
                key={field}
                label={field.replace(/_/g, ' ').toUpperCase()}
                fullWidth
                multiline={field === 'description' || field === 'line' || field === 'boost' || field === 'rules'}
                rows={2}
                value={form[field] || ''}
                onChange={e => setForm({ ...form, [field]: e.target.value })}
                variant="outlined"
                sx={{ 
                  '& .MuiInputBase-input': { color: '#fff' },
                  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' }
                }}
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <Button onClick={() => setDetailsOpen(false)} sx={{ color: 'rgba(255,255,255,0.5)' }}>Discard</Button>
          <Button variant="contained" onClick={handleSave} sx={{ bgcolor: 'var(--accent)', color: '#000' }}>Stitch It</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
