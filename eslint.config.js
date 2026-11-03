// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'supabase/*', 'src/lib/database.types.ts'],
  },
  {
    rules: {
      // Packages first, then our own code (@/...), then same-folder files; alphabetical in each.
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
          pathGroups: [{ pattern: '@/**', group: 'internal' }],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      // Screens and features talk to Supabase only through their feature's api.ts.
      'no-restricted-imports': [
        'error',
        { paths: [{ name: '@/lib/supabase', message: 'Use a hook from src/features/*/api.ts instead.' }] },
      ],
    },
  },
  {
    files: ['src/features/**/api.ts', 'src/features/auth/AuthProvider.tsx'],
    rules: { 'no-restricted-imports': 'off' },
  },
]);
