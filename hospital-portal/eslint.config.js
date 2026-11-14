// ESLint flat config (npm run lint). Rules are the recommended sets; nothing is switched off wholesale.
import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  { ignores: ['dist/**', 'node_modules/**', 'playwright-report/**', 'test-results/**', 'docs/demo/**'] },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { react, 'react-hooks': reactHooks },
    settings: { react: { version: '18.3' } },
    rules: {
      // JSX: components used only in markup count as used; common mistakes are errors
      'react/jsx-uses-vars': 'error',
      'react/jsx-no-undef': 'error',
      'react/jsx-key': 'error',
      'react/jsx-no-target-blank': 'error',
      'react/no-unescaped-entities': 'error',
      // Hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Unused names are errors, except a leading underscore (deliberately unused)
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
  {
    // Tests run in Node (node:test) and the e2e/config files run in Node too
    files: ['src/**/*.test.js', 'e2e/**/*.js', 'scripts/**/*.{js,mjs}', '*.config.js'],
    // e2e callbacks given to page.evaluate() run in the browser, so they may use browser globals too
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
];
