import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Typography, TextField, Button, Grid, IconButton, 
  Chip, Card, CardContent, CardActions, Divider, Tabs, Tab,
  Dialog, DialogTitle, DialogContent, DialogActions, Fab, Stack
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon, 
  Delete as DeleteIcon, 
  Edit as EditIcon,
  Close as CloseIcon,
  AutoAwesome as AutoAwesomeIcon,
  Book as BookIcon,
  Public as PublicIcon,
  Person as PersonIcon,
  Image as ImageIcon
} from '@mui/icons-material';

const SECTIONS = [
  { id: 'characters', label: 'Characters', icon: <PersonIcon />, fields: ['name', 'role', 'description', 'traits'] },
  { id: 'worlds', label: 'Worlds', icon: <PublicIcon />, fields: ['name', 'climate', 'description', 'landmarks'] },
  { id: 'stories', label: 'Stories', icon: <BookIcon />, fields: ['title', 'genre', 'logline', 'status'] },
  { id: 'moodboards', label: 'Moodboards', icon: <ImageIcon />, fields: ['title', 'style', 'description'] }
];

export default function NyxShift({ apiBase, onClose }) {
  const [activeTab, setActiveTab] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [form, setForm] = useState({});
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  const activeSection = SECTIONS[activeTab];

  useEffect(() => {
    fetchItems();
  }, [activeTab]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/nyxshift/${activeSection.id}`);
      if (res.ok) setItems(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (index) => {
    try {
      await fetch(`${apiBase}/api/nyxshift/${activeSection.id}/${index}`, { method: 'DELETE' });
      setItems(prev => prev.filter((_, i) => i !== index));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch(`${apiBase}/api/nyxshift/${activeSection.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setForm({});
        setDetailsOpen(false);
        fetchItems();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const brainstormWithAI = async () => {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);
    // Simulate AI generation for now or hook into efficient chat
    // For now we'll just append a note that AI would generate this
    const aiData = {};
    activeSection.fields.forEach(f => aiData[f] = `AI generated content based on: ${aiPrompt}`);
    setForm(aiData);
    setAiGenerating(false);
  };

  return (
    <Paper 
      sx={{ 
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
        zIndex: 1300, bgcolor: '#080a18', display: 'flex', flexDirection: 'column' 
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(0,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'rgba(0,0,0,0.5)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={onClose} sx={{ color: 'var(--accent)' }}><ArrowBackIcon /></IconButton>
          <AutoAwesomeIcon sx={{ color: 'var(--accent)', fontSize: 32 }} />
          <Typography variant="h5" sx={{ fontFamily: 'Orbitron, sans-serif', color: '#fff', letterSpacing: 2 }}>
            NYXSHIFT
          </Typography>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar Tabs */}
        <Box sx={{ width: 200, borderRight: '1px solid rgba(255,255,255,0.1)' }}>
          <Tabs 
            orientation="vertical" 
            value={activeTab} 
            onChange={(e, v) => setActiveTab(v)}
            sx={{ 
              '& .MuiTab-root': { alignItems: 'flex-start', textAlign: 'left', pl: 3, py: 2, color: 'rgba(255,255,255,0.5)' },
              '& .Mui-selected': { color: 'var(--accent) !important' },
              '& .MuiTabs-indicator': { bgcolor: 'var(--accent)', width: 4 }
            }}
          >
            {SECTIONS.map((s, i) => (
              <Tab key={s.id} icon={s.icon} iconPosition="start" label={s.label} />
            ))}
          </Tabs>
        </Box>

        {/* Content Area */}
        <Box sx={{ flex: 1, p: 4, overflowY: 'auto', bgcolor: 'rgba(0,0,0,0.2)' }}>
           
           <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
             <Typography variant="h4" sx={{ color: '#fff', fontWeight: 300 }}>
               {activeSection.label} Database
             </Typography>
             <Button 
               variant="contained" 
               startIcon={<AddIcon />}
               onClick={() => { setForm({}); setDetailsOpen(true); }}
               sx={{ bgcolor: 'var(--accent)', color: '#000', fontWeight: 'bold' }}
             >
               Create New
             </Button>
           </Box>

           <Grid container spacing={3}>
             {items.map((item, index) => (
               <Grid item xs={12} md={6} lg={4} key={index}>
                 <Card sx={{ bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
                   <CardContent>
                     <Typography variant="h6" sx={{ color: 'var(--accent)', mb: 1 }}>
                       {item.name || item.title || 'Untitled'}
                     </Typography>
                     {activeSection.fields.slice(1).map(f => (
                       item[f] && (
                         <Typography key={f} variant="body2" sx={{ mb: 1, color: 'rgba(255,255,255,0.7)' }}>
                           <strong>{f.charAt(0).toUpperCase() + f.slice(1)}:</strong> {item[f]}
                         </Typography>
                       )
                     ))}
                   </CardContent>
                   <CardActions>
                     <Button size="small" startIcon={<EditIcon />} onClick={() => { setForm(item); setDetailsOpen(true); }}>Edit</Button>
                     <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => handleDelete(index)}>Delete</Button>
                   </CardActions>
                 </Card>
               </Grid>
             ))}
             {items.length === 0 && !loading && (
               <Box sx={{ width: '100%', textAlign: 'center', py: 8, opacity: 0.5 }}>
                 <Typography variant="h6">No entries yet.</Typography>
                 <Typography>Start building your {activeSection.label.toLowerCase()}!</Typography>
               </Box>
             )}
           </Grid>
        </Box>
      </Box>

      {/* Editor Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#1a1b26', color: '#fff' } }}>
        <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          {form.timestamp ? 'Edit' : 'New'} {activeSection.label.slice(0, -1)}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2} sx={{ mt: 2 }}>
            {/* AI Brainstormer */}
            <Paper sx={{ p: 2, bgcolor: 'rgba(0,255,255,0.05)', border: '1px dashed var(--accent)' }}>
               <Typography variant="subtitle2" sx={{ color: 'var(--accent)', mb: 1 }}>✨ AI Brainstorming</Typography>
               <Box sx={{ display: 'flex', gap: 1 }}>
                 <TextField 
                   fullWidth size="small" 
                   placeholder={`"A cyberpunk detective with a robotic arm..."`}
                   value={aiPrompt}
                   onChange={e => setAiPrompt(e.target.value)}
                   sx={{ input: { color: '#fff' } }}
                 />
                 <Button variant="outlined" onClick={brainstormWithAI} disabled={aiGenerating}>
                   {aiGenerating ? '...' : 'Fill'}
                 </Button>
               </Box>
            </Paper>

            {activeSection.fields.map(field => (
              <TextField
                key={field}
                label={field.charAt(0).toUpperCase() + field.slice(1)}
                fullWidth
                multiline={field === 'description' || field === 'content'}
                rows={field === 'description' ? 3 : 1}
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
          <Button onClick={() => setDetailsOpen(false)} sx={{ color: 'rgba(255,255,255,0.5)' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} sx={{ bgcolor: 'var(--accent)', color: '#000' }}>Save Entry</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
