import React, { useState, useEffect, useRef } from 'react';
import { IconButton, Tooltip, Box } from '@mui/material';
import { Mic, Stop } from '@mui/icons-material';

const VoiceInput = ({ onTranscript }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Check if browser supports Speech Recognition
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0])
          .map((result) => result.transcript)
          .join('');

        if (event.results[0].isFinal) {
          onTranscript(transcript);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onTranscript]);

  const toggleRecording = () => {
    if (!recognitionRef.current) return;

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  if (!isSupported) {
    return null; // Don't show button if not supported
  }

  return (
    <Tooltip title={isRecording ? 'Stop recording' : 'Voice input'}>
      <IconButton
        className={`voice-button ${isRecording ? 'recording' : ''}`}
        onClick={toggleRecording}
        sx={{
          color: isRecording ? '#ff0000' : '#00ffff',
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
              border: '2px solid #ff0000',
              borderRadius: '50%',
              animation: 'recordingPulse 1.5s ease-in-out infinite',
            }}
          />
        )}
      </IconButton>
    </Tooltip>
  );
};

export default VoiceInput;
