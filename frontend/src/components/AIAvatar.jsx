import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';

const AIAvatar = ({ thinking = false, isSpeaking = false, mood = 'neutral' }) => {
  const getStatusColor = () => {
    if (isSpeaking) return '#FFD54F';
    if (thinking) return '#00FFD1';
    return '#00BCD4';
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 8px',
        borderRadius: '12px',
        background: 'rgba(0, 0, 0, 0.3)',
        border: `1px solid ${getStatusColor()}44`,
        animation: isSpeaking ? 'pulse 0.6s ease-in-out infinite' : thinking ? 'pulse 1s ease-in-out infinite' : 'none',
      }}
    >
      {/* Status dot */}
      <Box
        sx={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: getStatusColor(),
          boxShadow: `0 0 8px ${getStatusColor()}`,
          animation: isSpeaking ? 'pulse 0.5s ease-in-out infinite' : thinking ? 'pulse 1.5s ease-in-out infinite' : 'none',
        }}
      />
      <span
        style={{
          fontSize: '11px',
          fontWeight: 600,
          color: getStatusColor(),
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          lineHeight: 1,
        }}
      >
        Vesper
      </span>
    </Box>
  );
};

export default AIAvatar;
