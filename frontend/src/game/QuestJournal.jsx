import React, { useState, useEffect } from 'react';
import {
  Box,
  Dialog,
  Typography,
  IconButton,
  Paper,
  LinearProgress,
  Chip,
  Divider,
  Tabs,
  Tab,
} from '@mui/material';
import { Close, MenuBook, CheckCircle, RadioButtonUnchecked, Star } from '@mui/icons-material';

const QUEST_DATA = {
  main: [
    {
      id: 'main_1',
      title: '💜 Meeting Vesper',
      description: 'Talk to Vesper near her castle to begin your adventure.',
      objectives: [
        { text: 'Find Vesper near the castle', completed: false },
        { text: 'Have a conversation with her', completed: false },
      ],
      reward: { xp: 100, item: 'Crystal of Friendship' },
      unlocks: 'main_2',
    },
    {
      id: 'main_2',
      title: '✨ The Crystal Quest',
      description: 'Vesper needs 8 magical crystals scattered across the world.',
      objectives: [
        { text: 'Collect 8 magical crystals (0/8)', completed: false, progress: 0, max: 8 },
      ],
      reward: { xp: 500, item: 'Vesper\'s Blessing' },
      unlocks: 'main_3',
      locked: true,
    },
    {
      id: 'main_3',
      title: '🏰 Secrets of the Castle',
      description: 'Explore the mysteries hidden within Vesper\'s ancient castle.',
      objectives: [
        { text: 'Enter Vesper\'s Castle', completed: false },
        { text: 'Discover the hidden chamber', completed: false },
        { text: 'Read the ancient tome', completed: false },
      ],
      reward: { xp: 750, item: 'Ancient Knowledge' },
      unlocks: 'main_4',
      locked: true,
    },
    {
      id: 'main_4',
      title: '🌙 The Shadow Threat',
      description: 'Strange shadows have appeared at night. Investigate their source.',
      objectives: [
        { text: 'Survive until midnight', completed: false },
        { text: 'Defeat 5 shadow creatures (0/5)', completed: false, progress: 0, max: 5 },
        { text: 'Find the Shadow Core', completed: false },
      ],
      reward: { xp: 1000, item: 'Shadowbane Amulet' },
      unlocks: 'main_5',
      locked: true,
    },
    {
      id: 'main_5',
      title: '👑 The True Heir',
      description: 'Vesper reveals a shocking truth about her past and your destiny.',
      objectives: [
        { text: 'Return to Vesper with the Shadow Core', completed: false },
        { text: 'Learn the truth of your connection', completed: false },
        { text: 'Make your choice', completed: false },
      ],
      reward: { xp: 2000, item: 'Crown of Destiny' },
      locked: true,
    },
  ],
  side: [
    {
      id: 'side_1',
      title: '🐴 The Unicorn\'s Gift',
      description: 'Find and ride the legendary unicorn.',
      objectives: [
        { text: 'Locate the unicorn at [35, 35]', completed: false },
        { text: 'Mount the unicorn', completed: false },
        { text: 'Fly to the highest peak', completed: false },
      ],
      reward: { xp: 300, item: 'Unicorn Feather' },
    },
    {
      id: 'side_2',
      title: '🎁 Treasure Hunter',
      description: 'Open all treasure chests scattered throughout the land.',
      objectives: [
        { text: 'Open all 8 treasure chests (0/8)', completed: false, progress: 0, max: 8 },
      ],
      reward: { xp: 400, item: 'Treasure Master Badge' },
    },
    {
      id: 'side_3',
      title: '🌀 Portal Master',
      description: 'Travel through all teleportation portals.',
      objectives: [
        { text: 'Use all 5 portals (0/5)', completed: false, progress: 0, max: 5 },
      ],
      reward: { xp: 250, item: 'Portal Stone' },
    },
    {
      id: 'side_4',
      title: '🏡 Home Sweet Home',
      description: 'Build and customize your dream home.',
      objectives: [
        { text: 'Choose your home type', completed: false },
        { text: 'Customize with 5+ decorations', completed: false },
        { text: 'Invite Vesper to visit', completed: false },
      ],
      reward: { xp: 500, item: 'Home Builder Trophy' },
    },
    {
      id: 'side_5',
      title: '🦋 Nature Lover',
      description: 'Discover all wildlife species.',
      objectives: [
        { text: 'Spot 10 different butterfly colors', completed: false },
        { text: 'Observe all 8 bird species', completed: false },
        { text: 'Encounter 15 fish types', completed: false },
      ],
      reward: { xp: 350, item: 'Nature\'s Friend Badge' },
    },
  ],
};

function QuestCard({ quest, onSelect, selected }) {
  const allCompleted = quest.objectives.every(obj => obj.completed);
  const progress = quest.objectives.filter(obj => obj.completed).length;
  const total = quest.objectives.length;
  const progressPercent = (progress / total) * 100;

  return (
    <Paper
      elevation={selected ? 8 : 2}
      sx={{
        p: 2,
        mb: 2,
        background: quest.locked
          ? 'rgba(100, 100, 100, 0.2)'
          : selected
          ? 'linear-gradient(135deg, rgba(167, 139, 250, 0.3), rgba(139, 92, 246, 0.3))'
          : 'rgba(0, 0, 0, 0.3)',
        border: selected ? '2px solid #a78bfa' : '1px solid rgba(255, 255, 255, 0.1)',
        cursor: quest.locked ? 'not-allowed' : 'pointer',
        opacity: quest.locked ? 0.5 : 1,
        transition: 'all 0.3s',
        '&:hover': {
          transform: quest.locked ? 'none' : 'translateY(-2px)',
          boxShadow: quest.locked ? 'none' : '0 4px 20px rgba(167, 139, 250, 0.4)',
        },
      }}
      onClick={() => !quest.locked && onSelect(quest)}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 'bold' }}>
          {quest.title}
        </Typography>
        {allCompleted && <CheckCircle sx={{ color: '#10b981', fontSize: 24 }} />}
        {quest.locked && <Typography sx={{ color: '#f59e0b', fontSize: '20px' }}>🔒</Typography>}
      </Box>

      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
        {quest.description}
      </Typography>

      <Box sx={{ mb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" sx={{ color: '#a78bfa' }}>
            Progress
          </Typography>
          <Typography variant="caption" sx={{ color: '#fff' }}>
            {progress} / {total}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progressPercent}
          sx={{
            height: 6,
            borderRadius: 3,
            background: 'rgba(255, 255, 255, 0.1)',
            '& .MuiLinearProgress-bar': {
              background: 'linear-gradient(90deg, #a78bfa, #8b5cf6)',
            },
          }}
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
        <Chip
          icon={<Star />}
          label={`${quest.reward.xp} XP`}
          size="small"
          sx={{
            background: 'rgba(255, 215, 0, 0.2)',
            color: '#ffd700',
            border: '1px solid #ffd700',
          }}
        />
        <Chip
          label={quest.reward.item}
          size="small"
          sx={{
            background: 'rgba(167, 139, 250, 0.2)',
            color: '#a78bfa',
            border: '1px solid #a78bfa',
          }}
        />
      </Box>
    </Paper>
  );
}

export default function QuestJournal({ isOpen, onClose, questProgress, playerStats }) {
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedQuest, setSelectedQuest] = useState(null);

  const getQuestsWithProgress = (questList) => {
    return questList.map(quest => {
      const progress = questProgress?.[quest.id] || {};
      return {
        ...quest,
        objectives: quest.objectives.map((obj, i) => ({
          ...obj,
          completed: progress.objectives?.[i] || false,
          progress: progress.objectives?.[i]?.progress || obj.progress || 0,
        })),
        locked: quest.locked && !questProgress?.[quest.unlocks],
      };
    });
  };

  const mainQuests = getQuestsWithProgress(QUEST_DATA.main);
  const sideQuests = getQuestsWithProgress(QUEST_DATA.side);

  const activeQuests = selectedTab === 0 ? mainQuests : sideQuests;
  const completedCount = activeQuests.filter(q => 
    q.objectives.every(obj => obj.completed)
  ).length;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, rgba(30, 20, 50, 0.98), rgba(50, 40, 70, 0.98))',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          border: '2px solid rgba(167, 139, 250, 0.3)',
          boxShadow: '0 0 60px rgba(167, 139, 250, 0.4)',
          maxHeight: '90vh',
        }
      }}
    >
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MenuBook sx={{ color: '#a78bfa', fontSize: 36 }} />
            <Typography variant="h4" sx={{ color: '#fff', fontWeight: 'bold' }}>
              Quest Journal
            </Typography>
          </Box>
          <IconButton onClick={onClose} sx={{ color: '#fff' }}>
            <Close />
          </IconButton>
        </Box>

        {/* Tabs */}
        <Tabs
          value={selectedTab}
          onChange={(e, newValue) => setSelectedTab(newValue)}
          sx={{
            mb: 3,
            '& .MuiTab-root': {
              color: 'rgba(255, 255, 255, 0.6)',
              '&.Mui-selected': { color: '#a78bfa' },
            },
            '& .MuiTabs-indicator': { background: '#a78bfa' },
          }}
        >
          <Tab label={`Main Story (${completedCount}/${mainQuests.length})`} />
          <Tab label={`Side Quests (${completedCount}/${sideQuests.length})`} />
        </Tabs>

        {/* Quest Grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 3, maxHeight: '60vh', overflow: 'auto' }}>
          {/* Quest List */}
          <Box>
            {activeQuests.map(quest => (
              <QuestCard
                key={quest.id}
                quest={quest}
                selected={selectedQuest?.id === quest.id}
                onSelect={setSelectedQuest}
              />
            ))}
          </Box>

          {/* Quest Details */}
          <Box>
            {selectedQuest ? (
              <Paper
                elevation={4}
                sx={{
                  p: 3,
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(167, 139, 250, 0.3)',
                  borderRadius: '16px',
                }}
              >
                <Typography variant="h5" sx={{ color: '#fff', fontWeight: 'bold', mb: 2 }}>
                  {selectedQuest.title}
                </Typography>

                <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 3 }}>
                  {selectedQuest.description}
                </Typography>

                <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

                <Typography variant="h6" sx={{ color: '#a78bfa', mb: 2 }}>
                  Objectives:
                </Typography>

                {selectedQuest.objectives.map((obj, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    {obj.completed ? (
                      <CheckCircle sx={{ color: '#10b981', fontSize: 20 }} />
                    ) : (
                      <RadioButtonUnchecked sx={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: 20 }} />
                    )}
                    <Typography
                      sx={{
                        color: obj.completed ? 'rgba(255, 255, 255, 0.5)' : '#fff',
                        textDecoration: obj.completed ? 'line-through' : 'none',
                      }}
                    >
                      {obj.text}
                    </Typography>
                  </Box>
                ))}

                <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

                <Typography variant="h6" sx={{ color: '#ffd700', mb: 2 }}>
                  Rewards:
                </Typography>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Chip
                    icon={<Star />}
                    label={`${selectedQuest.reward.xp} XP`}
                    sx={{
                      background: 'rgba(255, 215, 0, 0.2)',
                      color: '#ffd700',
                      border: '1px solid #ffd700',
                      fontSize: '14px',
                    }}
                  />
                  <Chip
                    label={selectedQuest.reward.item}
                    sx={{
                      background: 'rgba(167, 139, 250, 0.2)',
                      color: '#a78bfa',
                      border: '1px solid #a78bfa',
                      fontSize: '14px',
                    }}
                  />
                </Box>
              </Paper>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: 'rgba(255, 255, 255, 0.3)',
                }}
              >
                <Typography variant="h6">
                  Select a quest to view details
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
}
