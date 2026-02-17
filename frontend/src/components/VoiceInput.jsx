import React, { useState, useEffect, useRef } from 'react';
import { IconButton, Tooltip, Box, Chip } from '@mui/material';
import { Mic, Stop } from '@mui/icons-material';

const VoiceInput = ({ onTranscript }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef(null);
  const isRecordingRef = useRef(false);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    setIsSupported(true);

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const results = Array.from(event.results);
      const interim = results.filter(r => !r.isFinal).map(r => r[0].transcript).join('');
      const final = results.filter(r => r.isFinal).map(r => r[0].transcript).join('');
      setInterimText(interim);
      if (final) { onTranscript(final); setInterimText(''); }
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') {
        setTimeout(() => { if (isRecordingRef.current) try { recognition.start(); } catch (e) {} }, 500);
      } else {
        setIsRecording(false);
        isRecordingRef.current = false;
      }
    };

    recognition.onend = () => {
      if (isRecordingRef.current) {
        try { recognition.start(); } catch (e) { setIsRecording(false); isRecordingRef.current = false; }
      }
    };

    recognitionRef.current = recognition;
    return () => { try { recognition.stop(); } catch (e) {} };
  }, [onTranscript]);

  const toggleRecording = () => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      isRecordingRef.current = false;
      setInterimText('');
    } else {
      try { recognitionRef.current.start(); setIsRecording(true); isRecordingRef.current = true; } catch (e) {}
    }
  };

  if (!isSupported) return null;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {interimText && (
        <Chip label={`"${interimText}..."`} size="small"
          sx={{ height: 24, bgcolor: 'rgba(255,255,255,0.1)', color: '#fff', maxWidth: 200, fontSize: '0.7rem' }} />
      )}
      <Tooltip title={isRecording ? 'Stop recording' : 'Voice input (hold V)'}>
        <IconButton className={`voice-button ${isRecording ? 'recording' : ''}`} onClick={toggleRecording}
          sx={{ color: isRecording ? '#ff4444' : '#00ffff', transition: 'all 0.3s ease' }}>
          {isRecording ? <Stop /> : <Mic />}
          {isRecording && (
            <Box sx={{ position: 'absolute', width: '100%', height: '100%', border: '2px solid #ff4444', borderRadius: '50%', animation: 'recordingPulse 1.5s ease-in-out infinite' }} />
          )}
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default VoiceInput;
