import React, { useState, useEffect } from 'react';

export default function CharacterCustomization({ onCustomize, isOpen, onClose }) {
  const [bodyColor, setBodyColor] = useState('#ffd700');
  const [trailColor, setTrailColor] = useState('#a78bfa');
  const [particleColor, setParticleColor] = useState('#ffffff');
  const [characterName, setCharacterName] = useState('Hero');
  
  // Load saved preferences
  useEffect(() => {
    const saved = localStorage.getItem('vesper_character_prefs');
    if (saved) {
      try {
        const prefs = JSON.parse(saved);
        setBodyColor(prefs.bodyColor || '#ffd700');
        setTrailColor(prefs.trailColor || '#a78bfa');
        setParticleColor(prefs.particleColor || '#ffffff');
        setCharacterName(prefs.characterName || 'Hero');
        
        // Apply immediately
        if (onCustomize) {
          onCustomize(prefs);
        }
      } catch (e) {
        console.error('Failed to load preferences:', e);
      }
    }
  }, []);
  
  // Save preferences whenever they change
  const savePreferences = () => {
    const prefs = {
      bodyColor,
      trailColor,
      particleColor,
      characterName
    };
    
    localStorage.setItem('vesper_character_prefs', JSON.stringify(prefs));
    
    if (onCustomize) {
      onCustomize(prefs);
    }
  };
  
  useEffect(() => {
    savePreferences();
  }, [bodyColor, trailColor, particleColor, characterName]);
  
  if (!isOpen) return null;
  
  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(0, 0, 0, 0.9)',
      backdropFilter: 'blur(15px)',
      border: '2px solid #a78bfa',
      borderRadius: '20px',
      padding: '30px',
      minWidth: '400px',
      maxWidth: '500px',
      color: 'white',
      fontFamily: 'Arial, sans-serif',
      boxShadow: '0 0 40px rgba(167, 139, 250, 0.6)',
      zIndex: 1000
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '25px',
        borderBottom: '1px solid #a78bfa',
        paddingBottom: '15px'
      }}>
        <h2 style={{
          margin: 0,
          color: '#a78bfa',
          fontSize: '24px',
          textShadow: '0 0 10px rgba(167, 139, 250, 0.8)'
        }}>
          ✨ Character Customization
        </h2>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#ff6b6b',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '5px 10px'
          }}
        >
          ✕
        </button>
      </div>
      
      {/* Character Name */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          color: '#00ffff',
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          Character Name
        </label>
        <input
          type="text"
          value={characterName}
          onChange={(e) => setCharacterName(e.target.value)}
          maxLength={20}
          style={{
            width: '100%',
            padding: '10px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid #a78bfa',
            borderRadius: '8px',
            color: 'white',
            fontSize: '16px',
            boxSizing: 'border-box'
          }}
          placeholder="Enter your hero's name..."
        />
      </div>
      
      {/* Body Color */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          color: '#00ffff',
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          Body Color
        </label>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="color"
            value={bodyColor}
            onChange={(e) => setBodyColor(e.target.value)}
            style={{
              width: '60px',
              height: '40px',
              border: '2px solid #a78bfa',
              borderRadius: '8px',
              cursor: 'pointer',
              background: 'none'
            }}
          />
          <div style={{
            flex: 1,
            padding: '10px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            border: '1px solid #a78bfa'
          }}>
            {bodyColor}
          </div>
        </div>
      </div>
      
      {/* Trail Color */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          color: '#00ffff',
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          Magic Trail Color
        </label>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="color"
            value={trailColor}
            onChange={(e) => setTrailColor(e.target.value)}
            style={{
              width: '60px',
              height: '40px',
              border: '2px solid #a78bfa',
              borderRadius: '8px',
              cursor: 'pointer',
              background: 'none'
            }}
          />
          <div style={{
            flex: 1,
            padding: '10px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            border: '1px solid #a78bfa'
          }}>
            {trailColor}
          </div>
        </div>
      </div>
      
      {/* Particle Color */}
      <div style={{ marginBottom: '25px' }}>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          color: '#00ffff',
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          Sparkle Color
        </label>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="color"
            value={particleColor}
            onChange={(e) => setParticleColor(e.target.value)}
            style={{
              width: '60px',
              height: '40px',
              border: '2px solid #a78bfa',
              borderRadius: '8px',
              cursor: 'pointer',
              background: 'none'
            }}
          />
          <div style={{
            flex: 1,
            padding: '10px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            border: '1px solid #a78bfa'
          }}>
            {particleColor}
          </div>
        </div>
      </div>
      
      {/* Preset Colors */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{
          display: 'block',
          marginBottom: '10px',
          color: '#00ffff',
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          Quick Presets
        </label>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {[
            { name: 'Default', body: '#ffd700', trail: '#a78bfa', particle: '#ffffff' },
            { name: 'Ice', body: '#00ffff', trail: '#4dd0e1', particle: '#e0f7fa' },
            { name: 'Fire', body: '#ff6b35', trail: '#ff4500', particle: '#ffd700' },
            { name: 'Nature', body: '#4caf50', trail: '#81c784', particle: '#c8e6c9' },
            { name: 'Shadow', body: '#9c27b0', trail: '#7b1fa2', particle: '#ce93d8' },
            { name: 'Royal', body: '#ffd700', trail: '#9c27b0', particle: '#ffd700' }
          ].map((preset) => (
            <button
              key={preset.name}
              onClick={() => {
                setBodyColor(preset.body);
                setTrailColor(preset.trail);
                setParticleColor(preset.particle);
              }}
              style={{
                padding: '8px 16px',
                background: `linear-gradient(135deg, ${preset.body}, ${preset.trail})`,
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>
      
      {/* Info */}
      <div style={{
        padding: '15px',
        background: 'rgba(167, 139, 250, 0.1)',
        borderRadius: '10px',
        border: '1px solid #a78bfa',
        fontSize: '13px',
        color: '#a78bfa',
        marginTop: '20px'
      }}>
        💡 <strong>Tip:</strong> Your customization is automatically saved to your browser!
      </div>
    </div>
  );
}
