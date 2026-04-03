import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';

const AIAvatar = ({ thinking = false, isSpeaking = false, mood = 'neutral' }) => {
  const [particles, setParticles] = useState([]);
  const [mouthPhase, setMouthPhase] = useState(0);
  const [eyeState, setEyeState] = useState('open');

  useEffect(() => {
    if (thinking) {
      const newParticles = Array.from({ length: 8 }, (_, i) => ({
        id: i,
        angle: (i * 360) / 8,
        delay: i * 0.2,
      }));
      setParticles(newParticles);
    } else {
      setParticles([]);
    }
  }, [thinking]);

  useEffect(() => {
    if (!isSpeaking) return;
    
    const interval = setInterval(() => {
      setMouthPhase((p) => (p + 1) % 4);
    }, 150);
    return () => clearInterval(interval);
  }, [isSpeaking]);

  // Blink animation
  useEffect(() => {
    if (isSpeaking) {
      const blinkInterval = setInterval(() => {
        setEyeState('closed');
        setTimeout(() => setEyeState('open'), 150);
      }, 4000 + Math.random() * 2000);
      return () => clearInterval(blinkInterval);
    }
  }, [isSpeaking]);

  const getMoodColor = () => {
    switch (mood) {
      case 'happy':
        return { primary: '#4FC3F7', secondary: '#0288D1', glow: 'rgba(79, 195, 247, 0.6)' };
      case 'thinking':
        return { primary: '#00FFD1', secondary: '#00BCD4', glow: 'rgba(0, 255, 209, 0.6)' };
      case 'speaking':
        return { primary: '#FFD54F', secondary: '#FBC02D', glow: 'rgba(255, 213, 79, 0.6)' };
      case 'error':
        return { primary: '#FF6B6B', secondary: '#FF1744', glow: 'rgba(255, 107, 107, 0.6)' };
      default:
        return { primary: '#00FFD1', secondary: '#00BCD4', glow: 'rgba(0, 255, 209, 0.6)' };
    }
  };

  const colors = isSpeaking ? getMoodColor() : (thinking ? getMoodColor() : getMoodColor());
  const getMouthPath = () => {
    const paths = [
      'M 30 65 Q 50 68 70 65',
      'M 30 60 Q 50 75 70 60',
      'M 30 55 Q 50 80 70 55',
      'M 30 60 Q 50 75 70 60',
    ];
    return paths[mouthPhase];
  };

  const eyeScale = eyeState === 'closed' ? 0.1 : 1;

  return (
    <Box
      className={`ai-avatar ${thinking ? 'thinking' : ''} ${isSpeaking ? 'speaking' : ''}`}
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '140px',
        height: '160px',
        animation: isSpeaking ? 'avatarPulse 0.6s ease-in-out infinite' : thinking ? 'avatarThink 2s ease-in-out infinite' : 'none',
      }}
    >
      {/* SVG Face */}
      <svg
        width="140"
        height="160"
        viewBox="0 0 100 120"
        style={{
          filter: isSpeaking ? `drop-shadow(0 0 24px ${colors.glow})` : thinking ? `drop-shadow(0 0 16px ${colors.glow})` : `drop-shadow(0 0 12px ${colors.glow})`,
        }}
      >
        <defs>
          {/* Head gradient */}
          <radialGradient id="headGradient" cx="35%" cy="35%">
            <stop offset="0%" stopColor={colors.primary} stopOpacity="0.95" />
            <stop offset="70%" stopColor={colors.secondary} stopOpacity="0.85" />
            <stop offset="100%" stopColor={colors.secondary} stopOpacity="0.6" />
          </radialGradient>

          {/* Eye gradient */}
          <radialGradient id="eyeGradient" cx="40%" cy="40%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="40%" stopColor={colors.primary} stopOpacity="0.9" />
            <stop offset="100%" stopColor={colors.secondary} stopOpacity="0.8" />
          </radialGradient>
        </defs>

        {/* Head - rounded shape */}
        <ellipse cx="50" cy="45" rx="32" ry="38" fill="url(#headGradient)" />

        {/* Head shine/highlight */}
        <ellipse cx="40" cy="25" rx="12" ry="10" fill="white" opacity="0.25" />

        {/* Left Eye */}
        <g
          style={{
            transform: `scale(${eyeScale})`,
            transformOrigin: '35px 38px',
            transition: 'transform 0.15s ease',
          }}
        >
          <circle cx="35" cy="38" r="8" fill="url(#eyeGradient)" />
          {/* Pupil */}
          <circle
            cx="35"
            cy="40"
            r="4.5"
            fill={colors.secondary}
            style={{
              animation: isSpeaking ? 'pupilDialate 0.6s ease-in-out infinite' : 'none',
            }}
          />
          {/* Pupil shine */}
          <circle cx="34" cy="38" r="1.5" fill="white" opacity="0.8" />
        </g>

        {/* Right Eye */}
        <g
          style={{
            transform: `scale(${eyeScale})`,
            transformOrigin: '65px 38px',
            transition: 'transform 0.15s ease',
          }}
        >
          <circle cx="65" cy="38" r="8" fill="url(#eyeGradient)" />
          {/* Pupil */}
          <circle
            cx="65"
            cy="40"
            r="4.5"
            fill={colors.secondary}
            style={{
              animation: isSpeaking ? 'pupilDialate 0.6s ease-in-out infinite' : 'none',
            }}
          />
          {/* Pupil shine */}
          <circle cx="64" cy="38" r="1.5" fill="white" opacity="0.8" />
        </g>

        {/* Nose */}
        <path
          d="M 50 42 L 48 55 L 52 55"
          stroke={colors.primary}
          strokeWidth="0.8"
          fill="none"
          opacity="0.4"
        />

        {/* Mouth */}
        <path
          d={getMouthPath()}
          stroke={colors.primary}
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          style={{
            transition: 'all 0.15s ease',
          }}
        />

        {/* Cheeks/Blush */}
        <ellipse cx="18" cy="52" rx="6" ry="5" fill={colors.primary} opacity="0.15" />
        <ellipse cx="82" cy="52" rx="6" ry="5" fill={colors.primary} opacity="0.15" />

        {/* Thinking particles around head */}
        {thinking && (
          <>
            <circle cx="15" cy="20" r="1.5" fill={colors.primary} opacity="0.6" />
            <circle cx="85" cy="22" r="1.5" fill={colors.primary} opacity="0.5" />
            <circle cx="12" cy="50" r="1" fill={colors.primary} opacity="0.4" />
            <circle cx="88" cy="48" r="1" fill={colors.primary} opacity="0.4" />
          </>
        )}
      </svg>

      {/* Outer glow effect */}
      <Box
        sx={{
          position: 'absolute',
          inset: '-8px',
          borderRadius: '50%',
          border: `2px solid ${colors.primary}`,
          opacity: 0.3,
          pointerEvents: 'none',
          animation: isSpeaking ? 'pulseRing 1.5s ease-out infinite' : 'none',
        }}
      />
    </Box>
  );
};

export default AIAvatar;
