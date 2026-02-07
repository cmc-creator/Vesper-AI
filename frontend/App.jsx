// Temporary header to fix missing component error
function StarlightHeader() {
  return (
    <Box sx={{ p: 2, textAlign: 'center', background: '#23213a', color: '#fff' }}>
      <Typography variant="h4">✨ VESPER ✨</Typography>
      <Typography variant="subtitle1">Your Private Sanctuary • The Threshold Between Day and Night</Typography>
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
    fetch(`${API}/vesper/mood`).then(r => r.json()).then(data => {
      setMood(data.mood);
      setEnergy(data.energy);
      setLastUpdated(data.last_updated);
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


function ResearchPanel() {
  const [research, setResearch] = useState([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [topic, setTopic] = useState('');
  const [summary, setSummary] = useState('');
  useEffect(() => {
    fetch(`${API}/research`).then(r=>r.json()).then(setResearch);
  }, []);
  const handleSearch = async () => {
    if (!query.trim()) return;
    const res = await fetch(`${API}/research/search?q=${encodeURIComponent(query)}`);
    setResults(await res.json());
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
    fetch(`${API}/style`).then(r=>r.json()).then(data=>{
      setStyle(data);
      setAvatar(data.avatar||{});
      setTheme(data.themes?.current||'evening');
      setPersonalItems(data.personal_items||[]);
      setWardrobe(data.wardrobe||[]);
      setOutfit(data.avatar?.outfit||'elegant');
      setExpression(data.avatar?.expression||'confident');
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
    fetch(`${API}/sassy/${type}`).then(r=>r.json()).then(setItems);
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
    fetch(`${API}/bestie/${type}`).then(r=>r.json()).then(setItems);
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
  const [mood, setMood] = useState('');
  const [energy, setEnergy] = useState(0.75);
  useEffect(() => {
    fetch(`${API}/bestie/mood-reading`).then(r=>r.json()).then(data=>{
      setMood(data.mood);
      setEnergy(data.energy);
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
    fetch(`${API}/growth/${type}`).then(r=>r.json()).then(setItems);
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
    fetch(`${API}/nyxshift/${type}`).then(r=>r.json()).then(setItems);
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
    fetch(`${API}/notes`).then(r=>r.json()).then(setNotes);
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
          <ListItem key={i}><ListItemText primary={n.content} secondary={n.timestamp} /></ListItem>
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
    fetch(`${API}/threads`).then(r=>r.json()).then(setThreads);
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
          <ListItem key={i}><ListItemText primary={t.messages[0]?.text} secondary={t.last_updated} /></ListItem>
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
          text: `Hey! I'm Vesper, your sassy, funny bestie and work partner. I can connect to the internet, learn new things, and help you with research, creative projects, or just keep you motivated. No emotional drama, just smart support and a good laugh. What do you want to tackle today?`
        }
      ]);
    }
    // eslint-disable-next-line
  }, []);

  const sassyResponses = [
    "Alright, boss! What do you need researched, built, or roasted today?",
    "I can Google, code, and crack jokes. Want a meme or a market analysis?",
    "You know I'm your sassy bestie, but also your work partner. Let's get productive and weird.",
    "If you need a new skill, I can learn it. If you need a laugh, I got you. If you need a spreadsheet, I'll make it sparkle.",
    "I can connect to the internet, find facts, and help you learn anything. Just ask!",
    "No drama, just results. But I'll roast you if you slack off.",
    "Want to brainstorm, research, or just vent? I'm here for all of it, and I never get tired."
  ];

  const sendMessage = async () => {
    if (!input.trim()) return;
    setMessages(msgs => [...msgs, { from: 'user', text: input }]);
    await fetch(`${API}/memory/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: input })
    });
    setTimeout(() => {
      setMessages(msgs => [...msgs, { from: 'vesper', text: sassyResponses[Math.floor(Math.random()*sassyResponses.length)] }]);
    }, 600);
    setInput('');
  };


  return (
    <Paper sx={{ p: 2, mt: 3, background: '#3e3a6d', color: '#fff' }}>
      <Typography variant="h6">Vesper Chat</Typography>
      {chatError && (
        <Typography color="error" sx={{ mb: 2 }}>{chatError}</Typography>
      )}
      {/* ...existing chat UI code here... */}
    </Paper>
  );
}

function VesperDNA() {
  const [dna, setDna] = useState('');
  const [engine, setEngine] = useState({});
  const [open, setOpen] = useState(false);
  useEffect(() => {
    fetch(`${API}/vesper/dna`).then(r=>r.json()).then(data=>{
      setDna(data.core_dna);
      setEngine(data.personality_engine);
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


export default function App() {
  return (
    <Box sx={{ minHeight: '100vh', background: 'radial-gradient(ellipse at top, #23213a 0%, #181726 100%)' }}>
      <StarlightHeader />
      <Chat />
      <MoodEnergy />
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
      <ResearchPanel />
      <VesperDNA />
    </Box>
  );
}
