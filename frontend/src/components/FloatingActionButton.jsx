import React, { useState } from 'react';
import { Box, Fab, Tooltip, Zoom } from '@mui/material';
import {
  Add,
  Chat,
  Psychology,
  Settings,
  DeleteOutline,
  Castle,
} from '@mui/icons-material';

const FloatingActionButton = ({ onAction }) => {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    {
      icon: <Castle />,
      label: 'Enter World',
      color: '#a78bfa',
      action: () => {
        onAction('enterWorld');
        setIsOpen(false);
      },
    },
    {
      icon: <Chat />,
      label: 'New Chat',
      color: '#00ffff',
      action: () => {
        onAction('newChat');
        setIsOpen(false);
      },
    },
    {
      icon: <Psychology />,
      label: 'Mind Map',
      color: '#ff00ff',
      action: () => {
        onAction('mindmap');
        setIsOpen(false);
      },
    },
    {
      icon: <DeleteOutline />,
      label: 'Clear History',
      color: '#ff0000',
      action: () => {
        onAction('clearHistory');
        setIsOpen(false);
      },
    },
    {
      icon: <Settings />,
      label: 'Settings',
      color: '#ffff00',
      action: () => {
        onAction('settings');
        setIsOpen(false);
      },
    },
  ];

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 1000,
      }}
    >
      {/* Action buttons */}
      {actions.map((action, index) => (
        <Zoom
          key={action.label}
          in={isOpen}
          style={{
            transitionDelay: isOpen ? `${index * 50}ms` : '0ms',
          }}
        >
          <Tooltip title={action.label} placement="left">
            <Fab
              size="small"
              onClick={action.action}
              sx={{
                position: 'absolute',
                bottom: (index + 1) * 60,
                right: 0,
                background: `linear-gradient(135deg, ${action.color}, ${action.color}88)`,
                border: `1px solid ${action.color}`,
                boxShadow: `0 0 20px ${action.color}44`,
                color: '#fff',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'scale(1.1)',
                  boxShadow: `0 0 30px ${action.color}88`,
                },
              }}
            >
              {action.icon}
            </Fab>
          </Tooltip>
        </Zoom>
      ))}

      {/* Main FAB */}
      <Fab
        className="floating-action-button"
        color="primary"
        onClick={() => setIsOpen(!isOpen)}
        sx={{
          background: 'linear-gradient(135deg, #00ffff, #0088ff)',
          border: '1px solid rgba(0, 255, 255, 0.5)',
          boxShadow: '0 0 30px rgba(0, 255, 255, 0.4)',
          transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 0 40px rgba(0, 255, 255, 0.6)',
          },
        }}
      >
        <Add />
      </Fab>
    </Box>
  );
};

export default FloatingActionButton;
