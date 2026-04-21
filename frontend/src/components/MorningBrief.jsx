import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, IconButton, Stack, CircularProgress, Fade, Tooltip,
} from '@mui/material';
import { WbSunny, Refresh, Close } from '@mui/icons-material';

export default function MorningBrief({ apiBase, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${apiBase}/api/morning-brief/today`);
      const d = await r.json();
      setData(d);
    } catch (e) {
      setData({ error: e.message });
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => { load(); }, [load]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{
          px: 3, py: 2,
          borderBottom: '1px solid rgba(255,200,100,0.15)',
          background: 'linear-gradient(90deg, rgba(255,160,50,0.08), transparent)',
          flexShrink: 0,
        }}
      >
        <WbSunny sx={{ color: '#FFD700', fontSize: 22 }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" sx={{ color: '#FFD700', fontWeight: 800, lineHeight: 1 }}>
            Morning Brief
          </Typography>
          {data?.date && (
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
              {data.date}
            </Typography>
          )}
        </Box>
        <Tooltip title="Regenerate">
          <IconButton onClick={load} disabled={loading} size="small" sx={{ color: 'rgba(255,255,255,0.4)' }}>
            <Refresh fontSize="small" />
          </IconButton>
        </Tooltip>
        {onClose && (
          <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(255,255,255,0.4)' }}>
            <Close fontSize="small" />
          </IconButton>
        )}
      </Stack>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        {loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 8, gap: 2 }}>
            <CircularProgress size={32} sx={{ color: '#FFD700' }} />
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
              Vesper is preparing your morning brief…
            </Typography>
          </Box>
        )}

        {!loading && data?.error && (
          <Box sx={{ textAlign: 'center', pt: 6 }}>
            <Typography sx={{ color: '#ff6b6b', mb: 1 }}>
              Could not load morning brief
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
              {data.error}
            </Typography>
          </Box>
        )}

        {!loading && data?.brief && (
          <Fade in>
            <Paper
              sx={{
                p: 3, borderRadius: 3,
                background: 'linear-gradient(135deg, rgba(255,160,50,0.06), rgba(0,0,0,0.4))',
                border: '1px solid rgba(255,200,100,0.15)',
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: 'rgba(255,255,255,0.88)',
                  lineHeight: 1.85,
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontSize: '0.95rem',
                }}
              >
                {data.brief}
              </Typography>
              {data.cached === false && (
                <Typography
                  variant="caption"
                  sx={{ display: 'block', mt: 2, color: 'rgba(255,200,100,0.5)' }}
                >
                  ✨ Just generated for today
                </Typography>
              )}
            </Paper>
          </Fade>
        )}

        {!loading && !data?.brief && !data?.error && (
          <Box sx={{ textAlign: 'center', pt: 8 }}>
            <WbSunny sx={{ fontSize: 48, color: 'rgba(255,200,100,0.15)', mb: 2 }} />
            <Typography sx={{ color: 'rgba(255,255,255,0.3)' }}>No brief available yet.</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
