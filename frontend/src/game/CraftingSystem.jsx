import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Tabs,
  Tab,
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  LinearProgress,
  Tooltip,
} from '@mui/material';

const RECIPES = {
  weapons: [
    { id: 'iron_sword', name: 'Iron Sword', materials: { Wood: 2, 'Iron Ore': 5 }, result: { name: 'Iron Sword', type: 'weapon', damage: 25 }, emoji: '⚔️' },
    { id: 'steel_sword', name: 'Steel Sword', materials: { Wood: 3, 'Steel Ingot': 8 }, result: { name: 'Steel Sword', type: 'weapon', damage: 50 }, emoji: '🗡️' },
    { id: 'mythril_blade', name: 'Mythril Blade', materials: { 'Ancient Wood': 5, Mythril: 10, 'Magic Crystal': 2 }, result: { name: 'Mythril Blade', type: 'weapon', damage: 100 }, emoji: '⚔️', quality: 'epic' },
  ],
  armor: [
    { id: 'leather_armor', name: 'Leather Armor', materials: { Leather: 10 }, result: { name: 'Leather Armor', type: 'armor', defense: 10 }, emoji: '🥾' },
    { id: 'iron_armor', name: 'Iron Armor', materials: { 'Iron Ore': 15, Leather: 5 }, result: { name: 'Iron Armor', type: 'armor', defense: 25 }, emoji: '🛡️' },
    { id: 'mythril_armor', name: 'Mythril Armor', materials: { Mythril: 20, 'Dragon Scale': 5 }, result: { name: 'Mythril Armor', type: 'armor', defense: 75 }, emoji: '🛡️', quality: 'legendary' },
  ],
  potions: [
    { id: 'health_potion', name: 'Health Potion', materials: { 'Red Herb': 3, Water: 1 }, result: { name: 'Health Potion', type: 'potion', healing: 50 }, emoji: '🧪' },
    { id: 'super_health', name: 'Super Health Potion', materials: { 'Red Herb': 5, 'Magic Crystal': 1, Water: 2 }, result: { name: 'Super Health Potion', type: 'potion', healing: 150 }, emoji: '🧪', quality: 'rare' },
    { id: 'speed_potion', name: 'Speed Potion', materials: { 'Yellow Herb': 2, Feather: 1 }, result: { name: 'Speed Potion', type: 'potion', effect: '2x Speed 60s' }, emoji: '⚡' },
    { id: 'strength_potion', name: 'Strength Potion', materials: { 'Orange Herb': 2, 'Monster Bone': 1 }, result: { name: 'Strength Potion', type: 'potion', effect: '2x Attack 60s' }, emoji: '💪' },
  ],
  tools: [
    { id: 'iron_axe', name: 'Iron Axe', materials: { Wood: 5, 'Iron Ore': 3 }, result: { name: 'Iron Axe', type: 'tool', efficiency: 2 }, emoji: '🪓' },
    { id: 'iron_pickaxe', name: 'Iron Pickaxe', materials: { Wood: 5, 'Iron Ore': 3 }, result: { name: 'Iron Pickaxe', type: 'tool', efficiency: 2 }, emoji: '⛏️' },
    { id: 'torch', name: 'Torch', materials: { Wood: 1, Coal: 1 }, result: { name: 'Torch', type: 'tool' }, emoji: '🔦' },
  ],
  furniture: [
    { id: 'wooden_chair', name: 'Wooden Chair', materials: { Wood: 4 }, result: { name: 'Wooden Chair', type: 'furniture' }, emoji: '🪑' },
    { id: 'wooden_table', name: 'Wooden Table', materials: { Wood: 8 }, result: { name: 'Wooden Table', type: 'furniture' }, emoji: '🪵' },
    { id: 'magical_lamp', name: 'Magical Lamp', materials: { 'Iron Ore': 3, 'Magic Crystal': 2, Glass: 1 }, result: { name: 'Magical Lamp', type: 'furniture', light: true }, emoji: '🏮', quality: 'rare' },
    { id: 'enchanted_bed', name: 'Enchanted Bed', materials: { Wood: 10, Silk: 5, 'Magic Crystal': 1 }, result: { name: 'Enchanted Bed', type: 'furniture', restBonus: true }, emoji: '🛏️', quality: 'epic' },
  ],
  materials: [
    { id: 'steel_ingot', name: 'Steel Ingot', materials: { 'Iron Ore': 3, Coal: 2 }, result: { name: 'Steel Ingot', type: 'material' }, emoji: '🔩' },
    { id: 'glass', name: 'Glass', materials: { Sand: 5, Coal: 1 }, result: { name: 'Glass', type: 'material' }, emoji: '🪟' },
    { id: 'leather', name: 'Leather', materials: { 'Animal Hide': 2 }, result: { name: 'Leather', type: 'material' }, emoji: '🧳' },
  ],
};

const QUALITY_COLORS = {
  common: '#9ca3af',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
};

export default function CraftingSystem({ 
  isOpen, 
  onClose, 
  inventory, 
  onCraft,
  unlockedRecipes = []
}) {
  const [activeTab, setActiveTab] = useState(0);
  const [crafting, setCrafting] = useState(null);
  const [craftProgress, setCraftProgress] = useState(0);
  
  const categories = ['weapons', 'armor', 'potions', 'tools', 'furniture', 'materials'];
  const currentCategory = categories[activeTab];
  const recipes = RECIPES[currentCategory];
  
  // Crafting animation
  useEffect(() => {
    if (crafting) {
      const interval = setInterval(() => {
        setCraftProgress(prev => {
          if (prev >= 100) {
            // Crafting complete!
            clearInterval(interval);
            
            // Play success sound
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            [523, 659, 784, 1046].forEach((freq, i) => {
              const osc = audioContext.createOscillator();
              const gain = audioContext.createGain();
              
              osc.frequency.value = freq;
              gain.gain.value = 0.1;
              gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
              
              osc.connect(gain);
              gain.connect(audioContext.destination);
              osc.start(audioContext.currentTime + i * 0.1);
              osc.stop(audioContext.currentTime + i * 0.1 + 0.3);
            });
            
            // Add to inventory
            if (onCraft) {
              const quality = Math.random();
              let resultQuality = 'common';
              if (quality > 0.95) resultQuality = 'legendary';
              else if (quality > 0.85) resultQuality = 'epic';
              else if (quality > 0.7) resultQuality = 'rare';
              
              onCraft(crafting, resultQuality);
            }
            
            setTimeout(() => {
              setCrafting(null);
              setCraftProgress(0);
            }, 500);
            
            return 100;
          }
          return prev + 2;
        });
      }, 50);
      
      return () => clearInterval(interval);
    }
  }, [crafting]);
  
  const canCraft = (recipe) => {
    if (!unlockedRecipes.includes(recipe.id)) return false;
    
    return Object.entries(recipe.materials).every(([material, needed]) => {
      const inInventory = inventory.filter(item => item && item.name === material).reduce((sum, item) => sum + (item.quantity || 1), 0);
      return inInventory >= needed;
    });
  };
  
  const handleCraft = (recipe) => {
    if (!canCraft(recipe)) {
      alert('Not enough materials!');
      return;
    }
    
    setCrafting(recipe);
    
    // Play crafting start sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.frequency.value = 300;
    gain.gain.value = 0.1;
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + 0.3);
  };
  
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, #1e293b, #0f172a)',
          border: '3px solid #8b4513',
          borderRadius: '16px',
          minHeight: '600px',
        },
      }}
    >
      <DialogTitle sx={{ borderBottom: '2px solid #8b4513', pb: 2 }}>
        <Typography variant="h5" sx={{ color: '#fff', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          ⚒️ Crafting Station
        </Typography>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            '& .MuiTab-root': { color: '#cbd5e1', minWidth: 120 },
            '& .Mui-selected': { color: '#fbbf24 !important' },
          }}
        >
          <Tab label="⚔️ Weapons" />
          <Tab label="🛡️ Armor" />
          <Tab label="🧪 Potions" />
          <Tab label="🔨 Tools" />
          <Tab label="🏠 Furniture" />
          <Tab label="📦 Materials" />
        </Tabs>
        
        <Box sx={{ p: 3 }}>
          <Grid container spacing={2}>
            {recipes.map((recipe) => {
              const unlocked = unlockedRecipes.includes(recipe.id);
              const canMake = canCraft(recipe);
              const quality = recipe.quality || 'common';
              
              return (
                <Grid item xs={12} sm={6} key={recipe.id}>
                  <Card
                    sx={{
                      background: unlocked 
                        ? 'rgba(255, 255, 255, 0.05)' 
                        : 'rgba(0, 0, 0, 0.3)',
                      border: `2px solid ${QUALITY_COLORS[quality]}`,
                      borderRadius: '12px',
                      opacity: unlocked ? 1 : 0.5,
                      transition: 'all 0.3s',
                      '&:hover': unlocked ? { 
                        transform: 'translateY(-4px)',
                        boxShadow: `0 8px 24px ${QUALITY_COLORS[quality]}40`,
                      } : {},
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Typography sx={{ fontSize: '32px' }}>{recipe.emoji}</Typography>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 'bold' }}>
                            {unlocked ? recipe.name : '🔒 Locked'}
                          </Typography>
                          {quality !== 'common' && (
                            <Chip
                              label={quality.toUpperCase()}
                              size="small"
                              sx={{
                                background: QUALITY_COLORS[quality],
                                color: '#fff',
                                fontWeight: 'bold',
                                fontSize: '10px',
                              }}
                            />
                          )}
                        </Box>
                      </Box>
                      
                      {unlocked && (
                        <>
                          <Typography variant="caption" sx={{ color: '#cbd5e1', display: 'block', mb: 1 }}>
                            Materials Required:
                          </Typography>
                          
                          <Box sx={{ mb: 2 }}>
                            {Object.entries(recipe.materials).map(([material, needed]) => {
                              const inInventory = inventory.filter(item => item && item.name === material).reduce((sum, item) => sum + (item.quantity || 1), 0);
                              const hasEnough = inInventory >= needed;
                              
                              return (
                                <Chip
                                  key={material}
                                  label={`${material} ${inInventory}/${needed}`}
                                  size="small"
                                  sx={{
                                    m: 0.5,
                                    background: hasEnough ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                    color: hasEnough ? '#10b981' : '#ef4444',
                                    border: `1px solid ${hasEnough ? '#10b981' : '#ef4444'}`,
                                  }}
                                />
                              );
                            })}
                          </Box>
                          
                          <Tooltip title={!canMake ? 'Missing materials!' : 'Craft item'}>
                            <span>
                              <Button
                                variant="contained"
                                fullWidth
                                disabled={!canMake || !!crafting}
                                onClick={() => handleCraft(recipe)}
                                sx={{
                                  background: canMake 
                                    ? 'linear-gradient(90deg, #fbbf24, #f59e0b)' 
                                    : 'rgba(255, 255, 255, 0.1)',
                                  color: canMake ? '#000' : '#666',
                                  fontWeight: 'bold',
                                  '&:hover': canMake ? {
                                    background: 'linear-gradient(90deg, #f59e0b, #d97706)',
                                  } : {},
                                }}
                              >
                                {crafting?.id === recipe.id ? '⏳ Crafting...' : '⚒️ Craft'}
                              </Button>
                            </span>
                          </Tooltip>
                        </>
                      )}
                      
                      {!unlocked && (
                        <Typography variant="caption" sx={{ color: '#cbd5e1', fontStyle: 'italic' }}>
                          Unlock by exploring, quests, or finding recipe scrolls!
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      </DialogContent>
      
      {/* Crafting Progress Overlay */}
      {crafting && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <Typography variant="h4" sx={{ color: '#fff', mb: 2 }}>
            {crafting.emoji}
          </Typography>
          <Typography variant="h6" sx={{ color: '#fbbf24', mb: 3 }}>
            Crafting {crafting.name}...
          </Typography>
          <Box sx={{ width: '60%', mb: 1 }}>
            <LinearProgress
              variant="determinate"
              value={craftProgress}
              sx={{
                height: 12,
                borderRadius: 6,
                background: 'rgba(255, 255, 255, 0.1)',
                '& .MuiLinearProgress-bar': {
                  background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
                },
              }}
            />
          </Box>
          <Typography variant="caption" sx={{ color: '#cbd5e1' }}>
            {Math.floor(craftProgress)}%
          </Typography>
        </Box>
      )}
    </Dialog>
  );
}

export { RECIPES };
