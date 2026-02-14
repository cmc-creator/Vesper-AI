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
} from '@mui/material';
import {
  Download as DownloadIcon,
  Close as CloseIcon,
  School as SchoolIcon,
} from '@mui/icons-material';

export default function GuidedLearning({ apiBase, onClose }) {
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('beginner');
  const [goals, setGoals] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [guide, setGuide] = useState(null);
  const [raw, setRaw] = useState('');

  const generateGuide = async () => {
    if (!topic.trim()) return;

    setLoading(true);
    setError('');
    setGuide(null);
    setRaw('');

    try {
      const response = await fetch(`${apiBase}/api/learning/guide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, level, goals }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setGuide(data.guide);
      setRaw(data.raw || '');
    } catch (err) {
      setError(err.message || 'Learning guide failed');
    } finally {
      setLoading(false);
    }
  };

  const exportAsJSON = () => {
    const payload = guide || raw;
    if (!payload) return;
    const data = { topic, level, goals, guide: payload };
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    link.download = `vesper-learning-${Date.now()}.json`;
    link.click();
  };

  const exportAsMarkdown = () => {
    if (!guide && !raw) return;
    let markdown = `# Learning Guide\n\n**Topic:** ${topic}\n**Level:** ${level}\n**Goals:** ${goals}\n\n---\n\n`;
    if (guide) {
      markdown += `## ${guide.title || 'Guide'}\n\n`;
      if (Array.isArray(guide.outline)) {
        guide.outline.forEach((lesson, idx) => {
          markdown += `### Lesson ${idx + 1}: ${lesson.title || ''}\n`;
          markdown += `${lesson.summary || ''}\n\n`;
          if (Array.isArray(lesson.exercises)) {
            markdown += `**Exercises:**\n`;
            lesson.exercises.forEach((ex) => { markdown += `- ${ex}\n`; });
            markdown += '\n';
          }
          if (Array.isArray(lesson.resources)) {
            markdown += `**Resources:**\n`;
            lesson.resources.forEach((res) => { markdown += `- ${res}\n`; });
            markdown += '\n';
          }
        });
      }
    } else {
      markdown += raw;
    }

    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown' }));
    link.download = `vesper-learning-${Date.now()}.md`;
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
          📚 Guided Learning
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
          placeholder="What do you want to learn?"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
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
          <Select value={level} onChange={(e) => setLevel(e.target.value)} size="small" sx={{ color: '#fff', minWidth: 140 }}>
            <MenuItem value="beginner">Beginner</MenuItem>
            <MenuItem value="intermediate">Intermediate</MenuItem>
            <MenuItem value="advanced">Advanced</MenuItem>
          </Select>
          <TextField
            fullWidth
            placeholder="Goals (optional)"
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            disabled={loading}
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                '& fieldset': { borderColor: 'rgba(0, 255, 255, 0.3)' },
              },
              '& .MuiInputBase-input::placeholder': { color: 'rgba(255, 255, 255, 0.4)', opacity: 1 },
            }}
          />
        </Stack>

        <Button
          onClick={generateGuide}
          disabled={loading || !topic.trim()}
          variant="contained"
          startIcon={loading ? <CircularProgress size={18} /> : <SchoolIcon fontSize="small" />}
          sx={{ bgcolor: 'var(--accent)', color: '#000' }}
        >
          {loading ? 'Building...' : 'Build Learning Plan'}
        </Button>
      </Stack>

      {error && (
        <Box sx={{ color: '#ff6b6b', mb: 2, fontSize: '0.9rem' }}>{error}</Box>
      )}

      <Box sx={{ flex: 1, overflowY: 'auto', mb: 2 }}>
        {guide ? (
          <Box>
            <Typography variant="subtitle1" sx={{ color: 'var(--accent)', fontWeight: 700 }}>
              {guide.title || 'Learning Plan'}
            </Typography>
            {Array.isArray(guide.outline) && guide.outline.map((lesson, idx) => (
              <Box key={idx} sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#fff' }}>
                  Lesson {idx + 1}: {lesson.title}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  {lesson.summary}
                </Typography>
              </Box>
            ))}
          </Box>
        ) : raw ? (
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>{raw}</Typography>
        ) : (
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
            Create a learning plan to preview here
          </Typography>
        )}
      </Box>

      {(guide || raw) && (
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
