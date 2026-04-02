import React from 'react';
import { Alert, Box, Button, Chip, LinearProgress, Stack, Typography } from '@mui/material';
import {
  AutoFixHigh as AutoFixHighIcon,
  CheckCircle as CheckCircleIcon,
  OpenInNew as OpenInNewIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  SettingsSuggest as SettingsSuggestIcon,
} from '@mui/icons-material';

export default function SetupWizard({ runtimeCapabilities, onOpenDiagnostics, onOpenOperations }) {
  const setup = runtimeCapabilities?.setup;
  const readiness = runtimeCapabilities?.readiness;
  const steps = setup?.steps || [];
  const completed = setup?.completed || 0;
  const total = setup?.total || steps.length || 1;
  const progress = Math.round((completed / total) * 100);
  const nextAction = setup?.next_action;

  if (!runtimeCapabilities) {
    return null;
  }

  return (
    <Box
      sx={{
        p: 2.2,
        borderRadius: 2,
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'linear-gradient(160deg, rgba(26,22,16,0.96), rgba(10,16,22,0.92))',
        boxShadow: '0 18px 40px rgba(0,0,0,0.22)',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 1.5 }}>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#f1d39b', letterSpacing: 0.4 }}>
            Guided Setup Wizard
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.62)', mt: 0.25 }}>
            Turn environment drift into an explicit checklist before you ship or demo Vesper.
          </Typography>
        </Box>
        <Chip
          icon={<SettingsSuggestIcon />}
          label={`${completed}/${total} complete`}
          size="small"
          sx={{
            bgcolor: 'rgba(241,211,155,0.12)',
            color: '#f1d39b',
            border: '1px solid rgba(241,211,155,0.2)',
            '& .MuiChip-icon': { color: '#f1d39b' },
          }}
        />
      </Box>

      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 9,
          borderRadius: 999,
          bgcolor: 'rgba(255,255,255,0.06)',
          mb: 1.5,
          '& .MuiLinearProgress-bar': {
            borderRadius: 999,
            background: 'linear-gradient(90deg, #d8b56f 0%, #8ef4cf 100%)',
          },
        }}
      />

      {nextAction && (
        <Alert
          severity={nextAction.critical ? 'warning' : 'info'}
          sx={{
            mb: 1.5,
            bgcolor: nextAction.critical ? 'rgba(255,190,92,0.08)' : 'rgba(0,255,255,0.08)',
            color: '#fff3da',
            border: `1px solid ${nextAction.critical ? 'rgba(255,190,92,0.18)' : 'rgba(0,255,255,0.18)'}`,
            '& .MuiAlert-icon': { color: nextAction.critical ? '#ffd38a' : 'var(--accent)' },
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            Next action: {nextAction.title}
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.72)' }}>
            {nextAction.hint}
          </Typography>
        </Alert>
      )}

      <Stack spacing={1.1} sx={{ mb: 1.8 }}>
        {steps.map((step) => (
          <Box
            key={step.id}
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 1.5,
              p: 1.25,
              borderRadius: 1.5,
              border: `1px solid ${step.ready ? 'rgba(0,255,136,0.16)' : 'rgba(255,255,255,0.08)'}`,
              bgcolor: step.ready ? 'rgba(0,255,136,0.05)' : 'rgba(255,255,255,0.03)',
            }}
          >
            <Box sx={{ display: 'flex', gap: 1.1, alignItems: 'flex-start', flex: 1 }}>
              {step.ready ? (
                <CheckCircleIcon sx={{ fontSize: 18, color: '#7ff2b8', mt: 0.15 }} />
              ) : (
                <RadioButtonUncheckedIcon sx={{ fontSize: 18, color: step.critical ? '#f1d39b' : 'rgba(255,255,255,0.45)', mt: 0.15 }} />
              )}
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#fff' }}>
                  {step.title}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', color: 'rgba(255,255,255,0.58)', mb: 0.35 }}>
                  {step.detail}
                </Typography>
                {!step.ready && (
                  <Typography variant="caption" sx={{ display: 'block', color: 'rgba(255,225,183,0.82)' }}>
                    {step.hint}
                  </Typography>
                )}
              </Box>
            </Box>
            <Chip
              label={step.ready ? 'Ready' : step.critical ? 'Required' : 'Optional'}
              size="small"
              sx={{
                mt: 0.15,
                bgcolor: step.ready ? 'rgba(0,255,136,0.12)' : step.critical ? 'rgba(241,211,155,0.12)' : 'rgba(255,255,255,0.07)',
                color: step.ready ? '#7ff2b8' : step.critical ? '#f1d39b' : 'rgba(255,255,255,0.68)',
                border: `1px solid ${step.ready ? 'rgba(0,255,136,0.18)' : step.critical ? 'rgba(241,211,155,0.16)' : 'rgba(255,255,255,0.08)'}`,
              }}
            />
          </Box>
        ))}
      </Stack>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        <Button
          size="small"
          variant="contained"
          startIcon={<AutoFixHighIcon />}
          onClick={onOpenDiagnostics}
          sx={{
            bgcolor: 'var(--accent)',
            color: '#03131a',
            fontWeight: 800,
            '&:hover': { bgcolor: 'var(--accent)' },
          }}
        >
          Open Diagnostics
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<OpenInNewIcon />}
          onClick={onOpenOperations}
          sx={{
            borderColor: 'rgba(255,255,255,0.14)',
            color: '#fff',
            '&:hover': { borderColor: '#f1d39b', bgcolor: 'rgba(255,255,255,0.04)' },
          }}
        >
          Open Operations Center
        </Button>
      </Box>
    </Box>
  );
}