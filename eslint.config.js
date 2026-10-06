import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

const UI_LAYERS = ['components', 'pages', 'hooks', 'stores', 'services']

export default defineConfig([
  globalIgnores([
    'dist',
    'dev-dist',
    'coverage',
    'playwright-report',
    'test-results',
    'tools/morph-oracle/.venv',
    'tools/**/.cache',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
  // The grammar engine is the authoritative core: framework-free, and it may
  // only import from grammar/ itself (the lexicon is passed in, not imported).
  {
    files: ['src/grammar/**/*.ts'],
    ignores: ['src/grammar/**/__tests__/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react/*', 'zustand', 'idb-keyval', 'lucide-react'],
              message: 'grammar/ must stay framework-free.',
            },
            {
              group: ['@/*', '!@/grammar/*', ...['data', ...UI_LAYERS].map((l) => `**/${l}/**`)],
              message: 'grammar/ may only import from grammar/.',
            },
          ],
        },
      ],
    },
  },
  // data/ is pure content: it may import types from grammar/ and types/, nothing that runs UI.
  {
    files: ['src/data/**/*.ts'],
    ignores: ['src/data/**/__tests__/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react/*', ...UI_LAYERS.flatMap((l) => [`**/${l}/**`, `@/${l}/*`])],
              message: 'data/ is pure content and must not depend on UI or services.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['tools/**/*.ts', 'tests/e2e/**/*.ts', '*.config.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
])
