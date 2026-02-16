import React, { useState, useMemo } from 'react';

/**
 * EnvironmentBrowser — Full-screen overlay UI for browsing and switching 3D environments.
 * 
 * Shows a grid of available environments with descriptions, categories, and size info.
 * User clicks one to load it as the active world.
 */
export default function EnvironmentBrowser({ 
  environments = [], 
  activeEnvironmentId = null, 
  onSelect, 
  onClose,
  onAddNew,
}) {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = useMemo(() => {
    const cats = new Set(environments.map(e => e.category));
    return ['all', ...Array.from(cats)];
  }, [environments]);

  const filtered = useMemo(() => {
    return environments.filter(env => {
      if (filter !== 'all' && env.category !== filter) return false;
      if (searchTerm && !env.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !env.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [environments, filter, searchTerm]);

  const categoryIcons = {
    nature: '🌲',
    building: '🏰',
    atmospheric: '🌧️',
    dark: '🌑',
    'pop-culture': '🎬',
    all: '🌍',
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(5, 5, 15, 0.97)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      color: '#e0e0e0',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 30px',
        borderBottom: '1px solid rgba(0, 255, 255, 0.15)',
        background: 'rgba(0, 255, 255, 0.03)',
        flexShrink: 0,
      }}>
        <div>
          <h1 style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 800,
            background: 'linear-gradient(135deg, #00ffff, #00ff88)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: 2,
          }}>
            ENVIRONMENT BROWSER
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            Choose a complete 3D world to explore • {environments.length} environments available
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onAddNew}
            style={{
              padding: '8px 16px',
              background: 'rgba(0, 255, 136, 0.1)',
              border: '1px solid rgba(0, 255, 136, 0.3)',
              color: '#00ff88',
              borderRadius: 8,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 12,
              fontWeight: 600,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0, 255, 136, 0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0, 255, 136, 0.1)'}
          >
            + ADD NEW
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: 'rgba(255, 100, 100, 0.1)',
              border: '1px solid rgba(255, 100, 100, 0.3)',
              color: '#ff6666',
              borderRadius: 8,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 12,
              fontWeight: 600,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 100, 100, 0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 100, 100, 0.1)'}
          >
            ✕ CLOSE
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 30px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        flexShrink: 0,
        flexWrap: 'wrap',
      }}>
        <input
          type="text"
          placeholder="Search environments..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{
            padding: '8px 14px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            color: '#fff',
            fontFamily: 'inherit',
            fontSize: 12,
            outline: 'none',
            width: 220,
            transition: 'border 0.2s',
          }}
          onFocus={e => e.currentTarget.style.borderColor = 'rgba(0,255,255,0.4)'}
          onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                padding: '6px 12px',
                background: filter === cat ? 'rgba(0, 255, 255, 0.15)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${filter === cat ? 'rgba(0, 255, 255, 0.4)' : 'rgba(255,255,255,0.08)'}`,
                color: filter === cat ? '#00ffff' : 'rgba(255,255,255,0.5)',
                borderRadius: 6,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 11,
                fontWeight: filter === cat ? 700 : 400,
                textTransform: 'capitalize',
                transition: 'all 0.2s',
              }}
            >
              {categoryIcons[cat] || '📦'} {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Environment Grid */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px 30px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: 16,
        alignContent: 'start',
      }}>
        {filtered.map(env => {
          const isActive = env.id === activeEnvironmentId;
          return (
            <div
              key={env.id}
              onClick={() => onSelect(env.id)}
              style={{
                background: isActive 
                  ? 'linear-gradient(135deg, rgba(0,255,136,0.08), rgba(0,255,255,0.05))'
                  : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isActive ? 'rgba(0,255,136,0.4)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 12,
                padding: 20,
                cursor: 'pointer',
                transition: 'all 0.3s',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(0,255,255,0.05)';
                  e.currentTarget.style.borderColor = 'rgba(0,255,255,0.25)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {/* Active badge */}
              {isActive && (
                <div style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  padding: '3px 10px',
                  background: 'rgba(0,255,136,0.2)',
                  border: '1px solid #00ff88',
                  borderRadius: 20,
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#00ff88',
                  letterSpacing: 1,
                }}>
                  ACTIVE
                </div>
              )}

              {/* Scene preview area */}
              <div style={{
                height: 120,
                borderRadius: 8,
                marginBottom: 14,
                background: `linear-gradient(135deg, ${env.ambientColor || '#333'}44, ${env.fogColor || '#111'}88)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255,255,255,0.05)',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <span style={{ fontSize: 48, opacity: 0.6 }}>
                  {categoryIcons[env.category] || '🌍'}
                </span>
                {/* Size badge */}
                <div style={{
                  position: 'absolute',
                  bottom: 6,
                  right: 8,
                  padding: '2px 8px',
                  background: 'rgba(0,0,0,0.6)',
                  borderRadius: 4,
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.5)',
                }}>
                  {env.sizeMB}MB
                </div>
              </div>

              {/* Info */}
              <h3 style={{
                margin: '0 0 6px',
                fontSize: 16,
                fontWeight: 700,
                color: isActive ? '#00ff88' : '#fff',
              }}>
                {env.name}
              </h3>
              <p style={{
                margin: 0,
                fontSize: 11,
                color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.5,
              }}>
                {env.description}
              </p>

              {/* Bottom tags */}
              <div style={{
                display: 'flex',
                gap: 6,
                marginTop: 12,
                flexWrap: 'wrap',
              }}>
                <span style={{
                  padding: '2px 8px',
                  background: 'rgba(0,255,255,0.08)',
                  border: '1px solid rgba(0,255,255,0.15)',
                  borderRadius: 4,
                  fontSize: 10,
                  color: '#00ffff',
                  textTransform: 'capitalize',
                }}>
                  {env.category}
                </span>
                <span style={{
                  padding: '2px 8px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 4,
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.4)',
                }}>
                  {env.source === 'local' ? '💾 Local' : '🌐 Remote'}
                </span>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: 60,
            color: 'rgba(255,255,255,0.3)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <div style={{ fontSize: 14 }}>No environments match your search</div>
          </div>
        )}
      </div>

      {/* Footer tip */}
      <div style={{
        padding: '12px 30px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        fontSize: 11,
        color: 'rgba(255,255,255,0.3)',
        textAlign: 'center',
        flexShrink: 0,
      }}>
        💡 Download more worlds from <a href="https://sketchfab.com/search?q=diorama&type=models&downloadable=true" target="_blank" rel="noopener" style={{ color: '#00ffff', textDecoration: 'none' }}>Sketchfab</a> or <a href="https://poly.pizza" target="_blank" rel="noopener" style={{ color: '#00ffff', textDecoration: 'none' }}>Poly Pizza</a> — drop GLB files in <code style={{ color: '#00ff88' }}>frontend/public/models/</code> and add to catalog
      </div>
    </div>
  );
}

/**
 * AddEnvironmentDialog — Shows instructions for adding new environments
 */
export function AddEnvironmentDialog({ onClose }) {
  const sources = [
    { name: 'Sketchfab', url: 'https://sketchfab.com/search?q=diorama&type=models&downloadable=true&sort_by=-likeCount', color: '#1CAAD9', desc: 'Biggest library. Search "diorama" or "environment". Download as GLB.' },
    { name: 'Poly Pizza', url: 'https://poly.pizza', color: '#FF6B6B', desc: 'Free low-poly models. Great for game environments. CC0 licensed.' },
    { name: 'Kenney', url: 'https://kenney.nl/assets', color: '#4CAF50', desc: 'Free game asset packs. Complete scene kits. CC0.' },
    { name: 'Quaternius', url: 'https://quaternius.com', color: '#9C27B0', desc: 'Free animated low-poly packs. Nature, buildings, characters.' },
    { name: 'CGTrader', url: 'https://www.cgtrader.com/free-3d-models?file_types[]=69', color: '#FF9800', desc: 'Free section. Filter by GLB/GLTF format. Check licenses.' },
    { name: 'TurboSquid Free', url: 'https://www.turbosquid.com/Search/3D-Models/free/glb', color: '#E91E63', desc: 'Professional quality. Some free GLB models available.' },
  ];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 10000,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        background: 'rgba(10, 10, 30, 0.98)',
        border: '1px solid rgba(0, 255, 255, 0.2)',
        borderRadius: 16,
        padding: 30,
        maxWidth: 600,
        maxHeight: '80vh',
        overflowY: 'auto',
        fontFamily: '"JetBrains Mono", monospace',
        color: '#e0e0e0',
      }}>
        <h2 style={{
          margin: '0 0 20px',
          fontSize: 20,
          fontWeight: 800,
          background: 'linear-gradient(135deg, #00ffff, #00ff88)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          ADD NEW ENVIRONMENTS
        </h2>

        <div style={{
          background: 'rgba(0,255,136,0.05)',
          border: '1px solid rgba(0,255,136,0.2)',
          borderRadius: 10,
          padding: 16,
          marginBottom: 20,
        }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 13, color: '#00ff88' }}>HOW TO:</h3>
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 12, lineHeight: 2, color: 'rgba(255,255,255,0.7)' }}>
            <li>Visit one of the sites below and find a <strong>complete scene/diorama</strong></li>
            <li>Download it as <strong>GLB</strong> format (GLTF binary)</li>
            <li>Drop the file in <code style={{ color: '#00ff88' }}>frontend/public/models/</code></li>
            <li>Add an entry in <code style={{ color: '#00ff88' }}>environmentCatalog.json</code></li>
            <li>It shows up here automatically!</li>
          </ol>
        </div>

        <h3 style={{ margin: '0 0 12px', fontSize: 13, color: '#00ffff' }}>FREE 3D WORLD SOURCES:</h3>
        
        {sources.map(s => (
          <a
            key={s.name}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              padding: '12px 16px',
              marginBottom: 8,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 8,
              textDecoration: 'none',
              transition: 'all 0.2s',
              borderLeft: `3px solid ${s.color}`,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              e.currentTarget.style.transform = 'translateX(4px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
              e.currentTarget.style.transform = 'translateX(0)';
            }}
          >
            <div style={{ fontWeight: 700, color: s.color, fontSize: 14, marginBottom: 4 }}>
              {s.name} ↗
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{s.desc}</div>
          </a>
        ))}

        <div style={{
          marginTop: 16,
          padding: 12,
          background: 'rgba(255, 200, 0, 0.05)',
          border: '1px solid rgba(255, 200, 0, 0.2)',
          borderRadius: 8,
          fontSize: 11,
          color: 'rgba(255,255,255,0.6)',
        }}>
          💡 <strong>Pro tip:</strong> On Sketchfab, search for "diorama", "scene", or "environment" and filter by "Downloadable". 
          Look for models with the <strong>CC BY</strong> or <strong>CC0</strong> license. 
          Scenes between 10-60MB tend to be the sweet spot — detailed enough but won't kill your browser.
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: 20,
            width: '100%',
            padding: 12,
            background: 'rgba(0,255,255,0.1)',
            border: '1px solid rgba(0,255,255,0.3)',
            borderRadius: 8,
            color: '#00ffff',
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,255,255,0.2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,255,255,0.1)'}
        >
          GOT IT
        </button>
      </div>
    </div>
  );
}
