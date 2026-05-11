import type { FullConfig } from '@playwright/test';
import { chromium } from '@playwright/test';
import { OrangehrmAdminApi } from '../src/api/orangehrmOSAPI/OrangehrmAdminApi';
import { env } from '../src/config/env';
import { verifyMasterData, writeMasterDataStatus } from '../src/setup/masterDataVerification';

/** Playwright CLI `--project` / `-p` values (globalSetup receives full config, so we read argv). */
function selectedProjectsFromArgv(): string[] {
  const out: string[] = [];
  const argv = process.argv;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--project' || a === '-p') {
      const next = argv[i + 1];
      if (next && !next.startsWith('-')) {
        out.push(next);
        i++;
      }
    } else if (a.startsWith('--project=')) {
      out.push(a.slice('--project='.length));
    }
  }
  return out;
}

/**
 * Runs before all Playwright projects. Verifies seeded master data markers exist via Admin API.
 *
 * **Skip:** `SKIP_MASTER_DATA_CHECK=1` (local speed runs).
 *
 * **Seed without pre-check:** run with only the master-data project — verification is skipped so empty instances can be seeded:
 * `npx playwright test --project=master-data tests/setup/seed-master-data.spec.ts`
 *
 * Status file: `test-results/master-data-status.json`
 */
export default async function playwrightGlobalSetup(_config: FullConfig): Promise<void> {
  if (process.env.SKIP_MASTER_DATA_CHECK === '1') {
    writeMasterDataStatus({
      ok: true,
      missing: [],
      checkedAt: new Date().toISOString(),
      skipped: true,
    });
    return;
  }

  const cliProjects = selectedProjectsFromArgv();
  const onlyMasterDataSeed =
    cliProjects.length === 1 && cliProjects[0] === 'master-data';

  if (onlyMasterDataSeed) {
    writeMasterDataStatus({
      ok: true,
      missing: [],
      checkedAt: new Date().toISOString(),
      skipped: true,
    });
    return;
  }

  if (!env.baseURL) {
    console.warn('[master-data] BASE_URL not set — skipping master data verification.');
    writeMasterDataStatus({
      ok: true,
      missing: [],
      checkedAt: new Date().toISOString(),
      skipped: true,
    });
    return;
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    baseURL: env.baseURL,
    extraHTTPHeaders: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  try {
    const adminApi = new OrangehrmAdminApi(context.request);
    const status = await verifyMasterData(adminApi);
    writeMasterDataStatus(status);

    if (!status.ok) {
      throw new Error(
        `[master-data] Verification failed against BASE_URL=${env.baseURL}\n` +
          `Missing: ${status.missing.join('; ')}\n\n` +
          `Seed this OrangeHRM instance once (same BASE_URL and admin credentials):\n` +
          `  npm run seed:master-data\n` +
          `  # or: npx playwright test --config automation.config.ts --project=master-data tests/setup/seed-master-data.spec.ts\n\n` +
          `Then re-run tests. To bypass only for local debugging: SKIP_MASTER_DATA_CHECK=1`,
      );
    }
  } finally {
    await browser.close();
  }
}
