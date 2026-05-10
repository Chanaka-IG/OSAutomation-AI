'use strict';

var parts = process.version.replace(/^v/, '').split('.');
var major = parseInt(parts[0], 10);

// Playwright 1.59+ ships modern JS (e.g. ?? in playwright-core). Old Node fails with
// "SyntaxError: Unexpected token ?" when the IDE test server loads playwright.
if (major < 18) {
  console.error(
    'Playwright requires Node.js 18 or newer. Your Node is too old to parse Playwright’s bundled code.',
  );
  console.error('Current:', process.version);
  console.error(
    'Fix: install Node 20 LTS, run `nvm use` / `fnm use` (see .nvmrc), verify `node -v` and `which node`.',
  );
  console.error(
    'Cursor/VS Code Playwright extension resolves `node` before Playwright env vars — fix your default Node (e.g. `nvm alias default 20`), then fully quit and reopen Cursor.',
  );
  process.exit(1);
}
