  ---
  name: automation-framework
  description: OrangeHRM OS Playwright framework architecture — structure, fixtures, page objects, API services, test data
  strategy.
  user-invocable: false
  ---


# OrangeHRM OS Playwright Automation Framework

A Playwright + TypeScript framework for UI and API testing of the OrangeHRM OpenSource instance. Uses a Page Object Model, fixture-driven dependency injection, domain API services, and a two-tier test data strategy.

---

## Project Structure

```
OSAutomationAI/
├── automation.config.ts          # Playwright config (intentionally not "playwright.config.ts")
├── index.js                      # CLI entry point: seeds master data
├── scripts/
│   └── playwright-global-setup.ts  # Runs before all tests; verifies/auto-seeds master data
├── src/
│   ├── config/env.ts             # Env vars with defaults (BASE_URL, credentials, LOG_LEVEL)
│   ├── lib/logger.ts             # Scoped structured logger
│   ├── fixtures/index.ts         # Custom Playwright fixtures (pages, APIs, masterDataReadiness)
│   ├── pages/
│   │   ├── BasePage.ts           # Abstract base: goto(), waitForSuccessToast(), loginAs()
│   │   ├── auth/LoginPage.ts
│   │   └── pim/
│   │       ├── EmployeeListPage.ts
│   │       ├── AddEmployeePage.ts
│   │       ├── PersonalDetailsPage.ts
│   │       └── PimModulePage.ts
│   ├── api/
│   │   ├── BaseApiService.ts     # Abstract base: get/post/put/patch/delete
│   │   └── orangehrmOSAPI/
│   │       ├── OrangehrmAdminApi.ts   # Session management + loginAsAdmin()
│   │       ├── EmployeesApi.ts
│   │       ├── JobTitlesApi.ts
│   │       └── ... (one class per domain)
│   └── setup/
│       ├── masterDataVerification.ts  # Verifies seed markers; writes master-data-status.json
│       ├── masterData/index.ts        # Orchestrates all domain seed functions
│       └── frontendTesting/           # Seeds test-owned UI test data per suite
├── tests/
│   ├── setup/seed-master-data.spec.ts
│   ├── pim/
│   │   ├── login.spec.ts
│   │   ├── employee-list.spec.ts
│   │   ├── add-employee.spec.ts
│   │   └── employee-details-personal-details.spec.ts
│   └── api/pim-employees.spec.ts
└── test-data/
    ├── api/           # Master data seeds (stable, shared)
    ├── frontend/      # UI routes, URL patterns, role credentials, file fixtures
    └── frontend-api/  # Test-owned records (seeded per suite, cleaned in afterAll)
```

---

## Running Tests

```bash
npm install                         # Install dependencies

npm run test                        # Full suite
npm run test:headed                 # Visible browser
npm run test:ui                     # Playwright UI mode (interactive)

npm run seed                        # Seed master data (also runs automatically on first test)
npm run seed:master-data            # Explicit master-data project seed

# Run a single spec
npx playwright test tests/pim/employee-list.spec.ts --config automation.config.ts

# Skip master data verification for speed
SKIP_MASTER_DATA_CHECK=1 npm run test

# Debug mode
PWDEBUG=1 npm run test
```

---

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `BASE_URL` | `https://automationtest-os-kord.orangehrm.com` | OrangeHRM instance origin |
| `ADMIN_USERNAME` / `OHRM_USERNAME` | `admin` | Admin login |
| `ADMIN_PASSWORD` / `OHRM_PASSWORD` | `admin@OHRM123` | Admin login |
| `OHRM_ESS_USERNAME` | (empty) | ESS role (optional) |
| `OHRM_ESS_PASSWORD` | (empty) | ESS role (optional) |
| `OHRM_SUPERVISOR_USERNAME` | (empty) | Supervisor role (optional) |
| `OHRM_SUPERVISOR_PASSWORD` | (empty) | Supervisor role (optional) |
| `LOG_LEVEL` | `info` | `silent \| error \| warn \| info \| debug` |
| `SKIP_MASTER_DATA_CHECK` | (unset) | Set to `1` to skip verification |
| `CI` | (unset) | Set to `1` to enable `forbidOnly` and retries |

---

## Playwright Projects

Defined in `automation.config.ts`:

| Project | Test match | Purpose |
|---|---|---|
| `chromium` | `tests/**` excluding `api/**` and `setup/**` | UI browser tests |
| `api` | `tests/api/**/*.spec.ts` | API-only tests (no browser) |
| `master-data` | `tests/setup/**/*.spec.ts` | Standalone seed run |

Config intentionally named `automation.config.ts` (not `playwright.config.ts`) to prevent IDE Playwright extension from auto-activating on an incompatible Node version.

---

## Fixture System

Import `test` and `expect` from fixtures, not from `@playwright/test` directly:

```typescript
import { test, expect } from '../../src/fixtures'
```

### Worker-Scoped Fixtures

| Fixture | Type | Description |
|---|---|---|
| `masterDataReadiness` | `MasterDataStatus` | Cached master data verification result |

---

## Page Object Pattern

All page objects extend `BasePage`:

```typescript
import { BasePage } from '../BasePage'
import { Page, Locator } from '@playwright/test'

export class MyModulePage extends BasePage {
  readonly someInput: Locator
  readonly saveButton: Locator

  constructor(page: Page) {
    super(page)
    this.someInput = page.getByLabel('Some Field')
    this.saveButton = page.getByRole('button', { name: 'Save' })
  }

  async gotoMyPage(): Promise<void> {
    await this.goto('/web/index.php/mymodule/route')
  }

  async fillAndSave(value: string): Promise<void> {
    await this.someInput.fill(value)
    await this.saveButton.click()
    await this.waitForSuccessToast()
  }
}
```

### BasePage API

```typescript
await this.goto(urlOrPath)               // Navigate; prepends baseURL for relative paths
await this.waitForSuccessToast()         // Waits for .oxd-toast--success, returns its text
await this.loginAs('admin')              // Logs in using configured credentials for the role
this.locator(selector)                   // Thin wrapper around page.locator()
```

### Rules
- **No assertions inside page objects.** All `expect()` calls belong in tests.
- Expose business-level methods (`fillName()`, `runSearch()`), not raw locator chains.
- Declare all locators as `readonly` properties in the constructor.

---

## API Service Pattern

All API services extend `BaseApiService`:

```typescript
import { BaseApiService } from '../BaseApiService'
import { APIRequestContext } from '@playwright/test'
import { createLogger } from '../../lib/logger'

const logger = createLogger('MyDomainApi')

export class MyDomainApi extends BaseApiService {
  constructor(request: APIRequestContext) {
    super(request)
  }

  async create(payload: MyDomainSeed): Promise<void> {
    const res = await this.post('/api/v2/my-domain', { data: payload })
    if (!res.ok()) {
      const body = await res.text()
      throw new Error(`create failed [${res.status()}]: ${body.slice(0, 200)}`)
    }
    logger.info('created', { payload })
  }

  async createIfAbsent(payload: MyDomainSeed): Promise<void> {
    // Check if it already exists, skip if so
    const existing = await this.getAll()
    const exists = existing.some(r => r.name === payload.name)
    if (exists) {
      logger.debug('already exists, skipping', { name: payload.name })
      return
    }
    await this.create(payload)
  }
}
```

### BaseApiService Methods

```typescript
this.get(url, options?)      // GET request
this.post(url, options?)     // POST request
this.put(url, options?)      // PUT request
this.patch(url, options?)    // PATCH request
this.delete(url, options?)   // DELETE request
```

### Session Management

`OrangehrmAdminApi` handles CSRF token extraction and cookie-based auth:

```typescript
await orangehrmAdminApi.loginAsAdmin()
// Now orangehrmAdminApi.request carries the session cookie
const employeesApi = new EmployeesApi(orangehrmAdminApi.request)
await employeesApi.create(payload)
```

---

## Test Data Architecture

### Two-Tier Strategy

**Tier 1 — Master Data** (`test-data/api/`): Stable shared records seeded once per environment. Verified by global setup; auto-seeded if missing. Tests reference these by name/ID but do not own them.

**Tier 2 — Frontend Test Data** (`test-data/frontend-api/`): Test-suite-owned records. Seeded in `beforeAll`, cleaned up in `afterAll`. Deterministic and isolated.

### Adding Master Data Records

```typescript
// test-data/api/jobTitles.ts
export const jobTitles = {
  seedRecords: [
    { title: 'New Role', description: '' },
  ] as const satisfies readonly JobTitleSeed[],
}
```

Then add the seed call in `src/setup/masterData/jobTitles.ts` and register it in `src/setup/masterData/index.ts`.

### Adding Frontend Test Data

```typescript
// test-data/frontend-api/pim/employees.ts
export const filterTestRecords = [
  { employeeId: '061004', firstName: 'New', lastName: 'Employee', middleName: '' },
] as const
```

Seed in `beforeAll` using `ensureEmployeeRecords(orangehrmAdminApi, records)`.

---

## Writing Tests

### Test File Template

```typescript
import { test, expect } from '../../src/fixtures'
import { env } from '../../src/config/env'
import { pim } from '../../test-data/frontend'
import { ensurePimFilterEmployees } from '../../src/setup/frontendTesting/ensurePimFilterEmployees'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test.describe('TC-MODULE-FEATURE — Short description', () => {
  test.beforeEach(async () => {
    test.skip(!env.baseURL, 'Set BASE_URL to run this suite')
  })

  test.beforeAll(async ({ orangehrmAdminApi, masterDataReadiness }) => {
    void masterDataReadiness  // assert master data is ready
    await ensurePimFilterEmployees(orangehrmAdminApi)
  })

  test.beforeEach(async ({ loginPage, myPage }) => {
    await loginPage.loginAs('admin')
    await myPage.gotoMyPage()
  })

  test('TC-MODULE-FEATURE-001 — Happy path', async ({ myPage, page }) => {
    await myPage.doAction('value')
    await expect(page).toHaveURL(/expected-url-pattern/i)
  })

  test('TC-MODULE-FEATURE-E01 — Validation error', async ({ myPage }) => {
    await myPage.saveButton.click()
    await expect(myPage.allValidationErrors.first()).toBeVisible()
  })
})
```

### Test Naming Convention

```
TC-{MODULE}-{FEATURE}-{NNN}   → Normal/happy-path cases
TC-{MODULE}-{FEATURE}-N{NN}   → Navigation cases
TC-{MODULE}-{FEATURE}-E{NN}   → Edge/error cases
```

### Cleanup Pattern

```typescript
const createdEmpNumbers: number[] = []

test.afterAll(async ({ orangehrmAdminApi }) => {
  if (createdEmpNumbers.length === 0) return
  await orangehrmAdminApi.loginAsAdmin()
  const empApi = new EmployeesApi(orangehrmAdminApi.request)
  await empApi.deleteEmployees(createdEmpNumbers)
})
```

---

## OXD Component Interaction Patterns

OrangeHRM uses the OXD design system. These selectors are reliable:

### Custom Dropdowns

```typescript
await page.locator('.oxd-select-wrapper').click()
await page.locator('.oxd-select-dropdown').getByText('Option Text', { exact: true }).click()
```

### Date Inputs

```typescript
await page.locator('input[placeholder="yyyy-mm-dd"]').fill('2025-12-31')
await page.locator('input[placeholder="yyyy-mm-dd"]').press('Tab')  // trigger validation
```

### Radio Buttons

```typescript
await page.locator('.oxd-radio-wrapper').filter({ hasText: 'Male' }).click()
```

### Validation Errors

```typescript
await expect(page.locator('.oxd-input-field-error-message').first()).toBeVisible()
const errorCount = await page.locator('.oxd-input-field-error-message').count()
```

### Toast Notifications

```typescript
// Race the toast before it auto-dismisses or the page redirects
const toastPromise = page.locator('.oxd-toast--success').innerText()
await triggerAction()
const text = await toastPromise
expect(text).toMatch(/successfully/i)
```

### Form Loader

```typescript
await page.locator('.oxd-form-loader').waitFor({ state: 'hidden', timeout: 10_000 })
```

### Table Rows

```typescript
const rows = page.locator('.oxd-table-card')
const matchingRow = rows.filter({ hasText: 'Employee Name' })
await expect(matchingRow).toHaveCount(1)
```

---

## Logging

```typescript
import { createLogger } from '../../lib/logger'

const logger = createLogger('MyModule')

logger.debug('verbose detail', { someData })
logger.info('action completed', { id })
logger.warn('unexpected but recoverable', { reason })
logger.error('failed', { error: e.message })
```

Controlled by `LOG_LEVEL` env var: `silent | error | warn | info | debug`

---

## Adding a New Page Object

1. Create `src/pages/{module}/MyNewPage.ts` extending `BasePage`
2. Add it to `src/fixtures/index.ts`:
   ```typescript
   myNewPage: async ({ page }, use) => {
     await use(new MyNewPage(page))
   }
   ```
3. Declare the fixture type in the `MyFixtures` interface in the same file

## Adding a New API Service

1. Create `src/api/orangehrmOSAPI/MyDomainApi.ts` extending `BaseApiService`
2. If it needs to be accessible in tests, add it as a fixture in `src/fixtures/index.ts`
3. For seeding, call it from `src/setup/masterData/` and register in `src/setup/masterData/index.ts`

## Adding a New Test Module

1. Create `tests/{module}/{feature}.spec.ts`
2. Add test data in `test-data/frontend/{module}.ts` (routes, URL patterns, samples)
3. Add frontend-api test records in `test-data/frontend-api/{module}/` if the suite owns its data
4. Add a setup function in `src/setup/frontendTesting/` if the module needs per-suite seeding

---

## Key Architectural Decisions

- **`automation.config.ts`** not `playwright.config.ts` — prevents IDE extension auto-activation on old Node
- **Sequential execution** (`fullyParallel: false`, `workers: 1`) — avoids shared UI state flakiness
- **Global setup auto-seeds** — tests never fail due to missing master data on first run
- **`createIfAbsent` / idempotent patterns** — setup functions are safe to re-run
- **Test data separation** — master data is shared and stable; frontend-api data is owned and cleaned per suite
- **No assertions in page objects** — keeps POM focused on interaction, tests focused on assertions
- **`void masterDataReadiness`** in `beforeAll` — triggers the worker-scoped fixture to confirm readiness
