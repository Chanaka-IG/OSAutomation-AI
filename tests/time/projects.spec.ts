import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { auth } from '../../test-data/auth';
import { frontend } from '../../test-data';
import { TimeProjectsApi } from '../../src/api/orangehrmOSAPI/TimeProjectsApi';

/**
 * E2E coverage for Time → Project Info → Projects — P0 + P1 (13 scenarios, one test each).
 * Source: docs/test-priority_Attendance -> Projects.md
 *   P0: TC-001, TC-002, TC-004, TC-200, TC-201
 *   P1: TC-003, TC-005, TC-100, TC-101, TC-303, TC-007, TC-504, TC-501
 *
 * Data: a project requires a customer. One customer is seeded via API in beforeAll; list/manage tests seed a
 * fresh unique project per test. All created projects + customers are hard-deleted in afterAll. Assertions
 * key off unique names / relative counts (the instance carries unrelated leftover data).
 *
 * Run:
 *   npx playwright test tests/time/projects.spec.ts --config automation.config.ts --project=chromium
 */

test.describe.configure({ timeout: 120_000 });

const projectsData = frontend.projects;
const ESS_TEST_USER = auth.essTestUser;

// ── Suite-level state ────────────────────────────────────────────────────────
let customerName: string;
let customerId: number;
const createdProjectNames: string[] = [];
const createdCustomerNames: string[] = [];
let seq = 0;
const uniqueProjectName = () => `${projectsData.samples.namePrefix} ${Date.now()}-${seq++}`;

test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL to run this suite.');
});

test.beforeAll(async ({ orangehrmAdminApi }) => {
  await orangehrmAdminApi.loginAsAdmin();
  const api = new TimeProjectsApi(orangehrmAdminApi.request);
  customerName = `${projectsData.samples.customerPrefix} ${Date.now()}`;
  customerId = await api.ensureCustomer(customerName);
  createdCustomerNames.push(customerName);
});

test.afterAll(async ({ orangehrmAdminApi }) => {
  await orangehrmAdminApi.loginAsAdmin();
  const api = new TimeProjectsApi(orangehrmAdminApi.request);
  await api.deleteProjectsByNames([...new Set(createdProjectNames)]);
  const customers = await api.getCustomers();
  const ids = customers.filter((c) => createdCustomerNames.includes(c.name)).map((c) => c.id);
  await api.deleteCustomers(ids);
});

// ─── Create / validate on the Add form (admin) ──────────────────────────────
test.describe('Projects — create (admin)', () => {
  test.beforeEach(async ({ loginPage, projectsPage }) => {
    await loginPage.loginAs('admin');
    await projectsPage.gotoAddForm();
  });

  test('TC-TIME-PRJ-001 — Add a project with a name and an existing customer', async ({
    projectsPage,
    page,
  }) => {
    const name = uniqueProjectName();
    await projectsPage.fillName(name);
    await projectsPage.selectCustomer(customerName);
    await projectsPage.saveAndVerifyToast();
    createdProjectNames.push(name);

    await expect(page).toHaveURL(projectsData.urlPatterns.edit);

    await projectsPage.gotoList();
    await expect(projectsPage.rowByName(name)).toBeVisible();
    await expect(projectsPage.rowByName(name)).toContainText(customerName);
  });

  test('TC-TIME-PRJ-005 — Add a customer inline via the modal auto-selects it', async ({
    projectsPage,
  }) => {
    const inlineCustomer = `${projectsData.samples.customerPrefix} Inline ${Date.now()}`;
    await projectsPage.addCustomerInline(inlineCustomer);
    createdCustomerNames.push(inlineCustomer);

    await expect(projectsPage.customerInput).toHaveValue(inlineCustomer);
  });

  test('TC-TIME-PRJ-100 — Name is required', async ({ projectsPage }) => {
    await projectsPage.selectCustomer(customerName);
    await projectsPage.saveButton.click();

    await expect(projectsPage.nameError).toHaveText(projectsData.messages.required);
  });

  test('TC-TIME-PRJ-101 — Customer is required', async ({ projectsPage }) => {
    await projectsPage.fillName(uniqueProjectName());
    await projectsPage.saveButton.click();

    await expect(projectsPage.customerError).toHaveText(projectsData.messages.required);
  });

  test('TC-TIME-PRJ-504 — Saving a valid project shows the success toast', async ({ projectsPage }) => {
    const name = uniqueProjectName();
    await projectsPage.fillName(name);
    await projectsPage.selectCustomer(customerName);
    await projectsPage.saveButton.click();
    await projectsPage.verifySuccessToastForSave();
    createdProjectNames.push(name);
  });
});

// ─── List & manage (admin) — a fresh project is seeded per test ─────────────
test.describe('Projects — list & manage (admin)', () => {
  let projectName: string;

  test.beforeEach(async ({ loginPage, projectsPage, orangehrmAdminApi }) => {
    await orangehrmAdminApi.loginAsAdmin();
    projectName = uniqueProjectName();
    await new TimeProjectsApi(orangehrmAdminApi.request).createProject({ name: projectName, customerId });
    createdProjectNames.push(projectName);

    await loginPage.loginAs('admin');
    await projectsPage.gotoList();
  });

  test('TC-TIME-PRJ-002 — List shows the project with its customer', async ({ projectsPage }) => {
    const row = projectsPage.rowByName(projectName);
    await expect(row).toBeVisible();
    await expect(row).toContainText(customerName);
  });

  test('TC-TIME-PRJ-501 — "(N) Records Found" is shown and non-zero', async ({ projectsPage }) => {
    await expect(projectsPage.recordsFoundText.first()).toBeVisible();
    expect(await projectsPage.recordsFoundCount()).toBeGreaterThanOrEqual(1);
  });

  test('TC-TIME-PRJ-003 — Edit a project (rename) persists', async ({ projectsPage }) => {
    const newName = uniqueProjectName();
    await projectsPage.editProjectByName(projectName);
    await projectsPage.fillName(newName);
    await projectsPage.saveAndVerifyToast();
    createdProjectNames.push(newName);

    await projectsPage.gotoList();
    await expect(projectsPage.rowByName(newName)).toBeVisible();
  });

  test('TC-TIME-PRJ-004 — Delete a project via trash + confirm', async ({ projectsPage }) => {
    await expect(projectsPage.rowByName(projectName)).toBeVisible();
    await projectsPage.deleteProjectByName(projectName);

    await expect(projectsPage.rowByName(projectName)).toHaveCount(0);
  });

  test('TC-TIME-PRJ-007 — Search the list by project name', async ({ projectsPage }) => {
    await projectsPage.searchByProject(projectName);
    await expect(projectsPage.rowByName(projectName)).toBeVisible();
  });

  test('TC-TIME-PRJ-303 — Duplicate project name is rejected', async ({ projectsPage }) => {
    await projectsPage.gotoAddForm();
    await projectsPage.fillName(projectName); // already exists (seeded in beforeEach)
    await projectsPage.selectCustomer(customerName);
    await projectsPage.saveButton.click();

    await expect(projectsPage.nameError).toHaveText(projectsData.messages.alreadyExists);
  });
});

// ─── Access control ─────────────────────────────────────────────────────────
test.describe('Projects — access control', () => {
  test('TC-TIME-PRJ-200 — ESS user cannot access Projects', async ({ loginPage, projectsPage }) => {
    await loginPage.loginWithCredentials(ESS_TEST_USER.username, ESS_TEST_USER.password);
    await projectsPage.gotoList();

    await expect(projectsPage.credentialRequired).toBeVisible();
    await expect(projectsPage.addButton).toHaveCount(0);
    await expect(projectsPage.tableRows).toHaveCount(0);
  });

  test('TC-TIME-PRJ-201 — Unauthenticated access redirects to login', async ({ projectsPage, page }) => {
    await page.context().clearCookies();
    await projectsPage.gotoList();

    await expect(page).toHaveURL(projectsData.urlPatterns.login);
  });
});
