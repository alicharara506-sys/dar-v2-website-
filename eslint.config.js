import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['**/*', '!src/', '!server/', '!tools/', '!tests/', '!vite.config.js', '!eslint.config.js', '!src/production.js', '!src/build-stages.js', '!src/content.js', '!src/inquiry-form.js', '!src/render-page.js', '!server/**', '!tools/**', '!tests/**'] },
  {
    files: ['**/*.js', '**/*.mjs'],
    ...js.configs.recommended,
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: { ...js.configs.recommended.rules, 'no-control-regex': 'off' },
  },
];
