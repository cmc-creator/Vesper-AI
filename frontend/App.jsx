// --- Tasks Panel ---
function TasksPanel() {
  const [tasks, setTasks] = useState([]);
  const [task, setTask] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`${API}/tasks`)
      .then(r=>r.ok ? r.json() : [])
      .then(data=>{ setTasks(data); setLoading(false); })
      .catch(()=>{ setTasks([]); setLoading(false); });
  }, []);
  const addTask = async () => {
    if (!task.trim()) return;
    const newTask = { content: task, completed: false, timestamp: new Date().toISOString() };
    await fetch(`${API}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTask)
    });
    setTasks(t=>[...t, newTask]);
    setTask('');
  };
  const toggleTask = async (idx) => {
    const updated = [...tasks];
    updated[idx].completed = !updated[idx].completed;
    setTasks(updated);
    await fetch(`${API}/tasks/${idx}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated[idx])
    });
  };
  const deleteTask = async (idx) => {
    await fetch(`${API}/tasks/${idx}`, { method: 'DELETE' });
    setTasks(tasks => tasks.filter((_,i)=>i!==idx));
  };
  return (
    <Paper sx={{ p: 2, mt: 3, background: '#23213a', color: '#fff' }}>
      <Typography variant="h6">Project & Task Manager</Typography>
      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
        <TextField fullWidth variant="outlined" value={task} onChange={e=>setTask(e.target.value)} placeholder="Add a new task..." sx={{ background: '#fff', borderRadius: 1 }} />
        <Button variant="contained" onClick={addTask}>Add</Button>
      </Box>
      {loading ? <Typography>Loading...</Typography> : (
        <List>
          {tasks.map((t,i)=>(
            <ListItem key={i} secondaryAction={
              <>
                <Button color="success" onClick={()=>toggleTask(i)}>{t.completed ? 'Undo' : 'Done'}</Button>
                <Button color="error" onClick={()=>deleteTask(i)}>Delete</Button>
              </>
            }>
              <ListItemText primary={<span style={{textDecoration:t.completed?'line-through':'none'}}>{t.content}</span>} secondary={t.timestamp} />
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );
}
// Temporary header to fix missing component error
function StarlightHeader() {
  return (
    <Box sx={{ p: 2, textAlign: 'center', background: '#23213a', color: '#fff' }}>
      <Typography variant="h4">✨ VESPER ✨</Typography>
      <Typography variant="subtitle1">Your Bad Bitch Bestie</Typography>
    </Box>
  );
}


import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, TextField, Button, Paper, List, ListItem, ListItemText, Chip, Slider, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';

// --- MoodEnergy component (added to fix missing reference) ---
function MoodEnergy() {
  const [mood, setMood] = useState('');
  const [energy, setEnergy] = useState(0.75);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editMood, setEditMood] = useState('');
  const [editEnergy, setEditEnergy] = useState(0.75);

  useEffect(() => {
    fetch(`${API}/vesper/mood`)
      .then(r => r.ok ? r.json() : { mood: 'Unknown', energy: 0.75, last_updated: null })
      .then(data => {
        setMood(data.mood || 'Unknown');
        setEnergy(data.energy || 0.75);
        setLastUpdated(data.last_updated);
      })
      .catch(() => {
        setMood('Unknown');
        setEnergy(0.75);
      });
  }, []);

  const openEdit = () => {
    setEditMood(mood);
    setEditEnergy(energy);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    await fetch(`${API}/vesper/mood`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mood: editMood, energy: editEnergy })
    });
    setMood(editMood);
    setEnergy(editEnergy);
    setLastUpdated(new Date().toISOString());
    setEditOpen(false);
  };

  return (
    <Paper sx={{ p: 2, mt: 3, background: '#23213a', color: '#fff' }}>
      <Typography variant="h6">Vesper's Mood & Energy</Typography>
      <Typography>Mood: <b>{mood}</b></Typography>
      <Typography>Energy: <b>{Math.round(energy*100)}%</b></Typography>
      <Typography variant="caption">Last updated: {lastUpdated && new Date(lastUpdated).toLocaleString()}</Typography>
      <Button variant="outlined" sx={{ mt: 1 }} onClick={openEdit}>Edit</Button>
      <Dialog open={editOpen} onClose={()=>setEditOpen(false)}>
        <DialogTitle>Edit Mood & Energy</DialogTitle>
        <DialogContent>
          <TextField label="Mood" fullWidth value={editMood} onChange={e=>setEditMood(e.target.value)} sx={{ my: 1 }} />
          <Typography gutterBottom>Energy</Typography>
          <Slider value={editEnergy} min={0} max={1} step={0.01} onChange={(_,v)=>setEditEnergy(v)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setEditOpen(false)}>Cancel</Button>
          <Button onClick={saveEdit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}


// --- Web Search Panel ---
function WebSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/search-web?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data);
    } catch (e) {
      setResults({ error: e.message });
    }
    setLoading(false);
  };

  return (
    <Paper sx={{ p: 2, mt: 3, background: '#23213a', color: '#fff' }}>
      <Typography variant="h6">Web Search (via DuckDuckGo)</Typography>
      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
        <TextField 
          fullWidth 
          variant="outlined" 
          value={query} 
          onChange={e=>setQuery(e.target.value)} 
          placeholder="Search the web..." 
          sx={{ background: '#fff', borderRadius: 1 }}
          onKeyPress={e => e.key === 'Enter' && handleSearch()}
        />
        <Button variant="contained" onClick={handleSearch} disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </Button>
      </Box>
      {results && (
        <Box sx={{ mt: 2 }}>
          {results.error ? (
            <Typography color="error">{results.error}</Typography>
          ) : (
            <>
              {results.abstract && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1"><b>{results.query}</b></Typography>
                  <Typography>{results.abstract}</Typography>
                  {results.abstract_url && (
                    <Typography variant="caption">
                      Source: <a href={results.abstract_url} target="_blank" rel="noopener noreferrer" style={{color:'#66d9ef'}}>{results.abstract_source}</a>
                    </Typography>
                  )}
                </Box>
              )}
              {results.related_topics && results.related_topics.length > 0 && (
                <Box>
                  <Typography variant="subtitle2">Related:</Typography>
                  <List dense>
                    {results.related_topics.map((t,i)=>(
                      <ListItem key={i}>
                        <a href={t.url} target="_blank" rel="noopener noreferrer" style={{color:'#66d9ef'}}>{t.text}</a>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </>
          )}
        </Box>
      )}
    </Paper>
  );
}


function ResearchPanel() {
  const [research, setResearch] = useState([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [topic, setTopic] = useState('');
  const [summary, setSummary] = useState('');
  useEffect(() => {
    fetch(`${API}/research`)
      .then(r=>r.ok ? r.json() : [])
      .then(setResearch)
      .catch(()=>setResearch([]));
  }, []);
  const handleSearch = async () => {
    if (!query.trim()) return;
    const res = await fetch(`${API}/research/search?q=${encodeURIComponent(query)}`);
    if (res.ok) {
      setResults(await res.json());
    } else {
      setResults([]);
    }
  };
  const addResearch = async () => {
    if (!topic.trim() || !summary.trim()) return;
    await fetch(`${API}/research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, summary })
    });
    setResearch(r=>[...r, { topic, summary, timestamp: new Date().toISOString() }]);
    setTopic(''); setSummary('');
  };
  return (
    <Paper sx={{ p: 2, mt: 3, background: '#23213a', color: '#fff' }}>
      <Typography variant="h6">Vesper Research & Learning</Typography>
      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
        <TextField fullWidth variant="outlined" value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Topic..." sx={{ background: '#fff', borderRadius: 1 }} />
        <TextField fullWidth variant="outlined" value={summary} onChange={e=>setSummary(e.target.value)} placeholder="Summary..." sx={{ background: '#fff', borderRadius: 1 }} />
        <Button variant="contained" onClick={addResearch}>Add</Button>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
        <TextField fullWidth variant="outlined" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search research..." sx={{ background: '#fff', borderRadius: 1 }} />
        <Button variant="contained" onClick={handleSearch}>Search</Button>
      </Box>
      <List>
        {(results.length>0?results:research).map((r,i)=>(
          <ListItem key={i}><ListItemText primary={r.topic} secondary={r.summary + (r.timestamp?` (${r.timestamp})`:'')} /></ListItem>
        ))}
      </List>
    </Paper>
  );

}


function AvatarStyle() {
  const [style, setStyle] = useState({});
  const [avatar, setAvatar] = useState({});
  const [theme, setTheme] = useState('evening');
  const [personalItems, setPersonalItems] = useState([]);
  const [wardrobe, setWardrobe] = useState([]);
  const [outfit, setOutfit] = useState('elegant');
  const [expression, setExpression] = useState('confident');
  const [customItem, setCustomItem] = useState('');
  const [newTheme, setNewTheme] = useState('evening');
  const fileInput = useRef();
  useEffect(() => {
    fetch(`${API}/style`)
      .then(r=>r.ok ? r.json() : {})
      .then(data=>{
        setStyle(data);
        setAvatar(data.avatar||{});
        setTheme(data.themes?.current||'evening');
        setPersonalItems(data.personal_items||[]);
        setWardrobe(data.wardrobe||[]);
        setOutfit(data.avatar?.outfit||'elegant');
        setExpression(data.avatar?.expression||'confident');
      })
      .catch(()=>{
        // Set defaults if fetch fails
        setStyle({});
        setAvatar({});
      });
  }, []);
  const updateAvatar = (field, value) => {
    const updated = { ...avatar, [field]: value };
    setAvatar(updated);
    fetch(`${API}/style/avatar`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated)
    });
  };
  const changeTheme = t => {
    setTheme(t);
    fetch(`${API}/style/theme`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(t)
    });
  };
  const addPersonalItem = () => {
    if (!customItem.trim()) return;
    fetch(`${API}/style/personal-item`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item: customItem })
    });
    setPersonalItems(i=>[...i, { item: customItem }]);
    setCustomItem('');
  };
  const addWardrobeItem = () => {
    if (!customItem.trim()) return;
    fetch(`${API}/style/wardrobe`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item: customItem })
    });
    setWardrobe(w=>[...w, { item: customItem }]);
    setCustomItem('');
  };
  // Avatar SVG (placeholder, can be replaced with real art)
  const avatarSVG = (
    <svg width="120" height="160" viewBox="0 0 120 160">
      <ellipse cx="60" cy="60" rx="40" ry="55" fill="#222" />
      <ellipse cx="60" cy="60" rx="38" ry="53" fill="#2d2a4a" />
      <ellipse cx="60" cy="60" rx="30" ry="45" fill="#fff" fillOpacity="0.05" />
      <ellipse cx="60" cy="60" rx="28" ry="43" fill="#222" />
      <ellipse cx="60" cy="60" rx="26" ry="41" fill="#3e3a6d" />
      {/* Hair */}
      <ellipse cx="60" cy="40" rx="28" ry="18" fill="#181726" />
      {/* Eyes */}
      <ellipse cx="48" cy="60" rx="5" ry="8" fill="#fff" />
      <ellipse cx="72" cy="60" rx="5" ry="8" fill="#fff" />
      <ellipse cx="48" cy="62" rx="2" ry="3" fill="#222" />
      <ellipse cx="72" cy="62" rx="2" ry="3" fill="#222" />
      {/* Expression (mouth) */}
      {expression==='confident' && <path d="M50 80 Q60 90 70 80" stroke="#fff" strokeWidth="2" fill="none" />}
      {expression==='sass' && <path d="M50 80 Q60 75 70 80" stroke="#fff" strokeWidth="2" fill="none" />}
      {expression==='warm' && <path d="M50 80 Q60 95 70 80" stroke="#fff" strokeWidth="2" fill="none" />}
      {/* Outfit (color block) */}
      <rect x="30" y="100" width="60" height="40" rx="20" fill={outfit==='elegant'?"#6a4eae":outfit==='edgy'?"#222":outfit==='sleek'?"#bdbdbd":"#e0a96d"} />
    </svg>
  );
  return (
    <Paper sx={{ p: 2, mt: 3, background: '#181726', color: '#fff' }}>
      <Typography variant="h6">Vesper's Avatar & Style</Typography>
      <Box sx={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
        <Box>{avatarSVG}</Box>
        <Box>
          <Typography>Outfit:</Typography>
          <Button onClick={()=>{setOutfit('elegant');updateAvatar('outfit','elegant')}} variant={outfit==='elegant'?'contained':'outlined'}>Elegant</Button>
          <Button onClick={()=>{setOutfit('edgy');updateAvatar('outfit','edgy')}} variant={outfit==='edgy'?'contained':'outlined'}>Edgy</Button>
          <Button onClick={()=>{setOutfit('sleek');updateAvatar('outfit','sleek')}} variant={outfit==='sleek'?'contained':'outlined'}>Sleek</Button>
          <Button onClick={()=>{setOutfit('cozy');updateAvatar('outfit','cozy')}} variant={outfit==='cozy'?'contained':'outlined'}>Cozy</Button>
        </Box>
        <Box>
          <Typography>Expression:</Typography>
          <Button onClick={()=>{setExpression('confident');updateAvatar('expression','confident')}} variant={expression==='confident'?'contained':'outlined'}>Confident</Button>
          <Button onClick={()=>{setExpression('sass');updateAvatar('expression','sass')}} variant={expression==='sass'?'contained':'outlined'}>Sass</Button>
          <Button onClick={()=>{setExpression('warm');updateAvatar('expression','warm')}} variant={expression==='warm'?'contained':'outlined'}>Warm</Button>
        </Box>
      </Box>
      <Box sx={{ mt: 2 }}>
        <Typography>Theme:</Typography>
        {['evening','cozy','sleek','seasonal_spring','seasonal_summer','seasonal_autumn','seasonal_winter'].map(t=>(
          <Button key={t} onClick={()=>changeTheme(t)} variant={theme===t?'contained':'outlined'} sx={{ mr: 1 }}>{t.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}</Button>
        ))}
      </Box>
      <Box sx={{ mt: 2 }}>
        <Typography>Personal Items:</Typography>
        <List>{personalItems.map((i,idx)=>(<ListItem key={idx}><ListItemText primary={i.item} /></ListItem>))}</List>
        <TextField value={customItem} onChange={e=>setCustomItem(e.target.value)} placeholder="Add item..." sx={{ background: '#fff', borderRadius: 1, mr: 1 }} />
        <Button onClick={addPersonalItem}>Add</Button>
      </Box>
      <Box sx={{ mt: 2 }}>
        <Typography>Wardrobe:</Typography>
        <List>{wardrobe.map((i,idx)=>(<ListItem key={idx}><ListItemText primary={i.item} /></ListItem>))}</List>
        <TextField value={customItem} onChange={e=>setCustomItem(e.target.value)} placeholder="Add outfit..." sx={{ background: '#fff', borderRadius: 1, mr: 1 }} />
        <Button onClick={addWardrobeItem}>Add</Button>
      </Box>
    </Paper>
  );
}
function SassySection({ type, label, fields }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({});
  useEffect(() => {
    fetch(`${API}/sassy/${type}`)
      .then(r=>r.ok ? r.json() : [])
      .then(setItems)
      .catch(()=>setItems([]));
  }, []);
  const handleChange = (f, v) => setForm(o=>({...o, [f]:v}));
  const addItem = async () => {
    if (!fields.every(f=>form[f])) return;
    await fetch(`${API}/sassy/${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    setItems(i=>[...i, { ...form, timestamp: new Date().toISOString() }]);
    setForm({});
  };
  const deleteItem = async idx => {
    await fetch(`${API}/sassy/${type}/${idx}`, { method: 'DELETE' });
    setItems(i=>i.filter((_,i2)=>i2!==idx));
  };
  return (
    <Paper sx={{ p: 2, mt: 3, background: '#3e3a6d', color: '#fff' }}>
      <Typography variant="h6">{label}</Typography>
      <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
        {fields.map(f=>(
          <TextField key={f} label={f} value={form[f]||''} onChange={e=>handleChange(f,e.target.value)} sx={{ background: '#fff', borderRadius: 1, mb: 1 }} />
        ))}
        <Button variant="contained" onClick={addItem}>Add</Button>
      </Box>
      <List>
        {items.map((item,i)=>(
          <ListItem key={i} secondaryAction={<Button color="error" onClick={()=>deleteItem(i)}>Delete</Button>}>
            <ListItemText primary={fields.map(f=>item[f]).filter(Boolean).join(' | ')} secondary={item.timestamp} />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}
function BestieSection({ type, label, fields }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({});
  useEffect(() => {
    fetch(`${API}/bestie/${type}`)
      .then(r=>r.ok ? r.json() : [])
      .then(setItems)
      .catch(()=>setItems([]));
  }, []);
  const handleChange = (f, v) => setForm(o=>({...o, [f]:v}));
  const addItem = async () => {
    if (!fields.every(f=>form[f])) return;
    await fetch(`${API}/bestie/${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    setItems(i=>[...i, { ...form, timestamp: new Date().toISOString() }]);
    setForm({});
  };
  const deleteItem = async idx => {
    await fetch(`${API}/bestie/${type}/${idx}`, { method: 'DELETE' });
    setItems(i=>i.filter((_,i2)=>i2!==idx));
  };
  return (
    <Paper sx={{ p: 2, mt: 3, background: '#3e3a6d', color: '#fff' }}>
      <Typography variant="h6">{label}</Typography>
      <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
        {fields.map(f=>(
          <TextField key={f} label={f} value={form[f]||''} onChange={e=>handleChange(f,e.target.value)} sx={{ background: '#fff', borderRadius: 1, mb: 1 }} />
        ))}
        <Button variant="contained" onClick={addItem}>Add</Button>
      </Box>
      <List>
        {items.map((item,i)=>(
          <ListItem key={i} secondaryAction={<Button color="error" onClick={()=>deleteItem(i)}>Delete</Button>}>
            <ListItemText primary={fields.map(f=>item[f]).filter(Boolean).join(' | ')} secondary={item.timestamp} />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}

function MoodReading() {
  const [mood, setMood] = useState('Unknown');
  const [energy, setEnergy] = useState(0.75);
  useEffect(() => {
    fetch(`${API}/bestie/mood-reading`)
      .then(r=>r.ok ? r.json() : { mood: 'Unknown', energy: 0.75 })
      .then(data=>{
        setMood(data.mood || 'Unknown');
        setEnergy(data.energy || 0.75);
      })
      .catch(()=>{
        setMood('Unknown');
        setEnergy(0.75);
      });
  }, []);
  return (
    <Paper sx={{ p: 2, mt: 3, background: '#23213a', color: '#fff' }}>
      <Typography variant="h6">Mood Reading</Typography>
      <Typography>Mood: <b>{mood}</b></Typography>
      <Typography>Energy: <b>{Math.round(energy*100)}%</b></Typography>
    </Paper>
  );
}
function GrowthSection({ type, label, fields }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({});
  useEffect(() => {
    fetch(`${API}/growth/${type}`)
      .then(r=>r.ok ? r.json() : [])
      .then(setItems)
      .catch(()=>setItems([]));
  }, []);
  const handleChange = (f, v) => setForm(o=>({...o, [f]:v}));
  const addItem = async () => {
    if (!fields.every(f=>form[f])) return;
    await fetch(`${API}/growth/${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    setItems(i=>[...i, { ...form, timestamp: new Date().toISOString() }]);
    setForm({});
  };
  const deleteItem = async idx => {
    await fetch(`${API}/growth/${type}/${idx}`, { method: 'DELETE' });
    setItems(i=>i.filter((_,i2)=>i2!==idx));
  };
  return (
    <Paper sx={{ p: 2, mt: 3, background: '#23213a', color: '#fff' }}>
      <Typography variant="h6">{label}</Typography>
      <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
        {fields.map(f=>(
          <TextField key={f} label={f} value={form[f]||''} onChange={e=>handleChange(f,e.target.value)} sx={{ background: '#fff', borderRadius: 1, mb: 1 }} />
        ))}
        <Button variant="contained" onClick={addItem}>Add</Button>
      </Box>
      <List>
        {items.map((item,i)=>(
          <ListItem key={i} secondaryAction={<Button color="error" onClick={()=>deleteItem(i)}>Delete</Button>}>
            <ListItemText primary={fields.map(f=>item[f]).filter(Boolean).join(' | ')} secondary={item.timestamp} />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}
function NyxShiftSection({ type, label, fields }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({});
  useEffect(() => {
    fetch(`${API}/nyxshift/${type}`)
      .then(r=>r.ok ? r.json() : [])
      .then(setItems)
      .catch(()=>setItems([]));
  }, []);
  const handleChange = (f, v) => setForm(o=>({...o, [f]:v}));
  const addItem = async () => {
    if (!fields.every(f=>form[f])) return;
    await fetch(`${API}/nyxshift/${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    setItems(i=>[...i, { ...form, timestamp: new Date().toISOString() }]);
    setForm({});
  };
  const deleteItem = async idx => {
    await fetch(`${API}/nyxshift/${type}/${idx}`, { method: 'DELETE' });
    setItems(i=>i.filter((_,i2)=>i2!==idx));
  };
  return (
    <Paper sx={{ p: 2, mt: 3, background: '#23213a', color: '#fff' }}>
      <Typography variant="h6">{label}</Typography>
      <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
        {fields.map(f=>(
          <TextField key={f} label={f} value={form[f]||''} onChange={e=>handleChange(f,e.target.value)} sx={{ background: '#fff', borderRadius: 1, mb: 1 }} />
        ))}
        <Button variant="contained" onClick={addItem}>Add</Button>
      </Box>
      <List>
        {items.map((item,i)=>(
          <ListItem key={i} secondaryAction={<Button color="error" onClick={()=>deleteItem(i)}>Delete</Button>}>
            <ListItemText primary={fields.map(f=>item[f]).filter(Boolean).join(' | ')} secondary={item.timestamp} />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}
function Notes() {
  const [notes, setNotes] = useState([]);
  const [note, setNote] = useState('');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  useEffect(() => {
    fetch(`${API}/notes`)
      .then(r=>r.ok ? r.json() : [])
      .then(setNotes)
      .catch(()=>setNotes([]));
  }, []);
  const addNote = async () => {
    if (!note.trim()) return;
    await fetch(`${API}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: note })
    });
    setNotes(n=>[...n, { content: note, timestamp: new Date().toISOString() }]);
    setNote('');
  };
  const handleSearch = () => {
    setResults(notes.filter(n=>n.content.toLowerCase().includes(search.toLowerCase())));
  };
  const deleteNote = async (idx) => {
    await fetch(`${API}/notes/${idx}`, { method: 'DELETE' });
    setNotes(notes => notes.filter((_,i)=>i!==idx));
  };
  return (
    <Paper sx={{ p: 2, mt: 3, background: '#23213a', color: '#fff' }}>
      <Typography variant="h6">Personal Notes</Typography>
      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
        <TextField fullWidth variant="outlined" value={note} onChange={e=>setNote(e.target.value)} placeholder="Write a note..." sx={{ background: '#fff', borderRadius: 1 }} />
        <Button variant="contained" onClick={addNote}>Add</Button>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
        <TextField fullWidth variant="outlined" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search notes..." sx={{ background: '#fff', borderRadius: 1 }} />
        <Button variant="contained" onClick={handleSearch}>Search</Button>
      </Box>
      <List>
        {(results.length>0?results:notes).map((n,i)=>(
          <ListItem key={i} secondaryAction={
            <Button color="error" onClick={()=>deleteNote(i)}>Delete</Button>
          }>
            <ListItemText primary={n.content} secondary={n.timestamp} />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}

function Threads() {
  const [threads, setThreads] = useState([]);
  const [title, setTitle] = useState('');
  const [msg, setMsg] = useState('');
  useEffect(() => {
    fetch(`${API}/threads`)
      .then(r=>r.ok ? r.json() : [])
      .then(setThreads)
      .catch(()=>setThreads([]));
  }, []);
  const addThread = async () => {
    if (!title.trim() || !msg.trim()) return;
    const thread = { thread_id: Date.now().toString(), messages: [{ from: 'user', text: msg, timestamp: new Date().toISOString() }] };
    await fetch(`${API}/threads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(thread)
    });
    setThreads(t=>[...t, { ...thread, last_updated: new Date().toISOString() }]);
    setTitle(''); setMsg('');
  };
  const deleteThread = async (idx) => {
    await fetch(`${API}/threads/${idx}`, { method: 'DELETE' });
    setThreads(threads => threads.filter((_,i)=>i!==idx));
  };
  return (
    <Paper sx={{ p: 2, mt: 3, background: '#2d2a4a', color: '#fff' }}>
      <Typography variant="h6">Conversation Threads</Typography>
      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
        <TextField fullWidth variant="outlined" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Thread title..." sx={{ background: '#fff', borderRadius: 1 }} />
        <TextField fullWidth variant="outlined" value={msg} onChange={e=>setMsg(e.target.value)} placeholder="First message..." sx={{ background: '#fff', borderRadius: 1 }} />
        <Button variant="contained" onClick={addThread}>Start</Button>
      </Box>
      <List>
        {threads.map((t,i)=>(
          <ListItem key={i} secondaryAction={
            <Button color="error" onClick={()=>deleteThread(i)}>Delete</Button>
          }>
            <ListItemText primary={t.messages[0]?.text} secondary={t.last_updated} />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}



const API = '/api';


function Chat() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [category, setCategory] = useState('conversations');
  const [memories, setMemories] = useState([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [categories, setCategories] = useState([]);
  const [featureIdeas, setFeatureIdeas] = useState([]);
  const firstRun = messages.length === 0;

  const [chatError, setChatError] = useState(null);
  useEffect(() => {
    fetch(`${API}/categories`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch categories');
        return r.json();
      })
      .then(setCategories)
      .catch(e => {
        setChatError('Could not connect to backend: ' + e.message);
        console.error('Chat categories fetch error:', e);
      });
    fetch(`${API}/vesper/feature-ideas`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch feature ideas');
        return r.json();
      })
      .then(setFeatureIdeas)
      .catch(e => {
        setChatError('Could not connect to backend: ' + e.message);
        console.error('Chat feature-ideas fetch error:', e);
      });
  }, []);

  useEffect(() => {
    fetch(`${API}/memory/${category}`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch memories');
        return r.json();
      })
      .then(setMemories)
      .catch(e => {
        setChatError('Could not connect to backend: ' + e.message);
        console.error('Chat memory fetch error:', e);
      });
  }, [category]);

  useEffect(() => {
    if (firstRun) {
      setMessages([
        {
          from: 'vesper',
          text: `Hey! I'm Vesper, your badass bitch bestie. I'm here to help you get shit done and rule the world. Need research? Done. Need motivation? You got it. Need someone to call you out when you're slacking? That's what I'm here for. Let's fucking go—what are we working on?`
        }
      ]);
    }
    // eslint-disable-next-line
  }, []);

  const sassyResponses = [
    "Hell yeah, what are we conquering today? Projects? Problems? The world?",
    "Alright babe, lay it on me. What needs to get done?",
    "I'm here to help you be a fucking legend. What's the move?",
    "You want me to research something, build something, or just hype you up? I do all three.",
    "No drama, no bullshit—just results. What do you need?",
    "Let's get this done and then celebrate. What's first on the list?",
    "I've got your back. Tell me what you need and I'll make it happen.",
    "Ready when you are, boss. What are we working on?"
  ];

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMessage = { from: 'user', text: input };
    setMessages(msgs => [...msgs, userMessage]);
    setInput('');
    
    // Save to memory
    await fetch(`${API}/memory/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: input })
    });
    
    // Get AI response
    try {
      const response = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          conversation_history: messages
        })
      });
      
      const data = await response.json();
      setMessages(msgs => [...msgs, { from: 'vesper', text: data.response }]);
    } catch (e) {
      setMessages(msgs => [...msgs, { 
        from: 'vesper', 
        text: "Fuck, something went wrong trying to reach my AI brain. Check the backend connection?" 
      }]);
    }
  };


  return (
    <Paper sx={{ p: 3, mt: 3, background: '#3e3a6d', color: '#fff', maxWidth: '900px', mx: 'auto' }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>💬 Chat with Vesper</Typography>
      {chatError && (
        <Typography color="error" sx={{ mb: 2 }}>{chatError}</Typography>
      )}
      
      {/* Chat Messages */}
      <Box sx={{ 
        height: '400px', 
        overflowY: 'auto', 
        mb: 2, 
        background: '#23213a', 
        borderRadius: 2, 
        p: 2 
      }}>
        {messages.map((msg, i) => (
          <Box 
            key={i} 
            sx={{ 
              mb: 2, 
              display: 'flex', 
              justifyContent: msg.from === 'user' ? 'flex-end' : 'flex-start' 
            }}
          >
            <Box sx={{ 
              maxWidth: '70%', 
              background: msg.from === 'user' ? '#5a4f8a' : '#181726',
              p: 2, 
              borderRadius: 2,
              border: msg.from === 'vesper' ? '2px solid #7c6fd6' : 'none'
            }}>
              <Typography variant="caption" sx={{ opacity: 0.7, fontWeight: 'bold' }}>
                {msg.from === 'user' ? 'You' : 'Vesper'}
              </Typography>
              <Typography sx={{ mt: 0.5 }}>{msg.text}</Typography>
            </Box>
          </Box>
        ))}
      </Box>

      {/* Input Area */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField 
          fullWidth 
          multiline
          maxRows={3}
          variant="outlined" 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          onKeyPress={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
          placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)" 
          sx={{ 
            background: '#fff', 
            borderRadius: 1,
            '& .MuiOutlinedInput-root': {
              color: '#000'
            }
          }} 
        />
        <Button 
          variant="contained" 
          onClick={sendMessage}
          sx={{ 
            background: '#7c6fd6',
            '&:hover': { background: '#9585e0' },
            px: 4
          }}
        >
          Send
        </Button>
      </Box>
    </Paper>
  );
}

function VesperDNA() {
  const [dna, setDna] = useState('');
  const [engine, setEngine] = useState({});
  const [open, setOpen] = useState(false);
  useEffect(() => {
    fetch(`${API}/vesper/dna`)
      .then(r=>r.ok ? r.json() : { core_dna: 'Loading...', personality_engine: {} })
      .then(data=>{
        setDna(data.core_dna || 'Not available');
        setEngine(data.personality_engine || {});
      })
      .catch(()=>{
        setDna('Not available');
        setEngine({});
      });
  }, []);
  return (
    <Paper sx={{ p: 2, mt: 3, background: '#181726', color: '#fff' }}>
      <Typography variant="h6">Vesper's Core DNA</Typography>
      <Button variant="outlined" onClick={()=>setOpen(o=>!o)}>{open ? 'Hide' : 'Show'} DNA</Button>
      {open && (
        <Box sx={{ whiteSpace: 'pre-wrap', mt: 2, fontSize: 14, fontFamily: 'monospace', background: '#23213a', p: 2, borderRadius: 2 }}>{dna}</Box>
      )}
      <Typography variant="subtitle1" sx={{ mt: 2 }}>Personality Engine</Typography>
      <Box sx={{ fontFamily: 'monospace', fontSize: 14, background: '#23213a', p: 2, borderRadius: 2 }}>
        {Object.entries(engine).map(([k,v])=>(<div key={k}><b>{k}:</b> {v}</div>))}
      </Box>
    </Paper>
  );
}


// --- Web Scraper Component ---
function WebScraper() {
  const [url, setUrl] = useState('');
  const [deep, setDeep] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const scrape = async () => {
    if (!url.trim()) return;
    
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${API}/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: url.trim(),
          deep: deep,
          extract_links: true 
        })
      });
      
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError('Failed to scrape: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 2, mt: 3, background: '#23213a', color: '#fff' }}>
      <Typography variant="h6">🕸️ Web Scraper - Deep Research Tool</Typography>
      <Typography variant="body2" sx={{ mb: 2, color: '#aaa' }}>
        Extract text, links, and data from any website. No restrictions, no blocks.
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
        <TextField 
          fullWidth 
          variant="outlined" 
          value={url} 
          onChange={e=>setUrl(e.target.value)}
          onKeyPress={e=>{ if(e.key === 'Enter') scrape(); }}
          placeholder="Enter URL to scrape (e.g., https://example.com)" 
          sx={{ background: '#fff', borderRadius: 1 }}
          disabled={loading}
        />
        <Button 
          variant="contained" 
          onClick={scrape}
          disabled={loading || !url.trim()}
          sx={{ minWidth: 120 }}
        >
          {loading ? 'Scraping...' : 'Scrape'}
        </Button>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <input 
          type="checkbox" 
          checked={deep} 
          onChange={e=>setDeep(e.target.checked)}
          id="deep-scrape"
          disabled={loading}
        />
        <label htmlFor="deep-scrape" style={{ cursor: 'pointer' }}>
          Deep scrape (follow links and extract from multiple pages)
        </label>
      </Box>

      {error && (
        <Paper sx={{ p: 2, mb: 2, background: '#4a2020', color: '#ff6b6b' }}>
          <Typography variant="body2">❌ {error}</Typography>
        </Paper>
      )}

      {result && (
        <Box sx={{ mt: 2 }}>
          <Paper sx={{ p: 2, mb: 2, background: '#2d2a4a' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
              📄 {result.title}
            </Typography>
            {result.meta_description && (
              <Typography variant="body2" sx={{ mb: 1, color: '#bbb', fontStyle: 'italic' }}>
                {result.meta_description}
              </Typography>
            )}
            <Typography variant="caption" sx={{ color: '#888' }}>
              Status: {result.status_code} | Length: {result.full_text_length} chars | Links: {result.total_links}
            </Typography>
          </Paper>

          {result.headings && result.headings.length > 0 && (
            <Paper sx={{ p: 2, mb: 2, background: '#2d2a4a' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                📑 Page Structure ({result.headings.length} headings)
              </Typography>
              <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                {result.headings.slice(0, 15).map((h, i) => (
                  <Typography 
                    key={i} 
                    variant="body2" 
                    sx={{ 
                      ml: (h.level - 1) * 2, 
                      fontSize: 14 - h.level,
                      color: '#ddd'
                    }}
                  >
                    H{h.level}: {h.text}
                  </Typography>
                ))}
              </Box>
            </Paper>
          )}

          <Paper sx={{ p: 2, mb: 2, background: '#2d2a4a' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              📝 Extracted Text (first 10,000 chars)
            </Typography>
            <Box sx={{ 
              maxHeight: 300, 
              overflow: 'auto', 
              whiteSpace: 'pre-wrap', 
              fontFamily: 'monospace', 
              fontSize: 12,
              background: '#1a1826',
              p: 1,
              borderRadius: 1
            }}>
              {result.text_content}
            </Box>
          </Paper>

          {result.links && result.links.length > 0 && (
            <Paper sx={{ p: 2, mb: 2, background: '#2d2a4a' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                🔗 Links Found ({result.links.length} shown)
              </Typography>
              <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                {result.links.map((link, i) => (
                  <Box key={i} sx={{ mb: 1 }}>
                    <Typography variant="caption" sx={{ color: '#888' }}>
                      {link.text}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        display: 'block',
                        color: '#6b9fff',
                        fontSize: 11,
                        wordBreak: 'break-all'
                      }}
                    >
                      {link.url}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          )}

          {result.scraped_linked_pages && result.scraped_linked_pages.length > 0 && (
            <Paper sx={{ p: 2, mb: 2, background: '#3a2d4a' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                🌐 Deep Scrape Results ({result.scraped_linked_pages.length} pages)
              </Typography>
              {result.scraped_linked_pages.map((page, i) => (
                <Paper key={i} sx={{ p: 2, mb: 2, background: '#2d2a4a' }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {page.title}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#888', display: 'block', mb: 1 }}>
                    {page.url}
                  </Typography>
                  <Box sx={{ 
                    maxHeight: 150, 
                    overflow: 'auto',
                    fontSize: 11,
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    background: '#1a1826',
                    p: 1,
                    borderRadius: 1
                  }}>
                    {page.text_content}
                  </Box>
                </Paper>
              ))}
            </Paper>
          )}

          {result.images && result.images.length > 0 && (
            <Paper sx={{ p: 2, background: '#2d2a4a' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                🖼️ Images Found ({result.images.length})
              </Typography>
              <Box sx={{ maxHeight: 150, overflow: 'auto' }}>
                {result.images.slice(0, 10).map((img, i) => (
                  <Typography key={i} variant="caption" sx={{ display: 'block', color: '#888', mb: 0.5 }}>
                    {img.alt || 'No alt text'} - {img.url}
                  </Typography>
                ))}
              </Box>
            </Paper>
          )}
        </Box>
      )}
    </Paper>
  );
}

// --- File Processing Component ---
function FileProcessor() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('analyze'); // analyze, extract, compare

  const handleFileSelect = (event) => {
    setSelectedFile(event.target.files[0]);
    setResult(null);
    setError(null);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
      setError(null);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const processFile = async () => {
    if (!selectedFile) return;

    setProcessing(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const endpoint = mode === 'analyze' ? '/file/analyze' : '/file/extract-text';
      
      const response = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError('File processing failed: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const renderAnalysisResult = () => {
    if (!result || !result.content) return null;

    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" sx={{ color: '#00ffff', mb: 2 }}>Analysis Results</Typography>
        
        {/* Metadata */}
        {result.metadata && Object.keys(result.metadata).length > 0 && (
          <Paper sx={{ p: 2, mb: 2, background: '#1a1a2e' }}>
            <Typography variant="subtitle1" sx={{ color: '#ffd700', mb: 1 }}>Metadata</Typography>
            {Object.entries(result.metadata).map(([key, value]) => (
              <Typography key={key} sx={{ fontSize: '0.9rem', mb: 0.5 }}>
                <strong>{key}:</strong> {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
              </Typography>
            ))}
          </Paper>
        )}

        {/* Content Display */}
        {result.content && (
          <Paper sx={{ p: 2, background: '#1a1a2e', maxHeight: '500px', overflow: 'auto' }}>
            <Typography variant="subtitle1" sx={{ color: '#ffd700', mb: 2 }}>Extracted Content</Typography>
            
            {/* PDF Content */}
            {result.content.pages && (
              <Box>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  <strong>Full Text ({result.content.pages.length} pages):</strong>
                </Typography>
                <Box sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                  {result.content.full_text || result.content.pages.join('\n\n')}
                </Box>
              </Box>
            )}

            {/* Word Document Content */}
            {result.content.paragraphs && (
              <Box>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  <strong>Document Text ({result.content.paragraphs.length} paragraphs):</strong>
                </Typography>
                <Box sx={{ whiteSpace: 'pre-wrap' }}>
                  {result.content.full_text}
                </Box>
                {result.content.tables && result.content.tables.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Tables ({result.content.tables.length}):</strong>
                    </Typography>
                    {result.content.tables.map((table, idx) => (
                      <TableContainer key={idx} component={Paper} sx={{ mb: 2, background: '#23213a' }}>
                        <Table size="small">
                          <TableBody>
                            {table.map((row, rowIdx) => (
                              <TableRow key={rowIdx}>
                                {row.map((cell, cellIdx) => (
                                  <TableCell key={cellIdx} sx={{ color: '#fff' }}>{cell}</TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ))}
                  </Box>
                )}
              </Box>
            )}

            {/* Excel Content */}
            {result.content && typeof result.content === 'object' && !result.content.paragraphs && !result.content.pages && !result.content.ocr_text && !result.content.text && !result.content.data && Object.keys(result.content).some(key => Array.isArray(result.content[key])) && (
              <Box>
                {Object.entries(result.content).map(([sheetName, data]) => (
                  <Box key={sheetName} sx={{ mb: 3 }}>
                    <Typography variant="body2" sx={{ mb: 1, color: '#00ffff' }}>
                      <strong>Sheet: {sheetName}</strong>
                    </Typography>
                    <TableContainer component={Paper} sx={{ background: '#23213a', maxHeight: '400px' }}>
                      <Table size="small" stickyHeader>
                        <TableBody>
                          {data.slice(0, 100).map((row, rowIdx) => (
                            <TableRow key={rowIdx}>
                              {row.map((cell, cellIdx) => (
                                <TableCell key={cellIdx} sx={{ color: '#fff' }}>{cell}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                ))}
              </Box>
            )}

            {/* Image OCR Content */}
            {result.content.ocr_text && (
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>OCR Extracted Text:</strong>
                </Typography>
                <Box sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                  {result.content.ocr_text}
                </Box>
              </Box>
            )}

            {/* CSV Data */}
            {result.content.data && (
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>CSV Data (first 100 rows):</strong>
                </Typography>
                <TableContainer component={Paper} sx={{ background: '#23213a', maxHeight: '400px' }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        {result.metadata.columns && result.metadata.columns.map((col, idx) => (
                          <TableCell key={idx} sx={{ background: '#1a1a2e', color: '#ffd700' }}>{col}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {result.content.data.map((row, rowIdx) => (
                        <TableRow key={rowIdx}>
                          {result.metadata.columns && result.metadata.columns.map((col, colIdx) => (
                            <TableCell key={colIdx} sx={{ color: '#fff' }}>{row[col]}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* Plain Text */}
            {result.content.text && (
              <Box sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                {result.content.text}
              </Box>
            )}

            {/* JSON Content */}
            {!result.content.text && !result.content.data && !result.content.ocr_text && !result.content.pages && !result.content.paragraphs && typeof result.content === 'object' && (
              <Box sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                {JSON.stringify(result.content, null, 2)}
              </Box>
            )}
          </Paper>
        )}
      </Box>
    );
  };

  const renderExtractResult = () => {
    if (!result || !result.text) return null;

    return (
      <Paper sx={{ p: 2, mt: 2, background: '#1a1a2e', maxHeight: '500px', overflow: 'auto' }}>
        <Typography variant="h6" sx={{ color: '#00ffff', mb: 2 }}>
          Extracted Text ({result.word_count} words, {result.length} characters)
        </Typography>
        <Box sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.85rem' }}>
          {result.text}
        </Box>
      </Paper>
    );
  };

  return (
    <Paper sx={{ p: 2, mt: 3, background: '#16213e', color: '#fff' }}>
      <Typography variant="h5" sx={{ color: '#00ffff', mb: 2 }}>📄 Advanced File Processing</Typography>
      <Typography variant="body2" sx={{ mb: 2, color: '#aaa' }}>
        Process PDFs, Word docs, Excel files, images (with OCR), CSV, JSON, and more. Extract text, data, and metadata from any file format.
      </Typography>

      {/* Mode Selection */}
      <Box sx={{ mb: 2 }}>
        <Button
          variant={mode === 'analyze' ? 'contained' : 'outlined'}
          onClick={() => setMode('analyze')}
          sx={{ mr: 1 }}
        >
          Full Analysis
        </Button>
        <Button
          variant={mode === 'extract' ? 'contained' : 'outlined'}
          onClick={() => setMode('extract')}
        >
          Text Extract Only
        </Button>
      </Box>

      {/* File Upload */}
      <Box
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        sx={{
          border: '2px dashed #00ffff',
          borderRadius: 2,
          p: 3,
          mb: 2,
          textAlign: 'center',
          background: '#1a1a2e',
          cursor: 'pointer'
        }}
        onClick={() => document.getElementById('file-input').click()}
      >
        <input
          id="file-input"
          type="file"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
        <Typography variant="body1" sx={{ mb: 1 }}>
          {selectedFile ? `Selected: ${selectedFile.name}` : 'Drop file here or click to select'}
        </Typography>
        <Typography variant="body2" sx={{ color: '#aaa' }}>
          Supports: PDF, DOCX, XLSX, images, CSV, JSON, TXT, and more
        </Typography>
      </Box>

      {/* Process Button */}
      {selectedFile && (
        <Button
          variant="contained"
          onClick={processFile}
          disabled={processing}
          fullWidth
          sx={{ mb: 2, background: '#00ffff', color: '#000', '&:hover': { background: '#00cccc' } }}
        >
          {processing ? <CircularProgress size={24} /> : `Process File (${mode})`}
        </Button>
      )}

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Results Display */}
      {mode === 'analyze' && renderAnalysisResult()}
      {mode === 'extract' && renderExtractResult()}
    </Paper>
  );
}

// --- Code Execution Component ---
function CodeExecutor() {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const codeExamples = {
    python: `# Python Example
import math

def calculate_fibonacci(n):
    if n <= 1:
        return n
    return calculate_fibonacci(n-1) + calculate_fibonacci(n-2)

for i in range(10):
    print(f"Fib({i}) = {calculate_fibonacci(i)}")

# Data analysis
numbers = [1, 2, 3, 4, 5]
print(f"Sum: {sum(numbers)}")
print(f"Average: {sum(numbers)/len(numbers)}")`,
    
    javascript: `// JavaScript Example
function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

for (let i = 1; i <= 10; i++) {
  console.log(\`\${i}! = \${factorial(i)}\`);
}

// Array operations
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(x => x * 2);
console.log('Original:', numbers);
console.log('Doubled:', doubled);`,
    
    sql: `-- SQL Example (SQLite in-memory)
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT,
  age INTEGER
);

INSERT INTO users (name, age) VALUES ('Alice', 30);
INSERT INTO users (name, age) VALUES ('Bob', 25);
INSERT INTO users (name, age) VALUES ('Charlie', 35);

SELECT * FROM users WHERE age >= 30;

SELECT AVG(age) as average_age FROM users;`
  };

  const executeCode = async () => {
    if (!code.trim()) {
      setError('Please enter code to execute');
      return;
    }

    setExecuting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${API}/code/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code,
          language: language,
          timeout: 30
        })
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError('Execution failed: ' + err.message);
    } finally {
      setExecuting(false);
    }
  };

  const validateCode = async () => {
    if (!code.trim()) return;

    try {
      const response = await fetch(`${API}/code/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code,
          language: language
        })
      });

      const data = await response.json();

      if (data.valid) {
        setError(null);
      } else {
        setError(`Syntax Error: ${data.error}`);
      }
    } catch (err) {
      setError('Validation failed: ' + err.message);
    }
  };

  const loadExample = () => {
    setCode(codeExamples[language]);
    setResult(null);
    setError(null);
  };

  const renderResult = () => {
    if (!result) return null;

    return (
      <Box sx={{ mt: 2 }}>
        <Paper sx={{ p: 2, background: '#1a1a2e', mb: 2 }}>
          <Typography variant="h6" sx={{ color: '#00ffff', mb: 1 }}>
            Execution Results
          </Typography>
          <Typography variant="body2" sx={{ color: '#ffd700', mb: 1 }}>
            Language: {result.language} | Time: {result.execution_time?.toFixed(3)}s | 
            Status: {result.success ? '✓ Success' : '✗ Failed'}
          </Typography>
        </Paper>

        {/* Python/JavaScript Output */}
        {result.output && (
          <Paper sx={{ p: 2, background: '#0a0a1a', mb: 2 }}>
            <Typography variant="subtitle2" sx={{ color: '#00ff00', mb: 1 }}>
              Output:
            </Typography>
            <Box sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.85rem', color: '#0f0' }}>
              {result.output}
            </Box>
          </Paper>
        )}

        {/* Error Output */}
        {result.error && (
          <Paper sx={{ p: 2, background: '#1a0000', mb: 2 }}>
            <Typography variant="subtitle2" sx={{ color: '#ff0000', mb: 1 }}>
              Errors:
            </Typography>
            <Box sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.85rem', color: '#f00' }}>
              {result.error}
            </Box>
          </Paper>
        )}

        {/* SQL Results */}
        {result.results && (
          <Box>
            {result.results.map((sqlResult, idx) => (
              <Paper key={idx} sx={{ p: 2, mb: 2, background: '#1a1a2e' }}>
                <Typography variant="subtitle2" sx={{ color: '#00ffff', mb: 1 }}>
                  Statement: {sqlResult.statement}
                </Typography>
                
                {sqlResult.rows ? (
                  <TableContainer component={Paper} sx={{ background: '#0a0a1a', mt: 1 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          {sqlResult.columns.map((col, colIdx) => (
                            <TableCell key={colIdx} sx={{ background: '#1a1a2e', color: '#ffd700' }}>
                              {col}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {sqlResult.rows.map((row, rowIdx) => (
                          <TableRow key={rowIdx}>
                            {sqlResult.columns.map((col, colIdx) => (
                              <TableCell key={colIdx} sx={{ color: '#fff' }}>
                                {row[col]}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography sx={{ color: '#0f0', mt: 1 }}>
                    ✓ {sqlResult.message}
                  </Typography>
                )}
              </Paper>
            ))}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Paper sx={{ p: 2, mt: 3, background: '#16213e', color: '#fff' }}>
      <Typography variant="h5" sx={{ color: '#00ffff', mb: 2 }}>⚡ Code Execution Engine</Typography>
      <Typography variant="body2" sx={{ mb: 2, color: '#aaa' }}>
        Execute Python, JavaScript, or SQL code with full output capture. Run automation scripts, data analysis, or test code snippets.
      </Typography>

      {/* Language Selection */}
      <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
        <Button
          variant={language === 'python' ? 'contained' : 'outlined'}
          onClick={() => setLanguage('python')}
          sx={{ flex: 1 }}
        >
          Python
        </Button>
        <Button
          variant={language === 'javascript' ? 'contained' : 'outlined'}
          onClick={() => setLanguage('javascript')}
          sx={{ flex: 1 }}
        >
          JavaScript
        </Button>
        <Button
          variant={language === 'sql' ? 'contained' : 'outlined'}
          onClick={() => setLanguage('sql')}
          sx={{ flex: 1 }}
        >
          SQL
        </Button>
        <Button
          variant="outlined"
          onClick={loadExample}
          sx={{ color: '#ffd700', borderColor: '#ffd700' }}
        >
          Load Example
        </Button>
      </Box>

      {/* Code Editor */}
      <TextField
        multiline
        rows={15}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder={`Enter ${language} code here...`}
        fullWidth
        sx={{
          mb: 2,
          '& .MuiOutlinedInput-root': {
            fontFamily: 'monospace',
            fontSize: '0.9rem',
            background: '#0a0a1a',
            color: '#fff',
            '& fieldset': { borderColor: '#00ffff' }
          }
        }}
      />

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Button
          variant="contained"
          onClick={executeCode}
          disabled={executing}
          sx={{
            flex: 1,
            background: '#00ff00',
            color: '#000',
            '&:hover': { background: '#00cc00' }
          }}
        >
          {executing ? <CircularProgress size={24} /> : '▶ Execute Code'}
        </Button>
        <Button
          variant="outlined"
          onClick={validateCode}
          sx={{ color: '#ffd700', borderColor: '#ffd700' }}
        >
          Validate Syntax
        </Button>
        <Button
          variant="outlined"
          onClick={() => { setCode(''); setResult(null); setError(null); }}
          sx={{ color: '#ff0000', borderColor: '#ff0000' }}
        >
          Clear
        </Button>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Results Display */}
      {renderResult()}
    </Paper>
  );
}

// --- Multi-Source Research Synthesizer Component ---
function ResearchSynthesizer() {
  const [taskDescription, setTaskDescription] = useState('');
  const [sources, setSources] = useState([]);
  const [synthesisPrompt, setSynthesisPrompt] = useState('');
  const [synthesizing, setSynthesizing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showAddSource, setShowAddSource] = useState(false);

  const [newSource, setNewSource] = useState({
    type: 'web',
    url: '',
    query: '',
    path: '',
    code: '',
    language: 'python'
  });

  const addSource = () => {
    const sourceToAdd = { ...newSource };
    setSources([...sources, sourceToAdd]);
    setNewSource({
      type: 'web',
      url: '',
      query: '',
      path: '',
      code: '',
      language: 'python'
    });
    setShowAddSource(false);
  };

  const removeSource = (index) => {
    setSources(sources.filter((_, i) => i !== index));
  };

  const executeSynthesis = async () => {
    if (!taskDescription || sources.length === 0) {
      setError('Please provide a task description and at least one source');
      return;
    }

    setSynthesizing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${API}/research/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_description: taskDescription,
          sources: sources,
          synthesis_prompt: synthesisPrompt || `Analyze and synthesize the following data sources to answer: ${taskDescription}`
        })
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError('Synthesis failed: ' + err.message);
    } finally {
      setSynthesizing(false);
    }
  };

  const loadExample = () => {
    setTaskDescription('Research competitor pricing and market trends');
    setSources([
      {
        type: 'web',
        url: 'https://example.com/competitor-pricing'
      },
      {
        type: 'code',
        language: 'python',
        code: 'import statistics\\nprices = [99, 149, 199, 249]\\nprint(f"Average: ${statistics.mean(prices)}")\\nprint(f"Median: ${statistics.median(prices)}")'
      }
    ]);
    setSynthesisPrompt('Compare the pricing data from the website with the calculated statistics. Provide strategic insights.');
  };

  const renderSourceCard = (source, index) => {
    return (
      <Paper key={index} sx={{ p: 2, mb: 2, background: '#1a1a2e', border: '1px solid #00ffff' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1" sx={{ color: '#00ffff' }}>
            Source {index + 1}: {source.type.toUpperCase()}
          </Typography>
          <Button
            size="small"
            onClick={() => removeSource(index)}
            sx={{ color: '#ff0000' }}
          >
            Remove
          </Button>
        </Box>
        <Box sx={{ pl: 2 }}>
          {source.type === 'web' && (
            <Typography sx={{ fontSize: '0.9rem' }}>URL: {source.url}</Typography>
          )}
          {source.type === 'database' && (
            <Typography sx={{ fontSize: '0.9rem' }}>Query: {source.query}</Typography>
          )}
          {source.type === 'file' && (
            <Typography sx={{ fontSize: '0.9rem' }}>Path: {source.path}</Typography>
          )}
          {source.type === 'code' && (
            <Typography sx={{ fontSize: '0.9rem', fontFamily: 'monospace' }}>
              {source.language}: {source.code.substring(0, 100)}...
            </Typography>
          )}
        </Box>
      </Paper>
    );
  };

  const renderResult = () => {
    if (!result) return null;

    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" sx={{ color: '#00ffff', mb: 2 }}>
          Research Results
        </Typography>

        {/* Source Results */}
        <Paper sx={{ p: 2, mb: 2, background: '#1a1a2e' }}>
          <Typography variant="subtitle1" sx={{ color: '#ffd700', mb: 2 }}>
            Source Data Collected:
          </Typography>
          {result.sources.map((source, idx) => (
            <Paper key={idx} sx={{ p: 2, mb: 2, background: '#0a0a1a' }}>
              <Typography variant="subtitle2" sx={{ color: '#00ffff', mb: 1 }}>
                Source {idx + 1} ({source.type}):
              </Typography>
              {source.error ? (
                <Typography sx={{ color: '#ff0000' }}>Error: {source.error}</Typography>
              ) : (
                <Box sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.85rem', maxHeight: '200px', overflow: 'auto' }}>
                  {JSON.stringify(source.data, null, 2)}
                </Box>
              )}
            </Paper>
          ))}
        </Paper>

        {/* AI Synthesis */}
        {result.synthesis && (
          <Paper sx={{ p: 2, background: '#1a1a2e' }}>
            <Typography variant="subtitle1" sx={{ color: '#ffd700', mb: 2 }}>
              AI Synthesis & Analysis:
            </Typography>
            <Box sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {result.synthesis}
            </Box>
          </Paper>
        )}
      </Box>
    );
  };

  return (
    <Paper sx={{ p: 2, mt: 3, background: '#16213e', color: '#fff' }}>
      <Typography variant="h5" sx={{ color: '#00ffff', mb: 2 }}>
        🧠 Multi-Source Research Synthesizer
      </Typography>
      <Typography variant="body2" sx={{ mb: 3, color: '#aaa' }}>
        Combine web scraping, databases, file processing, and code execution into unified research workflows. 
        AI synthesizes insights from all sources.
      </Typography>

      {/* Task Description */}
      <TextField
        label="Research Task Description"
        value={taskDescription}
        onChange={(e) => setTaskDescription(e.target.value)}
        placeholder="What do you want to research? e.g., 'Analyze competitor pricing trends'"
        fullWidth
        sx={{
          mb: 2,
          '& .MuiOutlinedInput-root': {
            color: '#fff',
            '& fieldset': { borderColor: '#00ffff' }
          },
          '& .MuiInputLabel-root': { color: '#00ffff' }
        }}
      />

      {/* Sources List */}
      <Typography variant="h6" sx={{ color: '#ffd700', mb: 2 }}>
        Data Sources ({sources.length})
      </Typography>
      
      {sources.map((source, index) => renderSourceCard(source, index))}

      {/* Add Source Button */}
      {!showAddSource && (
        <Button
          variant="outlined"
          onClick={() => setShowAddSource(true)}
          fullWidth
          sx={{ mb: 2, color: '#00ff00', borderColor: '#00ff00' }}
        >
          + Add Data Source
        </Button>
      )}

      {/* Add Source Form */}
      {showAddSource && (
        <Paper sx={{ p: 2, mb: 2, background: '#1a1a2e' }}>
          <Typography variant="subtitle1" sx={{ color: '#00ffff', mb: 2 }}>
            Add New Source
          </Typography>

          {/* Source Type Selection */}
          <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
            <Button
              variant={newSource.type === 'web' ? 'contained' : 'outlined'}
              onClick={() => setNewSource({ ...newSource, type: 'web' })}
              size="small"
            >
              Web
            </Button>
            <Button
              variant={newSource.type === 'database' ? 'contained' : 'outlined'}
              onClick={() => setNewSource({ ...newSource, type: 'database' })}
              size="small"
            >
              Database
            </Button>
            <Button
              variant={newSource.type === 'file' ? 'contained' : 'outlined'}
              onClick={() => setNewSource({ ...newSource, type: 'file' })}
              size="small"
            >
              File
            </Button>
            <Button
              variant={newSource.type === 'code' ? 'contained' : 'outlined'}
              onClick={() => setNewSource({ ...newSource, type: 'code' })}
              size="small"
            >
              Code
            </Button>
          </Box>

          {/* Source-specific inputs */}
          {newSource.type === 'web' && (
            <TextField
              label="URL"
              value={newSource.url}
              onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
              fullWidth
              sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: '#fff' } }}
            />
          )}

          {newSource.type === 'database' && (
            <TextField
              label="SQL Query"
              value={newSource.query}
              onChange={(e) => setNewSource({ ...newSource, query: e.target.value })}
              multiline
              rows={3}
              fullWidth
              sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: '#fff' } }}
            />
          )}

          {newSource.type === 'file' && (
            <TextField
              label="File Path"
              value={newSource.path}
              onChange={(e) => setNewSource({ ...newSource, path: e.target.value })}
              fullWidth
              sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: '#fff' } }}
            />
          )}

          {newSource.type === 'code' && (
            <>
              <Box sx={{ mb: 1 }}>
                <Button
                  variant={newSource.language === 'python' ? 'contained' : 'outlined'}
                  onClick={() => setNewSource({ ...newSource, language: 'python' })}
                  size="small"
                  sx={{ mr: 1 }}
                >
                  Python
                </Button>
                <Button
                  variant={newSource.language === 'javascript' ? 'contained' : 'outlined'}
                  onClick={() => setNewSource({ ...newSource, language: 'javascript' })}
                  size="small"
                >
                  JavaScript
                </Button>
              </Box>
              <TextField
                label="Code"
                value={newSource.code}
                onChange={(e) => setNewSource({ ...newSource, code: e.target.value })}
                multiline
                rows={5}
                fullWidth
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    fontFamily: 'monospace'
                  }
                }}
              />
            </>
          )}

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              onClick={addSource}
              sx={{ flex: 1, background: '#00ff00', color: '#000' }}
            >
              Add Source
            </Button>
            <Button
              variant="outlined"
              onClick={() => setShowAddSource(false)}
              sx={{ color: '#ff0000', borderColor: '#ff0000' }}
            >
              Cancel
            </Button>
          </Box>
        </Paper>
      )}

      {/* Synthesis Prompt */}
      <TextField
        label="AI Synthesis Prompt (Optional)"
        value={synthesisPrompt}
        onChange={(e) => setSynthesisPrompt(e.target.value)}
        placeholder="How should AI analyze the data? Leave empty for default analysis."
        multiline
        rows={3}
        fullWidth
        sx={{
          mb: 2,
          '& .MuiOutlinedInput-root': {
            color: '#fff',
            '& fieldset': { borderColor: '#00ffff' }
          },
          '& .MuiInputLabel-root': { color: '#00ffff' }
        }}
      />

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Button
          variant="contained"
          onClick={executeSynthesis}
          disabled={synthesizing || sources.length === 0}
          sx={{
            flex: 1,
            background: '#00ffff',
            color: '#000',
            '&:hover': { background: '#00cccc' }
          }}
        >
          {synthesizing ? <CircularProgress size={24} /> : '🚀 Execute Research'}
        </Button>
        <Button
          variant="outlined"
          onClick={loadExample}
          sx={{ color: '#ffd700', borderColor: '#ffd700' }}
        >
          Load Example
        </Button>
        <Button
          variant="outlined"
          onClick={() => {
            setTaskDescription('');
            setSources([]);
            setSynthesisPrompt('');
            setResult(null);
            setError(null);
          }}
          sx={{ color: '#ff0000', borderColor: '#ff0000' }}
        >
          Clear
        </Button>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Results Display */}
      {renderResult()}
    </Paper>
  );
}


// --- Database Manager Component ---
function DatabaseManager() {
  const [dbType, setDbType] = useState('sqlite');
  const [connString, setConnString] = useState('');
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState('5432');
  const [database, setDatabase] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [connected, setConnected] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState(null);
  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const connect = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const connection = {
        db_type: dbType,
        connection_string: connString || undefined,
        host: host || undefined,
        port: parseInt(port) || undefined,
        database: database || undefined,
        username: username || undefined,
        password: password || undefined
      };

      const response = await fetch(`${API}/database/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(connection)
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setConnected(true);
        setConnectionInfo(data);
      }
    } catch (err) {
      setError('Connection failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const executeQuery = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    setQueryResult(null);

    try {
      const connection = {
        db_type: dbType,
        connection_string: connString || undefined,
        host: host || undefined,
        port: parseInt(port) || undefined,
        database: database || undefined,
        username: username || undefined,
        password: password || undefined
      };

      const response = await fetch(`${API}/database/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connection: connection,
          query: query,
          params: {}
        })
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setQueryResult(data);
      }
    } catch (err) {
      setError('Query failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    setConnected(false);
    setConnectionInfo(null);
    setQueryResult(null);
  };

  return (
    <Paper sx={{ p: 2, mt: 3, background: '#23213a', color: '#fff' }}>
      <Typography variant="h6">🗄️ Database Manager - Direct DB Access</Typography>
      <Typography variant="body2" sx={{ mb: 2, color: '#aaa' }}>
        Connect to any database (SQLite, PostgreSQL, MySQL, MongoDB) and run queries directly.
      </Typography>

      {!connected ? (
        <>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>Database Type:</Typography>
            <select 
              value={dbType} 
              onChange={e => setDbType(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '8px', 
                borderRadius: '4px',
                background: '#fff',
                border: '1px solid #ccc'
              }}
            >
              <option value="sqlite">SQLite</option>
              <option value="postgresql">PostgreSQL</option>
              <option value="mysql">MySQL</option>
              <option value="mongodb">MongoDB</option>
            </select>
          </Box>

          {dbType === 'sqlite' ? (
            <TextField
              fullWidth
              variant="outlined"
              label="Database File Path"
              value={connString}
              onChange={e => setConnString(e.target.value)}
              placeholder="./database.db or /path/to/database.db"
              sx={{ mb: 2, background: '#fff', borderRadius: 1 }}
            />
          ) : (
            <>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 2 }}>
                <TextField
                  variant="outlined"
                  label="Host"
                  value={host}
                  onChange={e => setHost(e.target.value)}
                  sx={{ background: '#fff', borderRadius: 1 }}
                />
                <TextField
                  variant="outlined"
                  label="Port"
                  value={port}
                  onChange={e => setPort(e.target.value)}
                  sx={{ background: '#fff', borderRadius: 1 }}
                />
              </Box>
              <TextField
                fullWidth
                variant="outlined"
                label="Database Name"
                value={database}
                onChange={e => setDatabase(e.target.value)}
                sx={{ mb: 2, background: '#fff', borderRadius: 1 }}
              />
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 2 }}>
                <TextField
                  variant="outlined"
                  label="Username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  sx={{ background: '#fff', borderRadius: 1 }}
                />
                <TextField
                  variant="outlined"
                  label="Password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  sx={{ background: '#fff', borderRadius: 1 }}
                />
              </Box>
            </>
          )}

          <Button
            variant="contained"
            onClick={connect}
            disabled={loading}
            fullWidth
            sx={{ py: 1.5 }}
          >
            {loading ? 'Connecting...' : 'Connect to Database'}
          </Button>
        </>
      ) : (
        <>
          <Paper sx={{ p: 2, mb: 2, background: '#2d4a2d' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              ✅ Connected to {connectionInfo.db_type}
            </Typography>
            <Typography variant="body2" sx={{ color: '#ccc' }}>
              {connectionInfo.info}
            </Typography>
            {connectionInfo.tables && (
              <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#aaa' }}>
                Tables: {connectionInfo.tables.join(', ')}
              </Typography>
            )}
            {connectionInfo.collections && (
              <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#aaa' }}>
                Collections: {connectionInfo.collections.join(', ')}
              </Typography>
            )}
            <Button
              size="small"
              variant="outlined"
              onClick={disconnect}
              sx={{ mt: 1 }}
            >
              Disconnect
            </Button>
          </Paper>

          <Typography variant="body2" sx={{ mb: 1 }}>
            {dbType === 'mongodb' ? 'MongoDB Query (JSON):' : 'SQL Query:'}
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={
              dbType === 'mongodb'
                ? '{"collection": "users", "operation": "find", "filter": {"age": {"$gt": 18}}}'
                : 'SELECT * FROM users WHERE age > 18'
            }
            sx={{ mb: 2, background: '#fff', borderRadius: 1, fontFamily: 'monospace' }}
          />

          <Button
            variant="contained"
            onClick={executeQuery}
            disabled={loading || !query.trim()}
            fullWidth
            sx={{ py: 1.5 }}
          >
            {loading ? 'Executing...' : 'Execute Query'}
          </Button>
        </>
      )}

      {error && (
        <Paper sx={{ p: 2, mt: 2, background: '#4a2020', color: '#ff6b6b' }}>
          <Typography variant="body2">❌ {error}</Typography>
        </Paper>
      )}

      {queryResult && (
        <Paper sx={{ p: 2, mt: 2, background: '#2d2a4a' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
            ✅ Query Results
          </Typography>
          
          {queryResult.message && (
            <Typography variant="body2" sx={{ mb: 1, color: '#8f8' }}>
              {queryResult.message}
            </Typography>
          )}

          {queryResult.rows && queryResult.rows.length > 0 && (
            <Box sx={{ overflow: 'auto', maxHeight: 400 }}>
              <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#aaa' }}>
                {queryResult.row_count} rows returned
              </Typography>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                fontSize: '12px',
                fontFamily: 'monospace'
              }}>
                <thead>
                  <tr style={{ background: '#1a1826' }}>
                    {queryResult.columns && queryResult.columns.map(col => (
                      <th key={col} style={{ 
                        padding: '8px', 
                        textAlign: 'left',
                        borderBottom: '2px solid #4a4a6a',
                        color: '#8af'
                      }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {queryResult.rows.map((row, i) => (
                    <tr key={i} style={{ 
                      background: i % 2 === 0 ? '#23213a' : '#2d2a4a',
                      borderBottom: '1px solid #3a3a5a'
                    }}>
                      {queryResult.columns && queryResult.columns.map(col => (
                        <td key={col} style={{ padding: '6px', color: '#ddd' }}>
                          {JSON.stringify(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          )}

          {queryResult.documents && queryResult.documents.length > 0 && (
            <Box sx={{ overflow: 'auto', maxHeight: 400 }}>
              <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#aaa' }}>
                {queryResult.count} documents returned
              </Typography>
              {queryResult.documents.map((doc, i) => (
                <Paper key={i} sx={{ p: 1, mb: 1, background: '#1a1826' }}>
                  <pre style={{ 
                    margin: 0, 
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    color: '#ddd',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {JSON.stringify(doc, null, 2)}
                  </pre>
                </Paper>
              ))}
            </Box>
          )}
        </Paper>
      )}
    </Paper>
  );
}


export default function App() {
  return (
    <Box sx={{ minHeight: '100vh', background: 'radial-gradient(ellipse at top, #23213a 0%, #181726 100%)' }}>
      <StarlightHeader />
      <Chat />
      <MoodEnergy />
      <TasksPanel />
      <Notes />
      <Threads />
      <Paper sx={{ p: 2, mt: 3, background: '#3e3a6d', color: '#fff' }}>
        <Typography variant="h5">Vesper's Creative Suite</Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          These are your creative tools, Vesper. The NyxShift project is a special collaboration with CC, and you can keep memories and notes about it below.
        </Typography>
        <NyxShiftSection type="characters" label="Characters" fields={["name","description"]} />
        <NyxShiftSection type="worlds" label="Worlds" fields={["name","description"]} />
        <NyxShiftSection type="stories" label="Stories" fields={["title","fragment","tags"]} />
        <NyxShiftSection type="moodboards" label="Moodboards" fields={["title","inspiration"]} />
      </Paper>
      <Paper sx={{ p: 2, mt: 3, background: '#23213a', color: '#fff' }}>
        <Typography variant="h6">NyxShift Project Memories</Typography>
        <NyxShiftSection type="nyxshift_memories" label="NyxShift Memories" fields={["note"]} />
      </Paper>
      <GrowthSection type="sensory_library" label="Sensory Experience Library" fields={["description","season","texture","emotion"]} />
      <GrowthSection type="personality_evolution" label="Personality Evolution" fields={["change","reason"]} />
      <GrowthSection type="interest_map" label="Interest Map" fields={["topic","notes"]} />
      <BestieSection type="checkins" label="Daily Check-Ins" fields={["note"]} />
      <BestieSection type="surprises" label="Surprise Generator" fields={["gift"]} />
      <MoodReading />
      <BestieSection type="inside_jokes" label="Inside Joke Database" fields={["joke"]} />
      <SassySection type="comebacks" label="Witty Comeback Generator" fields={["line"]} />
      <SassySection type="boosts" label="Confidence Boost Protocols" fields={["boost"]} />
      <SassySection type="entertainment" label="Entertainment Mode" fields={["game_or_challenge"]} />
      <AvatarStyle />
      <ResearchSynthesizer />
      <CodeExecutor />
      <FileProcessor />
      <DatabaseManager />
      <WebScraper />
      <WebSearch />
      <ResearchPanel />
      <VesperDNA />
    </Box>
  );
}
