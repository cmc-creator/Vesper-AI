import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Stack,
  Typography,
  CircularProgress,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Divider,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Close as CloseIcon,
  Movie as MovieIcon,
  PlayArrow as PlayIcon,
  Theaters as TheatersIcon,
} from '@mui/icons-material';

export default function VideoCreator({ apiBase, onClose }) {
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(30);
  const [style, setStyle] = useState('cinematic');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [loading, setLoading] = useState(false);
  const [renderingScenes, setRenderingScenes] = useState(false);
  const [renderProgress, setRenderProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState('');
  const [plan, setPlan] = useState(null);
  const [raw, setRaw] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [clips, setClips] = useState([]);        // multi-scene clip results
  const [activeClip, setActiveClip] = useState(0); // which clip is playing

  // Single quick-clip generation (no scenes)
  const generateVideo = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError('');
    setVideoUrl('');
    setClips([]);

    try {
      const response = await fetch(`${apiBase}/api/video/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, aspect_ratio: aspectRatio }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      if (data.video_url) setVideoUrl(data.video_url);
    } catch (err) {
      setError(err.message || 'Video generation failed');
    } finally {
      setLoading(false);
    }
  };

  // Render ALL planned scenes via backend multi-scene endpoint
  const renderAllScenes = async () => {
    if (!plan?.scenes?.length) return;
    setRenderingScenes(true);
    setError('');
    setVideoUrl('');
    setClips([]);
    setRenderProgress({ current: 0, total: plan.scenes.length });

    try {
      const response = await fetch(`${apiBase}/api/video/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          aspect_ratio: aspectRatio,
          scenes: plan.scenes,
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      if (data.clips) {
        setClips(data.clips);
        setRenderProgress({ current: data.completed || 0, total: data.total_scenes || 0 });
        // Auto-play first successful clip
        const firstOk = data.clips.findIndex(c => c.status === 'success');
        if (firstOk >= 0) setActiveClip(firstOk);
      }
    } catch (err) {
      setError(err.message || 'Multi-scene rendering failed');
    } finally {
      setRenderingScenes(false);
    }
  };

  const createPlan = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setError('');
    setPlan(null);
    setRaw('');
    setClips([]);

    try {
      const response = await fetch(`${apiBase}/api/video/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          duration_seconds: Number(duration),
          style,
          aspect_ratio: aspectRatio,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setPlan(data.plan);
      setRaw(data.raw || '');
    } catch (err) {
      setError(err.message || 'Video planning failed');
    } finally {
      setLoading(false);
    }
  };

  const exportAsJSON = () => {
    const payload = plan || raw;
    if (!payload) return;
    const data = { prompt, duration, style, aspectRatio, plan: payload };
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    link.download = `vesper-video-plan-${Date.now()}.json`;
    link.click();
  };

  const exportAsMarkdown = () => {
    if (!plan && !raw) return;
    let markdown = `# Video Plan\n\n**Prompt:** ${prompt}\n\n`;
    markdown += `**Duration:** ${duration}s\n**Style:** ${style}\n**Aspect Ratio:** ${aspectRatio}\n\n---\n\n`;

    if (plan) {
      markdown += `## ${plan.title || 'Untitled'}\n\n`;
      markdown += `${plan.logline || ''}\n\n`;
      if (Array.isArray(plan.scenes)) {
        plan.scenes.forEach((scene) => {
          markdown += `### Scene ${scene.index || ''}\n`;
          markdown += `${scene.description || ''}\n\n`;
          if (scene.camera) markdown += `- Camera: ${scene.camera}\n`;
          if (scene.lighting) markdown += `- Lighting: ${scene.lighting}\n`;
          if (scene.audio) markdown += `- Audio: ${scene.audio}\n`;
          if (scene.on_screen_text) markdown += `- On-screen: ${scene.on_screen_text}\n`;
          markdown += '\n';
        });
      }
    } else {
      markdown += raw;
    }

    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown' }));
    link.download = `vesper-video-plan-${Date.now()}.md`;
    link.click();
  };

  return (
    <Paper
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: 'rgba(0, 0, 0, 0.8)',
        border: '1px solid rgba(0, 255, 255, 0.2)',
        borderRadius: '12px',
        p: 2,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--accent)' }}>
          🎬 Create Videos
        </Typography>
        <Tooltip title="Close">
          <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(255,255,255,0.6)' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Stack spacing={2} sx={{ mb: 2 }}>
        <TextField
          fullWidth
          placeholder="Describe the video you want..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={loading}
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': {
              color: '#fff',
              '& fieldset': { borderColor: 'rgba(0, 255, 255, 0.3)' },
              '&:hover fieldset': { borderColor: 'rgba(0, 255, 255, 0.5)' },
              '&.Mui-focused fieldset': { borderColor: 'var(--accent)' },
            },
            '& .MuiInputBase-input::placeholder': { color: 'rgba(255, 255, 255, 0.4)', opacity: 1 },
          }}
        />

        <Stack direction="row" spacing={1}>
          <Select value={duration} onChange={(e) => setDuration(e.target.value)} size="small" sx={{ color: '#fff' }}>
            <MenuItem value={15}>15s</MenuItem>
            <MenuItem value={30}>30s</MenuItem>
            <MenuItem value={60}>60s</MenuItem>
          </Select>
          <Select value={style} onChange={(e) => setStyle(e.target.value)} size="small" sx={{ color: '#fff' }}>
            <MenuItem value="cinematic">Cinematic</MenuItem>
            <MenuItem value="documentary">Documentary</MenuItem>
            <MenuItem value="ad">Ad / Promo</MenuItem>
            <MenuItem value="social">Social Clip</MenuItem>
          </Select>
          <Select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} size="small" sx={{ color: '#fff' }}>
            <MenuItem value="16:9">16:9</MenuItem>
            <MenuItem value="9:16">9:16</MenuItem>
            <MenuItem value="1:1">1:1</MenuItem>
          </Select>
        </Stack>

        <Stack direction="row" spacing={1}>
          <Button
            onClick={createPlan}
            disabled={loading || renderingScenes || !prompt.trim()}
            variant="outlined"
            startIcon={loading ? <CircularProgress size={18} /> : <MovieIcon fontSize="small" />}
            sx={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
          >
            {loading ? 'Thinking...' : 'Start Plan'}
          </Button>
          <Button
            onClick={generateVideo}
            disabled={loading || renderingScenes || !prompt.trim()}
            variant="contained"
            startIcon={loading ? <CircularProgress size={18} /> : <MovieIcon fontSize="small" />}
            sx={{ bgcolor: 'var(--accent)', color: '#000' }}
          >
            {loading ? 'Creating...' : 'Quick Clip'}
          </Button>
          {plan?.scenes?.length > 0 && (
            <Button
              onClick={renderAllScenes}
              disabled={loading || renderingScenes}
              variant="contained"
              startIcon={renderingScenes ? <CircularProgress size={18} /> : <TheatersIcon fontSize="small" />}
              sx={{ bgcolor: '#ff6b35', color: '#fff', '&:hover': { bgcolor: '#e55a2b' } }}
            >
              {renderingScenes
                ? `Rendering ${renderProgress.current}/${renderProgress.total}...`
                : `Render All ${plan.scenes.length} Scenes`}
            </Button>
          )}
        </Stack>
      </Stack>

      {/* Rendering progress bar */}
      {renderingScenes && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ color: 'var(--accent)' }}>
            Rendering scenes... Each scene takes ~60-90 seconds. Please be patient.
          </Typography>
          <LinearProgress
            variant="indeterminate"
            sx={{ mt: 1, '& .MuiLinearProgress-bar': { bgcolor: 'var(--accent)' }, bgcolor: 'rgba(0,255,255,0.1)' }}
          />
        </Box>
      )}

      {error && (
        <Box sx={{ color: '#ff6b6b', mb: 2, fontSize: '0.9rem', bgcolor: 'rgba(255,0,0,0.1)', p: 1, borderRadius: 1 }}>
          ⚠️ {error}
          {error.includes('REPLICATE_API_TOKEN') && (
            <Typography variant="caption" display="block" sx={{ mt: 1, color: 'rgba(255,255,255,0.7)' }}>
              Video generation requires a Replicate API key. <br/>
              1. Get key from <a href="https://replicate.com/" target="_blank" style={{color:'var(--accent)'}}>replicate.com</a><br/>
              2. Add to <code>backend/.env</code> as <code>REPLICATE_API_TOKEN=r8_...</code><br/>
              3. Restart backend
            </Typography>
          )}
        </Box>
      )}

      {/* Single clip player */}
      {videoUrl && !clips.length && (
        <Box sx={{ mt: 2, mb: 2, border: '1px solid var(--accent)', borderRadius: 2, overflow: 'hidden' }}>
          <video src={videoUrl} controls autoPlay loop style={{ width: '100%', display: 'block' }} />
          <Typography variant="caption" sx={{ p: 1, display: 'block', color: 'rgba(255,255,255,0.6)' }}>
            Quick Clip (~5s) &bull; Cost: ~$0.02
          </Typography>
        </Box>
      )}

      {/* Multi-scene clips player */}
      {clips.length > 0 && (
        <Box sx={{ mt: 2, mb: 2 }}>
          {/* Active clip player */}
          {clips[activeClip]?.video_url && (
            <Box sx={{ border: '1px solid var(--accent)', borderRadius: 2, overflow: 'hidden', mb: 1 }}>
              <video
                key={clips[activeClip].video_url}
                src={clips[activeClip].video_url}
                controls
                autoPlay
                style={{ width: '100%', display: 'block' }}
              />
              <Typography variant="caption" sx={{ p: 1, display: 'block', color: 'rgba(255,255,255,0.6)' }}>
                Scene {clips[activeClip].index} of {clips.length}
              </Typography>
            </Box>
          )}
          {/* Scene thumbnail strip */}
          <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1 }}>
            {clips.map((clip, idx) => (
              <Chip
                key={idx}
                icon={clip.status === 'success' ? <PlayIcon fontSize="small" /> : undefined}
                label={`Scene ${clip.index}`}
                onClick={() => clip.status === 'success' && setActiveClip(idx)}
                sx={{
                  cursor: clip.status === 'success' ? 'pointer' : 'default',
                  bgcolor: idx === activeClip ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
                  color: idx === activeClip ? '#000' : clip.status === 'success' ? '#fff' : '#ff6b6b',
                  border: `1px solid ${clip.status === 'success' ? 'var(--accent)' : 'rgba(255,0,0,0.3)'}`,
                  fontWeight: idx === activeClip ? 700 : 400,
                  '&:hover': clip.status === 'success' ? { bgcolor: 'rgba(0,255,255,0.3)' } : {},
                }}
              />
            ))}
          </Stack>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', mt: 0.5, display: 'block' }}>
            {clips.filter(c => c.status === 'success').length}/{clips.length} scenes rendered &bull;
            ~$0.02 per scene
          </Typography>
        </Box>
      )}

      <Box sx={{ flex: 1, overflowY: 'auto', mb: 2 }}>
        {plan ? (
          <Box>
            <Typography variant="subtitle1" sx={{ color: 'var(--accent)', fontWeight: 700 }}>
              {plan.title || 'Video Plan'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 2 }}>
              {plan.logline}
            </Typography>
            {Array.isArray(plan.scenes) && plan.scenes.map((scene) => (
              <Box key={scene.index} sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#fff' }}>
                  Scene {scene.index}: {scene.description}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                  Camera: {scene.camera} | Lighting: {scene.lighting} | Audio: {scene.audio}
                </Typography>
              </Box>
            ))}
          </Box>
        ) : raw ? (
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>{raw}</Typography>
        ) : (
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
            Create a plan to preview here
          </Typography>
        )}
      </Box>

      {(plan || raw) && (
        <>
          <Divider sx={{ mb: 1.5, borderColor: 'rgba(0, 255, 255, 0.15)' }} />
          <Stack direction="row" spacing={1}>
            <Button
              onClick={exportAsMarkdown}
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon fontSize="small" />}
              sx={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
            >
              Markdown
            </Button>
            <Button
              onClick={exportAsJSON}
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon fontSize="small" />}
              sx={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
            >
              JSON
            </Button>
          </Stack>
        </>
      )}
    </Paper>
  );
}
