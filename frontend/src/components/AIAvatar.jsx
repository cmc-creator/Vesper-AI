import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';

const MOOD_CONFIG = {
  neutral:   { color: '#00BCD4', glow: '#00BCD4', label: 'Vesper', animation: 'none', dotAnim: 'none' },
  thinking:  { color: '#00FFD1', glow: '#00FFD1', label: 'Vesper', animation: 'pulse 1s ease-in-out infinite', dotAnim: 'pulse 1.5s ease-in-out infinite' },
  speaking:  { color: '#FFD54F', glow: '#FFD54F', label: 'Vesper', animation: 'pulse 0.6s ease-in-out infinite', dotAnim: 'pulse 0.5s ease-in-out infinite' },
  excited:   { color: '#00FF88', glow: '#00FF88', label: 'Vesper!', animation: 'vesper-bounce 0.4s ease-in-out infinite alternate', dotAnim: 'vesper-bounce 0.3s ease-in-out infinite alternate' },
  happy:     { color: '#FFD700', glow: '#FFD700', label: 'Vesper', animation: 'vesper-glow 1.5s ease-in-out infinite', dotAnim: 'pulse 1.2s ease-in-out infinite' },
  searching: { color: '#4BA3FF', glow: '#4BA3FF', label: 'Vesper', animation: 'vesper-scan 1.2s linear infinite', dotAnim: 'vesper-scan 0.8s linear infinite' },
  working:   { color: '#FF8C00', glow: '#FF8C00', label: 'Vesper', animation: 'vesper-spin 1s linear infinite', dotAnim: 'none' },
  surprised: { color: '#E040FB', glow: '#E040FB', label: 'Vesper', animation: 'vesper-pop 0.3s ease-out forwards', dotAnim: 'pulse 0.6s ease-in-out 3' },
  concerned: { color: '#FF6060', glow: '#FF6060', label: 'Vesper', animation: 'pulse 0.8s ease-in-out infinite', dotAnim: 'pulse 1s ease-in-out infinite' },
};

const AIAvatar = ({ thinking = false, isSpeaking = false, mood = 'neutral' }) => {
  const [displayMood, setDisplayMood] = useState(mood);

  useEffect(() => {
    // Smooth mood transitions — don't interrupt speaking/thinking
    if (isSpeaking) { setDisplayMood('speaking'); return; }
    if (thinking)   { setDisplayMood('thinking');  return; }
    setDisplayMood(mood);
  }, [mood, thinking, isSpeaking]);

  const cfg = MOOD_CONFIG[displayMood] || MOOD_CONFIG.neutral;

  return (
    <>
      <style>{`
        @keyframes vesper-bounce { from { transform: translateY(0); } to { transform: translateY(-3px); } }
        @keyframes vesper-glow   { 0%,100% { box-shadow: 0 0 6px 1px ${cfg.glow}44; } 50% { box-shadow: 0 0 14px 4px ${cfg.glow}99; } }
        @keyframes vesper-scan   { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }
        @keyframes vesper-spin   { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes vesper-pop    { 0% { transform: scale(1); } 50% { transform: scale(1.25); } 100% { transform: scale(1); } }
      `}</style>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 8px',
          borderRadius: '12px',
          background: 'rgba(0, 0, 0, 0.3)',
          border: `1px solid ${cfg.color}44`,
          animation: cfg.animation,
          transition: 'border-color 0.4s ease, box-shadow 0.4s ease',
          boxShadow: displayMood === 'happy' ? `0 0 10px ${cfg.glow}33` : 'none',
        }}
      >
        <Box
          sx={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: cfg.color,
            boxShadow: `0 0 8px ${cfg.glow}`,
            animation: cfg.dotAnim,
            transition: 'background 0.4s ease, box-shadow 0.4s ease',
          }}
        />
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: cfg.color,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            lineHeight: 1,
            transition: 'color 0.4s ease',
          }}
        >
          {cfg.label}
        </span>
      </Box>
    </>
  );
};

export default AIAvatar;
