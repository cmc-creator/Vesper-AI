import React from 'react';

export default function Minimap({ playerPosition, crystalsCollected, horsePosition, unicornPos = [35, 0, 35] }) {
  const mapSize = 100; // World size
  const minimapSize = 150; // Minimap pixel size
  const scale = minimapSize / mapSize;
  
  // Convert 3D world position to 2D minimap position
  const worldToMinimap = (worldPos) => {
    const x = (worldPos[0] / mapSize) * minimapSize + minimapSize / 2;
    const z = (worldPos[2] / mapSize) * minimapSize + minimapSize / 2;
    return { x, y: z };
  };
  
  const playerPos = worldToMinimap(playerPosition);
  const unicornMapPos = worldToMinimap(unicornPos);

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      right: '20px',
      width: `${minimapSize}px`,
height: `${minimapSize}px`,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      border: '3px solid rgba(167, 139, 250, 0.8)',
      borderRadius: '10px',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      overflow: 'hidden',
      zIndex: 100
    }}>
      {/* Compass directions */}
      <div style={{
        position: 'absolute',
        top: '5px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: '#ffd700',
        fontSize: '10px',
        fontWeight: 'bold',
        textShadow: '0 0 5px rgba(255, 215, 0, 0.8)'
      }}>N</div>
      
      {/* Grid lines */}
      <svg style={{ width: '100%', height: '100%', position: 'absolute' }}>
        {/* Vertical lines */}
        {[0, 1, 2, 3, 4].map(i => (
          <line 
            key={`v-${i}`}
            x1={i * (minimapSize / 4)} 
            y1={0}
            x2={i * (minimapSize / 4)} 
            y2={minimapSize}
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="1"
          />
        ))}
        
        {/* Horizontal lines */}
        {[0, 1, 2, 3, 4].map(i => (
          <line 
            key={`h-${i}`}
            x1={0} 
            y1={i * (minimapSize / 4)}
            x2={minimapSize} 
            y2={i * (minimapSize / 4)}
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="1"
          />
        ))}
        
        {/* Castle marker */}
        <g transform={`translate(${worldToMinimap([0, 0, -25]).x}, ${worldToMinimap([0, 0, -25]).y})`}>
          <circle r="6" fill="#1a237e" stroke="#ffd700" strokeWidth="2" />
          <text 
            x="0" 
            y="0" 
            textAnchor="middle" 
            dominantBaseline="central"
            fontSize="10"
            fill="#ffd700"
          >🏰</text>
        </g>
        
        {/* Unicorn marker (if not collected) */}
        {crystalsCollected < 8 && (
          <g transform={`translate(${unicornMapPos.x}, ${unicornMapPos.y})`}>
            <circle r="5" fill="#ffd700" stroke="#ffffff" strokeWidth="1">
              <animate 
                attributeName="r" 
                values="4;6;4" 
                dur="2s" 
                repeatCount="indefinite"
              />
              <animate 
                attributeName="opacity" 
                values="0.5;1;0.5" 
                dur="2s" 
                repeatCount="indefinite"
              />
            </circle>
            <text 
              x="0" 
              y="0" 
              textAnchor="middle" 
              dominantBaseline="central"
              fontSize="8"
              fill="#ffffff"
            >🦄</text>
          </g>
        )}
        
        {/* Player marker (triangle pointing forward) */}
        <g transform={`translate(${playerPos.x}, ${playerPos.y})`}>
          <circle r="8" fill="rgba(167, 139, 250, 0.3)" />
          <circle r="4" fill="#a78bfa" stroke="#ffffff" strokeWidth="1.5" />
          <circle r="2" fill="#ffffff" />
        </g>
      </svg>
      
      {/* Minimap label */}
      <div style={{
        position: 'absolute',
        bottom: '5px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: '#a78bfa',
        fontSize: '9px',
        fontWeight: 'bold',
        textShadow: '0 0 5px rgba(167, 139, 250, 0.8)',
        pointerEvents: 'none'
      }}>
        MAP
      </div>
      
      {/* Compass rose overlay */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '40px',
        height: '40px',
        pointerEvents: 'none',
        opacity: 0.3
      }}>
        <svg viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="18" fill="none" stroke="#ffd700" strokeWidth="1" />
          <polygon points="20,5 22,18 20,20 18,18" fill="#ffd700" />
          <polygon points="20,35 22,22 20,20 18,22" fill="#888" />
          <polygon points="5,20 18,22 20,20 18,18" fill="#888" />
          <polygon points="35,20 22,22 20,20 22,18" fill="#888" />
        </svg>
      </div>
    </div>
  );
}
