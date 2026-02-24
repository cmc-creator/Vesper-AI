/**
 * MetaPersonCreator.jsx
 * Embeds the MetaPerson Creator iframe (avatarsdk.com) in a fullscreen dialog.
 * Handles the JS postMessage API:
 *   - Authenticates when creator is loaded
 *   - Captures the exported GLB URL and calls onAvatarExported(url)
 *   - Sends UI / export configuration on load
 *
 * Props:
 *   open            {boolean}   - Whether the dialog is open
 *   onClose         {function}  - Called when user closes
 *   onAvatarExported{function}  - Called with the exported .glb URL string
 *   clientId        {string}    - avatarsdk.com CLIENT_ID
 *   clientSecret    {string}    - avatarsdk.com CLIENT_SECRET
 *   accentColor     {string}    - Theme accent colour
 */
import React, { useRef, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, IconButton,
  Box, Typography, CircularProgress, Alert, Button,
} from '@mui/material';
import { Close, OpenInNew } from '@mui/icons-material';

const METAPERSON_URL = 'https://metaperson.avatarsdk.com/iframe.html';

export default function MetaPersonCreator({
  open,
  onClose,
  onAvatarExported,
  clientId = '',
  clientSecret = '',
  accentColor = '#a855f7',
}) {
  const iframeRef = useRef(null);
  const [status, setStatus] = React.useState('loading'); // 'loading' | 'ready' | 'exporting' | 'error'
  const [errorMsg, setErrorMsg] = React.useState('');

  // ── postMessage handler ─────────────────────────────────────────────────────
  const handleMessage = useCallback((evt) => {
    if (evt.data?.source !== 'metaperson_creator') return;

    const { eventName, data } = evt.data;

    switch (eventName) {
      // Creator loaded → authenticate + configure
      case 'metaperson_creator_loaded': {
        setStatus('ready');

        // 1. Authenticate
        if (clientId && clientSecret) {
          evt.source.postMessage({
            eventName: 'authenticate',
            clientId,
            clientSecret,
          }, '*');
        } else {
          setErrorMsg('No MetaPerson credentials — export may be disabled. Add CLIENT_ID & CLIENT_SECRET in Settings.');
        }

        // 2. Configure export to GLB format with morph targets for lip sync
        evt.source.postMessage({
          eventName: 'set_export_parameters',
          format: 'glb',
          lod: 1,
          textureProfile: '1K.jpg',
        }, '*');

        // 3. Configure UI — hide unnecessary panels
        evt.source.postMessage({
          eventName: 'set_ui_parameters',
          isExportButtonVisible: true,
          isLoginButtonVisible: false,
        }, '*');
        break;
      }

      // Avatar exported
      case 'model_exported': {
        setStatus('ready');
        const url = data?.url || evt.data?.url || evt.data?.link;
        if (url) {
          onAvatarExported?.(url);
          onClose?.();
        } else {
          setErrorMsg('Export completed but no URL was returned. Try again.');
        }
        break;
      }

      // Export started
      case 'export_started':
        setStatus('exporting');
        break;

      // Auth result
      case 'authenticated':
        if (evt.data?.isAuthenticated === false) {
          setErrorMsg('MetaPerson auth failed — check CLIENT_ID and CLIENT_SECRET.');
        }
        break;

      default:
        break;
    }
  }, [clientId, clientSecret, onAvatarExported, onClose]);

  // Attach / detach listener
  useEffect(() => {
    if (!open) return;
    setStatus('loading');
    setErrorMsg('');
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [open, handleMessage]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      PaperProps={{
        sx: {
          background: '#0a0a12',
          color: '#fff',
          position: 'relative',
        },
      }}
    >
      {/* Header bar */}
      <DialogTitle sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        py: 1, px: 2,
        background: 'rgba(0,0,0,0.6)',
        borderBottom: `1px solid ${accentColor}33`,
        flexShrink: 0,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, fontFamily: 'monospace', color: accentColor }}>
            MetaPerson Creator
          </Typography>
          {status === 'loading' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <CircularProgress size={14} sx={{ color: accentColor }} />
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>Loading…</Typography>
            </Box>
          )}
          {status === 'exporting' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <CircularProgress size={14} sx={{ color: '#4ade80' }} />
              <Typography variant="caption" sx={{ color: '#4ade80' }}>Exporting avatar…</Typography>
            </Box>
          )}
          {status === 'ready' && !errorMsg && (
            <Typography variant="caption" sx={{ color: '#4ade80' }}>✓ Ready — click Export when done</Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            size="small"
            startIcon={<OpenInNew sx={{ fontSize: 14 }} />}
            href="https://avatarsdk.com/metaperson-creator/"
            target="_blank"
            rel="noopener"
            sx={{ color: 'rgba(255,255,255,0.4)', textTransform: 'none', fontSize: '0.72rem' }}
          >
            Get credentials
          </Button>
          <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: '#fff' } }}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* Error banner */}
      {errorMsg && (
        <Alert severity="warning" sx={{ borderRadius: 0, py: 0.5 }} onClose={() => setErrorMsg('')}>
          {errorMsg}
        </Alert>
      )}

      {/* Instructions bar */}
      <Box sx={{
        px: 2, py: 0.75,
        bgcolor: `${accentColor}11`,
        borderBottom: `1px solid ${accentColor}22`,
        display: 'flex', gap: 3, flexWrap: 'wrap',
      }}>
        {['① Customise your avatar', '② Click Export (top-right)', '③ Vesper loads automatically'].map((s) => (
          <Typography key={s} variant="caption" sx={{ color: `${accentColor}cc`, fontFamily: 'monospace' }}>{s}</Typography>
        ))}
      </Box>

      {/* iframe */}
      <DialogContent sx={{ p: 0, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <iframe
          ref={iframeRef}
          id="metaperson_iframe"
          src={METAPERSON_URL}
          allow="fullscreen; microphone"
          frameBorder="0"
          style={{ width: '100%', flex: 1, border: 'none', display: 'block' }}
          title="MetaPerson Creator"
        />
      </DialogContent>
    </Dialog>
  );
}
