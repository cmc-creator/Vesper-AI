import React, { useState, useEffect } from 'react';

function ToastNotification({ achievement, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);
  
  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.95), rgba(139, 92, 246, 0.95))',
      backdropFilter: 'blur(15px)',
      border: '2px solid #a78bfa',
      borderRadius: '15px',
      padding: '20px 30px',
      minWidth: '300px',
      color: 'white',
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      boxShadow: '0 0 40px rgba(167, 139, 250, 0.8), 0 4px 20px rgba(0, 0, 0, 0.5)',
      animation: 'slideDown 0.5s ease-out, pulse 0.5s ease-in-out',
      zIndex: 10000,
      textAlign: 'center'
    }}>
      <div style={{
        fontSize: '48px',
        marginBottom: '10px',
        textShadow: '0 0 20px rgba(255, 215, 0, 0.8)',
        animation: 'bounce 0.5s ease-in-out'
      }}>
        🏆
      </div>
      <div style={{
        fontWeight: 'bold',
        fontSize: '20px',
        marginBottom: '5px',
        textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)'
      }}>
        Achievement Unlocked!
      </div>
      <div style={{
        fontSize: '18px',
        color: '#ffd700',
        fontWeight: 'bold',
        textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)'
      }}>
        {achievement.icon} {achievement.name}
      </div>
      <div style={{
        fontSize: '14px',
        marginTop: '8px',
        opacity: 0.9
      }}>
        {achievement.description}
      </div>
      <div style={{
        fontSize: '16px',
        marginTop: '10px',
        color: '#00ffff',
        fontWeight: 'bold'
      }}>
        +{achievement.xp} XP
      </div>
    </div>
  );
}

export default function AchievementSystem({ 
  crystalsCollected, 
  questsCompleted,
  treasuresFound,
  portalsTraveled,
  horsesRidden
}) {
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);
  const [currentToast, setCurrentToast] = useState(null);
  const [toastQueue, setToastQueue] = useState([]);
  
  // Define all achievements
  const achievements = {
    // Crystal achievements
    firstCrystal: {
      id: 'firstCrystal',
      name: 'Crystal Seeker',
      description: 'Collect your first mystical crystal',
      icon: '💎',
      xp: 10,
      condition: () => crystalsCollected >= 1
    },
    halfCrystals: {
      id: 'halfCrystals',
      name: 'Halfway There',
      description: 'Collect 4 out of 8 crystals',
      icon: '✨',
      xp: 25,
      condition: () => crystalsCollected >= 4
    },
    allCrystals: {
      id: 'allCrystals',
      name: 'Crystal Master',
      description: 'Collect all 8 mystical crystals!',
      icon: '🌟',
      xp: 100,
      condition: () => crystalsCollected >= 8
    },
    
    // Quest achievements
    firstQuest: {
      id: 'firstQuest',
      name: 'Quest Starter',
      description: 'Complete your first quest',
      icon: '📜',
      xp: 15,
      condition: () => questsCompleted >= 1
    },
    questMaster: {
      id: 'questMaster',
      name: 'Quest Master',
      description: 'Complete 5 quests',
      icon: '🎯',
      xp: 50,
      condition: () => questsCompleted >= 5
    },
    
    // Treasure achievements
    treasureHunter: {
      id: 'treasureHunter',
      name: 'Treasure Hunter',
      description: 'Open your first treasure chest',
      icon: '🎁',
      xp: 20,
      condition: () => treasuresFound >= 1
    },
    treasureMaster: {
      id: 'treasureMaster',
      name: 'Treasure Master',
      description: 'Find 5 treasure chests',
      icon: '💰',
      xp: 50,
      condition: () => treasuresFound >= 5
    },
    
    // Portal achievements
    portalExplorer: {
      id: 'portalExplorer',
      name: 'Portal Explorer',
      description: 'Use a teleportation portal',
      icon: '🌀',
      xp: 15,
      condition: () => portalsTraveled >= 1
    },
    portalMaster: {
      id: 'portalMaster',
      name: 'Portal Master',
      description: 'Travel through 10 portals',
      icon: '🔮',
      xp: 40,
      condition: () => portalsTraveled >= 10
    },
    
    // Horse achievements
    horseRider: {
      id: 'horseRider',
      name: 'Horse Whisperer',
      description: 'Ride a horse for the first time',
      icon: '🐴',
      xp: 20,
      condition: () => horsesRidden >= 1
    },
    
    // Special achievements
    explorer: {
      id: 'explorer',
      name: 'True Explorer',
      description: 'Visit all major locations',
      icon: '🗺️',
      xp: 75,
      condition: () => crystalsCollected >= 4 && treasuresFound >= 3 && portalsTraveled >= 5
    },
    legend: {
      id: 'legend',
      name: 'Living Legend',
      description: 'Complete all major challenges',
      icon: '👑',
      xp: 200,
      condition: () => crystalsCollected >= 8 && questsCompleted >= 5 && treasuresFound >= 5
    }
  };
  
  // Load unlocked achievements from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('vesper_achievements');
    if (saved) {
      try {
        setUnlockedAchievements(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load achievements:', e);
      }
    }
  }, []);
  
  // Check for new achievements
  useEffect(() => {
    Object.values(achievements).forEach(achievement => {
      if (!unlockedAchievements.includes(achievement.id) && achievement.condition()) {
        // Achievement unlocked!
        const newUnlocked = [...unlockedAchievements, achievement.id];
        setUnlockedAchievements(newUnlocked);
        localStorage.setItem('vesper_achievements', JSON.stringify(newUnlocked));
        
        // Add to toast queue
        setToastQueue(prev => [...prev, achievement]);
        
        // Play achievement sound
        try {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          
          // Success fanfare
          const playNote = (freq, time, duration = 0.15) => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            
            osc.frequency.value = freq;
            osc.type = 'square';
            
            gain.gain.value = 0.1;
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + time + duration);
            
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.start(audioContext.currentTime + time);
            osc.stop(audioContext.currentTime + time + duration);
          };
          
          // Achievement fanfare melody
          playNote(523.25, 0, 0.1);    // C5
          playNote(659.25, 0.1, 0.1);  // E5
          playNote(783.99, 0.2, 0.2);  // G5
          playNote(1046.50, 0.4, 0.3); // C6
        } catch (e) {
          console.error('Failed to play sound:', e);
        }
      }
    });
  }, [crystalsCollected, questsCompleted, treasuresFound, portalsTraveled, horsesRidden]);
  
  // Manage toast queue
  useEffect(() => {
    if (!currentToast && toastQueue.length > 0) {
      setCurrentToast(toastQueue[0]);
      setToastQueue(prev => prev.slice(1));
    }
  }, [currentToast, toastQueue]);
  
  const handleCloseToast = () => {
    setCurrentToast(null);
  };
  
  return (
    <>
      {currentToast && (
        <ToastNotification 
          achievement={currentToast} 
          onClose={handleCloseToast}
        />
      )}
      
      <style>{`
        @keyframes slideDown {
          from {
            transform: translate(-50%, -100px);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            transform: translate(-50%, 0) scale(1);
          }
          50% {
            transform: translate(-50%, 0) scale(1.05);
          }
        }
        
        @keyframes bounce {
          0%, 100% {
            transform: scale(1);
          }
          25% {
            transform: scale(1.2) rotate(-10deg);
          }
          75% {
            transform: scale(1.2) rotate(10deg);
          }
        }
      `}</style>
    </>
  );
}
