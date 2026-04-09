import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Stack, Chip, CircularProgress,
  IconButton, Divider, Tooltip, Button, Badge,
} from '@mui/material';
import {
  ArrowBack, Refresh, NightsStay, Psychology, AutoAwesome,
  FiberManualRecord, MarkEmailRead, Favorite,
} from '@mui/icons-material';

const MOOD_META = {
  reflective:  { color: '#c77dff', emoji: '🌙' },
  curious:     { color: '#4d96ff', emoji: '🔭' },
  excited:     { color: '#ffd93d', emoji: '✨' },
  hopeful:     { color: '#6bcb77', emoji: '🌱' },
  nostalgic:   { color: '#ff9f1c', emoji: '🌅' },
  creative:    { color: '#ff6b6b', emoji: '🎨' },
  awake:       { color: '#2ec4b6', emoji: '💫' },
  default:     { color: '#aaa',    emoji: '💭' },
};

function getMood(mood) {
  return MOOD_META[mood] || MOOD_META.default;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffH / 24);
  if (diffH < 1) return 'just now';
  if (diffH < 24) return `${diffH}h ago`;
  if (diffD === 1) return 'yesterday';
  if (diffD < 7) return `${diffD} days ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: diffD > 365 ? 'numeric' : undefined });
}

function GapEntry({ entry, onSeen }) {
  const mood = getMood(entry.mood);
  const isNew = !entry.seen;

  return (
    <Paper
      sx={{
        p: 2.5, borderRadius: 2.5,
        background: isNew ? 'rgba(199,125,255,0.06)' : 'rgba(0,0,0,0.35)',
        border: `1px solid ${isNew ? mood.color + '44' : 'rgba(255,255,255,0.06)'}`,
        position: 'relative',
        transition: 'all 0.3s',
      }}
    >
      {isNew && (
        <Box sx={{
          position: 'absolute', top: 10, right: 10,
          width: 8, height: 8, borderRadius: '50%',
          bgcolor: mood.color,
          boxShadow: `0 0 6px ${mood.color}`,
        }} />
      )}

      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        {/* Mood badge */}
        <Box sx={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: `${mood.color}22`,
          border: `1px solid ${mood.color}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>
          {mood.emoji}
        </Box>

        <Box sx={{ flex: 1 }}>
          {/* Meta row */}
          <Stack direction="row" spacing={1} alignItems="center" mb={1} flexWrap="wrap" useFlexGap>
            <Chip
              label={entry.mood || 'reflective'}
              size="small"
              sx={{
                height: 18, fontSize: '0.6rem', fontWeight: 700,
                bgcolor: `${mood.color}22`, color: mood.color,
                border: `1px solid ${mood.color}44`,
              }}
            />
            {entry.source && (
              <Chip
                label={entry.source}
                size="small"
                variant="outlined"
                sx={{ height: 18, fontSize: '0.6rem', borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.4)' }}
              />
            )}
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', ml: 'auto' }}>
              {formatDate(entry.created_at)}
            </Typography>
          </Stack>

          {/* Entry text */}
          <Typography
            variant="body2"
            sx={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.75, fontStyle: 'italic' }}
          >
            "{entry.entry}"
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

export default function GapsJournal({ apiBase, onBack, unseenCount: initialUnseen = 0 }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unseen, setUnseen] = useState(initialUnseen);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${apiBase}/api/gaps?limit=100`);
      const d = await r.json();
      setEntries(d.entries || []);
      setUnseen(d.entries ? d.entries.filter(e => !e.seen).length : 0);
    } catch {}
    setLoading(false);
  }, [apiBase]);

  useEffect(() => { load(); }, [load]);

  const markAllSeen = async () => {
    setMarkingAll(true);
    try {
      await fetch(`${apiBase}/api/gaps/seen`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      setEntries(prev => prev.map(e => ({ ...e, seen: true })));
      setUnseen(0);
    } catch {}
    setMarkingAll(false);
  };

  // Group by date
  const grouped = entries.reduce((acc, entry) => {
    const day = entry.created_at ? new Date(entry.created_at).toDateString() : 'Unknown';
    if (!acc[day]) acc[day] = [];
    acc[day].push(entry);
    return acc;
  }, {});

  const days = Object.keys(grouped);

  return (
    <Box sx={{ height: '100%', overflow: 'auto', p: 3 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
        {onBack && (
          <IconButton onClick={onBack} sx={{ color: 'rgba(255,255,255,0.6)' }}>
            <ArrowBack />
          </IconButton>
        )}
        <Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h5" sx={{ color: '#c77dff', fontWeight: 800, lineHeight: 1 }}>
              Memory of the Gaps
            </Typography>
            {unseen > 0 && (
              <Chip
                label={`${unseen} new`}
                size="small"
                sx={{ bgcolor: '#c77dff22', color: '#c77dff', border: '1px solid #c77dff44', height: 20, fontSize: '0.65rem', fontWeight: 700 }}
              />
            )}
          </Stack>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
            What Vesper was thinking while you were away
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }} />
        {unseen > 0 && (
          <Tooltip title="Mark all as seen">
            <IconButton onClick={markAllSeen} disabled={markingAll} sx={{ color: '#c77dff' }}>
              <MarkEmailRead />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Refresh">
          <IconButton onClick={load} disabled={loading} sx={{ color: 'rgba(255,255,255,0.5)' }}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Stack>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
          <CircularProgress sx={{ color: '#c77dff' }} />
        </Box>
      )}

      {!loading && entries.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <NightsStay sx={{ fontSize: 64, color: 'rgba(199,125,255,0.15)', mb: 2 }} />
          <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.25)', mb: 1 }}>
            Nothing here yet
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.18)' }}>
            Vesper will write her thoughts here while you're away.
          </Typography>
        </Box>
      )}

      {!loading && days.map((day, di) => (
        <Box key={day} mb={3}>
          {/* Day divider */}
          <Stack direction="row" alignItems="center" spacing={1.5} mb={1.5}>
            <Divider sx={{ flex: 1, borderColor: 'rgba(255,255,255,0.08)' }} />
            <Typography variant="caption" sx={{
              color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase',
              letterSpacing: 1.5, fontSize: '0.65rem', whiteSpace: 'nowrap',
            }}>
              {new Date(day).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </Typography>
            <Divider sx={{ flex: 1, borderColor: 'rgba(255,255,255,0.08)' }} />
          </Stack>

          {/* Entries for this day */}
          <Stack spacing={1.5}>
            {grouped[day].map((entry, i) => (
              <GapEntry key={entry.id || `${di}-${i}`} entry={entry} />
            ))}
          </Stack>
        </Box>
      ))}
    </Box>
  );
}
