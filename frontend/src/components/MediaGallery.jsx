import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Stack,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
} from '@mui/material';
import {
  Close as CloseIcon,
  Image as ImageIcon,
  Movie as MovieIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  PhotoLibrary as GalleryIcon,
} from '@mui/icons-material';

export default function MediaGallery({ apiBase, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | image | video
  const [preview, setPreview] = useState(null);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? `?media_type=${filter}` : '';
      const res = await fetch(`${apiBase}/api/media${params}`);
      const data = await res.json();
      setItems(data.items || []);
    } catch (err) {
      console.error('Failed to load gallery:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMedia(); }, [filter]);

  const deleteItem = async (id) => {
    try {
      await fetch(`${apiBase}/api/media/${id}`, { method: 'DELETE' });
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Paper
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: 'rgba(0, 0, 0, 0.85)',
        border: '1px solid rgba(0, 255, 255, 0.2)',
        borderRadius: '12px',
        p: 2,
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <GalleryIcon sx={{ color: 'var(--accent)' }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--accent)' }}>
            Media Gallery
          </Typography>
          <Chip label={items.length} size="small" sx={{ bgcolor: 'rgba(0,255,255,0.15)', color: 'var(--accent)', fontWeight: 700 }} />
        </Stack>
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchMedia} size="small" sx={{ color: 'rgba(255,255,255,0.6)' }}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Close">
            <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(255,255,255,0.6)' }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Filter chips */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        {['all', 'image', 'video'].map((f) => (
          <Chip
            key={f}
            label={f === 'all' ? 'All' : f === 'image' ? 'Images' : 'Videos'}
            icon={f === 'image' ? <ImageIcon fontSize="small" /> : f === 'video' ? <MovieIcon fontSize="small" /> : undefined}
            onClick={() => setFilter(f)}
            sx={{
              bgcolor: filter === f ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
              color: filter === f ? '#000' : 'rgba(255,255,255,0.7)',
              fontWeight: filter === f ? 700 : 400,
              cursor: 'pointer',
              '&:hover': { bgcolor: filter === f ? 'var(--accent)' : 'rgba(255,255,255,0.12)' },
            }}
          />
        ))}
      </Stack>

      {/* Cards grid */}
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
            <CircularProgress size={32} sx={{ color: 'var(--accent)' }} />
          </Box>
        ) : items.length === 0 ? (
          <Box sx={{ textAlign: 'center', pt: 4, color: 'rgba(255,255,255,0.4)' }}>
            <GalleryIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
            <Typography>No media yet. Generate some images or videos!</Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 1.5,
            }}
          >
            {items.map((item) => (
              <Box
                key={item.id}
                sx={{
                  position: 'relative',
                  bgcolor: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(0,255,255,0.12)',
                  borderRadius: 2,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: 'var(--accent)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(0,255,255,0.15)',
                  },
                  '&:hover .delete-btn': { opacity: 1 },
                }}
                onClick={() => setPreview(item)}
              >
                {/* Thumbnail */}
                <Box sx={{ width: '100%', height: 100, overflow: 'hidden', bgcolor: 'rgba(0,0,0,0.5)' }}>
                  {item.type === 'image' ? (
                    <img
                      src={item.url}
                      alt={item.prompt}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      loading="lazy"
                    />
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <MovieIcon sx={{ fontSize: 36, color: 'var(--accent)', opacity: 0.6 }} />
                    </Box>
                  )}
                </Box>

                {/* Type badge */}
                <Chip
                  size="small"
                  label={item.type}
                  icon={item.type === 'image' ? <ImageIcon sx={{ fontSize: '14px !important' }} /> : <MovieIcon sx={{ fontSize: '14px !important' }} />}
                  sx={{
                    position: 'absolute',
                    top: 4,
                    left: 4,
                    height: 20,
                    fontSize: '0.65rem',
                    bgcolor: item.type === 'image' ? 'rgba(0,200,255,0.8)' : 'rgba(255,100,50,0.8)',
                    color: '#fff',
                    '& .MuiChip-icon': { color: '#fff' },
                  }}
                />

                {/* Delete button */}
                <IconButton
                  className="delete-btn"
                  size="small"
                  onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
                  sx={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    bgcolor: 'rgba(0,0,0,0.6)',
                    color: '#ff6b6b',
                    '&:hover': { bgcolor: 'rgba(255,0,0,0.3)' },
                    p: 0.3,
                  }}
                >
                  <DeleteIcon sx={{ fontSize: 14 }} />
                </IconButton>

                {/* Info */}
                <Box sx={{ p: 1 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: '#fff',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      fontSize: '0.7rem',
                      lineHeight: 1.3,
                    }}
                  >
                    {item.prompt}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem', display: 'block', mt: 0.3 }}>
                    {formatDate(item.created_at)}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Preview dialog */}
      <Dialog
        open={!!preview}
        onClose={() => setPreview(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'rgba(10,10,20,0.95)',
            border: '1px solid var(--accent)',
            borderRadius: 3,
          },
        }}
      >
        {preview && (
          <DialogContent sx={{ p: 1 }}>
            {preview.type === 'image' ? (
              <img src={preview.url} alt={preview.prompt} style={{ width: '100%', borderRadius: 8 }} />
            ) : (
              <video src={preview.url} controls autoPlay style={{ width: '100%', borderRadius: 8 }} />
            )}
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mt: 1, px: 1 }}>
              {preview.prompt}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', px: 1, display: 'block' }}>
              {formatDate(preview.created_at)} &bull; {preview.metadata?.provider || preview.type}
            </Typography>
          </DialogContent>
        )}
      </Dialog>
    </Paper>
  );
}
