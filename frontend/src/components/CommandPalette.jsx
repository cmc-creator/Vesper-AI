import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
} from '@mui/material';
import {
  Chat as ChatIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  DeleteOutline as DeleteIcon,
  Psychology as PsychologyIcon,
  Memory as MemoryIcon,
  Lightbulb as LightbulbIcon,
  Castle as CastleIcon,
} from '@mui/icons-material';

const CommandPalette = ({ isOpen, onClose, onCommand }) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  const commands = [
    {
      id: 'new-chat',
      label: 'New Chat',
      icon: <ChatIcon />,
      action: () => onCommand('newChat'),
      shortcut: 'Ctrl+N',
    },
    {
      id: 'search',
      label: 'Search Messages',
      icon: <SearchIcon />,
      action: () => onCommand('search'),
      shortcut: 'Ctrl+F',
    },
    {
      id: 'clear-history',
      label: 'Clear Chat History',
      icon: <DeleteIcon />,
      action: () => onCommand('clearHistory'),
      shortcut: 'Ctrl+Shift+D',
    },
    {
      id: 'memory',
      label: 'View Memories',
      icon: <MemoryIcon />,
      action: () => onCommand('viewMemories'),
    },
    {
      id: 'mindmap',
      label: 'Generate Mind Map',
      icon: <PsychologyIcon />,
      action: () => onCommand('mindmap'),
    },
    {
      id: 'suggestions',
      label: 'Get AI Suggestions',
      icon: <LightbulbIcon />,
      action: () => onCommand('suggestions'),
    },
    {
      id: 'enter-world',
      label: '🏰 Enter Vesper\'s World',
      icon: <CastleIcon />,
      action: () => onCommand('enterWorld'),
      shortcut: 'Ctrl+G',
    },
    {
      id: 'settings',
      label: 'Open Settings',
      icon: <SettingsIcon />,
      action: () => onCommand('settings'),
      shortcut: 'Ctrl+,',
    },
  ];

  const filteredCommands = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredCommands.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredCommands.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Box className="command-palette-overlay" onClick={onClose} />
      <Box className="command-palette">
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(0, 255, 255, 0.2)' }}>
          <TextField
            inputRef={inputRef}
            fullWidth
            placeholder="Type a command or search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            variant="standard"
            InputProps={{
              disableUnderline: true,
              sx: {
                color: '#00ffff',
                fontSize: '18px',
                '& input::placeholder': {
                  color: 'rgba(0, 255, 255, 0.5)',
                },
              },
            }}
          />
        </Box>

        <List sx={{ maxHeight: '400px', overflow: 'auto' }}>
          {filteredCommands.length === 0 ? (
            <ListItem>
              <ListItemText
                primary="No commands found"
                sx={{ color: 'rgba(255, 255, 255, 0.5)' }}
              />
            </ListItem>
          ) : (
            filteredCommands.map((cmd, index) => (
              <ListItem
                key={cmd.id}
                className={`command-item ${
                  index === selectedIndex ? 'selected' : ''
                }`}
                onClick={() => {
                  cmd.action();
                  onClose();
                }}
                sx={{ cursor: 'pointer' }}
              >
                <ListItemIcon sx={{ color: '#00ffff', minWidth: 40 }}>
                  {cmd.icon}
                </ListItemIcon>
                <ListItemText
                  primary={cmd.label}
                  sx={{ color: '#fff' }}
                />
                {cmd.shortcut && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'rgba(255, 255, 255, 0.5)',
                      ml: 2,
                      fontSize: '12px',
                    }}
                  >
                    {cmd.shortcut}
                  </Typography>
                )}
              </ListItem>
            ))
          )}
        </List>

        <Box
          sx={{
            p: 1.5,
            borderTop: '1px solid rgba(0, 255, 255, 0.2)',
            background: 'rgba(0, 0, 0, 0.3)',
          }}
        >
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            ↑↓ to navigate • Enter to select • Esc to close
          </Typography>
        </Box>
      </Box>
    </>
  );
};

export default CommandPalette;
