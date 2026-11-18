import globals from 'globals';

const rules = {
  'no-undef': 'error',
  'no-unreachable': 'error',
  'no-constant-condition': ['error', {checkLoops: false}],
  'no-dupe-args': 'error',
  'no-dupe-keys': 'error',
  'no-duplicate-case': 'error',
  'valid-typeof': 'error',
  'constructor-super': 'error',
  'no-unsafe-finally': 'error',
};
export default [
  {ignores: ['**/node_modules/**', 'web/dist/**', 'vendor/**', 'test-results/**', 'playwright-report/**', '.vscode/**']},
  {files: ['**/*.{js,jsx,mjs}'], languageOptions: {ecmaVersion: 'latest', sourceType: 'module', parserOptions: {ecmaFeatures: {jsx: true}}, globals: {...globals.node, ...globals.browser}}, rules},
];
