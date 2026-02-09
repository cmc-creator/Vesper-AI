import { useEffect, useRef } from 'react';
import { Howl } from 'howler';

export default function AmbientSounds({ weather, isPlaying = true }) {
  const soundsRef = useRef({});

  useEffect(() => {
    // Create ambient nature sounds using Web Audio API oscillators
    // Since we don't have audio files, we'll use procedural audio
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Wind ambient sound
    const createWindSound = () => {
      const noiseBuffer = audioContext.createBuffer(
        1,
        audioContext.sampleRate * 2,
        audioContext.sampleRate
      );
      const output = noiseBuffer.getChannelData(0);
      
      for (let i = 0; i < noiseBuffer.length; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      
      const whiteNoise = audioContext.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;
      
      const filter = audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;
      
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0.05;
      
      whiteNoise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      if (isPlaying) {
        whiteNoise.start();
      }
      
      return { source: whiteNoise, gain: gainNode };
    };
    
    // Bird chirping sound
    const createBirdChirp = () => {
      const chirp = () => {
        if (!isPlaying) return;
        
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.value = 1500 + Math.random() * 1000;
        
        gain.gain.value = 0.02;
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          audioContext.currentTime + 0.2
        );
        
        osc.connect(gain);
        gain.connect(audioContext.destination);
        
        osc.start();
        osc.stop(audioContext.currentTime + 0.2);
        
        // Random next chirp
        setTimeout(chirp, Math.random() * 5000 + 3000);
      };
      
      chirp();
    };
    
    // Magical sparkle sound
    const createSparkleSound = () => {
      const sparkle = () => {
        if (!isPlaying) return;
        
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.value = 2000 + Math.random() * 1000;
        
        gain.gain.value = 0.01;
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          audioContext.currentTime + 0.3
        );
        
        osc.connect(gain);
        gain.connect(audioContext.destination);
        
        osc.start();
        osc.stop(audioContext.currentTime + 0.3);
        
        // Random sparkles
        setTimeout(sparkle, Math.random() * 8000 + 5000);
      };
      
      sparkle();
    };
    
    // Ambient music - peaceful melody
    const createAmbientMelody = () => {
      const notes = [
        261.63, // C
        293.66, // D
        329.63, // E
        349.23, // F
        392.00, // G
        440.00, // A
      ];
      
      let noteIndex = 0;
      
      const playNote = () => {
        if (!isPlaying) return;
        
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.value = notes[noteIndex % notes.length];
        
        gain.gain.value = 0.03;
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          audioContext.currentTime + 1.5
        );
        
        osc.connect(gain);
        gain.connect(audioContext.destination);
        
        osc.start();
        osc.stop(audioContext.currentTime + 1.5);
        
        noteIndex++;
        setTimeout(playNote, 2000);
      };
      
      playNote();
    };
    
    // Initialize sounds
    if (isPlaying) {
      soundsRef.current.wind = createWindSound();
      createBirdChirp();
      createSparkleSound();
      createAmbientMelody();
    }
    
    // Cleanup
    return () => {
      if (soundsRef.current.wind) {
        soundsRef.current.wind.source.stop();
      }
    };
  }, [isPlaying, weather]);

  return null;
}
