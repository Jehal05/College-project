// ESLint flat config for the patient app (npm run lint -w patient-app). Same rules as hospital-portal/eslint.config.js,
// so the two apps are checked the same way. Recommended rule sets only; nothing is switched off wholesale.
import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  { ignores: ['dist/**', 'dist-*/**', 'node_modules/**', 'public/**'] },
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
    // Unit tests (vitest), browser tests and scripts run in Node; browser tests also run code inside the page
    files: ['src/**/*.test.{js,jsx}', 'tests/**/*.{js,mjs}', 'scripts/**/*.{js,mjs}', '*.config.js'],
    languageOptions: { sourceType: 'module', ecmaVersion: 'latest', globals: { ...globals.node, ...globals.browser } },
  },
];
