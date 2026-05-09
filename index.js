#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

const playwrightBin = path.join(__dirname, 'node_modules', '.bin', 'playwright');
const result = spawnSync(
  playwrightBin,
  ['test', 'tests/setup/seed-master-data.spec.ts', '--project=master-data'],
  { stdio: 'inherit', cwd: __dirname, env: process.env },
);

process.exit(result.status === null ? 1 : result.status);
