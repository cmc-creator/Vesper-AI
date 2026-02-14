import React, { useRef, useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Button,
  IconButton,
  Tooltip,
  Stack,
  Slider,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Share as ShareIcon,
  Close as CloseIcon,
  CloudUpload as CloudUploadIcon,
} from '@mui/icons-material';

/**
 * Collaborative Canvas Component
 * - Real-time drawing canvas
 * - Basic shapes (pen, line, rectangle, circle)
 * - Color & size controls
 * - Save/export as image
 * - Share capability
 */
export default function Canvas({ onClose, onShare }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [context, setContext] = useState(null);
  const [brushColor, setBrushColor] = useState('#00ffff');
  const [brushSize, setBrushSize] = useState(2);
  const [tool, setTool] = useState('pen'); // pen, line, rect, circle, eraser
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareTitle, setShareTitle] = useState('My Canvas Artwork');
  const [isSavingToCloud, setIsSavingToCloud] = useState(false);
  const [cloudSaveSuccess, setCloudSaveSuccess] = useState(false);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    setContext(ctx);

    // Load saved canvas if exists
    const savedCanvas = localStorage.getItem('vesper_canvas_state');
    if (savedCanvas) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        saveToHistory();
      };
      img.src = savedCanvas;
    } else {
      saveToHistory();
    }

    // Handle resize
    const handleResize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Save canvas state to history
  const saveToHistory = () => {
    if (!canvasRef.current) return;
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(canvasRef.current.toDataURL());
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
    try {
      localStorage.setItem('vesper_canvas_state', canvasRef.current.toDataURL());
    } catch (e) {
      console.warn('Could not save canvas', e);
    }
  };

  // Undo/Redo
  const undo = () => {
    if (historyStep > 0) {
      const newStep = historyStep - 1;
      setHistoryStep(newStep);
      const img = new Image();
      img.onload = () => {
        context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        context.drawImage(img, 0, 0);
      };
      img.src = history[newStep];
    }
  };

  const redo = () => {
    if (historyStep < history.length - 1) {
      const newStep = historyStep + 1;
      setHistoryStep(newStep);
      const img = new Image();
      img.onload = () => {
        context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        context.drawImage(img, 0, 0);
      };
      img.src = history[newStep];
    }
  };

  const clear = () => {
    if (!context) return;
    context.fillStyle = 'rgba(0, 0, 0, 0.95)';
    context.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    saveToHistory();
  };

  // Mouse events
  const getMousePos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e) => {
    setIsDrawing(true);
    const pos = getMousePos(e);

    if (tool === 'pen' || tool === 'eraser') {
      context.beginPath();
      context.moveTo(pos.x, pos.y);
    } else if (tool === 'line' || tool === 'rect' || tool === 'circle') {
      // Save state before drawing shape (will be overdrawn during drag)
      e.currentTarget.dataset.startX = pos.x;
      e.currentTarget.dataset.startY = pos.y;
      e.currentTarget.dataset.startImage = canvasRef.current.toDataURL();
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;

    const pos = getMousePos(e);
    const canvas = canvasRef.current;

    if (tool === 'pen') {
      context.strokeStyle = brushColor;
      context.lineWidth = brushSize;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.lineTo(pos.x, pos.y);
      context.stroke();
    } else if (tool === 'eraser') {
      context.clearRect(pos.x - brushSize / 2, pos.y - brushSize / 2, brushSize, brushSize);
    } else if (tool === 'line') {
      const img = new Image();
      img.onload = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(img, 0, 0);
        context.strokeStyle = brushColor;
        context.lineWidth = brushSize;
        context.beginPath();
        context.moveTo(canvas.dataset.startX, canvas.dataset.startY);
        context.lineTo(pos.x, pos.y);
        context.stroke();
      };
      img.src = canvas.dataset.startImage;
    } else if (tool === 'rect') {
      const img = new Image();
      img.onload = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(img, 0, 0);
        context.strokeStyle = brushColor;
        context.fillStyle = brushColor.replace('ff', '20'); // Transparency
        context.lineWidth = brushSize;
        const width = pos.x - canvas.dataset.startX;
        const height = pos.y - canvas.dataset.startY;
        context.fillRect(canvas.dataset.startX, canvas.dataset.startY, width, height);
        context.strokeRect(canvas.dataset.startX, canvas.dataset.startY, width, height);
      };
      img.src = canvas.dataset.startImage;
    } else if (tool === 'circle') {
      const img = new Image();
      img.onload = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(img, 0, 0);
        context.strokeStyle = brushColor;
        context.fillStyle = brushColor.replace('ff', '20');
        context.lineWidth = brushSize;
        const radius = Math.sqrt(
          Math.pow(pos.x - canvas.dataset.startX, 2) +
            Math.pow(pos.y - canvas.dataset.startY, 2)
        );
        context.beginPath();
        context.arc(canvas.dataset.startX, canvas.dataset.startY, radius, 0, 2 * Math.PI);
        context.fill();
        context.stroke();
      };
      img.src = canvas.dataset.startImage;
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && (tool === 'pen' || tool === 'eraser')) {
      context.closePath();
    }
    setIsDrawing(false);
    if (tool !== 'pen' && tool !== 'eraser') {
      saveToHistory();
    }
  };

  const handleMouseUpPen = () => {
    if (tool === 'pen' || tool === 'eraser') {
      saveToHistory();
    }
  };

  // Export canvas
  const exportAsImage = () => {
    const link = document.createElement('a');
    link.href = canvasRef.current.toDataURL('image/png');
    link.download = `vesper-canvas-${Date.now()}.png`;
    link.click();
  };

  const exportAsJSON = () => {
    const data = {
      title: shareTitle,
      timestamp: new Date().toISOString(),
      canvas: canvasRef.current.toDataURL(),
    };
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
    link.download = `vesper-canvas-${Date.now()}.json`;
    link.click();
  };

  // Save to Supabase Storage
  const saveToCloud = async () => {
    setIsSavingToCloud(true);
    setCloudSaveSuccess(false);
    try {
      const canvasData = canvasRef.current.toDataURL('image/png');
      const filename = `${shareTitle.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`;
      
      const response = await fetch('https://vesper-backend-production-b486.up.railway.app/api/storage/save-canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canvas_data: canvasData, filename }),
      });
      
      const result = await response.json();
      if (result.success) {
        setCloudSaveSuccess(true);
        alert(`✅ Saved to cloud!\n\nURL: ${result.url}`);
      } else {
        alert(`❌ Save failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Cloud save error:', error);
      alert(`❌ Save failed: ${error.message}`);
    } finally {
      setIsSavingToCloud(false);
    }
  };

  return (
    <Paper
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: 'rgba(0, 0, 0, 0.8)',
        border: '1px solid rgba(0, 255, 255, 0.2)',
        borderRadius: '12px',
        p: 2,
      }}
    >
      {/* Toolbar */}
      <Stack
        direction="row"
        spacing={1}
        sx={{
          mb: 2,
          pb: 1,
          borderBottom: '1px solid rgba(0, 255, 255, 0.1)',
          overflowX: 'auto',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        {/* Tool Selection */}
        <Select
          value={tool}
          onChange={(e) => setTool(e.target.value)}
          variant="standard"
          sx={{
            width: 120,
            color: '#fff',
            '& .MuiSelect-icon': { color: 'var(--accent)' },
          }}
        >
          <MenuItem value="pen">✏️ Pen</MenuItem>
          <MenuItem value="line">📏 Line</MenuItem>
          <MenuItem value="rect">▭ Rectangle</MenuItem>
          <MenuItem value="circle">⭕ Circle</MenuItem>
          <MenuItem value="eraser">🧹 Eraser</MenuItem>
        </Select>

        {/* Color Picker */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <input
            type="color"
            value={brushColor}
            onChange={(e) => setBrushColor(e.target.value)}
            style={{
              width: 40,
              height: 32,
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          />
        </Box>

        {/* Brush Size */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 150 }}>
          <Box sx={{ width: 100 }}>
            <Slider
              value={brushSize}
              onChange={(e, v) => setBrushSize(v)}
              min={1}
              max={20}
              sx={{
                color: 'var(--accent)',
              }}
              size="small"
            />
          </Box>
          <Box sx={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
            {brushSize}px
          </Box>
        </Box>

        {/* Action Buttons */}
        <Stack direction="row" spacing={0.5} sx={{ ml: 'auto' }}>
          <Tooltip title="Undo">
            <IconButton
              onClick={undo}
              disabled={historyStep <= 0}
              size="small"
              sx={{ color: 'var(--accent)' }}
            >
              <UndoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Redo">
            <IconButton
              onClick={redo}
              disabled={historyStep >= history.length - 1}
              size="small"
              sx={{ color: 'var(--accent)' }}
            >
              <RedoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear Canvas">
            <IconButton
              onClick={clear}
              size="small"
              sx={{ color: '#ff6b6b' }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download as PNG">
            <IconButton
              onClick={exportAsImage}
              size="small"
              sx={{ color: 'var(--accent)' }}
            >
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Save to Cloud">
            <IconButton
              onClick={saveToCloud}
              disabled={isSavingToCloud}
              size="small"
              sx={{ 
                color: cloudSaveSuccess ? '#4caf50' : 'var(--accent)',
                opacity: isSavingToCloud ? 0.5 : 1,
              }}
            >
              <CloudUploadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Share Canvas">
            <IconButton
              onClick={() => setShareDialogOpen(true)}
              size="small"
              sx={{ color: 'var(--accent)' }}
            >
              <ShareIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Close Canvas">
            <IconButton
              onClick={onClose}
              size="small"
              sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: '#fff' } }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUpPen}
        style={{
          flex: 1,
          cursor: tool === 'eraser' ? 'grab' : 'crosshair',
          border: '1px solid rgba(0, 255, 255, 0.15)',
          borderRadius: '8px',
          minHeight: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
        }}
      />

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: 'rgba(0, 0, 0, 0.8)', color: '#fff' }}>
          Share Canvas
        </DialogTitle>
        <DialogContent sx={{ bgcolor: 'rgba(0, 0, 0, 0.8)', color: '#fff', py: 2 }}>
          <TextField
            fullWidth
            label="Canvas Title"
            value={shareTitle}
            onChange={(e) => setShareTitle(e.target.value)}
            size="small"
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                '& fieldset': { borderColor: 'rgba(0, 255, 255, 0.3)' },
              },
              '& .MuiInputBase-input::placeholder': { color: 'rgba(255, 255, 255, 0.5)' },
            }}
          />
          <Box sx={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', mb: 2 }}>
            Download canvas and share with others:
          </Box>
        </DialogContent>
        <DialogActions sx={{ bgcolor: 'rgba(0, 0, 0, 0.8)', gap: 1, p: 2 }}>
          <Button onClick={() => setShareDialogOpen(false)} variant="outlined" size="small">
            Cancel
          </Button>
          <Button
            onClick={() => {
              exportAsJSON();
              setShareDialogOpen(false);
            }}
            variant="contained"
            size="small"
            sx={{ bgcolor: 'var(--accent)', color: '#000' }}
          >
            Download JSON
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
