import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Grid,
  Typography,
  Box,
  LinearProgress,
  Chip,
  Stack,
  CircularProgress,
  Button,
  Collapse,
  Divider,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  Dns as DnsIcon,
  Refresh as RefreshIcon,
  Code as CodeIcon,
  BugReport as BugIcon,
  Healing as HealingIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Api as ApiIcon,
  Psychology as AiIcon,
  DataObject as DbIcon,
  Extension as DepIcon,
  Web as WebIcon,
} from '@mui/icons-material';

const statusColors = {
  healthy: '#00ff88',
  healthy_with_warnings: '#ffbb00',
  degraded: '#ff8800',
  critical: '#ff2244',
  ok: '#00ff88',
  error: '#ff2244',
  warning: '#ffbb00',
};

const MetricCard = ({ icon, label, value, subtext, color = 'var(--accent)', status }) => (
  <Box
    sx={{
      p: 2,
      bgcolor: 'rgba(255,255,255,0.05)',
      borderRadius: 2,
      border: `1px solid ${status === 'error' ? '#ff224466' : status === 'warning' ? '#ffbb0044' : 'rgba(255,255,255,0.1)'}`,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 1,
      transition: 'border-color 0.3s',
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color }}>
      {icon}
      <Typography variant="body2" sx={{ fontWeight: 600 }}>{label}</Typography>
      {status && (
        <Box sx={{ ml: 'auto' }}>
          {status === 'ok' ? <CheckIcon sx={{ fontSize: 16, color: '#00ff88' }} /> :
           status === 'error' ? <ErrorIcon sx={{ fontSize: 16, color: '#ff2244' }} /> :
           <WarningIcon sx={{ fontSize: 16, color: '#ffbb00' }} />}
        </Box>
      )}
    </Box>
    <Typography variant="h4" sx={{ fontWeight: 700, color: '#fff' }}>{value}</Typography>
    {subtext && <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>{subtext}</Typography>}
  </Box>
);

const CheckSection = ({ title, icon, status, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Box sx={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
      <Box
        onClick={() => setOpen(!open)}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5,
          cursor: 'pointer', bgcolor: 'rgba(255,255,255,0.03)',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
        }}
      >
        <Box sx={{ color: statusColors[status] || '#888' }}>{icon}</Box>
        <Typography variant="body2" sx={{ fontWeight: 600, color: '#fff', flex: 1 }}>{title}</Typography>
        <Chip
          label={status?.toUpperCase()}
          size="small"
          sx={{
            bgcolor: `${statusColors[status] || '#888'}22`,
            color: statusColors[status] || '#888',
            fontWeight: 700, fontSize: 10, height: 22,
          }}
        />
        {open ? <CollapseIcon sx={{ color: '#888' }} /> : <ExpandIcon sx={{ color: '#888' }} />}
      </Box>
      <Collapse in={open}>
        <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {children}
        </Box>
      </Collapse>
    </Box>
  );
};

const IssueItem = ({ issue }) => (
  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', py: 0.5 }}>
    {issue.severity === 'critical' || issue.severity === 'high' ? (
      <ErrorIcon sx={{ fontSize: 16, color: '#ff2244', mt: 0.3 }} />
    ) : (
      <WarningIcon sx={{ fontSize: 16, color: '#ffbb00', mt: 0.3 }} />
    )}
    <Box>
      <Typography variant="body2" sx={{ color: '#fff', fontSize: 13 }}>
        {issue.message}
      </Typography>
      {issue.file && (
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
          {issue.file}{issue.line ? `:${issue.line}` : ''}
        </Typography>
      )}
    </Box>
    <Chip
      label={issue.severity || issue.type}
      size="small"
      sx={{ ml: 'auto', height: 18, fontSize: 9, fontWeight: 700,
        bgcolor: issue.severity === 'critical' || issue.severity === 'high' ? '#ff224422' : '#ffbb0022',
        color: issue.severity === 'critical' || issue.severity === 'high' ? '#ff2244' : '#ffbb00',
      }}
    />
  </Box>
);

export default function SystemDiagnostics({ open, onClose, apiBase }) {
  const [data, setData] = useState(null);
  const [healData, setHealData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [healing, setHealing] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('diagnostics'); // 'diagnostics' | 'heal'

  const fetchDiagnostics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/system/diagnostics`);
      if (!res.ok) throw new Error('Diagnostics endpoint unavailable');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      // Fallback to basic health
      try {
        const res = await fetch(`${apiBase}/api/system/health`);
        if (res.ok) {
          const json = await res.json();
          setData({ status: json.status, checks: { hardware: { status: 'ok', ...json.metrics } }, issues: [], warnings: [], summary: { issues_count: 0, warnings_count: 0, checks_passed: 1, checks_total: 1 } });
        }
      } catch { /* ignore */ }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  const runSelfHeal = async () => {
    setHealing(true);
    setTab('heal');
    try {
      const res = await fetch(`${apiBase}/api/system/self-heal`, { method: 'POST' });
      if (!res.ok) throw new Error('Self-heal failed');
      const json = await res.json();
      setHealData(json);
      // Refresh diagnostics after heal
      setTimeout(fetchDiagnostics, 1000);
    } catch (err) {
      setHealData({ status: 'error', summary: err.message });
    } finally {
      setHealing(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchDiagnostics();
      const interval = setInterval(fetchDiagnostics, 10000); // 10s refresh (more complex now)
      return () => clearInterval(interval);
    }
  }, [open, fetchDiagnostics]);

  const checks = data?.checks || {};

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        style: {
          backgroundColor: 'var(--panel-bg)',
          backdropFilter: 'blur(20px)',
          border: `1px solid ${statusColors[data?.status] || 'var(--accent)'}`,
          borderRadius: '16px',
          maxHeight: '85vh',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', pb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <SpeedIcon sx={{ color: statusColors[data?.status] || 'var(--accent)' }} />
          <Box>
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, lineHeight: 1.2 }}>
              Vesper System Diagnostics
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
              {data?.summary ? `${data.summary.checks_passed}/${data.summary.checks_total} checks passed` : 'Scanning...'}
              {data?.timestamp && ` • ${new Date(data.timestamp).toLocaleTimeString()}`}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Run Self-Heal">
            <IconButton onClick={runSelfHeal} disabled={healing} sx={{ color: '#00ff88' }}>
              {healing ? <CircularProgress size={20} sx={{ color: '#00ff88' }} /> : <HealingIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Rescan">
            <IconButton onClick={fetchDiagnostics} disabled={loading} sx={{ color: 'var(--accent)' }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.5)' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {loading && !data ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 5, gap: 2 }}>
            <CircularProgress size={60} sx={{ color: 'var(--accent)' }} />
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>Running full system scan...</Typography>
          </Box>
        ) : error && !data ? (
          <Alert severity="error" sx={{ bgcolor: 'rgba(255,30,30,0.1)' }}>{error}</Alert>
        ) : (
          <Stack spacing={2.5}>
            {/* Overall Status Banner */}
            <Box sx={{
              p: 2, borderRadius: 2,
              bgcolor: `${statusColors[data?.status] || '#888'}11`,
              border: `1px solid ${statusColors[data?.status] || '#888'}44`,
              display: 'flex', alignItems: 'center', gap: 2,
            }}>
              <Box sx={{
                width: 12, height: 12, borderRadius: '50%',
                bgcolor: statusColors[data?.status],
                boxShadow: `0 0 12px ${statusColors[data?.status]}`,
                animation: data?.status === 'critical' ? 'pulse 1s infinite' : 'none',
              }} />
              <Typography variant="body1" sx={{ color: '#fff', fontWeight: 700, flex: 1, textTransform: 'uppercase', letterSpacing: 1 }}>
                {data?.status?.replace(/_/g, ' ')}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                {data?.summary?.issues_count || 0} issues • {data?.summary?.warnings_count || 0} warnings
              </Typography>
            </Box>

            {/* Issues List (if any) */}
            {data?.issues?.length > 0 && (
              <Box sx={{ p: 2, bgcolor: 'rgba(255,30,30,0.05)', borderRadius: 2, border: '1px solid rgba(255,30,30,0.2)' }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#ff4444', mb: 1 }}>
                  <BugIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />
                  Active Issues
                </Typography>
                <Stack spacing={0.5} divider={<Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />}>
                  {data.issues.map((issue, i) => <IssueItem key={i} issue={issue} />)}
                </Stack>
              </Box>
            )}

            {/* Hardware Metrics */}
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <MetricCard icon={<SpeedIcon />} label="CPU" value={`${checks.hardware?.cpu_percent ?? '—'}%`} color="#ff4444" status={checks.hardware?.cpu_percent > 90 ? 'warning' : 'ok'} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <MetricCard icon={<MemoryIcon />} label="Memory" value={`${checks.hardware?.memory_percent ?? '—'}%`} subtext={checks.hardware?.memory_available_gb ? `${checks.hardware.memory_available_gb}GB free` : ''} color="#00ff88" status={checks.hardware?.memory_percent > 90 ? 'warning' : 'ok'} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <MetricCard icon={<StorageIcon />} label="Disk" value={`${checks.hardware?.disk_percent ?? '—'}%`} color="#00ffff" status={checks.hardware?.disk_percent > 95 ? 'error' : 'ok'} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <MetricCard icon={<AiIcon />} label="AI Providers" value={`${checks.ai_providers?.active_count ?? '—'}`} subtext={checks.ai_providers?.active_count === 1 ? 'No fallback!' : 'Active'} color="#cc66ff" status={checks.ai_providers?.status} />
              </Grid>
            </Grid>

            {/* Detailed Checks */}
            <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.3)', letterSpacing: 2 }}>
              Detailed Scan Results
            </Typography>

            {/* Python Syntax */}
            {checks.python_syntax && (
              <CheckSection title={`Python Code — ${checks.python_syntax.files_checked} files`} icon={<CodeIcon />} status={checks.python_syntax.status} defaultOpen={checks.python_syntax.status !== 'ok'}>
                {checks.python_syntax.errors?.length > 0 ? (
                  <Stack spacing={1}>
                    {checks.python_syntax.errors.map((err, i) => (
                      <Box key={i} sx={{ p: 1.5, bgcolor: 'rgba(255,30,30,0.08)', borderRadius: 1, fontFamily: 'monospace', fontSize: 12 }}>
                        <Typography variant="body2" sx={{ color: '#ff4444', fontWeight: 700 }}>
                          {err.file}:{err.line}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                          {err.message}
                        </Typography>
                        {err.text && (
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', display: 'block', mt: 0.5 }}>
                            {err.text}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" sx={{ color: '#00ff88' }}>✓ No syntax errors found</Typography>
                )}
              </CheckSection>
            )}

            {/* Frontend Scan */}
            {checks.frontend_scan && (
              <CheckSection title={`Frontend Code — ${checks.frontend_scan.files_checked} files`} icon={<WebIcon />} status={checks.frontend_scan.status}>
                {checks.frontend_scan.issues?.length > 0 ? (
                  <Stack spacing={0.5}>
                    {checks.frontend_scan.issues.map((issue, i) => (
                      <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <WarningIcon sx={{ fontSize: 14, color: '#ffbb00' }} />
                        <Typography variant="caption" sx={{ color: '#fff', fontFamily: 'monospace' }}>
                          {issue.file}: {issue.issue}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" sx={{ color: '#00ff88' }}>✓ No issues detected</Typography>
                )}
              </CheckSection>
            )}

            {/* Endpoint Health */}
            {checks.endpoints && (
              <CheckSection title="API Endpoints" icon={<ApiIcon />} status={checks.endpoints.status} defaultOpen={checks.endpoints.status !== 'ok'}>
                <Stack spacing={0.5}>
                  {Object.entries(checks.endpoints.results || {}).map(([path, info]) => (
                    <Box key={path} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {info.ok ? <CheckIcon sx={{ fontSize: 14, color: '#00ff88' }} /> : <ErrorIcon sx={{ fontSize: 14, color: '#ff2244' }} />}
                      <Typography variant="caption" sx={{ color: info.ok ? '#fff' : '#ff4444', fontFamily: 'monospace', flex: 1 }}>
                        {path}
                      </Typography>
                      <Chip label={info.status_code || 'ERR'} size="small" sx={{ height: 18, fontSize: 10, fontWeight: 700, bgcolor: info.ok ? '#00ff8822' : '#ff224422', color: info.ok ? '#00ff88' : '#ff2244' }} />
                      {info.response_time_ms != null && (
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', minWidth: 50, textAlign: 'right' }}>
                          {info.response_time_ms}ms
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Stack>
              </CheckSection>
            )}

            {/* AI Providers */}
            {checks.ai_providers && (
              <CheckSection title="AI Providers" icon={<AiIcon />} status={checks.ai_providers.status}>
                <Stack spacing={0.5}>
                  {Object.entries(checks.ai_providers.providers || {}).map(([name, active]) => (
                    <Box key={name} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {active ? <CheckIcon sx={{ fontSize: 14, color: '#00ff88' }} /> : <ErrorIcon sx={{ fontSize: 14, color: '#ff2244' }} />}
                      <Typography variant="caption" sx={{ color: active ? '#fff' : 'rgba(255,255,255,0.3)', textTransform: 'capitalize' }}>
                        {name}
                      </Typography>
                      {checks.ai_providers.models?.[name] && (
                        <Chip label={checks.ai_providers.models[name]} size="small" sx={{ height: 18, fontSize: 9, bgcolor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }} />
                      )}
                    </Box>
                  ))}
                </Stack>
              </CheckSection>
            )}

            {/* Database */}
            {checks.database && (
              <CheckSection title="Database" icon={<DbIcon />} status={checks.database.status}>
                <Box sx={{ display: 'flex', gap: 3 }}>
                  <Box>
                    <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700 }}>{checks.database.threads ?? '—'}</Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>Threads</Typography>
                  </Box>
                  <Box>
                    <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700 }}>{checks.database.memories ?? '—'}</Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>Memories</Typography>
                  </Box>
                  <Box>
                    <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700 }}>{checks.database.tasks ?? '—'}</Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>Tasks</Typography>
                  </Box>
                </Box>
              </CheckSection>
            )}

            {/* Dependencies */}
            {checks.dependencies && (
              <CheckSection title="Dependencies" icon={<DepIcon />} status={checks.dependencies.status}>
                {checks.dependencies.critical_missing?.length > 0 && (
                  <Alert severity="error" sx={{ mb: 1, bgcolor: 'rgba(255,30,30,0.08)' }}>
                    Missing critical: {checks.dependencies.critical_missing.map(d => d.package).join(', ')}
                  </Alert>
                )}
                {checks.dependencies.optional_missing?.length > 0 ? (
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                    Optional not installed: {checks.dependencies.optional_missing.join(', ')}
                  </Typography>
                ) : (
                  <Typography variant="body2" sx={{ color: '#00ff88' }}>✓ All dependencies installed</Typography>
                )}
              </CheckSection>
            )}

            {/* Self-Heal Results */}
            {healData && (
              <>
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                <Typography variant="overline" sx={{ color: '#00ff88', letterSpacing: 2 }}>
                  <HealingIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'text-bottom' }} />
                  Self-Heal Results
                </Typography>
                <Box sx={{ p: 2, bgcolor: 'rgba(0,255,136,0.05)', borderRadius: 2, border: '1px solid rgba(0,255,136,0.2)' }}>
                  <Typography variant="body2" sx={{ color: '#fff', mb: 1, fontWeight: 600 }}>
                    {healData.summary}
                  </Typography>
                  {healData.actions_taken?.length > 0 && (
                    <Stack spacing={0.5} sx={{ mb: 1 }}>
                      <Typography variant="caption" sx={{ color: '#00ff88', fontWeight: 700 }}>Actions Taken:</Typography>
                      {healData.actions_taken.map((a, i) => (
                        <Typography key={i} variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', pl: 1 }}>
                          ✓ {a}
                        </Typography>
                      ))}
                    </Stack>
                  )}
                  {healData.issues_found?.length > 0 && (
                    <Stack spacing={0.5}>
                      <Typography variant="caption" sx={{ color: '#ffbb00', fontWeight: 700 }}>Issues Detected:</Typography>
                      {healData.issues_found.map((issue, i) => (
                        <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center', pl: 1 }}>
                          {issue.auto_fixable ? <CheckIcon sx={{ fontSize: 12, color: '#00ff88' }} /> : <WarningIcon sx={{ fontSize: 12, color: '#ffbb00' }} />}
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                            {issue.file ? `${issue.file}: ` : ''}{issue.message}
                          </Typography>
                          <Chip label={issue.auto_fixable ? 'FIXED' : 'MANUAL'} size="small" sx={{
                            height: 16, fontSize: 8, fontWeight: 700,
                            bgcolor: issue.auto_fixable ? '#00ff8822' : '#ffbb0022',
                            color: issue.auto_fixable ? '#00ff88' : '#ffbb00',
                          }} />
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Box>
              </>
            )}
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
