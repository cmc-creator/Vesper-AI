import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, Chip, Stack, CircularProgress,
  IconButton, Divider, LinearProgress, Tooltip, Button,
} from '@mui/material';
import {
  TrendingUp, AttachMoney, AutoAwesome, CheckCircle, Schedule,
  ArrowBack, Refresh, OpenInNew, BookmarkBorder,
  EmojiObjects, MusicNote, Brush, Description, Campaign, Calculate,
} from '@mui/icons-material';

const TYPE_META = {
  ebook:          { label: 'eBook',        color: '#ff6b6b', icon: AutoAwesome,   monthly: 120 },
  song:           { label: 'Song',         color: '#ffd93d', icon: MusicNote,     monthly: 80  },
  art:            { label: 'Art/Print',    color: '#6bcb77', icon: Brush,         monthly: 60  },
  proposal:       { label: 'Proposal',     color: '#4d96ff', icon: Description,   monthly: 200 },
  income_plan:    { label: 'Income Plan',  color: '#c77dff', icon: Calculate,     monthly: 0   },
  content_calendar:{ label: 'Content Cal',color: '#ff9f1c', icon: Campaign,       monthly: 150 },
  course:         { label: 'Course',       color: '#2ec4b6', icon: EmojiObjects,  monthly: 300 },
  default:        { label: 'Creation',     color: '#aaa',    icon: AutoAwesome,   monthly: 50  },
};

function getMeta(type) {
  return TYPE_META[type] || TYPE_META.default;
}

function StatCard({ label, value, sub, color, icon: Icon }) {
  return (
    <Paper sx={{
      p: 2.5, borderRadius: 3,
      background: `linear-gradient(135deg, rgba(0,0,0,0.6), rgba(0,0,0,0.4))`,
      border: `1px solid ${color}33`,
      position: 'relative', overflow: 'hidden',
    }}>
      <Box sx={{
        position: 'absolute', top: -10, right: -10, opacity: 0.08,
        fontSize: 80, color,
      }}>
        <Icon sx={{ fontSize: 80 }} />
      </Box>
      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1.5 }}>
        {label}
      </Typography>
      <Typography variant="h4" sx={{ color, fontWeight: 800, my: 0.5 }}>
        {value}
      </Typography>
      {sub && (
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)' }}>
          {sub}
        </Typography>
      )}
    </Paper>
  );
}

function PipelineCard({ item, onOpen }) {
  const meta = getMeta(item.type);
  const Icon = meta.icon;
  const words = item.word_count || 0;
  const isPublished = item.status === 'published';
  const est = item.est_monthly || item.estimated_monthly_income || meta.monthly;

  return (
    <Paper
      onClick={() => onOpen && onOpen(item)}
      sx={{
        p: 2, borderRadius: 2, cursor: 'pointer',
        border: `1px solid ${meta.color}22`,
        background: 'rgba(0,0,0,0.45)',
        transition: 'all 0.2s',
        '&:hover': { border: `1px solid ${meta.color}66`, transform: 'translateY(-2px)', bgcolor: 'rgba(255,255,255,0.04)' },
      }}
    >
      <Stack direction="row" alignItems="flex-start" spacing={1.5}>
        <Box sx={{
          width: 36, height: 36, borderRadius: 1.5, flexShrink: 0,
          background: `${meta.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon sx={{ fontSize: 18, color: meta.color }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#fff', mb: 0.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.title}
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mb: 0.8 }}>
            {meta.label} · {words.toLocaleString()} words
          </Typography>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            <Chip
              label={isPublished ? 'Published' : 'Draft'}
              size="small"
              sx={{
                height: 18, fontSize: '0.6rem', fontWeight: 700,
                bgcolor: isPublished ? '#6bcb7722' : '#ffd93d22',
                color: isPublished ? '#6bcb77' : '#ffd93d',
                border: `1px solid ${isPublished ? '#6bcb7744' : '#ffd93d44'}`,
              }}
            />
            {est > 0 && (
              <Chip
                label={`~$${est}/mo`}
                size="small"
                sx={{
                  height: 18, fontSize: '0.6rem', fontWeight: 700,
                  bgcolor: '#4d96ff22', color: '#4d96ff', border: '1px solid #4d96ff44',
                }}
              />
            )}
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
}

export default function IncomeDashboard({ apiBase, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [content, setContent] = useState('');
  const [contentLoading, setContentLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${apiBase}/api/income/dashboard`);
      const d = await r.json();
      setData(d);
    } catch (e) {
      setData({ error: e.message });
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => { load(); }, [load]);

  const openItem = async (item) => {
    setSelected(item);
    setContent('');
    if (item.id) {
      setContentLoading(true);
      try {
        const r = await fetch(`${apiBase}/api/creative/creations/${item.id}`);
        const d = await r.json();
        setContent(d.content || '');
      } catch {}
      setContentLoading(false);
    }
  };

  if (selected) {
    const meta = getMeta(selected.type);
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
          <IconButton onClick={() => setSelected(null)} sx={{ color: 'rgba(255,255,255,0.6)' }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" sx={{ color: meta.color, fontWeight: 700 }}>{selected.title}</Typography>
          <Chip label={meta.label} size="small" sx={{ bgcolor: `${meta.color}22`, color: meta.color, border: `1px solid ${meta.color}44` }} />
        </Stack>
        <Paper sx={{ flex: 1, overflow: 'auto', p: 3, borderRadius: 2, background: 'rgba(0,0,0,0.4)', border: `1px solid ${meta.color}22` }}>
          {contentLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
              <CircularProgress sx={{ color: meta.color }} />
            </Box>
          ) : (
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
              {content || selected.preview || 'No content available.'}
            </Typography>
          )}
        </Paper>
      </Box>
    );
  }

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
          <Typography variant="h5" sx={{ color: '#4d96ff', fontWeight: 800, lineHeight: 1 }}>
            Income Dashboard
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
            What Vesper has built for you
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Refresh">
          <IconButton onClick={load} disabled={loading} sx={{ color: 'rgba(255,255,255,0.5)' }}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Stack>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
          <CircularProgress sx={{ color: '#4d96ff' }} />
        </Box>
      )}

      {!loading && data && !data.error && (
        <>
          {/* Stats row */}
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                label="Total Creations"
                value={data.total_creations || 0}
                sub="all types"
                color="#4d96ff"
                icon={AutoAwesome}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                label="Est. Monthly Income"
                value={`$${(data.total_est_monthly || 0).toLocaleString()}`}
                sub="if published"
                color="#6bcb77"
                icon={AttachMoney}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                label="Published"
                value={data.published_count || 0}
                sub="live & earning"
                color="#ffd93d"
                icon={CheckCircle}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                label="In Draft"
                value={data.draft_count || 0}
                sub="ready to launch"
                color="#ff6b6b"
                icon={Schedule}
              />
            </Grid>
          </Grid>

          {/* Income by type */}
          {data.by_type && Object.keys(data.by_type).length > 0 && (
            <Paper sx={{ p: 2.5, borderRadius: 3, mb: 3, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 2, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                Breakdown by Type
              </Typography>
              <Stack spacing={1.5}>
                {Object.entries(data.by_type).map(([type, info]) => {
                  const meta = getMeta(type);
                  const pct = data.total_est_monthly > 0
                    ? Math.round((info.est_monthly / data.total_est_monthly) * 100)
                    : 0;
                  return (
                    <Box key={type}>
                      <Stack direction="row" justifyContent="space-between" mb={0.5}>
                        <Typography variant="caption" sx={{ color: meta.color, fontWeight: 600 }}>
                          {info.label || meta.label} ({info.count})
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                          ~${info.est_monthly}/mo · {pct}%
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={pct}
                        sx={{
                          height: 6, borderRadius: 3,
                          bgcolor: `${meta.color}22`,
                          '& .MuiLinearProgress-bar': { bgcolor: meta.color, borderRadius: 3 },
                        }}
                      />
                    </Box>
                  );
                })}
              </Stack>
            </Paper>
          )}

          {/* Pipeline / Next Actions */}
          {data.pipeline && data.pipeline.length > 0 && (
            <Paper sx={{ p: 2.5, borderRadius: 3, mb: 3, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 2, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                Your Pipeline
              </Typography>
              <Grid container spacing={1.5}>
                {data.pipeline.map((item) => (
                  <Grid item xs={12} sm={6} md={4} key={item.id || item.title}>
                    <PipelineCard item={item} onOpen={openItem} />
                  </Grid>
                ))}
              </Grid>
            </Paper>
          )}

          {/* Next Actions */}
          {data.next_actions && data.next_actions.length > 0 && (
            <Paper sx={{ p: 2.5, borderRadius: 3, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 2, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                Next Actions
              </Typography>
              <Stack spacing={1}>
                {data.next_actions.map((action, i) => (
                  <Stack key={i} direction="row" spacing={1.5} alignItems="flex-start">
                    <Box sx={{
                      width: 20, height: 20, borderRadius: '50%', flexShrink: 0, mt: 0.1,
                      bgcolor: '#4d96ff22', border: '1px solid #4d96ff44',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Typography sx={{ fontSize: '0.6rem', color: '#4d96ff', fontWeight: 700 }}>{i + 1}</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
                      {action}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Paper>
          )}

          {(!data.total_creations || data.total_creations === 0) && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <AutoAwesome sx={{ fontSize: 56, color: 'rgba(255,255,255,0.1)', mb: 2 }} />
              <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.3)' }}>No creations yet</Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.2)', mt: 1 }}>
                Ask Vesper to write an ebook, create a song, or plan an income stream.
              </Typography>
            </Box>
          )}
        </>
      )}

      {!loading && data?.error && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography sx={{ color: '#ff6b6b' }}>Failed to load dashboard: {data.error}</Typography>
          <Button onClick={load} sx={{ mt: 2, color: '#4d96ff' }}>Retry</Button>
        </Box>
      )}
    </Box>
  );
}
