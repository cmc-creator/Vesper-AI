import React from 'react';
import { Box, Typography } from '@mui/material';

export default function CyberRobotPortrait({ accentColor = '#00ffff', isSpeaking = false }) {
  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `radial-gradient(circle at 50% 24%, ${accentColor}20 0%, rgba(4,8,20,0.92) 72%)`,
        overflow: 'hidden',
        '@keyframes eyePulse': {
          '0%, 100%': { opacity: 0.72 },
          '50%': { opacity: 1 },
        },
        '@keyframes scanline': {
          '0%': { transform: 'translateY(-120px)' },
          '100%': { transform: 'translateY(220px)' },
        },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.03) 45%, transparent 100%)',
          animation: 'scanline 3.2s linear infinite',
          pointerEvents: 'none',
        }}
      />

      <Box
        sx={{
          position: 'relative',
          width: 118,
          height: 176,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
        }}
      >
        <Box
          sx={{
            width: 10,
            height: 18,
            borderRadius: 8,
            mb: 0.4,
            background: `linear-gradient(180deg, ${accentColor}, rgba(255,255,255,0.35))`,
            boxShadow: `0 0 10px ${accentColor}88`,
          }}
        />

        <Box
          sx={{
            width: 96,
            height: 108,
            borderRadius: '20px 20px 18px 18px',
            position: 'relative',
            border: `1px solid ${accentColor}66`,
            background: 'linear-gradient(180deg, rgba(34,44,78,0.96) 0%, rgba(12,18,42,0.98) 100%)',
            boxShadow: `0 0 14px ${accentColor}44, inset 0 0 24px rgba(255,255,255,0.06)`,
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: 22,
              left: 14,
              right: 14,
              height: 20,
              borderRadius: 10,
              background: `linear-gradient(90deg, rgba(0,0,0,0.45), ${accentColor}66, rgba(0,0,0,0.45))`,
              border: `1px solid ${accentColor}66`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-evenly',
            }}
          >
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: accentColor,
                boxShadow: `0 0 10px ${accentColor}`,
                animation: 'eyePulse 1.2s ease-in-out infinite',
              }}
            />
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: accentColor,
                boxShadow: `0 0 10px ${accentColor}`,
                animation: 'eyePulse 1.2s ease-in-out infinite 0.2s',
              }}
            />
          </Box>

          <Box
            sx={{
              position: 'absolute',
              top: 56,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 36,
              height: 14,
              borderRadius: 8,
              border: `1px solid ${accentColor}66`,
              bgcolor: isSpeaking ? `${accentColor}40` : 'rgba(8,16,36,0.9)',
              boxShadow: isSpeaking ? `0 0 12px ${accentColor}99` : 'none',
            }}
          />

          <Box
            sx={{
              position: 'absolute',
              bottom: 10,
              left: 16,
              right: 16,
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 0.5,
            }}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <Box
                key={i}
                sx={{
                  height: 4,
                  borderRadius: 1,
                  bgcolor: i % 2 === 0 ? `${accentColor}88` : 'rgba(255,255,255,0.18)',
                }}
              />
            ))}
          </Box>
        </Box>

        <Box
          sx={{
            mt: 0.9,
            width: 116,
            height: 58,
            borderRadius: '16px 16px 10px 10px',
            border: `1px solid ${accentColor}55`,
            background: 'linear-gradient(180deg, rgba(20,28,55,0.98) 0%, rgba(10,14,32,0.98) 100%)',
            boxShadow: `0 0 14px ${accentColor}33`,
            position: 'relative',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 54,
              height: 10,
              borderRadius: 6,
              border: `1px solid ${accentColor}66`,
              bgcolor: `${accentColor}18`,
            }}
          />
        </Box>
      </Box>

      <Typography
        variant="caption"
        sx={{
          position: 'absolute',
          bottom: 8,
          left: 0,
          right: 0,
          textAlign: 'center',
          color: accentColor,
          opacity: 0.85,
          fontSize: '0.62rem',
          letterSpacing: 1,
          fontWeight: 700,
          textTransform: 'uppercase',
        }}
      >
        VESPER UNIT-7
      </Typography>
    </Box>
  );
}
