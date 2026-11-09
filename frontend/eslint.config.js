import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';

export default [
  { ignores: ['dist/**'] },
  { files: ['**/*.{ts,tsx}'], languageOptions: { parser: tsParser, parserOptions: { ecmaFeatures: { jsx: true } }, globals: globals.browser }, plugins: { react: reactPlugin }, rules: { 'no-unused-vars': 'off' } },
];
