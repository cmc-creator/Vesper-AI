import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Button, Grid, Card, CardContent, CardActions,
  IconButton, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  Stack, Chip, Tooltip, Divider, CircularProgress, Alert,
  Select, MenuItem, InputLabel, FormControl,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  AutoAwesome as AutoAwesomeIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  OpenInNew as OpenIcon,
  Palette as PaletteIcon,
  Business as BusinessIcon,
  Campaign as CampaignIcon,
  Description as DocIcon,
  CalendarMonth as CalendarIcon,
  CheckCircle as CheckIcon,
  CloudSync as SyncIcon,
  Image as ImageIcon,
  Lightbulb as IdeaIcon,
  TrendingUp as GrowthIcon,
  Groups as AudienceIcon,
  RocketLaunch as LaunchIcon,
  Psychology as BrainIcon,
  QueryStats as InsightIcon,
  Map as MapIcon,
  Close as CloseIcon,
  ColorLens as ColorLensIcon,
  CreateNewFolder as NewFolderIcon,
} from '@mui/icons-material';


// Sidebar Navigation
const SIDEBAR_NAV = [
  { id: 'hub', label: 'Command Hub', icon: LaunchIcon, color: '#00d0ff' },
  { id: 'brands', label: 'Brand Identities', icon: BusinessIcon, color: '#ff6b35' },
  { id: 'content', label: 'Content Studio', icon: DocIcon, color: '#9d00ff' },
  { id: 'strategy', label: 'Strategy Board', icon: BrainIcon, color: '#00ff88' },
  { id: 'campaigns', label: 'Campaigns', icon: CampaignIcon, color: '#ff2d55' },
  { id: 'audience', label: 'Audience Intel', icon: AudienceIcon, color: '#ffcc00' },
  { id: 'assets', label: 'Asset Library', icon: ImageIcon, color: '#4285f4' },
  { id: 'google', label: 'Google Tools', icon: SyncIcon, color: '#34a853' },
  { id: 'projects', label: 'Projects', icon: FolderIcon, color: '#ff9800' },
];

export default function CreativeSuite({ apiBase, onBack }) {
  const [activePanel, setActivePanel] = useState('hub');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Brand state
  const [brands, setBrands] = useState([]);
  const [activeBrandId, setActiveBrandId] = useState(null);
  const [brandDialog, setBrandDialog] = useState(false);
  const [brandForm, setBrandForm] = useState({ name: '', industry: '', tagline: '', description: '', colors: [], logo_url: '', website: '' });
  const [editingBrandId, setEditingBrandId] = useState(null);

  // Content state
  const [contentItems, setContentItems] = useState([]);
  const [contentDialog, setContentDialog] = useState(false);
  const [contentForm, setContentForm] = useState({ title: '', type: 'blog', status: 'draft', body: '', brand_id: null, tags: '' });

  // Strategy state
  const [strategies, setStrategies] = useState([]);
  const [strategyDialog, setStrategyDialog] = useState(false);
  const [strategyForm, setStrategyForm] = useState({ title: '', type: 'goal', description: '', priority: 'medium', brand_id: null });

  // Campaign state
  const [campaigns, setCampaigns] = useState([]);
  const [campaignDialog, setCampaignDialog] = useState(false);
  const [campaignForm, setCampaignForm] = useState({ name: '', platform: '', status: 'planning', start_date: '', end_date: '', budget: '', brand_id: null, notes: '' });

  // Google state
  const [googleStatus, setGoogleStatus] = useState(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [driveFiles, setDriveFiles] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);

  // Projects state
  const [projects, setProjects] = useState([]);
  const [projectDialog, setProjectDialog] = useState(false);
  const [projectForm, setProjectForm] = useState({ name: '', description: '', color: '#00d0ff', type: 'app', status: 'planning', tech_stack: '', repo_url: '', live_url: '' });
  const [activeProjectId, setActiveProjectId] = useState(null);

  const [toast, setToast] = useState('');

  // Data Loading
  const loadBrands = useCallback(async () => {
    if (apiBase == null) return;
    try { const r = await fetch(`${apiBase}/api/brands`); const d = await r.json(); setBrands(Array.isArray(d) ? d : d.brands || []); } catch { setBrands([]); }
  }, [apiBase]);

  const loadContent = useCallback(async () => {
    if (apiBase == null) return;
    try { const r = await fetch(`${apiBase}/api/creative/content`); const d = await r.json(); setContentItems(Array.isArray(d) ? d : d.items || []); } catch { setContentItems([]); }
  }, [apiBase]);

  const loadStrategies = useCallback(async () => {
    if (apiBase == null) return;
    try { const r = await fetch(`${apiBase}/api/creative/strategies`); const d = await r.json(); setStrategies(Array.isArray(d) ? d : d.items || []); } catch { setStrategies([]); }
  }, [apiBase]);

  const loadCampaigns = useCallback(async () => {
    if (apiBase == null) return;
    try { const r = await fetch(`${apiBase}/api/creative/campaigns`); const d = await r.json(); setCampaigns(Array.isArray(d) ? d : d.items || []); } catch { setCampaigns([]); }
  }, [apiBase]);

  const checkGoogleStatus = useCallback(async () => {
    if (apiBase == null) return;
    setGoogleLoading(true);
    try { const r = await fetch(`${apiBase}/api/google/status`); const d = await r.json(); setGoogleStatus(d); } catch (e) { setGoogleStatus({ connected: false, error: e.message }); }
    setGoogleLoading(false);
  }, [apiBase]);

  const loadDriveFiles = useCallback(async () => {
    if (apiBase == null) return;
    try { const r = await fetch(`${apiBase}/api/google/drive/files?page_size=15`); const d = await r.json(); setDriveFiles(d.files || []); } catch { setDriveFiles([]); }
  }, [apiBase]);

  const loadCalendarEvents = useCallback(async () => {
    if (apiBase == null) return;
    try { const r = await fetch(`${apiBase}/api/google/calendar/events`); const d = await r.json(); setCalendarEvents(d.events || []); } catch { setCalendarEvents([]); }
  }, [apiBase]);

  const loadProjects = useCallback(async () => {
    if (apiBase == null) return;
    try { const r = await fetch(`${apiBase}/api/projects`); const d = await r.json(); setProjects(Array.isArray(d) ? d : d.projects || []); } catch { setProjects([]); }
  }, [apiBase]);

  useEffect(() => { loadBrands(); loadContent(); loadStrategies(); loadCampaigns(); loadProjects(); }, [loadBrands, loadContent, loadStrategies, loadCampaigns, loadProjects]);

  useEffect(() => {
    if (activePanel === 'google') { checkGoogleStatus(); loadDriveFiles(); loadCalendarEvents(); }
  }, [activePanel, checkGoogleStatus, loadDriveFiles, loadCalendarEvents]);

  // Brand CRUD
  const saveBrand = async () => {
    if (!brandForm.name.trim()) return;
    try {
      const method = editingBrandId ? 'PUT' : 'POST';
      const url = editingBrandId ? `${apiBase}/api/brands/${editingBrandId}` : `${apiBase}/api/brands`;
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(brandForm) });
      setBrandDialog(false); setEditingBrandId(null);
      setBrandForm({ name: '', industry: '', tagline: '', description: '', colors: [], logo_url: '', website: '' });
      loadBrands(); showToast('Brand saved!');
    } catch (e) { showToast('Error: ' + e.message); }
  };

  const deleteBrand = async (id) => {
    if (!window.confirm('Delete this brand identity?')) return;
    await fetch(`${apiBase}/api/brands/${id}`, { method: 'DELETE' }); loadBrands();
  };

  // Content CRUD
  const saveContent = async () => {
    if (!contentForm.title.trim()) return;
    try {
      await fetch(`${apiBase}/api/creative/content`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...contentForm, tags: contentForm.tags.split(',').map(t => t.trim()).filter(Boolean) }),
      });
      setContentDialog(false); setContentForm({ title: '', type: 'blog', status: 'draft', body: '', brand_id: null, tags: '' });
      loadContent(); showToast('Content saved!');
    } catch (e) { showToast('Error: ' + e.message); }
  };

  const deleteContent = async (id) => { await fetch(`${apiBase}/api/creative/content/${id}`, { method: 'DELETE' }); loadContent(); };

  // Strategy CRUD
  const saveStrategy = async () => {
    if (!strategyForm.title.trim()) return;
    try {
      await fetch(`${apiBase}/api/creative/strategies`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(strategyForm) });
      setStrategyDialog(false); setStrategyForm({ title: '', type: 'goal', description: '', priority: 'medium', brand_id: null });
      loadStrategies(); showToast('Strategy saved!');
    } catch (e) { showToast('Error: ' + e.message); }
  };

  const deleteStrategy = async (id) => { await fetch(`${apiBase}/api/creative/strategies/${id}`, { method: 'DELETE' }); loadStrategies(); };

  // Campaign CRUD
  const saveCampaign = async () => {
    if (!campaignForm.name.trim()) return;
    try {
      await fetch(`${apiBase}/api/creative/campaigns`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(campaignForm) });
      setCampaignDialog(false); setCampaignForm({ name: '', platform: '', status: 'planning', start_date: '', end_date: '', budget: '', brand_id: null, notes: '' });
      loadCampaigns(); showToast('Campaign saved!');
    } catch (e) { showToast('Error: ' + e.message); }
  };

  const deleteCampaign = async (id) => { await fetch(`${apiBase}/api/creative/campaigns/${id}`, { method: 'DELETE' }); loadCampaigns(); };

  // Project CRUD
  const saveProject = async () => {
    if (!projectForm.name.trim()) return;
    try {
      await fetch(`${apiBase}/api/projects`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(projectForm),
      });
      setProjectDialog(false); setProjectForm({ name: '', description: '', color: '#ff9800', type: 'creative' });
      loadProjects(); showToast('Project created!');
    } catch (e) { showToast('Error: ' + e.message); }
  };

  const deleteProject = async (id) => {
    if (!window.confirm('Delete this project and all its data?')) return;
    try {
      const r = await fetch(`${apiBase}/api/projects/${id}`, { method: 'DELETE' });
      if (!r.ok) { const d = await r.json(); showToast(d.detail || 'Cannot delete'); return; }
      loadProjects(); showToast('Project deleted');
    } catch (e) { showToast('Error: ' + e.message); }
  };

  // Helpers
  const activeBrand = brands.find(b => b.id === activeBrandId);
  const filteredContent = activeBrandId ? contentItems.filter(c => c.brand_id === activeBrandId) : contentItems;
  const filteredStrategies = activeBrandId ? strategies.filter(s => s.brand_id === activeBrandId) : strategies;
  const filteredCampaigns = activeBrandId ? campaigns.filter(c => c.brand_id === activeBrandId) : campaigns;
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const glassCard = {
    bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, p: 2.5,
    transition: 'all 0.2s', '&:hover': { borderColor: 'rgba(0,255,255,0.2)', bgcolor: 'rgba(255,255,255,0.05)' },
  };

  const dialogInputSx = {
    input: { color: '#fff' }, '& .MuiInputBase-input': { color: '#fff' },
    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
    '& textarea': { color: '#fff' },
  };

  const sectionHeader = (icon, label, count, actionLabel, onAction) => (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {icon}
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>{label}</Typography>
        {count !== undefined && <Chip label={count} size="small" sx={{ bgcolor: 'rgba(0,255,255,0.12)', color: 'var(--accent)', fontWeight: 700, minWidth: 28 }} />}
      </Box>
      {actionLabel && (
        <Button startIcon={<AddIcon />} onClick={onAction} size="small" sx={{ color: 'var(--accent)', border: '1px solid rgba(0,255,255,0.3)', '&:hover': { bgcolor: 'rgba(0,255,255,0.1)' } }}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );

  // ======== PANELS ========

  // COMMAND HUB
  const renderHub = () => (
    <Box>
      <Typography variant="h5" sx={{ color: '#fff', fontWeight: 800, mb: 0.5, fontFamily: 'Orbitron, sans-serif' }}>
        Creative Command Center
      </Typography>
      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mb: 3 }}>
        Manage your dev projects, brands, content, campaigns, and Google Workspace all in one place.
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Brands', value: brands.length, icon: <BusinessIcon />, color: '#ff6b35' },
          { label: 'Content', value: contentItems.length, icon: <DocIcon />, color: '#9d00ff' },
          { label: 'Strategies', value: strategies.length, icon: <BrainIcon />, color: '#00ff88' },
          { label: 'Campaigns', value: campaigns.length, icon: <CampaignIcon />, color: '#ff2d55' },
        ].map(stat => (
          <Grid item xs={6} sm={3} key={stat.label}>
            <Box sx={{ ...glassCard, textAlign: 'center', borderColor: `${stat.color}30` }}>
              <Box sx={{ color: stat.color, mb: 1 }}>{stat.icon}</Box>
              <Typography variant="h4" sx={{ color: '#fff', fontWeight: 800 }}>{stat.value}</Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>{stat.label}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
      {brands.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.5)', mb: 1, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem' }}>Active Brand Filter</Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
            <Chip label="All Brands" size="small" onClick={() => setActiveBrandId(null)}
              sx={{ bgcolor: !activeBrandId ? 'rgba(0,255,255,0.15)' : 'rgba(255,255,255,0.04)', color: !activeBrandId ? 'var(--accent)' : 'rgba(255,255,255,0.6)', fontWeight: !activeBrandId ? 700 : 400, cursor: 'pointer' }} />
            {brands.map(b => (
              <Chip key={b.id} label={b.name} size="small" onClick={() => setActiveBrandId(b.id)}
                sx={{ bgcolor: activeBrandId === b.id ? 'rgba(255,107,53,0.15)' : 'rgba(255,255,255,0.04)', color: activeBrandId === b.id ? '#ff6b35' : 'rgba(255,255,255,0.6)', fontWeight: activeBrandId === b.id ? 700 : 400, cursor: 'pointer' }} />
            ))}
          </Stack>
        </Box>
      )}
      <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.5)', mb: 1.5, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem' }}>Quick Actions</Typography>
      <Grid container spacing={1.5}>
        {[
          { label: 'Add Brand', icon: <BusinessIcon />, color: '#ff6b35', action: () => { setBrandDialog(true); setEditingBrandId(null); } },
          { label: 'New Content', icon: <DocIcon />, color: '#9d00ff', action: () => setContentDialog(true) },
          { label: 'Add Strategy', icon: <BrainIcon />, color: '#00ff88', action: () => setStrategyDialog(true) },
          { label: 'New Campaign', icon: <CampaignIcon />, color: '#ff2d55', action: () => setCampaignDialog(true) },
          { label: 'Google Tools', icon: <SyncIcon />, color: '#34a853', action: () => setActivePanel('google') },
          { label: 'Projects', icon: <FolderIcon />, color: '#ff9800', action: () => setActivePanel('projects') },
        ].map(a => (
          <Grid item xs={6} sm={4} md={2} key={a.label}>
            <Box onClick={a.action} sx={{ ...glassCard, textAlign: 'center', cursor: 'pointer', p: 1.5, '&:hover': { borderColor: a.color, transform: 'translateY(-2px)', boxShadow: `0 4px 20px ${a.color}20` } }}>
              <Box sx={{ color: a.color, mb: 0.5 }}>{a.icon}</Box>
              <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600, fontSize: '0.75rem' }}>{a.label}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  // BRAND IDENTITIES
  const renderBrands = () => (
    <Box>
      {sectionHeader(<BusinessIcon sx={{ color: '#ff6b35' }} />, 'Brand Identities', brands.length, 'New Brand', () => {
        setBrandForm({ name: '', industry: '', tagline: '', description: '', colors: [], logo_url: '', website: '' });
        setEditingBrandId(null); setBrandDialog(true);
      })}
      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', mb: 3 }}>
        Manage brand identities for each business  colors, logos, voice, messaging, and more.
      </Typography>
      {brands.length === 0 ? (
        <Box sx={{ ...glassCard, textAlign: 'center', py: 6 }}>
          <BusinessIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.2)', mb: 2 }} />
          <Typography sx={{ color: 'rgba(255,255,255,0.5)', mb: 2 }}>No brands yet</Typography>
          <Button startIcon={<AddIcon />} onClick={() => setBrandDialog(true)} sx={{ color: '#ff6b35', border: '1px solid rgba(255,107,53,0.3)' }}>Create Brand</Button>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {brands.map(brand => (
            <Grid item xs={12} sm={6} md={4} key={brand.id}>
              <Box sx={{ ...glassCard, borderColor: activeBrandId === brand.id ? '#ff6b3540' : undefined }}>
                {brand.logo_url && <Box component="img" src={brand.logo_url} sx={{ width: 48, height: 48, borderRadius: 1, objectFit: 'contain', mb: 1, bgcolor: 'rgba(255,255,255,0.05)', p: 0.5 }} />}
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>{brand.name}</Typography>
                {brand.industry && <Chip label={brand.industry} size="small" sx={{ mt: 0.5, bgcolor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }} />}
                {brand.tagline && <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mt: 1, fontStyle: 'italic' }}>"{brand.tagline}"</Typography>}
                {brand.colors && brand.colors.length > 0 && (
                  <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
                    {brand.colors.slice(0, 6).map((c, i) => (
                      <Tooltip key={i} title={c.label || c.hex || c}>
                        <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: c.hex || c, border: '1px solid rgba(255,255,255,0.2)' }} />
                      </Tooltip>
                    ))}
                  </Stack>
                )}
                {brand.website && (
                  <Typography variant="caption" sx={{ color: 'var(--accent)', display: 'block', mt: 1 }}>
                    <a href={brand.website} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>{brand.website}</a>
                  </Typography>
                )}
                <Stack direction="row" spacing={0.5} sx={{ mt: 1.5 }}>
                  <Button size="small" onClick={() => setActiveBrandId(brand.id)} sx={{ color: 'var(--accent)', fontSize: '0.75rem' }}>
                    {activeBrandId === brand.id ? ' Active' : 'Set Active'}
                  </Button>
                  <IconButton size="small" onClick={() => { setBrandForm(brand); setEditingBrandId(brand.id); setBrandDialog(true); }} sx={{ color: 'rgba(255,255,255,0.4)' }}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" onClick={() => deleteBrand(brand.id)} sx={{ color: 'rgba(255,255,255,0.3)', '&:hover': { color: '#ff4444' } }}><DeleteIcon fontSize="small" /></IconButton>
                </Stack>
              </Box>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );

  // CONTENT STUDIO
  const CONTENT_TYPES = ['blog', 'social', 'email', 'ad_copy', 'landing_page', 'proposal', 'pitch_deck', 'case_study', 'newsletter', 'script'];
  const CONTENT_STATUSES = ['draft', 'in_review', 'approved', 'published', 'archived'];

  const renderContent = () => (
    <Box>
      {sectionHeader(<DocIcon sx={{ color: '#9d00ff' }} />, 'Content Studio', filteredContent.length, 'New Content', () => setContentDialog(true))}
      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', mb: 2 }}>
        Create and track content across all brands  blogs, social posts, proposals, pitch decks.
      </Typography>
      {filteredContent.length === 0 ? (
        <Box sx={{ ...glassCard, textAlign: 'center', py: 5 }}>
          <DocIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.2)', mb: 2 }} />
          <Typography sx={{ color: 'rgba(255,255,255,0.5)' }}>No content yet</Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {filteredContent.map(item => (
            <Box key={item.id} sx={{ ...glassCard, display: 'flex', alignItems: 'center', gap: 2, p: 1.5 }}>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography variant="body1" sx={{ color: '#fff', fontWeight: 600 }}>{item.title}</Typography>
                  <Chip label={item.type} size="small" sx={{ bgcolor: 'rgba(157,0,255,0.12)', color: '#9d00ff', fontSize: '0.65rem', height: 20 }} />
                  <Chip label={item.status} size="small" sx={{ bgcolor: item.status === 'published' ? 'rgba(0,255,136,0.12)' : 'rgba(255,255,255,0.06)', color: item.status === 'published' ? '#00ff88' : 'rgba(255,255,255,0.5)', fontSize: '0.65rem', height: 20 }} />
                </Box>
                {item.tags && item.tags.length > 0 && (
                  <Stack direction="row" spacing={0.5}>
                    {item.tags.map((t, i) => <Chip key={i} label={t} size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)' }} />)}
                  </Stack>
                )}
              </Box>
              <IconButton size="small" onClick={() => deleteContent(item.id)} sx={{ color: 'rgba(255,255,255,0.3)', '&:hover': { color: '#ff4444' } }}><DeleteIcon fontSize="small" /></IconButton>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );

  // STRATEGY BOARD
  const STRATEGY_TYPES = ['goal', 'swot', 'okr', 'competitor_analysis', 'value_proposition', 'revenue_model', 'risk_assessment', 'growth_plan'];
  const PRIORITIES = ['low', 'medium', 'high', 'critical'];

  const renderStrategy = () => (
    <Box>
      {sectionHeader(<BrainIcon sx={{ color: '#00ff88' }} />, 'Strategy Board', filteredStrategies.length, 'New Strategy', () => setStrategyDialog(true))}
      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', mb: 2 }}>
        Business strategy tools  goals, SWOT, OKRs, competitor analysis, growth plans.
      </Typography>
      {filteredStrategies.length === 0 ? (
        <Box sx={{ ...glassCard, textAlign: 'center', py: 5 }}>
          <BrainIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.2)', mb: 2 }} />
          <Typography sx={{ color: 'rgba(255,255,255,0.5)' }}>No strategies yet</Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filteredStrategies.map(item => (
            <Grid item xs={12} sm={6} key={item.id}>
              <Box sx={{ ...glassCard }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Box>
                    <Typography variant="body1" sx={{ color: '#fff', fontWeight: 600 }}>{item.title}</Typography>
                    <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                      <Chip label={item.type?.replace(/_/g, ' ')} size="small" sx={{ bgcolor: 'rgba(0,255,136,0.12)', color: '#00ff88', fontSize: '0.65rem', height: 20 }} />
                      <Chip label={item.priority} size="small" sx={{
                        bgcolor: item.priority === 'critical' ? 'rgba(255,45,85,0.15)' : item.priority === 'high' ? 'rgba(255,107,53,0.12)' : 'rgba(255,255,255,0.06)',
                        color: item.priority === 'critical' ? '#ff2d55' : item.priority === 'high' ? '#ff6b35' : 'rgba(255,255,255,0.5)',
                        fontSize: '0.65rem', height: 20
                      }} />
                    </Stack>
                  </Box>
                  <IconButton size="small" onClick={() => deleteStrategy(item.id)} sx={{ color: 'rgba(255,255,255,0.3)', '&:hover': { color: '#ff4444' } }}><DeleteIcon fontSize="small" /></IconButton>
                </Box>
                {item.description && <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mt: 1 }}>{item.description}</Typography>}
              </Box>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );

  // CAMPAIGNS
  const PLATFORMS = ['facebook', 'instagram', 'linkedin', 'google_ads', 'tiktok', 'email', 'youtube', 'twitter', 'pinterest', 'other'];
  const CAMPAIGN_STATUSES = ['planning', 'active', 'paused', 'completed', 'cancelled'];

  const renderCampaigns = () => (
    <Box>
      {sectionHeader(<CampaignIcon sx={{ color: '#ff2d55' }} />, 'Campaigns', filteredCampaigns.length, 'New Campaign', () => setCampaignDialog(true))}
      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', mb: 2 }}>Marketing and advertising campaigns across all platforms.</Typography>
      {filteredCampaigns.length === 0 ? (
        <Box sx={{ ...glassCard, textAlign: 'center', py: 5 }}>
          <CampaignIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.2)', mb: 2 }} />
          <Typography sx={{ color: 'rgba(255,255,255,0.5)' }}>No campaigns yet</Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {filteredCampaigns.map(item => (
            <Box key={item.id} sx={{ ...glassCard, p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="body1" sx={{ color: '#fff', fontWeight: 600 }}>{item.name}</Typography>
                  <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                    {item.platform && <Chip label={item.platform} size="small" sx={{ bgcolor: 'rgba(255,45,85,0.12)', color: '#ff2d55', fontSize: '0.65rem', height: 20 }} />}
                    <Chip label={item.status} size="small" sx={{ bgcolor: item.status === 'active' ? 'rgba(0,255,136,0.12)' : 'rgba(255,255,255,0.06)', color: item.status === 'active' ? '#00ff88' : 'rgba(255,255,255,0.5)', fontSize: '0.65rem', height: 20 }} />
                  </Stack>
                  {(item.start_date || item.end_date) && <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', display: 'block', mt: 0.5 }}>{item.start_date || '?'} to {item.end_date || 'ongoing'}</Typography>}
                  {item.budget && <Typography variant="caption" sx={{ color: 'var(--accent)' }}>Budget: ${item.budget}</Typography>}
                </Box>
                <IconButton size="small" onClick={() => deleteCampaign(item.id)} sx={{ color: 'rgba(255,255,255,0.3)', '&:hover': { color: '#ff4444' } }}><DeleteIcon fontSize="small" /></IconButton>
              </Box>
              {item.notes && <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', mt: 1, fontSize: '0.85rem' }}>{item.notes}</Typography>}
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );

  // AUDIENCE INTEL
  const renderAudience = () => (
    <Box>
      {sectionHeader(<AudienceIcon sx={{ color: '#ffcc00' }} />, 'Audience Intelligence')}
      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', mb: 3 }}>Understand your audience  personas, demographics, behavior patterns.</Typography>
      <Grid container spacing={2}>
        {[
          { title: 'Ideal Client Profiles', desc: 'Define buyer personas with demographics, pain points, and goals', icon: <AudienceIcon />, color: '#ffcc00' },
          { title: 'Market Research', desc: 'Competitor analysis, market sizing, trend identification', icon: <InsightIcon />, color: '#4285f4' },
          { title: 'Engagement Metrics', desc: 'Track content performance and audience response patterns', icon: <GrowthIcon />, color: '#00ff88' },
          { title: 'Customer Journey Maps', desc: 'Visualize the path from awareness to conversion', icon: <MapIcon />, color: '#ff6b35' },
        ].map(item => (
          <Grid item xs={12} sm={6} key={item.title}>
            <Box sx={{ ...glassCard, '&:hover': { borderColor: `${item.color}40` } }}>
              <Box sx={{ color: item.color, mb: 1 }}>{item.icon}</Box>
              <Typography variant="body1" sx={{ color: '#fff', fontWeight: 600, mb: 0.5 }}>{item.title}</Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>{item.desc}</Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', mt: 1, display: 'block' }}>Coming soon  ask Vesper to help build these!</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  // ASSET LIBRARY
  const renderAssets = () => (
    <Box>
      {sectionHeader(<ImageIcon sx={{ color: '#4285f4' }} />, 'Asset Library')}
      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', mb: 3 }}>Centralized storage for brand assets  logos, images, documents, templates.</Typography>
      <Grid container spacing={2}>
        {[
          { title: 'Logos & Marks', desc: 'Brand logos, wordmarks, icons in all variants', icon: <PaletteIcon />, color: '#ff6b35' },
          { title: 'Image Library', desc: 'Photos, illustrations, stock images by brand', icon: <ImageIcon />, color: '#9d00ff' },
          { title: 'Document Templates', desc: 'Proposals, invoices, presentations, contracts', icon: <DocIcon />, color: '#4285f4' },
          { title: 'Style Guides', desc: 'Brand guidelines, tone of voice, visual standards', icon: <ColorLensIcon />, color: '#00ff88' },
        ].map(item => (
          <Grid item xs={12} sm={6} key={item.title}>
            <Box sx={{ ...glassCard, '&:hover': { borderColor: `${item.color}40` } }}>
              <Box sx={{ color: item.color, mb: 1 }}>{item.icon}</Box>
              <Typography variant="body1" sx={{ color: '#fff', fontWeight: 600, mb: 0.5 }}>{item.title}</Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>{item.desc}</Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', mt: 1, display: 'block' }}>Coming soon  use Google Drive for file storage</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  // GOOGLE TOOLS
  const renderGoogle = () => (
    <Box>
      {sectionHeader(<SyncIcon sx={{ color: '#34a853' }} />, 'Google Workspace Tools')}
      <Box sx={{ ...glassCard, mb: 3, borderColor: googleStatus?.connected ? 'rgba(52,168,83,0.3)' : 'rgba(255,68,68,0.3)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {googleLoading ? <CircularProgress size={20} sx={{ color: 'var(--accent)' }} /> : googleStatus?.connected ? <CheckIcon sx={{ color: '#34a853' }} /> : <CloseIcon sx={{ color: '#ff4444' }} />}
            <Box>
              <Typography variant="body1" sx={{ color: '#fff', fontWeight: 600 }}>{googleStatus?.connected ? 'Connected' : 'Not Connected'}</Typography>
              {googleStatus?.service_account && <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>{googleStatus.service_account}</Typography>}
              {googleStatus?.error && <Typography variant="caption" sx={{ color: '#ff6b6b' }}>{googleStatus.error}</Typography>}
            </Box>
          </Box>
          <Button size="small" onClick={checkGoogleStatus} disabled={googleLoading} sx={{ color: 'var(--accent)' }}>Refresh</Button>
        </Box>
        {googleStatus?.connected && googleStatus?.services && (
          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
            {googleStatus.services.map(s => <Chip key={s} label={s} size="small" sx={{ bgcolor: 'rgba(52,168,83,0.12)', color: '#34a853', fontSize: '0.7rem' }} />)}
          </Stack>
        )}
      </Box>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Box sx={{ ...glassCard }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <FolderIcon sx={{ color: '#ffba00' }} />
              <Typography variant="body1" sx={{ color: '#fff', fontWeight: 600 }}>Google Drive</Typography>
              <Chip label={driveFiles.length} size="small" sx={{ bgcolor: 'rgba(255,186,0,0.12)', color: '#ffba00', fontSize: '0.7rem' }} />
            </Box>
            {driveFiles.length > 0 ? (
              <Stack spacing={0.5} sx={{ maxHeight: 300, overflowY: 'auto' }}>
                {driveFiles.map(f => (
                  <Box key={f.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 0.75, borderRadius: 1, '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' } }}>
                    <Typography variant="body2" sx={{ color: '#fff', flex: 1, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</Typography>
                    {f.webViewLink && <IconButton size="small" onClick={() => window.open(f.webViewLink, '_blank')} sx={{ color: 'var(--accent)', p: 0.3 }}><OpenIcon fontSize="small" /></IconButton>}
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>{googleStatus?.connected ? 'No files yet' : 'Connect Google to see files'}</Typography>
            )}
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box sx={{ ...glassCard }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CalendarIcon sx={{ color: '#4285f4' }} />
              <Typography variant="body1" sx={{ color: '#fff', fontWeight: 600 }}>Calendar</Typography>
              <Chip label={calendarEvents.length} size="small" sx={{ bgcolor: 'rgba(66,133,244,0.12)', color: '#4285f4', fontSize: '0.7rem' }} />
            </Box>
            {calendarEvents.length > 0 ? (
              <Stack spacing={0.5} sx={{ maxHeight: 300, overflowY: 'auto' }}>
                {calendarEvents.map(e => (
                  <Box key={e.id} sx={{ p: 0.75, borderRadius: 1, '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' } }}>
                    <Typography variant="body2" sx={{ color: '#fff', fontSize: '0.85rem' }}>{e.summary || 'Untitled'}</Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>{e.start?.dateTime ? new Date(e.start.dateTime).toLocaleString() : e.start?.date || ''}</Typography>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>{googleStatus?.connected ? 'No upcoming events' : 'Connect Google to see calendar'}</Typography>
            )}
          </Box>
        </Grid>
        <Grid item xs={12}>
          <Box sx={{ ...glassCard }}>
            <Typography variant="body1" sx={{ color: '#fff', fontWeight: 600, mb: 1.5 }}>Quick Actions</Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              {[
                { label: 'Create Doc', emoji: 'doc', action: () => showToast('Ask Vesper to create a Google Doc!') },
                { label: 'Create Sheet', emoji: 'sheet', action: () => showToast('Ask Vesper to create a Google Sheet!') },
                { label: 'Create Event', emoji: 'cal', action: () => showToast('Ask Vesper to create a calendar event!') },
                { label: 'Upload File', emoji: 'up', action: () => showToast('Ask Vesper to upload a file to Drive!') },
              ].map(a => (
                <Button key={a.label} size="small" onClick={a.action} disabled={!googleStatus?.connected}
                  sx={{ color: '#fff', border: '1px solid rgba(255,255,255,0.1)', bgcolor: 'rgba(255,255,255,0.03)', '&:hover': { bgcolor: 'rgba(52,168,83,0.1)', borderColor: 'rgba(52,168,83,0.3)' } }}>
                  {a.label}
                </Button>
              ))}
            </Stack>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );

  // PROJECTS
  const PROJECT_TYPES = ['app', 'platform', 'website', 'saas', 'tool', 'api', 'automation', 'game', 'creative', 'other'];
  const PROJECT_STATUSES = ['planning', 'in-dev', 'in-progress', 'launched', 'paused', 'shelved'];
  const PROJECT_COLORS = ['#00d0ff', '#ff9800', '#9d00ff', '#ff2d55', '#00ff88', '#ffcc00', '#4285f4', '#ff6b35'];

  const renderProjects = () => (
    <Box>
      {sectionHeader(<FolderIcon sx={{ color: '#ff9800' }} />, 'My Projects', projects.length, 'New Project', () => setProjectDialog(true))}
      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', mb: 3 }}>
        Track all your apps, platforms, and tools in development. Add NyxShift, Vesper, and any other projects you're building here.
      </Typography>
      {projects.length === 0 ? (
        <Box sx={{ ...glassCard, textAlign: 'center', py: 6 }}>
          <FolderIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.2)', mb: 2 }} />
          <Typography sx={{ color: 'rgba(255,255,255,0.5)', mb: 2 }}>No projects yet</Typography>
          <Button startIcon={<NewFolderIcon />} onClick={() => setProjectDialog(true)} sx={{ color: '#ff9800', border: '1px solid rgba(255,152,0,0.3)' }}>Create Project</Button>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {projects.map(project => {
            const pColor = project.color || '#00d0ff';
            const statusColor = { planning: '#ffcc00', 'in-dev': '#00d0ff', 'in-progress': '#00ff88', launched: '#34a853', paused: '#ff9800', shelved: 'rgba(255,255,255,0.3)' }[project.status] || 'rgba(255,255,255,0.4)';
            return (
              <Grid item xs={12} sm={6} md={4} key={project.id}>
                <Box
                  sx={{
                    ...glassCard,
                    borderColor: `${pColor}30`,
                    position: 'relative',
                    '&:hover': { borderColor: pColor, transform: 'translateY(-2px)', boxShadow: `0 8px 32px ${pColor}15` },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <FolderOpenIcon sx={{ fontSize: 28, color: pColor }} />
                      <Box>
                        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>{project.name}</Typography>
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.4 }}>
                          <Chip label={project.type || 'app'} size="small" sx={{ bgcolor: `${pColor}18`, color: pColor, fontSize: '0.6rem', height: 17 }} />
                          {project.status && <Chip label={project.status} size="small" sx={{ bgcolor: `${statusColor}18`, color: statusColor, fontSize: '0.6rem', height: 17 }} />}
                        </Stack>
                      </Box>
                    </Box>
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); deleteProject(project.id); }} sx={{ color: 'rgba(255,255,255,0.25)', '&:hover': { color: '#ff4444' } }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  {project.description && (
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mb: 1, fontSize: '0.85rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {project.description}
                    </Typography>
                  )}
                  {project.tech_stack && (
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', display: 'block', mb: 0.5 }}>⚙ {project.tech_stack}</Typography>
                  )}
                  <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
                    {project.repo_url && (
                      <Chip label="Repo" size="small" onClick={(e) => { e.stopPropagation(); window.open(project.repo_url, '_blank'); }}
                        sx={{ height: 20, fontSize: '0.65rem', bgcolor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }} />
                    )}
                    {project.live_url && (
                      <Chip label="Live ↗" size="small" onClick={(e) => { e.stopPropagation(); window.open(project.live_url, '_blank'); }}
                        sx={{ height: 20, fontSize: '0.65rem', bgcolor: `${statusColor}15`, color: statusColor, cursor: 'pointer' }} />
                    )}
                    {project.created_at && (
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.2)', ml: 'auto', alignSelf: 'center' }}>
                        {new Date(project.created_at).toLocaleDateString()}
                      </Typography>
                    )}
                  </Stack>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );

  const renderPanel = () => {
    switch (activePanel) {
      case 'hub': return renderHub();
      case 'brands': return renderBrands();
      case 'content': return renderContent();
      case 'strategy': return renderStrategy();
      case 'campaigns': return renderCampaigns();
      case 'audience': return renderAudience();
      case 'assets': return renderAssets();
      case 'google': return renderGoogle();
      case 'projects': return renderProjects();
      default: return renderHub();
    }
  };

  // ======== MAIN LAYOUT ========
  return (
    <Paper sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1300, bgcolor: '#080a18', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 1.5, borderBottom: '1px solid rgba(0,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'rgba(0,0,0,0.5)', flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton onClick={onBack} sx={{ color: 'var(--accent)' }}><ArrowBackIcon /></IconButton>
          <LaunchIcon sx={{ color: 'var(--accent)', fontSize: 28 }} />
          <Typography variant="h6" sx={{ fontFamily: 'Orbitron, sans-serif', color: '#fff', letterSpacing: 2, fontSize: '1rem' }}>CREATIVE COMMAND CENTER</Typography>
        </Box>
        {activeBrand && <Chip label={`${activeBrand.name}`} size="small" sx={{ bgcolor: 'rgba(255,107,53,0.12)', color: '#ff6b35', fontWeight: 600 }} />}
      </Box>

      {/* Body: Sidebar + Content */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar */}
        <Box sx={{ width: sidebarCollapsed ? 56 : 220, borderRight: '1px solid rgba(255,255,255,0.08)', bgcolor: 'rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', flexShrink: 0, transition: 'width 0.2s ease', overflowX: 'hidden' }}>
          <Box sx={{ flex: 1, py: 1, display: 'flex', flexDirection: 'column', gap: 0.3 }}>
            {SIDEBAR_NAV.map(item => {
              const Icon = item.icon;
              const isActive = activePanel === item.id;
              return (
                <Box key={item.id} onClick={() => setActivePanel(item.id)} sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5, px: sidebarCollapsed ? 1.5 : 2, py: 1, cursor: 'pointer',
                  borderRadius: '0 8px 8px 0', bgcolor: isActive ? 'rgba(0,255,255,0.1)' : 'transparent',
                  borderLeft: isActive ? `3px solid ${item.color}` : '3px solid transparent',
                  transition: 'all 0.15s ease', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' }, minHeight: 40,
                }}>
                  <Icon sx={{ fontSize: 20, color: isActive ? item.color : 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
                  {!sidebarCollapsed && (
                    <Typography variant="body2" sx={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.6)', fontWeight: isActive ? 700 : 400, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.label}
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Box>
          <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.08)', p: 1, textAlign: 'center' }}>
            <IconButton size="small" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} sx={{ color: 'rgba(255,255,255,0.3)', '&:hover': { color: 'var(--accent)' } }}>
              <Typography sx={{ fontSize: '0.8rem' }}>{sidebarCollapsed ? '\u25B6' : '\u25C0'}</Typography>
            </IconButton>
          </Box>
        </Box>
        {/* Main Content */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>{renderPanel()}</Box>
      </Box>

      {/* Toast */}
      {toast && (
        <Box sx={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', bgcolor: 'rgba(0,0,0,0.9)', border: '1px solid var(--accent)', borderRadius: 2, px: 3, py: 1.5, zIndex: 9999 }}>
          <Typography sx={{ color: 'var(--accent)', fontSize: '0.85rem' }}>{toast}</Typography>
        </Box>
      )}

      {/* BRAND DIALOG */}
      <Dialog open={brandDialog} onClose={() => setBrandDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#1a1b26', color: '#fff' } }}>
        <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>{editingBrandId ? 'Edit Brand Identity' : 'New Brand Identity'}</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Business Name" fullWidth value={brandForm.name} onChange={e => setBrandForm({...brandForm, name: e.target.value})} sx={dialogInputSx} />
            <TextField label="Industry / Niche" fullWidth value={brandForm.industry} onChange={e => setBrandForm({...brandForm, industry: e.target.value})} sx={dialogInputSx} placeholder="e.g. Business Consulting, E-commerce" />
            <TextField label="Tagline / Slogan" fullWidth value={brandForm.tagline} onChange={e => setBrandForm({...brandForm, tagline: e.target.value})} sx={dialogInputSx} />
            <TextField label="Brand Description" fullWidth multiline rows={3} value={brandForm.description} onChange={e => setBrandForm({...brandForm, description: e.target.value})} sx={dialogInputSx} />
            <TextField label="Logo URL" fullWidth value={brandForm.logo_url} onChange={e => setBrandForm({...brandForm, logo_url: e.target.value})} sx={dialogInputSx} />
            <TextField label="Website" fullWidth value={brandForm.website} onChange={e => setBrandForm({...brandForm, website: e.target.value})} sx={dialogInputSx} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <Button onClick={() => setBrandDialog(false)} sx={{ color: 'rgba(255,255,255,0.5)' }}>Cancel</Button>
          <Button variant="contained" onClick={saveBrand} sx={{ bgcolor: '#ff6b35', color: '#fff' }}>{editingBrandId ? 'Save Changes' : 'Create Brand'}</Button>
        </DialogActions>
      </Dialog>

      {/* CONTENT DIALOG */}
      <Dialog open={contentDialog} onClose={() => setContentDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#1a1b26', color: '#fff' } }}>
        <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>New Content</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Title" fullWidth value={contentForm.title} onChange={e => setContentForm({...contentForm, title: e.target.value})} sx={dialogInputSx} />
            <FormControl fullWidth>
              <InputLabel sx={{ color: 'rgba(255,255,255,0.5)' }}>Type</InputLabel>
              <Select value={contentForm.type} onChange={e => setContentForm({...contentForm, type: e.target.value})} label="Type" sx={{ color: '#fff', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' } }}>
                {CONTENT_TYPES.map(t => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel sx={{ color: 'rgba(255,255,255,0.5)' }}>Status</InputLabel>
              <Select value={contentForm.status} onChange={e => setContentForm({...contentForm, status: e.target.value})} label="Status" sx={{ color: '#fff', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' } }}>
                {CONTENT_STATUSES.map(s => <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>)}
              </Select>
            </FormControl>
            {brands.length > 0 && (
              <FormControl fullWidth>
                <InputLabel sx={{ color: 'rgba(255,255,255,0.5)' }}>Brand</InputLabel>
                <Select value={contentForm.brand_id || ''} onChange={e => setContentForm({...contentForm, brand_id: e.target.value || null})} label="Brand" sx={{ color: '#fff', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' } }}>
                  <MenuItem value="">All / No Brand</MenuItem>
                  {brands.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                </Select>
              </FormControl>
            )}
            <TextField label="Tags (comma-separated)" fullWidth value={contentForm.tags} onChange={e => setContentForm({...contentForm, tags: e.target.value})} sx={dialogInputSx} />
            <TextField label="Body / Notes" fullWidth multiline rows={4} value={contentForm.body} onChange={e => setContentForm({...contentForm, body: e.target.value})} sx={dialogInputSx} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <Button onClick={() => setContentDialog(false)} sx={{ color: 'rgba(255,255,255,0.5)' }}>Cancel</Button>
          <Button variant="contained" onClick={saveContent} sx={{ bgcolor: '#9d00ff', color: '#fff' }}>Create</Button>
        </DialogActions>
      </Dialog>

      {/* STRATEGY DIALOG */}
      <Dialog open={strategyDialog} onClose={() => setStrategyDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#1a1b26', color: '#fff' } }}>
        <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>New Strategy</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Title" fullWidth value={strategyForm.title} onChange={e => setStrategyForm({...strategyForm, title: e.target.value})} sx={dialogInputSx} />
            <FormControl fullWidth>
              <InputLabel sx={{ color: 'rgba(255,255,255,0.5)' }}>Type</InputLabel>
              <Select value={strategyForm.type} onChange={e => setStrategyForm({...strategyForm, type: e.target.value})} label="Type" sx={{ color: '#fff', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' } }}>
                {STRATEGY_TYPES.map(t => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel sx={{ color: 'rgba(255,255,255,0.5)' }}>Priority</InputLabel>
              <Select value={strategyForm.priority} onChange={e => setStrategyForm({...strategyForm, priority: e.target.value})} label="Priority" sx={{ color: '#fff', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' } }}>
                {PRIORITIES.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </Select>
            </FormControl>
            {brands.length > 0 && (
              <FormControl fullWidth>
                <InputLabel sx={{ color: 'rgba(255,255,255,0.5)' }}>Brand</InputLabel>
                <Select value={strategyForm.brand_id || ''} onChange={e => setStrategyForm({...strategyForm, brand_id: e.target.value || null})} label="Brand" sx={{ color: '#fff', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' } }}>
                  <MenuItem value="">All / No Brand</MenuItem>
                  {brands.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                </Select>
              </FormControl>
            )}
            <TextField label="Description" fullWidth multiline rows={4} value={strategyForm.description} onChange={e => setStrategyForm({...strategyForm, description: e.target.value})} sx={dialogInputSx} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <Button onClick={() => setStrategyDialog(false)} sx={{ color: 'rgba(255,255,255,0.5)' }}>Cancel</Button>
          <Button variant="contained" onClick={saveStrategy} sx={{ bgcolor: '#00ff88', color: '#000' }}>Create</Button>
        </DialogActions>
      </Dialog>

      {/* CAMPAIGN DIALOG */}
      <Dialog open={campaignDialog} onClose={() => setCampaignDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#1a1b26', color: '#fff' } }}>
        <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>New Campaign</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Campaign Name" fullWidth value={campaignForm.name} onChange={e => setCampaignForm({...campaignForm, name: e.target.value})} sx={dialogInputSx} />
            <FormControl fullWidth>
              <InputLabel sx={{ color: 'rgba(255,255,255,0.5)' }}>Platform</InputLabel>
              <Select value={campaignForm.platform} onChange={e => setCampaignForm({...campaignForm, platform: e.target.value})} label="Platform" sx={{ color: '#fff', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' } }}>
                {PLATFORMS.map(p => <MenuItem key={p} value={p}>{p.replace(/_/g, ' ')}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel sx={{ color: 'rgba(255,255,255,0.5)' }}>Status</InputLabel>
              <Select value={campaignForm.status} onChange={e => setCampaignForm({...campaignForm, status: e.target.value})} label="Status" sx={{ color: '#fff', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' } }}>
                {CAMPAIGN_STATUSES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
            {brands.length > 0 && (
              <FormControl fullWidth>
                <InputLabel sx={{ color: 'rgba(255,255,255,0.5)' }}>Brand</InputLabel>
                <Select value={campaignForm.brand_id || ''} onChange={e => setCampaignForm({...campaignForm, brand_id: e.target.value || null})} label="Brand" sx={{ color: '#fff', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' } }}>
                  <MenuItem value="">All / No Brand</MenuItem>
                  {brands.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                </Select>
              </FormControl>
            )}
            <Stack direction="row" spacing={2}>
              <TextField label="Start Date" type="date" fullWidth value={campaignForm.start_date} onChange={e => setCampaignForm({...campaignForm, start_date: e.target.value})} InputLabelProps={{ shrink: true }} sx={dialogInputSx} />
              <TextField label="End Date" type="date" fullWidth value={campaignForm.end_date} onChange={e => setCampaignForm({...campaignForm, end_date: e.target.value})} InputLabelProps={{ shrink: true }} sx={dialogInputSx} />
            </Stack>
            <TextField label="Budget" fullWidth value={campaignForm.budget} onChange={e => setCampaignForm({...campaignForm, budget: e.target.value})} sx={dialogInputSx} />
            <TextField label="Notes" fullWidth multiline rows={3} value={campaignForm.notes} onChange={e => setCampaignForm({...campaignForm, notes: e.target.value})} sx={dialogInputSx} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <Button onClick={() => setCampaignDialog(false)} sx={{ color: 'rgba(255,255,255,0.5)' }}>Cancel</Button>
          <Button variant="contained" onClick={saveCampaign} sx={{ bgcolor: '#ff2d55', color: '#fff' }}>Create</Button>
        </DialogActions>
      </Dialog>

      {/* PROJECT DIALOG */}
      <Dialog open={projectDialog} onClose={() => setProjectDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#1a1b26', color: '#fff' } }}>
        <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <NewFolderIcon sx={{ color: '#00d0ff' }} />
            New Project
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Project Name" fullWidth value={projectForm.name} onChange={e => setProjectForm({...projectForm, name: e.target.value})} sx={dialogInputSx} placeholder="e.g. NyxShift, Vesper, my-saas-app" />
            <TextField label="Description" fullWidth multiline rows={2} value={projectForm.description} onChange={e => setProjectForm({...projectForm, description: e.target.value})} sx={dialogInputSx} placeholder="What is this app / platform / tool?" />
            <Stack direction="row" spacing={2}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: 'rgba(255,255,255,0.5)' }}>Type</InputLabel>
                <Select value={projectForm.type} onChange={e => setProjectForm({...projectForm, type: e.target.value})} label="Type" sx={{ color: '#fff', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' } }}>
                  {PROJECT_TYPES.map(t => <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>{t}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel sx={{ color: 'rgba(255,255,255,0.5)' }}>Status</InputLabel>
                <Select value={projectForm.status} onChange={e => setProjectForm({...projectForm, status: e.target.value})} label="Status" sx={{ color: '#fff', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' } }}>
                  {PROJECT_STATUSES.map(s => <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
            <TextField label="Tech Stack" fullWidth value={projectForm.tech_stack} onChange={e => setProjectForm({...projectForm, tech_stack: e.target.value})} sx={dialogInputSx} placeholder="e.g. React, FastAPI, Railway, Firebase" />
            <TextField label="Repo URL" fullWidth value={projectForm.repo_url} onChange={e => setProjectForm({...projectForm, repo_url: e.target.value})} sx={dialogInputSx} placeholder="https://github.com/..." />
            <TextField label="Live URL" fullWidth value={projectForm.live_url} onChange={e => setProjectForm({...projectForm, live_url: e.target.value})} sx={dialogInputSx} placeholder="https://..." />
            <Box>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', mb: 1, display: 'block' }}>Project Color</Typography>
              <Stack direction="row" spacing={1}>
                {PROJECT_COLORS.map(c => (
                  <Box key={c} onClick={() => setProjectForm({...projectForm, color: c})} sx={{
                    width: 32, height: 32, borderRadius: '50%', bgcolor: c, cursor: 'pointer', border: projectForm.color === c ? '3px solid #fff' : '2px solid transparent',
                    transition: 'all 0.15s', '&:hover': { transform: 'scale(1.2)' },
                  }} />
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <Button onClick={() => setProjectDialog(false)} sx={{ color: 'rgba(255,255,255,0.5)' }}>Cancel</Button>
          <Button variant="contained" onClick={saveProject} sx={{ bgcolor: '#00d0ff', color: '#000', fontWeight: 700, '&:hover': { bgcolor: '#00b8e0' } }}>Create Project</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
