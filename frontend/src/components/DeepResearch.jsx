import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Stack,
  Typography,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';

/**
 * Deep Research Tool
 * - Multi-source research compilation
 * - Web search integration
 * - Organized results display
 * - Export as markdown/JSON
 */
export default function DeepResearch({ apiBase, onClose }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  const performResearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setResults([]);

    try {
      const response = await fetch(`${apiBase}/api/search-web`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      setResults(data.results || []);
      setTitle(query);

      if (!data.results || data.results.length === 0) {
        setError('No results found for this query');
      }
    } catch (err) {
      setError(`Research error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const exportAsMarkdown = () => {
    if (!results.length) return;

    let markdown = `# Deep Research: ${title}\n\n`;
    markdown += `**Date:** ${new Date().toLocaleDateString()}\n\n`;
    markdown += `**Query:** ${title}\n\n`;
    markdown += `---\n\n`;

    results.forEach((result, idx) => {
      markdown += `## ${idx + 1}. ${result.title || 'Untitled'}\n\n`;
      if (result.snippet) markdown += `${result.snippet}\n\n`;
      if (result.link) markdown += `**Source:** [${result.link}](${result.link})\n\n`;
      markdown += '---\n\n';
    });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown' }));
    link.download = `research-${title.replace(/\s+/g, '-')}.md`;
    link.click();
  };

  const exportAsJSON = () => {
    if (!results.length) return;

    const data = {
      title,
      query,
      timestamp: new Date().toISOString(),
      resultCount: results.length,
      results,
    };

    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    link.download = `research-${title.replace(/\s+/g, '-')}.json`;
    link.click();
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
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--accent)' }}>
          🔬 Deep Research
        </Typography>
        <Tooltip title="Close">
          <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(255,255,255,0.6)' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Search Bar */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <TextField
          fullWidth
          placeholder="What do you want to research?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && performResearch()}
          disabled={loading}
          variant="outlined"
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': {
              color: '#fff',
              '& fieldset': { borderColor: 'rgba(0, 255, 255, 0.3)' },
              '&:hover fieldset': { borderColor: 'rgba(0, 255, 255, 0.5)' },
              '&.Mui-focused fieldset': { borderColor: 'var(--accent)' },
            },
            '& .MuiInputBase-input::placeholder': { color: 'rgba(255, 255, 255, 0.4)', opacity: 1 },
          }}
        />
        <Button
          onClick={performResearch}
          disabled={loading || !query.trim()}
          variant="contained"
          sx={{
            bgcolor: 'var(--accent)',
            color: '#000',
            '&:hover': { bgcolor: 'rgba(0, 255, 255, 0.8)' },
            '&:disabled': { bgcolor: 'rgba(0, 255, 255, 0.3)' },
          }}
        >
          {loading ? <CircularProgress size={20} /> : <SearchIcon fontSize="small" />}
        </Button>
      </Stack>

      {/* Error Message */}
      {error && (
        <Box
          sx={{
            bgcolor: 'rgba(255, 68, 68, 0.15)',
            border: '1px solid rgba(255, 68, 68, 0.3)',
            borderRadius: '8px',
            p: 1.5,
            mb: 2,
            color: '#ff6b6b',
            fontSize: '0.9rem',
          }}
        >
          {error}
        </Box>
      )}

      {/* Results */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          mb: 2,
          pr: 1,
          '&::-webkit-scrollbar': { width: '6px' },
          '&::-webkit-scrollbar-track': { bgcolor: 'rgba(0, 0, 0, 0.3)' },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: 'rgba(0, 255, 255, 0.3)',
            borderRadius: '3px',
            '&:hover': { bgcolor: 'rgba(0, 255, 255, 0.5)' },
          },
        }}
      >
        {results.length > 0 ? (
          <Stack spacing={1.5}>
            {results.map((result, idx) => (
              <Card
                key={idx}
                sx={{
                  bgcolor: 'rgba(0, 255, 255, 0.05)',
                  border: '1px solid rgba(0, 255, 255, 0.15)',
                  borderRadius: '8px',
                  '&:hover': {
                    bgcolor: 'rgba(0, 255, 255, 0.1)',
                    borderColor: 'rgba(0, 255, 255, 0.3)',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                <CardContent sx={{ pb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        color: 'var(--accent)',
                        flex: 1,
                        mb: 0.5,
                      }}
                      component="a"
                      href={result.link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {result.title || 'Result'}
                    </Typography>
                    {result.link && (
                      <Tooltip title="Open in new tab">
                        <IconButton
                          component="a"
                          href={result.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          size="small"
                          sx={{ color: 'rgba(0, 255, 255, 0.5)' }}
                        >
                          <OpenInNewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                  {result.snippet && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        display: 'block',
                        mb: 0.5,
                        lineHeight: 1.4,
                      }}
                    >
                      {result.snippet}
                    </Typography>
                  )}
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'rgba(0, 255, 255, 0.6)',
                      fontSize: '0.75rem',
                      wordBreak: 'break-all',
                    }}
                  >
                    {result.link}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>
        ) : (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'rgba(255, 255, 255, 0.4)',
              fontSize: '0.95rem',
            }}
          >
            {loading ? '🔍 Researching...' : 'Start a search to see results'}
          </Box>
        )}
      </Box>

      {/* Export Buttons */}
      {results.length > 0 && (
        <>
          <Divider sx={{ mb: 1.5, borderColor: 'rgba(0, 255, 255, 0.15)' }} />
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              {results.length} result{results.length !== 1 ? 's' : ''} found
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                onClick={exportAsMarkdown}
                variant="outlined"
                size="small"
                startIcon={<DownloadIcon fontSize="small" />}
                sx={{
                  borderColor: 'var(--accent)',
                  color: 'var(--accent)',
                  '&:hover': { bgcolor: 'rgba(0, 255, 255, 0.1)' },
                }}
              >
                Markdown
              </Button>
              <Button
                onClick={exportAsJSON}
                variant="outlined"
                size="small"
                startIcon={<DownloadIcon fontSize="small" />}
                sx={{
                  borderColor: 'var(--accent)',
                  color: 'var(--accent)',
                  '&:hover': { bgcolor: 'rgba(0, 255, 255, 0.1)' },
                }}
              >
                JSON
              </Button>
            </Stack>
          </Box>
        </>
      )}
    </Paper>
  );
}
