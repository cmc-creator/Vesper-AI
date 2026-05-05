import React from 'react';
import { Box, Typography, Stack, Tooltip, IconButton } from '@mui/material';
import { ContentCopyRounded, BoltRounded } from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

/**
 * MessageContent - lazy-loaded markdown renderer.
 * Imported via React.lazy() to keep react-markdown and react-syntax-highlighter
 * out of the main bundle, preventing Rollup TDZ errors from their circular ESM re-exports.
 *
 * Props:
 *   content        {string}   - markdown string to render
 *   onOpenAppBuilder {function(code, lang)} - called when user clicks "Open in App Builder"
 */
export default function MessageContent({ content, onOpenAppBuilder }) {
  return (
    <ReactMarkdown
      components={{
        a: ({ href, children, ...props }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', borderBottom: '1px solid rgba(var(--accent-rgb),0.35)' }} {...props}>{children}</a>
        ),
        h1: ({ children }) => (
          <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', mt: 2, mb: 0.75, borderBottom: '1px solid rgba(255,255,255,0.1)', pb: 0.5 }}>{children}</Typography>
        ),
        h2: ({ children }) => (
          <Typography sx={{ fontSize: '1.08rem', fontWeight: 700, color: 'rgba(255,255,255,0.95)', mt: 1.5, mb: 0.5 }}>{children}</Typography>
        ),
        h3: ({ children }) => (
          <Typography sx={{ fontSize: '0.97rem', fontWeight: 600, color: 'var(--accent)', mt: 1.25, mb: 0.4, letterSpacing: '0.02em' }}>{children}</Typography>
        ),
        blockquote: ({ children }) => (
          <Box sx={{ borderLeft: '3px solid rgba(var(--accent-rgb),0.5)', pl: 1.5, py: 0.25, my: 1, bgcolor: 'rgba(var(--accent-rgb),0.05)', borderRadius: '0 6px 6px 0' }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontStyle: 'italic', fontSize: '0.89rem', lineHeight: 1.65 }}>{children}</Typography>
          </Box>
        ),
        table: ({ children }) => (
          <Box sx={{ overflowX: 'auto', my: 1.5, borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>{children}</table>
          </Box>
        ),
        thead: ({ children }) => <thead style={{ background: 'rgba(var(--accent-rgb),0.1)' }}>{children}</thead>,
        th: ({ children }) => <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--accent)', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>{children}</th>,
        td: ({ children }) => <td style={{ padding: '7px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.82)' }}>{children}</td>,
        li: ({ children }) => (
          <li style={{ marginBottom: '0.3em', lineHeight: 1.65, color: 'rgba(255,255,255,0.85)' }}>{children}</li>
        ),
        p: ({ children }) => (
          <p style={{ margin: '0 0 0.75em 0', lineHeight: 1.72 }}>{children}</p>
        ),
        strong: ({ children }) => <strong style={{ color: '#fff', fontWeight: 700 }}>{children}</strong>,
        em: ({ children }) => <em style={{ color: 'rgba(255,255,255,0.75)' }}>{children}</em>,
        code: ({ inline, className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || '');
          const codeString = String(children).replace(/\n$/, '');
          const copy = async () => {
            try { await navigator.clipboard.writeText(codeString); } catch (e) { console.error(e); }
          };
          const isReact = match && ['js', 'jsx', 'javascript', 'tsx', 'ts', 'react'].includes(match[1]);
          const openInAppBuilder = () => {
            if (onOpenAppBuilder) onOpenAppBuilder(codeString, match ? match[1] : '');
          };

          return !inline && match ? (
            <Box sx={{ position: 'relative', my: 1, borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.09)' }}>
              <Box sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                px: 1.5, py: 0.5,
                bgcolor: 'rgba(0,0,0,0.55)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {match[1]}
                </Typography>
                <Stack direction="row" spacing={0.5}>
                  {isReact && (
                    <Tooltip title="Preview in App Builder">
                      <IconButton size="small" onClick={openInAppBuilder} sx={{ color: 'var(--accent)', p: 0.4, '&:hover': { bgcolor: 'rgba(var(--accent-rgb),0.12)' } }}>
                        <BoltRounded sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Copy">
                    <IconButton size="small" onClick={copy} sx={{ color: 'rgba(255,255,255,0.5)', p: 0.4, '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' } }}>
                      <ContentCopyRounded sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>
              <SyntaxHighlighter
                language={match[1]}
                style={oneDark}
                customStyle={{
                  margin: 0,
                  borderRadius: 0,
                  fontSize: '0.8rem',
                  lineHeight: 1.6,
                  background: 'rgba(10,12,18,0.95)',
                  padding: '14px 16px',
                }}
                wrapLongLines
              >
                {codeString}
              </SyntaxHighlighter>
            </Box>
          ) : (
            <code
              className={className}
              style={{
                background: 'rgba(0, 0, 0, 0.35)',
                padding: '2px 6px',
                borderRadius: '6px',
                fontFamily: 'monospace',
                fontSize: '0.85em',
                color: 'var(--accent)',
              }}
              {...props}
            >
              {children}
            </code>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
