import React, { useState } from 'react';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { ContentCopy, Check } from '@mui/icons-material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const CodeBlock = ({ code, language = 'javascript' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <Box className="code-block-container">
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 2,
          py: 1,
          background: 'rgba(0, 0, 0, 0.3)',
          borderBottom: '1px solid rgba(0, 255, 255, 0.2)',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: '#00ffff',
            fontFamily: 'monospace',
            fontWeight: 600,
            textTransform: 'uppercase',
            fontSize: '11px',
          }}
        >
          {language}
        </Typography>
        <Tooltip title={copied ? 'Copied!' : 'Copy code'}>
          <IconButton
            size="small"
            onClick={handleCopy}
            sx={{
              color: copied ? '#00ff00' : '#00ffff',
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'rgba(0, 255, 255, 0.1)',
              },
            }}
          >
            {copied ? <Check fontSize="small" /> : <ContentCopy fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>

      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          borderRadius: '0 0 12px 12px',
          background: 'rgba(0, 0, 0, 0.5)',
          fontSize: '14px',
          padding: '16px',
        }}
        showLineNumbers
      >
        {code}
      </SyntaxHighlighter>
    </Box>
  );
};

export default CodeBlock;
