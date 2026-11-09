import globals from 'globals';

export default [
  { ignores: ['coverage/**'] },
  {
    files: ['**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.node } },
    rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }], 'no-undef': 'error' },
  },
];
