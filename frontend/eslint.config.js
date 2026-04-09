import js from '@eslint/js'
import globals from 'globals'
import reactPlugin from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist', 'dev-dist', 'node_modules', 'src/game/Game-full.jsx'] },
  // Service Worker — needs its own globals scope
  {
    files: ['public/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.serviceworker,
        ...globals.browser,
      },
    },
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        ...globals.browser,
        ...globals.es2021,
        process: 'readonly',
      },
    },
    settings: { react: { version: 'detect' } },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // ── React / JSX ──────────────────────────────────────────────────────
      'react/prop-types': 'off',
      'react/display-name': 'off',
      // R3F (React Three Fiber) uses custom JSX props that are not standard HTML attrs
      'react/no-unknown-property': 'off',
      // Apostrophes in JSX text — cosmetic, not a bug
      'react/no-unescaped-entities': 'off',

      // ── React Compiler rules (react-hooks v5+) ───────────────────────────
      // These are too strict for an existing codebase not written for the React Compiler
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/preserve-manual-memoization': 'off',

      // ── General JS ───────────────────────────────────────────────────────
      'no-console': 'off',
      // Empty catch blocks are common — warn only when no comment is present
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-unused-vars': ['warn', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
    },
  },
]
