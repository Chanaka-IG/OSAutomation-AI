import * as fs from 'fs';
import * as path from 'path';
import { createLogger } from '../lib/logger';

const log = createLogger('runSeedGuard');

/**
 * Run-scoped seed guard.
 *
 * `test.beforeAll` is **worker**-scoped, not run-scoped: when a test fails, Playwright discards
 * the whole worker process and starts a fresh one for the remaining tests
 * (https://playwright.dev/docs/test-parallel#worker-processes). The new worker re-runs every
 * `beforeAll` in the file, so suite setup fires again in the middle of a run.
 *
 * Wrapping the setup in {@link seedOncePerRun} pins it to the run instead of the worker: the first
 * worker seeds and writes a marker under `test-results/seed-guards/`, and any worker started later
 * (after a failure, or in parallel) sees the marker and continues straight to the next test.
 *
 * Markers are cleared once per run by `scripts/playwright-global-setup.ts` via {@link resetSeedGuards}.
 */

const GUARD_DIR_RELATIVE = path.join('test-results', 'seed-guards');

type GuardState = {
  key: string;
  status: 'seeding' | 'done';
  pid: number;
  updatedAt: string;
};

function guardDir(): string {
  return path.join(process.cwd(), GUARD_DIR_RELATIVE);
}

/** Keys become file names, so keep them filesystem-safe. */
function guardFile(key: string): string {
  return path.join(guardDir(), `${key.replace(/[^a-zA-Z0-9._-]/g, '_')}.json`);
}

function serialize(key: string, status: GuardState['status']): string {
  const state: GuardState = {
    key,
    status,
    pid: process.pid,
    updatedAt: new Date().toISOString(),
  };
  return `${JSON.stringify(state, null, 2)}\n`;
}

function readGuard(filePath: string): GuardState | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as GuardState;
  } catch {
    return null;
  }
}

/** Drops every marker so the next run seeds from scratch. Called from `globalSetup`. */
export function resetSeedGuards(): void {
  fs.rmSync(guardDir(), { recursive: true, force: true });
}

/**
 * Runs `seed` at most once per test run, across worker restarts and parallel workers.
 *
 * @returns `true` when this call performed the seeding, `false` when it was already done.
 * @throws when `seed` throws (the claim is released so a later worker can retry), or when another
 *         worker's seeding fails or exceeds `options.timeout`.
 */
export async function seedOncePerRun(
  key: string,
  seed: () => Promise<void>,
  options: { timeout?: number; pollInterval?: number } = {},
): Promise<boolean> {
  const { timeout = 180_000, pollInterval = 500 } = options;
  const filePath = guardFile(key);

  fs.mkdirSync(guardDir(), { recursive: true });

  /** `wx` fails if the marker exists — an atomic claim, so two workers never seed at once. */
  let claimed = false;
  try {
    fs.writeFileSync(filePath, serialize(key, 'seeding'), { flag: 'wx' });
    claimed = true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
  }

  if (!claimed) {
    if (readGuard(filePath)?.status === 'done') {
      log.info(`Seed "${key}" already completed in this run — skipping.`);
      return false;
    }
    await waitForSeed(filePath, key, timeout, pollInterval);
    return false;
  }

  log.info(`Seeding "${key}" for this run...`);
  try {
    await seed();
  } catch (error) {
    fs.rmSync(filePath, { force: true });
    throw error;
  }

  fs.writeFileSync(filePath, serialize(key, 'done'));
  log.info(`Seed "${key}" completed.`);
  return true;
}

async function waitForSeed(
  filePath: string,
  key: string,
  timeout: number,
  pollInterval: number,
): Promise<void> {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    if (readGuard(filePath)?.status === 'done') return;
    /** The claim is removed when seeding throws — fail fast instead of polling a dead marker. */
    if (!fs.existsSync(filePath)) {
      throw new Error(`Seed "${key}" failed in another worker — see that worker's error above.`);
    }
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error(`Timed out after ${timeout}ms waiting for seed "${key}" to finish in another worker.`);
}
