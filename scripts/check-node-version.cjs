'use strict';

var major = parseInt(process.version.replace(/^v/, '').split('.')[0], 10);

if (major < 18) {
  console.error(
    'Playwright requires Node.js 18 or newer (nullish coalescing and other syntax).',
  );
  console.error('Current:', process.version);
  console.error('Fix: install Node 20 LTS, run `nvm use` (see .nvmrc), then restart the IDE from that shell.');
  process.exit(1);
}
