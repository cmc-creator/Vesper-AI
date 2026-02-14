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
  Image as ImageIcon,
} from '@mui/icons-material';

export default function ImageGenerator({ apiBase, onClose }) {
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState('1024x1024');
  const [style, setStyle] = useState('vivid');
  const [quality, setQuality] = useState('standard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageBase64, setImageBase64] = useState('');

  const generateImage = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setError('');
    setImageUrl('');
    setImageBase64('');

    try {
      const response = await fetch(`${apiBase}/api/images/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, size, style, quality }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      if (data.image_url) setImageUrl(data.image_url);
      if (data.image_base64) setImageBase64(data.image_base64);
    } catch (err) {
      setError(err.message || 'Image generation failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = () => {
    const link = document.createElement('a');
    if (imageUrl) {
      link.href = imageUrl;
    } else if (imageBase64) {
      link.href = `data:image/png;base64,${imageBase64}`;
    } else {
      return;
    }
    link.download = `vesper-image-${Date.now()}.png`;
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
          🎨 Create Images
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
          placeholder="Describe the image you want..."
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
          <Select
            value={size}
            onChange={(e) => setSize(e.target.value)}
            size="small"
            sx={{ color: '#fff', minWidth: 140 }}
          >
            <MenuItem value="1024x1024">1024x1024</MenuItem>
            <MenuItem value="1024x1792">1024x1792</MenuItem>
            <MenuItem value="1792x1024">1792x1024</MenuItem>
          </Select>
          <Select
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            size="small"
            sx={{ color: '#fff', minWidth: 120 }}
          >
            <MenuItem value="vivid">Vivid</MenuItem>
            <MenuItem value="natural">Natural</MenuItem>
          </Select>
          <Select
            value={quality}
            onChange={(e) => setQuality(e.target.value)}
            size="small"
            sx={{ color: '#fff', minWidth: 120 }}
          >
            <MenuItem value="standard">Standard</MenuItem>
            <MenuItem value="hd">HD</MenuItem>
          </Select>
        </Stack>

        <Button
          onClick={generateImage}
          disabled={loading || !prompt.trim()}
          variant="contained"
          startIcon={loading ? <CircularProgress size={18} /> : <ImageIcon fontSize="small" />}
          sx={{ bgcolor: 'var(--accent)', color: '#000' }}
        >
          {loading ? 'Generating...' : 'Generate Image'}
        </Button>
      </Stack>

      {error && (
        <Box sx={{ color: '#ff6b6b', mb: 2, fontSize: '0.9rem' }}>
          {error}
        </Box>
      )}

      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {(imageUrl || imageBase64) ? (
          <Box sx={{ textAlign: 'center' }}>
            <img
              src={imageUrl || `data:image/png;base64,${imageBase64}`}
              alt="Generated"
              style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: '8px' }}
            />
            <Divider sx={{ my: 2, borderColor: 'rgba(0, 255, 255, 0.2)' }} />
            <Button
              onClick={downloadImage}
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon fontSize="small" />}
              sx={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
            >
              Download
            </Button>
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
            Generate an image to preview here
          </Typography>
        )}
      </Box>
    </Paper>
  );
}
