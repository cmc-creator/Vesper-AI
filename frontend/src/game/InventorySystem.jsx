import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Dialog, 
  Typography, 
  IconButton, 
  Tooltip,
  Paper,
  Grid,
  Chip
} from '@mui/material';
import { Close, Backpack, Star } from '@mui/icons-material';

const ITEM_RARITIES = {
  common: { color: '#9ca3af', label: 'Common' },
  uncommon: { color: '#10b981', label: 'Uncommon' },
  rare: { color: '#3b82f6', label: 'Rare' },
  epic: { color: '#a855f7', label: 'Epic' },
  legendary: { color: '#f59e0b', label: 'Legendary' },
};

const ITEM_TYPES = {
  weapon: '⚔️',
  potion: '🧪',
  material: '📦',
  treasure: '💎',
  food: '🍎',
  tool: '🔨',
  quest: '📜',
  pet: '🐾',
};

function InventorySlot({ item, index, onDragStart, onDrop, onUse, onDragOver, isDragging }) {
  const handleDragStart = (e) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    onDragStart(index);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
    onDrop(fromIndex, index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  if (!item) {
    return (
      <Box
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        sx={{
          width: 70,
          height: 70,
          border: '2px dashed rgba(255, 255, 255, 0.2)',
          borderRadius: '8px',
          background: 'rgba(0, 0, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
          '&:hover': {
            background: 'rgba(255, 255, 255, 0.05)',
            borderColor: 'rgba(255, 255, 255, 0.4)',
          },
        }}
      >
        <Typography sx={{ color: 'rgba(255, 255, 255, 0.2)', fontSize: '12px' }}>
          {index + 1}
        </Typography>
      </Box>
    );
  }

  const rarity = ITEM_RARITIES[item.rarity] || ITEM_RARITIES.common;

  return (
    <Tooltip
      title={
        <Box>
          <Typography variant="subtitle2" sx={{ color: rarity.color, fontWeight: 'bold' }}>
            {item.name}
          </Typography>
          <Typography variant="caption" sx={{ color: '#fff' }}>
            {item.description}
          </Typography>
          {item.stackable && item.quantity > 1 && (
            <Typography variant="caption" sx={{ color: '#ffd700', display: 'block' }}>
              Quantity: {item.quantity}
            </Typography>
          )}
        </Box>
      }
      arrow
    >
      <Box
        draggable
        onDragStart={handleDragStart}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => onUse(item, index)}
        sx={{
          width: 70,
          height: 70,
          border: `2px solid ${rarity.color}`,
          borderRadius: '8px',
          background: `linear-gradient(135deg, ${rarity.color}20, rgba(0, 0, 0, 0.5))`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'grab',
          position: 'relative',
          opacity: isDragging ? 0.5 : 1,
          transition: 'all 0.2s',
          '&:hover': {
            transform: 'scale(1.05)',
            boxShadow: `0 0 20px ${rarity.color}80`,
          },
          '&:active': {
            cursor: 'grabbing',
          },
        }}
      >
        <Typography sx={{ fontSize: '28px' }}>
          {ITEM_TYPES[item.type] || '📦'}
        </Typography>
        {item.stackable && item.quantity > 1 && (
          <Typography
            sx={{
              position: 'absolute',
              bottom: 2,
              right: 4,
              fontSize: '11px',
              fontWeight: 'bold',
              color: '#fff',
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
            }}
          >
            {item.quantity}
          </Typography>
        )}
      </Box>
    </Tooltip>
  );
}

export default function InventorySystem({ isOpen, onClose, inventory, onUpdateInventory, onUseItem }) {
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [weight, setWeight] = useState(0);
  const maxWeight = 100;

  useEffect(() => {
    const totalWeight = inventory.reduce((sum, item) => {
      if (!item) return sum;
      const itemWeight = item.weight || 1;
      const quantity = item.quantity || 1;
      return sum + (itemWeight * quantity);
    }, 0);
    setWeight(totalWeight);
  }, [inventory]);

  const handleDragStart = (index) => {
    setDraggingIndex(index);
  };

  const handleDrop = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;

    const newInventory = [...inventory];
    const temp = newInventory[fromIndex];
    newInventory[fromIndex] = newInventory[toIndex];
    newInventory[toIndex] = temp;

    onUpdateInventory(newInventory);
    setDraggingIndex(null);

    // Play swap sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.frequency.value = 400;
    osc.frequency.exponentialRampToValueAtTime(500, audioContext.currentTime + 0.1);
    gain.gain.value = 0.1;
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + 0.1);
  };

  const handleUseItem = (item, index) => {
    if (onUseItem) {
      onUseItem(item, index);
    }

    // Play use sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.frequency.value = 600;
    osc.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.2);
    gain.gain.value = 0.15;
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + 0.2);
  };

  const weightPercentage = (weight / maxWeight) * 100;
  const weightColor = weightPercentage > 90 ? '#ef4444' : weightPercentage > 70 ? '#f59e0b' : '#10b981';

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, rgba(20, 20, 30, 0.98), rgba(40, 40, 60, 0.98))',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          border: '2px solid rgba(100, 100, 255, 0.3)',
          boxShadow: '0 0 60px rgba(100, 100, 255, 0.4)',
        }
      }}
    >
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Backpack sx={{ color: '#ffd700', fontSize: 32 }} />
            <Typography variant="h4" sx={{ color: '#fff', fontWeight: 'bold' }}>
              Inventory
            </Typography>
          </Box>
          <IconButton onClick={onClose} sx={{ color: '#fff' }}>
            <Close />
          </IconButton>
        </Box>

        {/* Weight Bar */}
        <Paper
          elevation={3}
          sx={{
            background: 'rgba(0, 0, 0, 0.4)',
            borderRadius: '12px',
            p: 2,
            mb: 3,
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2" sx={{ color: '#fff' }}>
              Weight: {weight.toFixed(1)} / {maxWeight}
            </Typography>
            <Typography variant="caption" sx={{ color: weightColor }}>
              {weightPercentage.toFixed(0)}%
            </Typography>
          </Box>
          <Box
            sx={{
              width: '100%',
              height: '8px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                width: `${weightPercentage}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${weightColor}, ${weightColor}dd)`,
                transition: 'all 0.3s ease',
              }}
            />
          </Box>
        </Paper>

        {/* Inventory Grid */}
        <Grid container spacing={1.5}>
          {Array.from({ length: 20 }).map((_, index) => (
            <Grid item xs={2.4} key={index}>
              <InventorySlot
                item={inventory[index]}
                index={index}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
                onUse={handleUseItem}
                isDragging={draggingIndex === index}
              />
            </Grid>
          ))}
        </Grid>

        {/* Instructions */}
        <Typography
          variant="caption"
          sx={{
            color: 'rgba(255, 255, 255, 0.5)',
            display: 'block',
            textAlign: 'center',
            mt: 3,
          }}
        >
          💡 Drag items to rearrange • Click to use • Hover for details
        </Typography>
      </Box>
    </Dialog>
  );
}
