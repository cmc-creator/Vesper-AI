/**
 * MetaPersonCreator.jsx  (renamed component: AvatarCreatorDialog)
 * Embeds the Ready Player Me avatar creator — completely free, no API key needed.
 * RPM sends a postMessage when the user clicks "Done" containing the .glb URL.
 * That URL is passed to onAvatarExported() and automatically used as Vesper's face.
 */
import React, { useRef, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, IconButton,
  Box, Typography, CircularProgress, Button, TextField,
} from '@mui/material';
import { Close } from '@mui/icons-material';

// Ready Player Me free iframe — no credentials required
const RPM_URL = 'https://readyplayer.me/avatar?frameApi&clearCache';

export default function MetaPersonCreator({
  open,
  onClose,
  onAvatarExported,
  accentColor = '#a855f7',
}) {
  const iframeRef = useRef(null);
  const [loading, setLoading] = React.useState(true);
  const [manualUrl, setManualUrl] = React.useState('');

  // ── Ready Player Me postMessage events ──────────────────────────────────────
  const handleMessage = useCallback((evt) => {
    // RPM sends messages from readyplayer.me origin
    const src = evt.data?.source;
    const eventName = evt.data?.eventName;
    const data = evt.data?.data;

    // v1 frame API format
    if (src === 'readyplayerme') {
      if (eventName === 'v1.frame.ready') {
        setLoading(false);
        // Subscribe to avatar exported events
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ target: 'readyplayerme', type: 'subscribe', eventName: 'v1.avatar.exported' }),
          '*'
        );
      }
      if (eventName === 'v1.avatar.exported') {
        const url = data?.url || evt.data?.url;
        if (url) {
          onAvatarExported?.(url);
          onClose?.();
        }
      }
    }

    // Some RPM builds send a plain string URL directly
    if (typeof evt.data === 'string' && evt.data.includes('readyplayer.me') && evt.data.endsWith('.glb')) {
      onAvatarExported?.(evt.data);
      onClose?.();
    }
  }, [onAvatarExported, onClose]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setManualUrl('');
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [open, handleMessage]);

  const handleManualSubmit = () => {
    const trimmed = manualUrl.trim();
    if (!trimmed) return;
    // Accept any GLB/FBX URL
    onAvatarExported?.(trimmed);
    onClose?.();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      PaperProps={{ sx: { background: '#090b14', color: '#fff' } }}
    >
      {/* Header */}
      <DialogTitle sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        py: 1, px: 2, flexShrink: 0,
        background: 'rgba(0,0,0,0.7)',
        borderBottom: `1px solid ${accentColor}33`,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, fontFamily: 'monospace', color: accentColor }}>
            Avatar Creator
          </Typography>
          {loading
            ? <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <CircularProgress size={13} sx={{ color: accentColor }} />
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)' }}>Loading…</Typography>
              </Box>
            : <Typography variant="caption" sx={{ color: '#4ade80' }}>
                ✓ Customise → click <strong>Next</strong> → click <strong>Done</strong>
              </Typography>
          }
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#fff' } }}>
          <Close />
        </IconButton>
      </DialogTitle>

      {/* Steps bar */}
      <Box sx={{
        px: 2, py: 0.6, display: 'flex', gap: 3, flexWrap: 'wrap',
        bgcolor: `${accentColor}0d`, borderBottom: `1px solid ${accentColor}1a`,
      }}>
        {['① Pick a style & customise', '② Click Next → Done', '③ Vesper updates automatically'].map(s => (
          <Typography key={s} variant="caption" sx={{ color: `${accentColor}bb`, fontFamily: 'monospace' }}>{s}</Typography>
        ))}
      </Box>

      {/* RPM iframe */}
      <DialogContent sx={{ p: 0, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <iframe
          ref={iframeRef}
          src={RPM_URL}
          allow="camera; microphone; fullscreen"
          frameBorder="0"
          style={{ width: '100%', flex: 1, border: 'none', display: 'block' }}
          title="Ready Player Me Avatar Creator"
          onLoad={() => setLoading(false)}
        />

        {/* Manual URL fallback at the bottom */}
        <Box sx={{
          px: 2, py: 1.25, display: 'flex', alignItems: 'center', gap: 1,
          background: 'rgba(0,0,0,0.6)', borderTop: `1px solid rgba(255,255,255,0.08)`,
          flexShrink: 0,
        }}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap', minWidth: 130 }}>
            Or paste any .glb / .fbx URL:
          </Typography>
          <input
            type="text"
            placeholder="https://models.readyplayer.me/…glb"
            value={manualUrl}
            onChange={e => setManualUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
            style={{
              flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 6, padding: '6px 10px', color: '#fff', fontSize: '0.8rem', outline: 'none',
            }}
          />
          <Button
            size="small" variant="contained" onClick={handleManualSubmit}
            disabled={!manualUrl.trim()}
            sx={{ bgcolor: accentColor, color: '#000', fontWeight: 700, textTransform: 'none',
              minWidth: 64, '&:hover': { filter: 'brightness(1.15)' } }}
          >
            Use
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
