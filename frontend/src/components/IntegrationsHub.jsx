import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Button, Grid, Card, CardContent, IconButton,
  TextField, Dialog, DialogTitle, DialogContent, DialogActions, Stack, Chip,
  Tooltip, Switch, LinearProgress, Tabs, Tab, Divider, CircularProgress,
  Accordion, AccordionSummary, AccordionDetails, Alert,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Extension as ExtensionIcon,
  Palette as PaletteIcon,
  TextFields as TextFieldsIcon,
  Image as ImageIcon,
  Description as DescriptionIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Link as LinkIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as PreviewIcon,
  VisibilityOff as HideIcon,
  Spellcheck as SpellcheckIcon,
  PictureAsPdf as PdfIcon,
  Gavel as GavelIcon,
  School as SchoolIcon,
  CloudSync as SyncIcon,
} from '@mui/icons-material';

// ─── Service Catalog ────────────────────────────────────────────────────────
const SERVICES = [
  {
    id: 'canva', label: 'Canva', icon: '🎨', color: '#00c4cc', category: 'design',
    desc: 'Professional layouts, graphics, templates — Canva Connect API',
    fields: ['api_key'],
    links: { docs: 'https://www.canva.dev/docs/connect/', dashboard: 'https://www.canva.com' },
  },
  {
    id: 'stripe', label: 'Stripe', icon: '💳', color: '#635bff', category: 'payments',
    desc: 'Payment processing — accept payments, manage subscriptions',
    fields: ['api_key'],
    links: { docs: 'https://stripe.com/docs/api', dashboard: 'https://dashboard.stripe.com' },
  },
  {
    id: 'etsy', label: 'Etsy', icon: '🧶', color: '#f1641e', category: 'marketplace',
    desc: 'Auto-upload listings, manage shop — Etsy Open API v3',
    fields: ['api_key'],
    links: { docs: 'https://developers.etsy.com/documentation', dashboard: 'https://www.etsy.com/your/shops/me' },
  },
  {
    id: 'gumroad', label: 'Gumroad', icon: '📦', color: '#ff90e8', category: 'marketplace',
    desc: 'Sell digital products — direct upload via Gumroad API',
    fields: ['api_key'],
    links: { docs: 'https://gumroad.com/api', dashboard: 'https://app.gumroad.com' },
  },
  {
    id: 'mailchimp', label: 'Mailchimp', icon: '📧', color: '#ffe01b', category: 'email',
    desc: 'Email marketing — manage lists, campaigns, automations',
    fields: ['api_key'],
    links: { docs: 'https://mailchimp.com/developer/', dashboard: 'https://us1.admin.mailchimp.com' },
  },
  {
    id: 'convertkit', label: 'ConvertKit', icon: '✉️', color: '#fb6970', category: 'email',
    desc: 'Creator-focused email marketing — sequences, tags, forms',
    fields: ['api_key'],
    links: { docs: 'https://developers.convertkit.com/', dashboard: 'https://app.convertkit.com' },
  },
  {
    id: 'google_workspace', label: 'Google Workspace', icon: '🔷', color: '#4285f4', category: 'productivity',
    desc: 'Docs, Sheets, Slides, Drive, Calendar — full workspace access',
    fields: [],
    links: { docs: 'https://developers.google.com/workspace', dashboard: 'https://workspace.google.com' },
    note: 'Uses service account (vesper-working@warm-cycle-471217-p5). No API key needed.',
  },
  {
    id: 'google_docs', label: 'Google Docs', icon: '📝', color: '#4285f4', category: 'productivity',
    desc: 'Create & edit documents programmatically via Docs API',
    fields: [],
    links: { docs: 'https://developers.google.com/docs/api', dashboard: 'https://docs.google.com' },
    note: 'Uses service account — no API key needed.',
  },
  {
    id: 'google_sheets', label: 'Google Sheets', icon: '📊', color: '#0f9d58', category: 'productivity',
    desc: 'Spreadsheets API — read/write data, create charts',
    fields: [],
    links: { docs: 'https://developers.google.com/sheets/api', dashboard: 'https://sheets.google.com' },
    note: 'Uses service account — no API key needed.',
  },
  {
    id: 'google_drive', label: 'Google Drive', icon: '☁️', color: '#ffba00', category: 'productivity',
    desc: 'File storage — upload, organize, share documents',
    fields: [],
    links: { docs: 'https://developers.google.com/drive/api', dashboard: 'https://drive.google.com' },
    note: 'Uses service account — no API key needed.',
  },
  {
    id: 'google_calendar', label: 'Google Calendar', icon: '📅', color: '#4285f4', category: 'productivity',
    desc: 'Scheduling — create events, check availability',
    fields: [],
    links: { docs: 'https://developers.google.com/calendar', dashboard: 'https://calendar.google.com' },
    note: 'Uses service account — no API key needed.',
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All Services', icon: '🔌' },
  { id: 'design', label: 'Design', icon: '🎨' },
  { id: 'payments', label: 'Payments', icon: '💳' },
  { id: 'marketplace', label: 'Marketplace', icon: '🛒' },
  { id: 'email', label: 'Email', icon: '📧' },
  { id: 'productivity', label: 'Google Workspace', icon: '🔷' },
];

// ─── CONNECTION CARD ────────────────────────────────────────────────────────
function ServiceCard({ svc, integration, onConfigure, onTest, onToggle }) {
  const isConnected = integration?.enabled;
  const hasKey = !!integration?.api_key_preview;

  return (
    <Card sx={{
      bgcolor: 'rgba(255,255,255,0.03)', border: `1px solid ${isConnected ? svc.color + '44' : 'rgba(255,255,255,0.08)'}`,
      transition: 'all 0.25s', cursor: 'pointer',
      '&:hover': { borderColor: svc.color, transform: 'translateY(-2px)', boxShadow: `0 6px 24px ${svc.color}22` },
    }} onClick={onConfigure}>
      <CardContent sx={{ p: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{
              width: 36, height: 36, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: `${svc.color}18`, border: `1px solid ${svc.color}33`, fontSize: 18,
            }}>{svc.icon}</Box>
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{svc.label}</Typography>
              <Typography sx={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', textTransform: 'uppercase' }}>{svc.category}</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {hasKey && <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: isConnected ? '#00ff64' : '#666', boxShadow: isConnected ? '0 0 8px #00ff64' : 'none' }} />}
            <Switch size="small" checked={!!isConnected} onClick={(e) => { e.stopPropagation(); onToggle(); }}
              sx={{ '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: svc.color } }} />
          </Box>
        </Box>
        <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>{svc.desc}</Typography>
        {hasKey && (
          <Chip label={`Key: ${integration.api_key_preview}`} size="small" sx={{
            mt: 0.8, height: 18, fontSize: 8, fontFamily: 'monospace', bgcolor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)',
          }} />
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ███ TAB 1: INTEGRATIONS HUB ████████████████████████████████████████████████
// ═══════════════════════════════════════════════════════════════════════════════
function IntegrationsTab({ apiBase }) {
  const [integrations, setIntegrations] = useState({});
  const [filter, setFilter] = useState('all');
  const [configDialog, setConfigDialog] = useState(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchIntegrations = useCallback(async () => {
    try {
      const r = await fetch(`${apiBase}/api/integrations`);
      const d = await r.json();
      setIntegrations(d.integrations || {});
    } catch { }
    setLoading(false);
  }, [apiBase]);

  useEffect(() => { fetchIntegrations(); }, [fetchIntegrations]);

  const saveKey = async (serviceId) => {
    await fetch(`${apiBase}/api/integrations`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service: serviceId, api_key: apiKeyInput, enabled: true }),
    });
    setApiKeyInput('');
    setConfigDialog(null);
    fetchIntegrations();
  };

  const toggleService = async (serviceId) => {
    const current = integrations[serviceId];
    await fetch(`${apiBase}/api/integrations`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service: serviceId, enabled: !(current?.enabled) }),
    });
    fetchIntegrations();
  };

  const testConnection = async (serviceId) => {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await fetch(`${apiBase}/api/integrations/test/${serviceId}`, { method: 'POST' });
      const d = await r.json();
      setTestResult(d);
    } catch (e) {
      setTestResult({ connected: false, error: e.message });
    }
    setTesting(false);
  };

  const filtered = SERVICES.filter(s => filter === 'all' || s.category === filter);
  const connectedCount = Object.values(integrations).filter(v => v?.enabled).length;

  return (
    <Box>
      {/* Status bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {CATEGORIES.map(c => (
            <Chip key={c.id} label={`${c.icon} ${c.label}`} size="small"
              onClick={() => setFilter(c.id)}
              sx={{
                bgcolor: filter === c.id ? 'rgba(0,255,255,0.15)' : 'rgba(255,255,255,0.04)',
                color: filter === c.id ? 'var(--accent)' : 'rgba(255,255,255,0.6)',
                border: `1px solid ${filter === c.id ? 'var(--accent)' : 'rgba(255,255,255,0.08)'}`,
                fontWeight: filter === c.id ? 700 : 400, cursor: 'pointer',
              }}
            />
          ))}
        </Box>
        <Chip label={`${connectedCount} connected`} size="small"
          sx={{ bgcolor: 'rgba(0,255,100,0.1)', color: '#00ff64', fontWeight: 700, fontFamily: 'monospace' }} />
      </Box>

      {loading ? <CircularProgress size={28} sx={{ color: 'var(--accent)' }} /> : (
        <Grid container spacing={1.5}>
          {filtered.map(svc => (
            <Grid item xs={12} sm={6} md={4} key={svc.id}>
              <ServiceCard
                svc={svc}
                integration={integrations[svc.id]}
                onConfigure={() => { setConfigDialog(svc); setApiKeyInput(''); setTestResult(null); }}
                onToggle={() => toggleService(svc.id)}
                onTest={() => testConnection(svc.id)}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Config Dialog */}
      <Dialog open={!!configDialog} onClose={() => setConfigDialog(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: '#0a0c1a', border: '1px solid rgba(0,255,255,0.2)', borderRadius: 3 } }}>
        {configDialog && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <Box sx={{ fontSize: 28 }}>{configDialog.icon}</Box>
              <Box>
                <Typography sx={{ fontWeight: 700, color: configDialog.color }}>{configDialog.label}</Typography>
                <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{configDialog.desc}</Typography>
              </Box>
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
              {configDialog.note && (
                <Alert severity="info" sx={{ mb: 2, bgcolor: 'rgba(66,133,244,0.1)', color: '#90caf9', '& .MuiAlert-icon': { color: '#90caf9' } }}>
                  {configDialog.note}
                </Alert>
              )}
              <TextField
                fullWidth label="API Key / Credentials" variant="filled" size="small"
                type={showKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder={integrations[configDialog.id]?.api_key_preview || 'Enter API key...'}
                InputProps={{
                  sx: { color: '#fff', fontFamily: 'monospace' },
                  endAdornment: (
                    <IconButton size="small" onClick={() => setShowKey(!showKey)} sx={{ color: 'rgba(255,255,255,0.4)' }}>
                      {showKey ? <HideIcon fontSize="small" /> : <PreviewIcon fontSize="small" />}
                    </IconButton>
                  ),
                }}
                sx={{ mb: 2 }}
              />
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                {configDialog.links?.docs && (
                  <Button size="small" startIcon={<LinkIcon />} href={configDialog.links.docs} target="_blank"
                    sx={{ color: 'var(--accent)', textTransform: 'none', fontSize: 11 }}>API Docs</Button>
                )}
                {configDialog.links?.dashboard && (
                  <Button size="small" startIcon={<LinkIcon />} href={configDialog.links.dashboard} target="_blank"
                    sx={{ color: 'rgba(255,255,255,0.5)', textTransform: 'none', fontSize: 11 }}>Dashboard</Button>
                )}
              </Box>
              {testResult && (
                <Alert severity={testResult.connected ? 'success' : 'error'}
                  sx={{ mb: 1, bgcolor: testResult.connected ? 'rgba(0,255,100,0.1)' : 'rgba(255,0,0,0.1)' }}>
                  {testResult.connected ? '✓ Connection successful' : `✗ ${testResult.error || 'Connection failed'}`}
                  {testResult.note && <Typography sx={{ fontSize: 10, mt: 0.5 }}>{testResult.note}</Typography>}
                </Alert>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <Button onClick={() => testConnection(configDialog.id)} disabled={testing}
                sx={{ color: 'rgba(255,255,255,0.6)' }}>{testing ? <CircularProgress size={16} /> : 'Test'}</Button>
              <Button onClick={() => { setConfigDialog(null); }} sx={{ color: 'rgba(255,255,255,0.5)' }}>Cancel</Button>
              <Button onClick={() => saveKey(configDialog.id)} variant="contained"
                sx={{ bgcolor: configDialog.color, color: '#000', fontWeight: 700, '&:hover': { bgcolor: configDialog.color } }}>
                Save Key
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ███ TAB 2: BRAND KIT ██████████████████████████████████████████████████████
// ═══════════════════════════════════════════════════════════════════════════════
function BrandKitTab({ apiBase }) {
  const [kit, setKit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newColor, setNewColor] = useState({ hex: '#00ffff', label: '', usage: '' });
  const [newTagline, setNewTagline] = useState('');
  const [newTerm, setNewTerm] = useState({ term: '', definition: '', category: 'general' });
  const [newDisclaimer, setNewDisclaimer] = useState({ title: '', text: '' });

  const fetchKit = useCallback(async () => {
    try {
      const r = await fetch(`${apiBase}/api/brandkit`);
      setKit(await r.json());
    } catch { }
    setLoading(false);
  }, [apiBase]);

  useEffect(() => { fetchKit(); }, [fetchKit]);

  const updateField = async (field, value) => {
    await fetch(`${apiBase}/api/brandkit`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    fetchKit();
  };

  const addColor = async () => {
    if (!newColor.hex) return;
    await fetch(`${apiBase}/api/brandkit/color`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newColor),
    });
    setNewColor({ hex: '#00ffff', label: '', usage: '' });
    fetchKit();
  };

  const deleteColor = async (idx) => {
    await fetch(`${apiBase}/api/brandkit/color/${idx}`, { method: 'DELETE' });
    fetchKit();
  };

  const addTagline = async () => {
    if (!newTagline.trim()) return;
    await fetch(`${apiBase}/api/brandkit/tagline`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: newTagline }),
    });
    setNewTagline('');
    fetchKit();
  };

  const addTerminology = async () => {
    if (!newTerm.term.trim()) return;
    await fetch(`${apiBase}/api/brandkit/terminology`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newTerm),
    });
    setNewTerm({ term: '', definition: '', category: 'general' });
    fetchKit();
  };

  const addDisclaimer = async () => {
    if (!newDisclaimer.title.trim()) return;
    await fetch(`${apiBase}/api/brandkit/disclaimer`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newDisclaimer),
    });
    setNewDisclaimer({ title: '', text: '' });
    fetchKit();
  };

  if (loading) return <CircularProgress size={28} sx={{ color: 'var(--accent)' }} />;
  if (!kit) return <Typography sx={{ color: 'rgba(255,255,255,0.5)' }}>Failed to load brand kit</Typography>;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* ── Business Identity ── */}
      <Accordion defaultExpanded sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', '&::before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'var(--accent)' }} />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: 11 }}>🏢</Typography>
            <Typography sx={{ fontWeight: 700, fontSize: 13, color: 'var(--accent)' }}>Business Identity</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1.5}>
            <TextField fullWidth label="Business Name" variant="filled" size="small" value={kit.business_name || ''}
              onChange={(e) => updateField('business_name', e.target.value)}
              InputProps={{ sx: { color: '#fff' } }} />
            <TextField fullWidth label="About / Bio" variant="filled" size="small" multiline minRows={2}
              value={kit.about || ''} onChange={(e) => updateField('about', e.target.value)}
              InputProps={{ sx: { color: '#fff' } }} />
            <TextField fullWidth label="Headshot / Photo URL" variant="filled" size="small"
              value={kit.headshot_url || ''} onChange={(e) => updateField('headshot_url', e.target.value)}
              InputProps={{ sx: { color: '#fff' } }} />
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* ── Color Palette ── */}
      <Accordion defaultExpanded sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', '&::before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'var(--accent)' }} />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PaletteIcon sx={{ fontSize: 16, color: 'var(--accent)' }} />
            <Typography sx={{ fontWeight: 700, fontSize: 13, color: 'var(--accent)' }}>Color Palette</Typography>
            <Chip label={`${kit.colors?.length || 0} colors`} size="small" sx={{ height: 18, fontSize: 9, bgcolor: 'rgba(255,255,255,0.06)' }} />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
            {(kit.colors || []).map((c, i) => (
              <Tooltip key={i} title={`${c.label || c.hex} — ${c.usage || 'General'} | Click to copy`}>
                <Box onClick={() => navigator.clipboard.writeText(c.hex)} sx={{
                  width: 48, height: 48, borderRadius: 1.5, bgcolor: c.hex, cursor: 'pointer',
                  border: '2px solid rgba(255,255,255,0.2)', position: 'relative',
                  transition: 'all 0.2s', '&:hover': { transform: 'scale(1.1)', boxShadow: `0 0 16px ${c.hex}66` },
                  '&:hover .del-btn': { opacity: 1 },
                }}>
                  <Typography sx={{ position: 'absolute', bottom: -16, left: '50%', transform: 'translateX(-50%)',
                    fontSize: 7, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{c.hex}</Typography>
                  <IconButton className="del-btn" size="small" onClick={(e) => { e.stopPropagation(); deleteColor(i); }}
                    sx={{ position: 'absolute', top: -6, right: -6, bgcolor: 'rgba(0,0,0,0.7)', opacity: 0, transition: 'opacity 0.2s',
                      width: 16, height: 16, '& svg': { fontSize: 10 }, color: '#ff4444' }}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Tooltip>
            ))}
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 2 }}>
            <input type="color" value={newColor.hex} onChange={(e) => setNewColor(p => ({ ...p, hex: e.target.value }))}
              style={{ width: 32, height: 32, border: 'none', borderRadius: 4, cursor: 'pointer' }} />
            <TextField size="small" variant="filled" label="Label" value={newColor.label}
              onChange={(e) => setNewColor(p => ({ ...p, label: e.target.value }))}
              InputProps={{ sx: { color: '#fff' } }} sx={{ flex: 1 }} />
            <TextField size="small" variant="filled" label="Usage" value={newColor.usage}
              onChange={(e) => setNewColor(p => ({ ...p, usage: e.target.value }))}
              InputProps={{ sx: { color: '#fff' } }} sx={{ flex: 1 }} />
            <Button size="small" variant="contained" onClick={addColor}
              sx={{ bgcolor: 'var(--accent)', color: '#000', fontWeight: 700, minWidth: 60 }}>Add</Button>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* ── Fonts ── */}
      <Accordion sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', '&::before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'var(--accent)' }} />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextFieldsIcon sx={{ fontSize: 16, color: 'var(--accent)' }} />
            <Typography sx={{ fontWeight: 700, fontSize: 13, color: 'var(--accent)' }}>Font Selections</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1.5}>
            <TextField fullWidth label="Heading Font" variant="filled" size="small" value={kit.fonts?.heading || ''}
              onChange={(e) => updateField('fonts', { ...kit.fonts, heading: e.target.value })}
              placeholder="e.g. Orbitron, Montserrat, Playfair Display"
              InputProps={{ sx: { color: '#fff', fontFamily: kit.fonts?.heading || 'inherit' } }} />
            <TextField fullWidth label="Body Font" variant="filled" size="small" value={kit.fonts?.body || ''}
              onChange={(e) => updateField('fonts', { ...kit.fonts, body: e.target.value })}
              placeholder="e.g. Inter, Open Sans, Lato"
              InputProps={{ sx: { color: '#fff', fontFamily: kit.fonts?.body || 'inherit' } }} />
            <TextField fullWidth label="Accent / Display Font" variant="filled" size="small" value={kit.fonts?.accent || ''}
              onChange={(e) => updateField('fonts', { ...kit.fonts, accent: e.target.value })}
              placeholder="e.g. Fira Code, Space Mono"
              InputProps={{ sx: { color: '#fff', fontFamily: kit.fonts?.accent || 'inherit' } }} />
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* ── Taglines / Messaging ── */}
      <Accordion sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', '&::before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'var(--accent)' }} />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: 11 }}>💬</Typography>
            <Typography sx={{ fontWeight: 700, fontSize: 13, color: 'var(--accent)' }}>Taglines & Messaging</Typography>
            <Chip label={kit.taglines?.length || 0} size="small" sx={{ height: 18, fontSize: 9, bgcolor: 'rgba(255,255,255,0.06)' }} />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={0.8} sx={{ mb: 1.5 }}>
            {(kit.taglines || []).map((t, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 0.8,
                borderRadius: 1, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Typography sx={{ fontSize: 12, color: '#fff', fontStyle: 'italic' }}>"{t}"</Typography>
                <Box sx={{ display: 'flex', gap: 0.3 }}>
                  <IconButton size="small" onClick={() => navigator.clipboard.writeText(t)} sx={{ color: 'var(--accent)' }}>
                    <CopyIcon sx={{ fontSize: 14 }} /></IconButton>
                </Box>
              </Box>
            ))}
          </Stack>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField fullWidth size="small" variant="filled" label="New tagline" value={newTagline}
              onChange={(e) => setNewTagline(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTagline()}
              InputProps={{ sx: { color: '#fff' } }} />
            <Button size="small" onClick={addTagline} sx={{ bgcolor: 'var(--accent)', color: '#000', fontWeight: 700 }}>Add</Button>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* ── Legal Disclaimers ── */}
      <Accordion sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', '&::before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'var(--accent)' }} />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GavelIcon sx={{ fontSize: 14, color: 'var(--accent)' }} />
            <Typography sx={{ fontWeight: 700, fontSize: 13, color: 'var(--accent)' }}>Legal Disclaimers</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={0.8} sx={{ mb: 1.5 }}>
            {(kit.legal_disclaimers || []).map((d, i) => (
              <Box key={i} sx={{ p: 1, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', mb: 0.3 }}>{d.title}</Typography>
                <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', whiteSpace: 'pre-wrap' }}>{d.text}</Typography>
              </Box>
            ))}
          </Stack>
          <Stack spacing={1}>
            <TextField fullWidth size="small" variant="filled" label="Disclaimer Title" value={newDisclaimer.title}
              onChange={(e) => setNewDisclaimer(p => ({ ...p, title: e.target.value }))} InputProps={{ sx: { color: '#fff' } }} />
            <TextField fullWidth size="small" variant="filled" label="Disclaimer Text" multiline minRows={2}
              value={newDisclaimer.text} onChange={(e) => setNewDisclaimer(p => ({ ...p, text: e.target.value }))}
              InputProps={{ sx: { color: '#fff' } }} />
            <Button size="small" onClick={addDisclaimer} sx={{ bgcolor: 'var(--accent)', color: '#000', fontWeight: 700, alignSelf: 'flex-start' }}>Add Disclaimer</Button>
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* ── Terminology Database ── */}
      <Accordion sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', '&::before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'var(--accent)' }} />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SchoolIcon sx={{ fontSize: 14, color: 'var(--accent)' }} />
            <Typography sx={{ fontWeight: 700, fontSize: 13, color: 'var(--accent)' }}>Industry Terminology</Typography>
            <Chip label={kit.terminology?.length || 0} size="small" sx={{ height: 18, fontSize: 9, bgcolor: 'rgba(255,255,255,0.06)' }} />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={0.5} sx={{ mb: 1.5, maxHeight: 200, overflowY: 'auto' }}>
            {(kit.terminology || []).map((t, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1, p: 0.6, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.02)' }}>
                <Chip label={t.category} size="small" sx={{ height: 16, fontSize: 8, bgcolor: 'rgba(255,255,255,0.06)' }} />
                <Typography sx={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>{t.term}</Typography>
                <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>— {t.definition}</Typography>
              </Box>
            ))}
          </Stack>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <TextField size="small" variant="filled" label="Term" value={newTerm.term} sx={{ flex: 1, minWidth: 100 }}
              onChange={(e) => setNewTerm(p => ({ ...p, term: e.target.value }))} InputProps={{ sx: { color: '#fff' } }} />
            <TextField size="small" variant="filled" label="Definition" value={newTerm.definition} sx={{ flex: 2, minWidth: 150 }}
              onChange={(e) => setNewTerm(p => ({ ...p, definition: e.target.value }))} InputProps={{ sx: { color: '#fff' } }} />
            <TextField size="small" variant="filled" label="Category" value={newTerm.category} sx={{ width: 100 }}
              onChange={(e) => setNewTerm(p => ({ ...p, category: e.target.value }))} InputProps={{ sx: { color: '#fff' } }} />
            <Button size="small" onClick={addTerminology} sx={{ bgcolor: 'var(--accent)', color: '#000', fontWeight: 700 }}>Add</Button>
          </Box>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ███ TAB 3: CONTENT TOOLS ██████████████████████████████████████████████████
// ═══════════════════════════════════════════════════════════════════════════════
function ContentToolsTab({ apiBase }) {
  const [text, setText] = useState('');
  const [grammarResult, setGrammarResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [pdfTitle, setPdfTitle] = useState('');
  const [pdfContent, setPdfContent] = useState('');
  const [generating, setGenerating] = useState(false);
  const [pdfResult, setPdfResult] = useState(null);

  const checkGrammar = async () => {
    if (!text.trim()) return;
    setChecking(true);
    setGrammarResult(null);
    try {
      const r = await fetch(`${apiBase}/api/content/grammar-check`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      setGrammarResult(await r.json());
    } catch (e) {
      setGrammarResult({ error: e.message });
    }
    setChecking(false);
  };

  const generatePdf = async () => {
    if (!pdfContent.trim()) return;
    setGenerating(true);
    setPdfResult(null);
    try {
      const r = await fetch(`${apiBase}/api/content/pdf-generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: pdfTitle || 'Document', content: pdfContent }),
      });
      const d = await r.json();
      setPdfResult(d);
      if (d.pdf_base64) {
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${d.pdf_base64}`;
        link.download = d.filename || 'document.pdf';
        link.click();
      }
    } catch (e) {
      setPdfResult({ error: e.message });
    }
    setGenerating(false);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* ── Grammar & Style Checker ── */}
      <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <SpellcheckIcon sx={{ fontSize: 18, color: 'var(--accent)' }} />
          <Typography sx={{ fontWeight: 700, fontSize: 14, color: 'var(--accent)' }}>Grammar & Style Checker</Typography>
        </Box>
        <TextField fullWidth multiline minRows={4} variant="filled" size="small"
          label="Paste your content here..." value={text} onChange={(e) => setText(e.target.value)}
          InputProps={{ sx: { color: '#fff', fontSize: 13 } }} sx={{ mb: 1.5 }} />
        <Button variant="contained" onClick={checkGrammar} disabled={checking || !text.trim()}
          startIcon={checking ? <CircularProgress size={14} /> : <SpellcheckIcon />}
          sx={{ bgcolor: 'var(--accent)', color: '#000', fontWeight: 700 }}>
          {checking ? 'Checking...' : 'Check Grammar & Style'}
        </Button>
        {grammarResult && !grammarResult.error && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <Chip label={`Score: ${grammarResult.score}/100`} size="small"
                sx={{ bgcolor: grammarResult.score > 80 ? 'rgba(0,255,100,0.15)' : 'rgba(255,170,0,0.15)',
                  color: grammarResult.score > 80 ? '#00ff64' : '#ffaa00', fontWeight: 700, fontFamily: 'monospace' }} />
              <Chip label={`${grammarResult.issues?.length || 0} issues`} size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }} />
            </Box>
            {grammarResult.corrected && (
              <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'rgba(0,255,100,0.05)', border: '1px solid rgba(0,255,100,0.15)', mb: 1 }}>
                <Typography sx={{ fontSize: 10, color: '#00ff64', fontWeight: 700, mb: 0.5 }}>CORRECTED:</Typography>
                <Typography sx={{ fontSize: 12, color: '#fff', whiteSpace: 'pre-wrap' }}>{grammarResult.corrected}</Typography>
              </Box>
            )}
            {grammarResult.issues?.map((issue, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1, p: 0.6, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.02)', mb: 0.5 }}>
                <Chip label={issue.type} size="small" sx={{
                  height: 16, fontSize: 8,
                  bgcolor: issue.type === 'grammar' ? 'rgba(255,68,68,0.15)' :
                    issue.type === 'spelling' ? 'rgba(255,170,0,0.15)' : 'rgba(0,255,255,0.15)',
                  color: issue.type === 'grammar' ? '#ff4444' :
                    issue.type === 'spelling' ? '#ffaa00' : 'var(--accent)',
                }} />
                <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                  <span style={{ textDecoration: 'line-through', color: '#ff6666' }}>{issue.original}</span>
                  {' → '}
                  <span style={{ color: '#00ff64', fontWeight: 600 }}>{issue.suggestion}</span>
                </Typography>
              </Box>
            ))}
          </Box>
        )}
        {grammarResult?.error && (
          <Alert severity="error" sx={{ mt: 1, bgcolor: 'rgba(255,0,0,0.1)' }}>{grammarResult.error}</Alert>
        )}
      </Paper>

      {/* ── PDF Generator ── */}
      <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <PdfIcon sx={{ fontSize: 18, color: '#ff4444' }} />
          <Typography sx={{ fontWeight: 700, fontSize: 14, color: 'var(--accent)' }}>PDF Generator</Typography>
        </Box>
        <TextField fullWidth label="Document Title" variant="filled" size="small" value={pdfTitle}
          onChange={(e) => setPdfTitle(e.target.value)} InputProps={{ sx: { color: '#fff' } }} sx={{ mb: 1 }} />
        <TextField fullWidth multiline minRows={4} variant="filled" size="small"
          label="Document content (separate paragraphs with blank lines)" value={pdfContent}
          onChange={(e) => setPdfContent(e.target.value)} InputProps={{ sx: { color: '#fff', fontSize: 12 } }} sx={{ mb: 1.5 }} />
        <Button variant="contained" onClick={generatePdf} disabled={generating || !pdfContent.trim()}
          startIcon={generating ? <CircularProgress size={14} /> : <PdfIcon />}
          sx={{ bgcolor: '#ff4444', color: '#fff', fontWeight: 700 }}>
          {generating ? 'Generating...' : 'Generate & Download PDF'}
        </Button>
        {pdfResult?.error && (
          <Alert severity="error" sx={{ mt: 1, bgcolor: 'rgba(255,0,0,0.1)' }}>{pdfResult.error}</Alert>
        )}
        {pdfResult?.success && (
          <Alert severity="success" sx={{ mt: 1, bgcolor: 'rgba(0,255,100,0.1)' }}>PDF downloaded: {pdfResult.filename}</Alert>
        )}
      </Paper>

      {/* ── Professional Formatting Standards ── */}
      <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <DescriptionIcon sx={{ fontSize: 18, color: 'var(--accent)' }} />
          <Typography sx={{ fontWeight: 700, fontSize: 14, color: 'var(--accent)' }}>Quick Templates</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {[
            { label: '📄 Cover Page', text: '[COMPANY NAME]\n\n[DOCUMENT TITLE]\n\n[Subtitle / Description]\n\nPrepared by: [Author]\nDate: [Date]\nVersion: [1.0]\n\nConfidential — For Internal Use Only' },
            { label: '📋 Proposal', text: 'PROPOSAL\n\n1. Executive Summary\n[Brief overview of the proposal]\n\n2. Problem Statement\n[Describe the challenge or opportunity]\n\n3. Proposed Solution\n[Detail your approach]\n\n4. Timeline & Milestones\n[Key dates and deliverables]\n\n5. Budget\n[Cost breakdown]\n\n6. Next Steps\n[Call to action]' },
            { label: '📝 Invoice', text: 'INVOICE\n\nFrom: Connie Michelle Consulting\nTo: [Client Name]\nDate: [Date]\nInvoice #: [Number]\n\nServices Rendered:\n- [Service 1] — $[Amount]\n- [Service 2] — $[Amount]\n\nSubtotal: $[Amount]\nTax: $[Amount]\nTotal Due: $[Amount]\n\nPayment Terms: Net 30\nPayment Method: [Stripe/Bank Transfer]' },
            { label: '📧 Email Template', text: 'Subject: [Topic]\n\nHi [Name],\n\n[Opening — personalized greeting]\n\n[Main content — value proposition or update]\n\n[Call to action — clear next step]\n\nBest regards,\nConnie Michelle\nConnie Michelle Consulting\n[Phone] | [Email] | [Website]' },
            { label: '⚖️ Disclaimer', text: 'DISCLAIMER\n\nThe information provided by Connie Michelle Consulting is for general informational purposes only. All information is provided in good faith; however, we make no representation or warranty of any kind, express or implied, regarding the accuracy, adequacy, validity, reliability, availability, or completeness of any information.\n\n© [Year] Connie Michelle Consulting. All rights reserved.' },
            { label: '📊 Report Header', text: '[COMPANY LOGO]\n\n══════════════════════════════\n[REPORT TITLE]\n══════════════════════════════\n\nDate: [Date]\nPrepared for: [Client/Audience]\nAuthor: [Name]\nDepartment: [Department]\n\nTable of Contents:\n1. ...\n2. ...\n3. ...' },
          ].map((tmpl, i) => (
            <Button key={i} size="small" variant="outlined" onClick={() => { setPdfTitle(tmpl.label.replace(/^[^ ]+ /, '')); setPdfContent(tmpl.text); }}
              sx={{ textTransform: 'none', borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', fontSize: 11, '&:hover': { borderColor: 'var(--accent)', color: 'var(--accent)' } }}>
              {tmpl.label}
            </Button>
          ))}
        </Box>
      </Paper>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ███ MAIN EXPORT ███████████████████████████████████████████████████████████
// ═══════════════════════════════════════════════════════════════════════════════
export default function IntegrationsHub({ apiBase, onBack }) {
  const [tab, setTab] = useState(0);

  return (
    <Paper sx={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 1300, bgcolor: '#080a18', display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <Box sx={{
        p: 2, borderBottom: '1px solid rgba(0,255,255,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        bgcolor: 'rgba(0,0,0,0.5)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={onBack} sx={{ color: 'var(--accent)' }}>
            <ArrowBackIcon />
          </IconButton>
          <ExtensionIcon sx={{ color: 'var(--accent)', fontSize: 28 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#fff', letterSpacing: 1 }}>
              Command Center
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', letterSpacing: 2 }}>
              INTEGRATIONS · BRAND KIT · CONTENT TOOLS
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)}
        sx={{
          px: 2, borderBottom: '1px solid rgba(255,255,255,0.06)',
          '& .MuiTab-root': { color: 'rgba(255,255,255,0.5)', textTransform: 'none', fontWeight: 600, minHeight: 48, fontSize: 13 },
          '& .Mui-selected': { color: 'var(--accent) !important' },
          '& .MuiTabs-indicator': { bgcolor: 'var(--accent)' },
        }}>
        <Tab icon={<ExtensionIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Integrations" />
        <Tab icon={<PaletteIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Brand Kit" />
        <Tab icon={<DescriptionIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Content Tools" />
      </Tabs>

      {/* Content */}
      <Box sx={{ flex: 1, p: 3, overflowY: 'auto' }}>
        {tab === 0 && <IntegrationsTab apiBase={apiBase} />}
        {tab === 1 && <BrandKitTab apiBase={apiBase} />}
        {tab === 2 && <ContentToolsTab apiBase={apiBase} />}
      </Box>
    </Paper>
  );
}
