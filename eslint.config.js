// WHAT THIS IS FOR, so nobody later mistakes it for a style opinion.
//
// Three times this codebase shipped a file that parsed perfectly and threw the moment it ran:
//   - a code block was deleted and took `import { SYSTEM, SCHEMA, MODEL }` with it, so every
//     /api/analyze call returned 500
//   - the tab-pause logic was deleted and took `const now = Date.now()` with it, so every timer
//     tick threw and the recording clock froze at 1:00 with the submit button locked
//   - a catch block read `e` without binding it, so a type-mode failure left the person on
//     "reading your accent…" forever with no toast and no way back
//
// All three are the same mistake: a name that nothing declares. `node --check` cannot see any of
// them, because they are scope errors and not syntax errors, and it was the only check being run.
// `no-undef` catches all three in about a second.
//
// STYLE RULES ARE DELIBERATELY ABSENT. This codebase has a voice and long explanatory comments
// that are the point rather than clutter, and a linter that argues about quote marks trains
// everyone to ignore the output that actually matters. Only rules that indicate a real defect.
import js from '@eslint/js';
import globals from 'globals';

const correctness = {
  ...js.configs.recommended.rules,

  // Empty catch is a deliberate idiom here and always carries a comment saying why
  // (`catch { /* private mode */ }`). A comment does not stop no-empty firing, so allow it.
  'no-empty': ['error', { allowEmptyCatch: true }],

  // An unused local is usually the other half of one of the deletions described above: the
  // reference went and the declaration stayed, or vice versa. Worth an error.
  // Caught errors are exempt — `catch (err)` where err goes unread is normal and readable.
  'no-unused-vars': ['error', {
    args: 'after-used',
    caughtErrors: 'none',
    varsIgnorePattern: '^_',
    argsIgnorePattern: '^_',
  }],
};

export default [
  { ignores: ['node_modules/**', 'vendor/**', 'clips/**', 'assets/**', 'data/**'] },

  // Browser code. `window.HT` carries the shared map/theme helpers, `L` is Leaflet and `YT` is the
  // YouTube IFrame API, all three loaded by script tags rather than imported.
  {
    files: ['js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: { ...globals.browser, L: 'readonly', YT: 'readonly' },
    },
    rules: correctness,
  },

  // The service worker has its own globals (self, caches, clients, skipWaiting).
  {
    files: ['sw.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'script',
      globals: globals.serviceworker,
    },
    rules: correctness,
  },

  // Serverless handlers and the dev server run on Node.
  {
    files: ['api/**/*.js', 'dev-server.js', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: globals.node,
    },
    rules: correctness,
  },

  // The measurement tooling is Node too, but it reads the clip manifest by doing
  // `globalThis.window = {}` and then importing js/clips.js, which is written as `window.CLIPS =`
  // for the browser. That assignment creates a real global at runtime that no linter can see, so
  // `window` is declared here rather than the tools being rewritten to satisfy the check.
  {
    files: ['tools/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: { ...globals.node, window: 'writable' },
    },
    rules: correctness,
  },
];
