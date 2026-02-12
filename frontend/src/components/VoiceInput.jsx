import React, { useState, useEffect, useRef } from 'react';
import { IconButton, Tooltip, Box, Chip, Menu, MenuItem } from '@mui/material';
import { Mic, Stop, Settings as SettingsIcon } from '@mui/icons-material';

const VoiceInput = ({ onTranscript }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false); // Wake word mode
  const [isSupported, setIsSupported] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [language, setLanguage] = useState('en-US');
  const [settingsAnchor, setSettingsAnchor] = useState(null);
  const [wakeWordEnabled, setWakeWordEnabled] = useState(false);
  const recognitionRef = useRef(null);
  const wakeWordRecognitionRef = useRef(null);

  const languages = [
    { code: 'en-US', label: 'English (US)' },
    { code: 'en-GB', label: 'English (UK)' },
    { code: 'es-ES', label: 'Spanish' },
    { code: 'fr-FR', label: 'French' },
    { code: 'de-DE', label: 'German' },
    { code: 'it-IT', label: 'Italian' },
    { code: 'pt-BR', label: 'Portuguese (BR)' },
    { code: 'ja-JP', label: 'Japanese' },
    { code: 'zh-CN', label: 'Chinese (Simplified)' },
  ];

  useEffect(() => {
    // Check if browser supports Speech Recognition
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      setIsSupported(true);
      
      // Main recognition for transcription
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = language;

      recognitionRef.current.onresult = (event) => {
        const results = Array.from(event.results);
        const interimTranscript = results
          .filter(result => !result.isFinal)
          .map(result => result[0].transcript)
          .join('');
        
        const finalTranscript = results
          .filter(result => result.isFinal)
          .map(result => result[0].transcript)
          .join('');

        setInterimText(interimTranscript);

        if (finalTranscript) {
          onTranscript(finalTranscript);
          setInterimText('');
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          // Auto-restart on no-speech
          setTimeout(() => {
            if (isRecording && recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                console.warn('Could not restart recognition', e);
              }
            }
          }, 500);
        } else {
          setIsRecording(false);
        }
      };

      recognitionRef.current.onend = () => {
        // Auto-restart if still in recording mode
        if (isRecording) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            setIsRecording(false);
          }
        }
      };

      // Wake word detection recognition
      wakeWordRecognitionRef.current = new SpeechRecognition();
      wakeWordRecognitionRef.current.continuous = true;
      wakeWordRecognitionRef.current.interimResults = false;
      wakeWordRecognitionRef.current.lang = language;

      wakeWordRecognitionRef.current.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
        
        // Check for wake words
        if (transcript.includes('hey vesper') || 
            transcript.includes('vesper') || 
            transcript.includes('hey vis')) {
          console.log('Wake word detected!');
          startRecording();
        }
      };

      wakeWordRecognitionRef.current.onerror = (event) => {
        console.error('Wake word detection error:', event.error);
        if (isListening) {
          // Restart wake word detection
          setTimeout(() => {
            if (wakeWordRecognitionRef.current && isListening) {
              try {
                wakeWordRecognitionRef.current.start();
              } catch (e) {
                console.warn('Could not restart wake word detection', e);
              }
            }
          }, 500);
        }
      };

      wakeWordRecognitionRef.current.onend = () => {
        // Auto-restart wake word detection
        if (isListening) {
          try {
            wakeWordRecognitionRef.current.start();
          } catch (e) {
            setIsListening(false);
          }
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (wakeWordRecognitionRef.current) {
        wakeWordRecognitionRef.current.stop();
      }
    };
  }, [language, onTranscript, isRecording, isListening]);

  const startRecording = () => {
    if (!recognitionRef.current) return;
    
    // Stop wake word detection
    if (wakeWordRecognitionRef.current && isListening) {
      wakeWordRecognitionRef.current.stop();
      setIsListening(false);
    }

    try {
      recognitionRef.current.start();
      setIsRecording(true);
    } catch (e) {
      console.warn('Recognition already started', e);
    }
  };

  const stopRecording = () => {
    if (!recognitionRef.current) return;
    
    recognitionRef.current.stop();
    setIsRecording(false);
    setInterimText('');

    // Restart wake word detection if enabled
    if (wakeWordEnabled && wakeWordRecognitionRef.current) {
      setTimeout(() => {
        try {
          wakeWordRecognitionRef.current.start();
          setIsListening(true);
        } catch (e) {
          console.warn('Could not start wake word detection', e);
        }
      }, 500);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const toggleWakeWord = () => {
    const newValue = !wakeWordEnabled;
    setWakeWordEnabled(newValue);

    if (newValue && wakeWordRecognitionRef.current) {
      try {
        wakeWordRecognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.warn('Could not start wake word detection', e);
      }
    } else if (wakeWordRecognitionRef.current) {
      wakeWordRecognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const changeLanguage = (langCode) => {
    setLanguage(langCode);
    if (recognitionRef.current) {
      recognitionRef.current.lang = langCode;
    }
    if (wakeWordRecognitionRef.current) {
      wakeWordRecognitionRef.current.lang = langCode;
    }
    setSettingsAnchor(null);
  };

  if (!isSupported) {
    return null; // Don't show button if not supported
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, position: 'relative' }}>
      {isListening && !isRecording && (
        <Chip 
          label="Listening for 'Hey Vesper'..." 
          size="small"
          sx={{ 
            height: 24,
            bgcolor: 'rgba(0,255,255,0.1)',
            color: 'var(--accent)',
            borderColor: 'var(--accent)',
            borderWidth: 1,
            borderStyle: 'solid',
            animation: 'pulse 2s ease-in-out infinite',
            fontSize: '0.7rem'
          }}
        />
      )}
      
      {interimText && (
        <Chip 
          label={`"${interimText}..."`} 
          size="small"
          sx={{ 
            height: 24,
            bgcolor: 'rgba(255,255,255,0.1)',
            color: '#fff',
            maxWidth: 200,
            fontSize: '0.7rem'
          }}
        />
      )}

      <Tooltip title={isRecording ? 'Stop recording (or say your message)' : 'Start voice input'}>
        <IconButton
          className={`voice-button ${isRecording ? 'recording' : ''}`}
          onClick={toggleRecording}
          sx={{
            color: isRecording ? '#ff4444' : isListening ? '#ffaa00' : '#00ffff',
            transition: 'all 0.3s ease',
          }}
        >
          {isRecording ? <Stop /> : <Mic />}
          {isRecording && (
            <Box
              sx={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                border: '2px solid #ff4444',
                borderRadius: '50%',
                animation: 'recordingPulse 1.5s ease-in-out infinite',
              }}
            />
          )}
        </IconButton>
      </Tooltip>

      <Tooltip title="Voice settings">
        <IconButton
          size="small"
          onClick={(e) => setSettingsAnchor(e.currentTarget)}
          sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: 'var(--accent)' } }}
        >
          <SettingsIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={settingsAnchor}
        open={Boolean(settingsAnchor)}
        onClose={() => setSettingsAnchor(null)}
        PaperProps={{
          sx: {
            bgcolor: 'rgba(10, 14, 30, 0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(20px)',
            maxHeight: 400,
          }
        }}
      >
        <MenuItem onClick={toggleWakeWord}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <span>Wake Word Detection</span>
            <Chip 
              label={wakeWordEnabled ? "ON" : "OFF"} 
              size="small" 
              sx={{ 
                ml: 2,
                bgcolor: wakeWordEnabled ? '#4ade80' : 'rgba(255,255,255,0.1)',
                color: wakeWordEnabled ? '#000' : '#fff',
                fontWeight: 700
              }}
            />
          </Box>
        </MenuItem>
        <MenuItem disabled sx={{ opacity: 0.5, fontSize: '0.85rem' }}>
          Language
        </MenuItem>
        {languages.map((lang) => (
          <MenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            selected={language === lang.code}
          >
            {lang.label}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default VoiceInput;
