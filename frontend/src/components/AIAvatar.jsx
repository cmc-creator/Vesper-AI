import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { Psychology as BrainIcon } from '@mui/icons-material';

const AIAvatar = ({ thinking = false, mood = 'neutral' }) => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (thinking) {
      // Generate particles when thinking
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

  const getMoodColor = () => {
    switch (mood) {
      case 'happy':
        return ['#00ff00', '#00cc00'];
      case 'thinking':
        return ['#00ffff', '#0088ff'];
      case 'error':
        return ['#ff0000', '#cc0000'];
      default:
        return ['#00ffff', '#0088ff'];
    }
  };

  const [color1, color2] = getMoodColor();

  return (
    <Box
      className={`ai-avatar ${thinking ? 'thinking' : ''}`}
      sx={{
        position: 'relative',
        background: `radial-gradient(circle at 30% 30%, ${color1}, ${color2})`,
      }}
    >
      <BrainIcon
        sx={{
          fontSize: 32,
          color: 'rgba(255, 255, 255, 0.9)',
          filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.5))',
        }}
      />

      {particles.map((particle) => (
        <Box
          key={particle.id}
          className="avatar-particle"
          sx={{
            left: '50%',
            top: '50%',
            transform: `rotate(${particle.angle}deg) translateY(-30px)`,
            animationDelay: `${particle.delay}s`,
          }}
        />
      ))}
    </Box>
  );
};

export default AIAvatar;
