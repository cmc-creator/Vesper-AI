import React, { useState, useEffect, Suspense } from 'react';
import {
  Box, Paper, Typography, Button, Stack, IconButton, Chip, TextField,
  Tabs, Tab, CircularProgress, Tooltip, Dialog, Grid
} from '@mui/material';
import {
  Close as CloseIcon,
  Casino as DiceIcon,
  AutoAwesome as SparkleIcon,
  Link as LinkIcon,
  CloudUpload as UploadIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import VesperAvatar3D, { AvatarThumbnail } from './VesperAvatar3D';

export default function AvatarStudio({ apiBase, onClose, accentColor = '#00ffff', vesperIdentity, setToast }) {
  const [tab, setTab] = useState(0); // 0=Gallery, 1=Ready Player Me, 2=AI Generate
  const [avatars, setAvatars] = useState([]);
  const [activeAvatar, setActiveAvatar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allowVesperChoice, setAllowVesperChoice] = useState(true);
  const [rpmUrl, setRpmUrl] = useState('');
  const [rpmInput, setRpmInput] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiConcepts, setAiConcepts] = useState([]);
  const [previewAvatar, setPreviewAvatar] = useState(null);

  useEffect(() => {
    fetchAvatars();
  }, [apiBase]);

  const fetchAvatars = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/avatars`);
      if (res.ok) {
        const data = await res.json();
        setAvatars(data.avatars || []);
        setActiveAvatar(data.active);
        setAllowVesperChoice(data.allow_vesper_choice ?? true);
        setRpmUrl(data.rpm_url || '');
        setRpmInput(data.rpm_url || '');
      }
    } catch (e) { console.error('Fetch avatars failed:', e); }
    finally { setLoading(false); }
  };

  const selectAvatar = async (id) => {
    try {
      const res = await fetch(`${apiBase}/api/avatars/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_id: id }),
      });
      if (res.ok) {
        setActiveAvatar(id);
        setToast?.(`✨ Avatar changed!`);
      }
    } catch (e) { console.error(e); }
  };

  const saveRpmUrl = async () => {
    try {
      const res = await fetch(`${apiBase}/api/avatars/rpm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: rpmInput }),
      });
      if (res.ok) {
        setRpmUrl(rpmInput);
        setToast?.('✅ Ready Player Me avatar saved!');
        fetchAvatars();
      }
    } catch (e) { console.error(e); }
  };

  const generateAiAvatar = async () => {
    setAiGenerating(true);
    try {
      const res = await fetch(`${apiBase}/api/avatars/ai-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.avatar_concept) {
          setAiConcepts(prev => [data.avatar_concept, ...prev]);
          setToast?.('🎨 Avatar concept generated!');
        }
      }
    } catch (e) { console.error(e); }
    finally { setAiGenerating(false); }
  };

  const toggleVesperChoice = async () => {
    const newVal = !allowVesperChoice;
    try {
      await fetch(`${apiBase}/api/avatars/vesper-choice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allow: newVal }),
      });
      setAllowVesperChoice(newVal);
      setToast?.(newVal ? '🎲 Vesper can now pick her own avatar!' : '🔒 Avatar locked to your choice');
    } catch (e) { console.error(e); }
  };

  const currentAvatar = avatars.find(a => a.id === (previewAvatar || activeAvatar));

  return (
    <Paper className="intel-board glass-card" sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 0 }}>
      {/* Header */}
      <Box className="board-header" sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            🧬 Avatar Studio
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            Choose Vesper's 3D form — premade, custom, or AI-generated
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: 'rgba(255,255,255,0.7)' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Large 3D Preview */}
      <Box sx={{ p: 2, pb: 0 }}>
        <VesperAvatar3D
          avatarUrl={currentAvatar?.file}
          scale={currentAvatar?.scale || 1.5}
          position={currentAvatar?.position || [0, -1, 0]}
          height={220}
          accentColor={accentColor}
        />
        {currentAvatar && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#fff' }}>
                {currentAvatar.name}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                {currentAvatar.description}
              </Typography>
            </Box>
            <Stack direction="row" spacing={0.5}>
              {currentAvatar.tags?.map(tag => (
                <Chip key={tag} label={tag} size="small" sx={{ 
                  height: 20, fontSize: '0.6rem',
                  bgcolor: `${accentColor}15`, color: accentColor, 
                  border: `1px solid ${accentColor}33`,
                }} />
              ))}
            </Stack>
          </Box>
        )}
      </Box>

      {/* Vesper Choice Toggle */}
      <Box sx={{ px: 2, pt: 1 }}>
        <Button
          size="small"
          onClick={toggleVesperChoice}
          startIcon={allowVesperChoice ? <DiceIcon /> : <CheckIcon />}
          sx={{
            color: allowVesperChoice ? '#ff66ff' : 'rgba(255,255,255,0.5)',
            fontSize: '0.7rem',
            textTransform: 'none',
            border: `1px solid ${allowVesperChoice ? 'rgba(255,102,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 2,
            '&:hover': { bgcolor: 'rgba(255,102,255,0.1)' },
          }}
        >
          {allowVesperChoice ? "Vesper picks her avatar daily" : "I choose the avatar"}
        </Button>
        {vesperIdentity?.avatar && (
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', ml: 1, fontSize: '0.6rem' }}>
            Today she chose: {avatars.find(a => a.id === vesperIdentity.avatar)?.name || vesperIdentity.avatar}
          </Typography>
        )}
      </Box>

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="fullWidth"
        sx={{
          mt: 1,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          '& .MuiTab-root': { color: 'rgba(255,255,255,0.5)', minHeight: 40, fontSize: '0.75rem' },
          '& .Mui-selected': { color: accentColor },
          '& .MuiTabs-indicator': { bgcolor: accentColor },
        }}
      >
        <Tab label="🎮 Gallery" />
        <Tab label="🧑 Ready Player Me" />
        <Tab label="🤖 AI Generate" />
      </Tabs>

      {/* Tab Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {/* Tab 0: Gallery */}
        {tab === 0 && (
          <Box>
            {loading ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CircularProgress size={24} sx={{ color: accentColor }} />
              </Box>
            ) : (
              <>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', mb: 1.5, display: 'block' }}>
                  {avatars.filter(a => a.file).length} models available — click to preview, double-click to select
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {avatars.filter(a => a.file).map((avatar) => (
                    <Box
                      key={avatar.id}
                      onClick={() => setPreviewAvatar(avatar.id)}
                      onDoubleClick={() => selectAvatar(avatar.id)}
                      sx={{
                        width: 100,
                        cursor: 'pointer',
                        borderRadius: 2,
                        p: 1,
                        textAlign: 'center',
                        border: activeAvatar === avatar.id 
                          ? `2px solid ${accentColor}` 
                          : previewAvatar === avatar.id
                          ? `2px solid ${accentColor}66`
                          : '2px solid rgba(255,255,255,0.06)',
                        bgcolor: activeAvatar === avatar.id 
                          ? `${accentColor}15` 
                          : 'rgba(255,255,255,0.02)',
                        transition: 'all 0.2s ease',
                        '&:hover': { 
                          borderColor: `${accentColor}66`,
                          transform: 'translateY(-2px)',
                        },
                        position: 'relative',
                      }}
                    >
                      {/* Type badge */}
                      <Chip 
                        label={avatar.type === 'premade' ? '📦' : avatar.type === 'readyplayerme' ? '🧑' : '🤖'}
                        size="small"
                        sx={{ 
                          position: 'absolute', top: 2, right: 2, 
                          height: 18, minWidth: 18, fontSize: '0.6rem',
                          bgcolor: 'rgba(0,0,0,0.5)',
                        }} 
                      />
                      
                      {/* Preview icon */}
                      <Box sx={{ 
                        height: 50, 
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '2rem',
                        mb: 0.5,
                      }}>
                        {avatar.tags?.includes('cyberpunk') ? '🤖' :
                         avatar.tags?.includes('fantasy') ? '🐉' :
                         avatar.tags?.includes('nature') ? '🐴' :
                         avatar.tags?.includes('cute') ? '🍄' :
                         avatar.tags?.includes('flying') ? '🦅' :
                         avatar.tags?.includes('mech') ? '⚙️' : '✨'}
                      </Box>
                      
                      <Typography variant="caption" sx={{ 
                        color: activeAvatar === avatar.id ? accentColor : 'rgba(255,255,255,0.7)',
                        fontWeight: activeAvatar === avatar.id ? 700 : 500,
                        fontSize: '0.6rem',
                        lineHeight: 1.2,
                        display: 'block',
                      }}>
                        {avatar.name}
                      </Typography>

                      {activeAvatar === avatar.id && (
                        <Chip label="Active" size="small" sx={{ 
                          mt: 0.5, height: 16, fontSize: '0.5rem',
                          bgcolor: `${accentColor}25`, color: accentColor,
                        }} />
                      )}
                    </Box>
                  ))}
                </Box>

                {previewAvatar && previewAvatar !== activeAvatar && (
                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => { selectAvatar(previewAvatar); setPreviewAvatar(null); }}
                      sx={{ 
                        bgcolor: accentColor, color: '#000', fontWeight: 700,
                        textTransform: 'none', borderRadius: 2,
                        '&:hover': { bgcolor: accentColor, filter: 'brightness(1.2)' },
                      }}
                    >
                      ✨ Set as active avatar
                    </Button>
                  </Box>
                )}
              </>
            )}
          </Box>
        )}

        {/* Tab 1: Ready Player Me */}
        {tab === 1 && (
          <Stack spacing={2}>
            <Box sx={{ 
              p: 2, borderRadius: 2, 
              bgcolor: 'rgba(0,255,255,0.03)', 
              border: '1px solid rgba(0,255,255,0.1)' 
            }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: accentColor, mb: 1 }}>
                🧑 Ready Player Me
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mb: 1.5 }}>
                Create a custom 3D avatar at{' '}
                <a 
                  href="https://readyplayer.me" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: accentColor, textDecoration: 'none' }}
                >
                  readyplayer.me
                </a>
                , then paste the .glb URL here.
              </Typography>
              
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="https://models.readyplayer.me/xxx.glb"
                  value={rpmInput}
                  onChange={(e) => setRpmInput(e.target.value)}
                  InputProps={{
                    startAdornment: <LinkIcon sx={{ color: 'rgba(255,255,255,0.3)', mr: 1, fontSize: 18 }} />,
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': { 
                      color: '#fff', 
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
                      '&:hover fieldset': { borderColor: `${accentColor}44` },
                    },
                  }}
                />
                <Button
                  variant="contained"
                  onClick={saveRpmUrl}
                  disabled={!rpmInput.trim()}
                  sx={{ 
                    bgcolor: accentColor, color: '#000', fontWeight: 700,
                    textTransform: 'none', whiteSpace: 'nowrap',
                    '&:hover': { bgcolor: accentColor, filter: 'brightness(1.2)' },
                  }}
                >
                  Save
                </Button>
              </Stack>

              {rpmUrl && (
                <Box sx={{ mt: 1.5 }}>
                  <Chip 
                    label="✅ RPM avatar connected" 
                    size="small"
                    onDelete={() => { setRpmInput(''); saveRpmUrl(); }}
                    sx={{ bgcolor: 'rgba(0,255,136,0.15)', color: '#00ff88' }} 
                  />
                </Box>
              )}
            </Box>

            <Box sx={{ 
              p: 2, borderRadius: 2, 
              bgcolor: 'rgba(255,255,255,0.02)', 
              border: '1px solid rgba(255,255,255,0.06)' 
            }}>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>How it works:</Typography>
              <Stack spacing={0.5}>
                {[
                  '1. Go to readyplayer.me and create your avatar',
                  '2. Copy the .glb model URL from the builder',
                  '3. Paste it above and click Save',
                  '4. Your avatar appears in the Gallery tab!',
                  '5. Vesper can also use it if she chooses',
                ].map((step) => (
                  <Typography key={step} variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                    {step}
                  </Typography>
                ))}
              </Stack>
            </Box>

            <Box sx={{ 
              p: 2, borderRadius: 2, 
              bgcolor: 'rgba(255,255,255,0.02)', 
              border: '1px solid rgba(255,255,255,0.06)' 
            }}>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>Upload Custom .glb</Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', display: 'block', mb: 1 }}>
                Have your own 3D model? Drop it in <code style={{ color: accentColor }}>frontend/public/models/</code> and enter the path:
              </Typography>
              <TextField
                size="small"
                fullWidth
                placeholder="/models/my-custom-avatar.glb"
                sx={{
                  '& .MuiOutlinedInput-root': { 
                    color: '#fff', 
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
                  },
                }}
              />
            </Box>
          </Stack>
        )}

        {/* Tab 2: AI Generate */}
        {tab === 2 && (
          <Stack spacing={2}>
            <Box sx={{ 
              p: 2, borderRadius: 2, 
              bgcolor: 'rgba(255,0,255,0.03)', 
              border: '1px solid rgba(255,0,255,0.1)' 
            }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#ff66ff', mb: 1 }}>
                🤖 AI Avatar Designer
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mb: 1.5 }}>
                Describe your ideal avatar and Vesper's AI will generate a detailed concept. Use services like{' '}
                <a href="https://www.meshy.ai" target="_blank" rel="noopener noreferrer" style={{ color: '#ff66ff' }}>Meshy.ai</a>
                {' '}or{' '}
                <a href="https://www.tripo3d.ai" target="_blank" rel="noopener noreferrer" style={{ color: '#ff66ff' }}>Tripo3D</a>
                {' '}to turn concepts into real 3D models.
              </Typography>
              
              <TextField
                size="small"
                fullWidth
                multiline
                rows={2}
                placeholder="e.g. A glowing cyberpunk fox spirit with neon circuit patterns..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                sx={{
                  mb: 1.5,
                  '& .MuiOutlinedInput-root': { 
                    color: '#fff', 
                    '& fieldset': { borderColor: 'rgba(255,0,255,0.2)' },
                    '&:hover fieldset': { borderColor: 'rgba(255,0,255,0.4)' },
                  },
                }}
              />
              
              <Button
                variant="contained"
                onClick={generateAiAvatar}
                disabled={aiGenerating || !aiPrompt.trim()}
                startIcon={aiGenerating ? <CircularProgress size={16} sx={{ color: '#000' }} /> : <SparkleIcon />}
                sx={{ 
                  bgcolor: '#ff66ff', color: '#000', fontWeight: 700,
                  textTransform: 'none', borderRadius: 2,
                  '&:hover': { bgcolor: '#ff88ff' },
                }}
              >
                {aiGenerating ? 'Generating...' : 'Generate Concept'}
              </Button>
            </Box>

            {/* AI Concept Results */}
            {aiConcepts.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#ff66ff' }}>
                  Generated Concepts
                </Typography>
                <Stack spacing={1.5}>
                  {aiConcepts.map((concept, i) => (
                    <Box key={i} sx={{
                      p: 2, borderRadius: 2,
                      bgcolor: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,0,255,0.15)',
                    }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                        {concept.design?.name || concept.name || `Concept ${i + 1}`}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mb: 1 }}>
                        {concept.design?.description || concept.description || 'AI-generated avatar concept'}
                      </Typography>
                      
                      {/* Color palette */}
                      {concept.design?.color_palette && (
                        <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                          {concept.design.color_palette.map((color, ci) => (
                            <Box key={ci} sx={{
                              width: 20, height: 20, borderRadius: '50%',
                              bgcolor: color, border: '1px solid rgba(255,255,255,0.2)',
                            }} />
                          ))}
                        </Box>
                      )}
                      
                      {/* Tags */}
                      {concept.design?.style_tags && (
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {concept.design.style_tags.map((tag, ti) => (
                            <Chip key={ti} label={tag} size="small" sx={{
                              height: 18, fontSize: '0.55rem',
                              bgcolor: 'rgba(255,0,255,0.1)', color: '#ff88ff',
                            }} />
                          ))}
                        </Box>
                      )}
                      
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.25)', display: 'block', mt: 1, fontSize: '0.6rem' }}>
                        💡 Use this concept with Meshy.ai or Tripo3D to generate a real .glb model, then upload it in the RPM tab
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        )}
      </Box>
    </Paper>
  );
}
