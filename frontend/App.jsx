import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Typography,
  CircularProgress,
  Container,
  Paper,
} from '@mui/material';
import { Send as SendIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useHotkeys } from 'react-hotkeys-hook';

// Firebase
import { db, auth, isFirebaseConfigured } from './src/firebase';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

// Components
// import AIAvatar from './src/components/AIAvatar';
// import CommandPalette from './src/components/CommandPalette';
// import VoiceInput from './src/components/VoiceInput';
// import CodeBlock from './src/components/CodeBlock';
// import FloatingActionButton from './src/components/FloatingActionButton';
import Game from './src/game/Game';

// Styles
import './src/enhancements.css';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00ffff',
    },
    background: {
      default: '#0a0a1e',
      paper: 'rgba(20, 20, 40, 0.6)',
    },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", -apple-system, sans-serif',
  },
});

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [thinking, setThinking] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [gameMode, setGameMode] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  const addLocalMessage = (role, content) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        userId: userId || 'local',
        role,
        content,
        timestamp: new Date(),
      },
    ]);
  };

  // Command Palette hotkey (Cmd/Ctrl+K)
  useHotkeys('ctrl+k, cmd+k', (e) => {
    e.preventDefault();
    setCommandPaletteOpen(true);
  });

  // Enter game world hotkey (Cmd/Ctrl+G)
  useHotkeys('ctrl+g, cmd+g', (e) => {
    e.preventDefault();
    setGameMode(true);
  });

  // Initialize Firebase Auth
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setUserId('local');
      return;
    }

    const initAuth = async () => {
      try {
        const result = await signInAnonymously(auth);
        setUserId(result.user.uid);
      } catch (error) {
        console.error('Auth error:', error);
        setUserId('local');
      }
    };
    initAuth();
  }, []);

  // Load messages from Firebase
  useEffect(() => {
    if (!isFirebaseConfigured || !db || !userId || userId === 'local') return;

    const q = query(
      collection(db, 'chat_messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedMessages = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.userId === userId) {
          loadedMessages.push({
            id: doc.id,
            ...data,
          });
        }
      });
      setMessages(loadedMessages);
    });

    return () => unsubscribe();
  }, [userId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);
    setThinking(true);

    const usingFirebase = isFirebaseConfigured && db && userId && userId !== 'local';

    try {
      // Save user message to Firebase
      if (usingFirebase) {
        await addDoc(collection(db, 'chat_messages'), {
          userId,
          role: 'user',
          content: userMessage,
          timestamp: new Date(),
        });
      } else {
        addLocalMessage('user', userMessage);
      }

      // Send to backend
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) throw new Error('Network response was not ok');

      const data = await response.json();

      // Save AI response to Firebase
      if (usingFirebase) {
        await addDoc(collection(db, 'chat_messages'), {
          userId,
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
        });
      } else {
        addLocalMessage('assistant', data.response);
      }
    } catch (error) {
      console.error('Error:', error);
      if (usingFirebase) {
        await addDoc(collection(db, 'chat_messages'), {
          userId,
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
        });
      } else {
        addLocalMessage('assistant', 'Sorry, I encountered an error. Please try again.');
      }
    } finally {
      setLoading(false);
      setThinking(false);
    }
  };

  const clearHistory = async () => {
    if (!userId) return;
    if (!isFirebaseConfigured || !db || userId === 'local') {
      setMessages([]);
      return;
    }
    
    const q = query(collection(db, 'chat_messages'));
    const snapshot = await getDocs(q);
    
    const deletePromises = [];
    snapshot.forEach((doc) => {
      if (doc.data().userId === userId) {
        deletePromises.push(deleteDoc(doc.ref));
      }
    });
    
    await Promise.all(deletePromises);
    setMessages([]);
  };

  const handleCommand = (command) => {
    switch (command) {
      case 'newChat':
        clearHistory();
        break;
      case 'clearHistory':
        clearHistory();
        break;
      case 'settings':
        alert('Settings coming soon!');
        break;
      case 'mindmap':
        alert('Mind map generation coming soon!');
        break;
      case 'suggestions':
        setInput('Can you give me some suggestions?');
        break;
      case 'enterWorld':
        setGameMode(true);
        break;
      default:
        console.log('Unknown command:', command);
    }
  };

  const handleVoiceTranscript = (transcript) => {
    setInput(transcript);
  };

  const renderMessage = (message) => {
    const isUser = message.role === 'user';
    
    return (
      <motion.div
        initial={{ opacity: 0, x: isUser ? 20 : -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          display: 'flex',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          marginBottom: '16px',
        }}
      >
        <Box
          className="message-bubble glass-card"
          sx={{
            maxWidth: '70%',
            padding: '12px 16px',
            borderRadius: '16px',
            background: isUser
              ? 'linear-gradient(135deg, rgba(0, 255, 255, 0.15), rgba(0, 136, 255, 0.15))'
              : 'rgba(20, 20, 40, 0.7)',
            border: `1px solid ${isUser ? 'rgba(0, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
            boxShadow: isUser
              ? '0 0 20px rgba(0, 255, 255, 0.2)'
              : '0 4px 20px rgba(0, 0, 0, 0.3)',
          }}
        >
          {!isUser && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              {/* <AIAvatar thinking={false} mood="neutral" /> */}
              <Typography
                variant="caption"
                sx={{ ml: 2, color: '#00ffff', fontWeight: 600 }}
              >
                Vesper AI
              </Typography>
            </Box>
          )}
          
          <ReactMarkdown
            components={{
              code: ({ node, inline, className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || '');
                const codeString = String(children).replace(/\n$/, '');
                
                return !inline && match ? (
                  <code
                    className={className}
                    style={{
                      display: 'block',
                      background: 'rgba(0, 0, 0, 0.3)',
                      padding: '12px',
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      color: '#00ffff',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {codeString}
                  </code>
                ) : (
                  <code
                    className={className}
                    style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      color: '#00ffff',
                    }}
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </Box>
      </motion.div>
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      
      {/* Game Mode */}
      {gameMode ? (
        <Game 
          onExitGame={() => setGameMode(false)}
          onChatWithNPC={() => {
            // Could open chat overlay in game
            setGameMode(false);
          }}
        />
      ) : (
        /* Chat Mode */
        <Box
          sx={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0a0a1e 0%, #1a0a2e 50%, #0a1a2e 100%)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
        {/* Animated background gradient */}
        <Box
          className="animated-gradient"
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              'radial-gradient(circle at 20% 50%, rgba(0, 255, 255, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(138, 43, 226, 0.05) 0%, transparent 50%)',
            animation: 'gradientShift 20s ease infinite',
            pointerEvents: 'none',
          }}
        />

        {/* Hexagonal grid overlay */}
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `
              repeating-linear-gradient(90deg, rgba(0, 255, 255, 0.03) 0px, transparent 1px, transparent 50px),
              repeating-linear-gradient(0deg, rgba(0, 255, 255, 0.03) 0px, transparent 1px, transparent 50px)
            `,
            pointerEvents: 'none',
          }}
        />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          {/* Header */}
          <Box
            className="glass-panel"
            sx={{
              textAlign: 'center',
              py: 4,
              my: 3,
              borderRadius: '20px',
            }}
          >
            <Typography
              variant="h3"
              sx={{
                background: 'linear-gradient(135deg, #00ffff, #a78bfa, #ec4899)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 700,
                letterSpacing: '3px',
                mb: 1,
              }}
            >
              VESPER
            </Typography>
            <Typography variant="subtitle1" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              Your Intelligent AI Assistant
            </Typography>
          </Box>

          {/* Chat Container */}
          <Paper
            className="glass-panel"
            ref={chatContainerRef}
            sx={{
              height: 'calc(100vh - 320px)',
              overflowY: 'auto',
              p: 3,
              mb: 2,
              borderRadius: '20px',
            }}
          >
            <AnimatePresence>
              {messages.map((message) => (
                <div key={message.id}>{renderMessage(message)}</div>
              ))}
            </AnimatePresence>

            {/* Loading indicator */}
            {loading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 2 }}>
                {/* <AIAvatar thinking={true} mood="thinking" /> */}
                <Box className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </Box>
              </Box>
            )}

            <div ref={messagesEndRef} />
          </Paper>

          {/* Input Area */}
          <Paper
            className="glass-panel"
            sx={{
              p: 2,
              borderRadius: '20px',
              display: 'flex',
              gap: 1,
              alignItems: 'center',
            }}
          >
            <TextField
              fullWidth
              multiline
              maxRows={4}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask Vesper anything..."
              disabled={loading}
              variant="standard"
              InputProps={{
                disableUnderline: true,
                sx: {
                  color: '#fff',
                  fontSize: '16px',
                  '& textarea::placeholder': {
                    color: 'rgba(255, 255, 255, 0.4)',
                  },
                },
              }}
            />
            
            {/* <VoiceInput onTranscript={handleVoiceTranscript} /> */}

            <IconButton
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              sx={{
                background: 'linear-gradient(135deg, #00ffff, #0088ff)',
                color: '#fff',
                '&:hover': {
                  background: 'linear-gradient(135deg, #00cccc, #0066cc)',
                  boxShadow: '0 0 20px rgba(0, 255, 255, 0.5)',
                },
                '&:disabled': {
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.3)',
                },
              }}
            >
              {loading ? <CircularProgress size={24} /> : <SendIcon />}
            </IconButton>

            <IconButton
              onClick={clearHistory}
              sx={{
                color: '#ff4444',
                '&:hover': {
                  background: 'rgba(255, 68, 68, 0.1)',
                },
              }}
            >
              <DeleteIcon />
            </IconButton>
          </Paper>
        </Container>

        {/* Command Palette */}
        {/* <CommandPalette
          isOpen={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
          onCommand={handleCommand}
        /> */}

        {/* Floating Action Button */}
        {/* <FloatingActionButton onAction={handleCommand} /> */}
      
        {/* Explore World Button */}
        <IconButton
          onClick={() => setGameMode(true)}
          sx={{
            position: 'fixed',
            bottom: 90,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '16px 32px',
            background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)',
            color: '#fff',
            fontSize: '18px',
            fontWeight: 700,
            borderRadius: '30px',
            border: '2px solid rgba(167, 139, 250, 0.5)',
            boxShadow: '0 0 40px rgba(167, 139, 250, 0.6)',
            '&:hover': {
              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              transform: 'translateX(-50%) scale(1.05)',
              boxShadow: '0 0 60px rgba(167, 139, 250, 0.8)',
            },
            transition: 'all 0.3s ease',
          }}
        >
          🏰 Enter Vesper's World 🌍
        </IconButton>
      </Box>
      )}
    </ThemeProvider>
  );
}

export default App;
