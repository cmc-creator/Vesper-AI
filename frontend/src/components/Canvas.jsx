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
  Tabs,
  Tab,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Share as ShareIcon,
  Close as CloseIcon,
  CloudUpload as CloudUploadIcon,
  Code as CodeIcon,
  Brush as BrushIcon,
} from '@mui/icons-material';
import { Sandpack } from "@codesandbox/sandpack-react";
import { monokaiPro } from "@codesandbox/sandpack-themes";

/**
 * Collaborative Canvas Component
 * - Real-time drawing canvas (Tab 1)
 * - Live App Builder (Tab 2)
 */
export default function Canvas({ onClose, onShare, initialCode, initialTab = 0 }) {
  const [tab, setTab] = useState(initialTab); // 0 = Canvas, 1 = App Builder
  
  // Canvas State ...
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

  // App Builder State
  const [appCode, setAppCode] = useState(initialCode || `import React from "react";

export default function App() {
  return (
    <div style={{ 
      color: "#00ffff", 
      background: "#0a0a1a", 
      height: "100vh", 
      padding: "20px",
      fontFamily: "Inter, sans-serif" 
    }}>
      <h1>Hello from Vesper</h1>
      <p>I can build apps for you here!</p>
      <button style={{
        padding: "10px 20px",
        background: "rgba(0, 255, 255, 0.2)",
        border: "1px solid #00ffff",
        color: "#fff",
        borderRadius: "5px",
        cursor: "pointer"
      }}>
        Click Me
      </button>
    </div>
  );
}`);

  // Initialize canvas
  useEffect(() => {
    if (tab !== 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const ctx = canvas.getContext('2d');
    
    // Only clear if new context (first load)
    if (!context) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setContext(ctx);

      // Load saved canvas if exists
      const savedCanvas = localStorage.getItem('vesper_canvas_state');
      if (savedCanvas) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          // Don't call saveToHistory here to avoid dependency loops, 
          // just let the user's first action trigger history or save it once manually
        };
        img.src = savedCanvas;
      }
    } else {
        // If we already have a context, we might be switching back tabs
        // Restore from current history state if available
        if (history.length > 0 && historyStep >= 0) {
             const img = new Image();
             img.onload = () => {
                ctx.drawImage(img, 0, 0);
             };
             img.src = history[historyStep];
        }
    }

    const handleResize = () => {
       const saved = canvas.toDataURL();
       canvas.width = canvas.offsetWidth;
       canvas.height = canvas.offsetHeight;
       const img = new Image();
       img.onload = () => ctx.drawImage(img, 0, 0);
       img.src = saved;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [tab]);

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
      elevation={24}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: 'rgba(0, 0, 0, 0.95)',
        border: '1px solid rgba(0, 255, 255, 0.2)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    >
      {/* Tabs Header */}
      <Box sx={{ borderBottom: 1, borderColor: 'rgba(255,255,255,0.1)', px: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'rgba(0,0,0,0.5)' }}>
        <Tabs 
            value={tab} 
            onChange={(e, v) => setTab(v)}
            sx={{
                minHeight: 48,
                '& .MuiTab-root': { color: 'rgba(255,255,255,0.6)', minHeight: 48, textTransform: 'none', fontSize: '0.95rem' },
                '& .Mui-selected': { color: 'var(--accent)' },
                '& .MuiTabs-indicator': { backgroundColor: 'var(--accent)' },
            }}
        >
            <Tab icon={<BrushIcon fontSize="small"/>} iconPosition="start" label="Drawing" />
            <Tab icon={<CodeIcon fontSize="small"/>} iconPosition="start" label="App Builder" />
        </Tabs>
        <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#fff' } }}>
            <CloseIcon />
        </IconButton>
      </Box>

      {/* Tab 0: Canvas Drawing */}
      {tab === 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, p: 2, height: '100%', overflow: 'hidden' }}>
            <Stack
                direction="row"
                spacing={1}
                sx={{
                mb: 1,
                pb: 1,
                borderBottom: '1px solid rgba(0, 255, 255, 0.1)',
                overflowX: 'auto',
                flexWrap: 'wrap',
                gap: 1,
                alignItems: 'center'
                }}
            >
                <Select
                value={tool}
                onChange={(e) => setTool(e.target.value)}
                variant="standard"
                sx={{
                    width: 110,
                    color: '#fff',
                    '& .MuiSelect-icon': { color: 'var(--accent)' },
                    fontSize: '0.9rem'
                }}
                >
                <MenuItem value="pen">✏️ Pen</MenuItem>
                <MenuItem value="line">📏 Line</MenuItem>
                <MenuItem value="rect">▭ Rect</MenuItem>
                <MenuItem value="circle">⭕ Circle</MenuItem>
                <MenuItem value="eraser">🧹 Eraser</MenuItem>
                </Select>

                <input
                    type="color"
                    value={brushColor}
                    onChange={(e) => setBrushColor(e.target.value)}
                    style={{ width: 36, height: 28, border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: 'transparent' }}
                />

                <Box sx={{ width: 80, mx: 1 }}>
                    <Slider
                    value={brushSize}
                    onChange={(e, v) => setBrushSize(v)}
                    min={1}
                    max={20}
                    sx={{ color: 'var(--accent)', p: 0 }}
                    size="small"
                    />
                </Box>

                <Box sx={{ flex: 1 }} />

                <Tooltip title="Undo"><IconButton onClick={undo} disabled={historyStep <= 0} size="small" sx={{ color: 'var(--accent)' }}><UndoIcon fontSize="small"/></IconButton></Tooltip>
                <Tooltip title="Redo"><IconButton onClick={redo} disabled={historyStep >= history.length - 1} size="small" sx={{ color: 'var(--accent)' }}><RedoIcon fontSize="small"/></IconButton></Tooltip>
                <Tooltip title="Clear"><IconButton onClick={clear} size="small" sx={{ color: '#ff6b6b' }}><DeleteIcon fontSize="small"/></IconButton></Tooltip>
                <Tooltip title="Download"><IconButton onClick={exportAsImage} size="small" sx={{ color: 'var(--accent)' }}><DownloadIcon fontSize="small"/></IconButton></Tooltip>
                <Tooltip title="Save Cloud"><IconButton onClick={saveToCloud} disabled={isSavingToCloud} size="small" sx={{ color: cloudSaveSuccess ? '#4caf50' : 'var(--accent)' }}><CloudUploadIcon fontSize="small"/></IconButton></Tooltip>
                <Tooltip title="Share"><IconButton onClick={() => setShareDialogOpen(true)} size="small" sx={{ color: 'var(--accent)' }}><ShareIcon fontSize="small"/></IconButton></Tooltip>
            </Stack>

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
                touchAction: 'none'
                }}
            />
        </Box>
      )}

      {/* Tab 1: Sandpack App Builder */}
      {tab === 1 && (
        <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', bgcolor: '#1e1e1e' }}>
            <Sandpack 
                template="react"
                theme={monokaiPro}
                files={{
                    "/App.js": appCode,
                    "/styles.css": {
                        code: `body { 
  margin: 0; 
  padding: 0; 
  background: #121212; 
  color: #fff; 
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
.container { padding: 20px; }
button { cursor: pointer; }`,
                        active: false 
                    }
                }}
                options={{
                    showNavigator: true,
                    showTabs: true,
                    showLineNumbers: true,
                    wrapContent: true,
                    editorHeight: "100%", // Valid string
                    classes: {
                        "sp-layout": "custom-sandpack-layout",
                    }
                }}
                customSetup={{
                    dependencies: {
                        "react-bootstrap": "latest",
                        "bootstrap": "latest",
                        "framer-motion": "latest",
                        "lucide-react": "latest",
                        "recharts": "latest",
                        "@mui/material": "latest",
                        "@mui/icons-material": "latest",
                        "@emotion/react": "latest",
                        "@emotion/styled": "latest"
                    }
                }}
            />
            <style>{`
                .custom-sandpack-layout {
                    height: 100% !important;
                    display: flex !important;
                    flex-direction: row !important; /* Force side-by-side */
                }
                .sp-preview-container {
                     min-height: 100% !important;
                }
            `}</style>
        </Box>
      )}

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: 'rgba(0, 0, 0, 0.9)', color: '#fff' }}>
          Share Canvas
        </DialogTitle>
        <DialogContent sx={{ bgcolor: 'rgba(0, 0, 0, 0.9)', color: '#fff', py: 2 }}>
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
              '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
            }}
          />
          <Box sx={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', mb: 2 }}>
            Download canvas as generic JSON data.
          </Box>
        </DialogContent>
        <DialogActions sx={{ bgcolor: 'rgba(0, 0, 0, 0.9)', gap: 1, p: 2 }}>
          <Button onClick={() => setShareDialogOpen(false)} variant="outlined" size="small" sx={{color: '#fff', borderColor: 'rgba(255,255,255,0.3)'}}>
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
