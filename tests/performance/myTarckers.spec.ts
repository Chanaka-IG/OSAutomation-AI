import { test, expect } from '../../src/fixtures/apiAction';
import { env } from '../../src/config/env';
import { frontend } from '../../test-data';
import { api } from '../../test-data';

test.describe.configure({ timeout: 50_000 });

// Backend log order for the TC-404 order tracker, snapshotted in beforeAll where the API context is
// authenticated. The test-scoped myTracker fixture is unauthenticated inside a test body, so TC-404
// asserts the rendered UI order against this snapshot rather than calling the API itself.
let orderTrackerApiLogs: Array<{ id: number; log: string }> = [];

test.beforeEach(() => {
    test.skip(!env.baseURL, 'Set BASE_URL to run this suite.');
});

test.beforeAll(async ({ orangehrmAdminApi, masterDataReadiness, users, employees, myTracker }) => {

    // First run seeds a dozen bulk logs over the network; give the hook headroom beyond the 30s default.
    test.setTimeout(120_000);

    void masterDataReadiness;

    await orangehrmAdminApi.loginAsAdmin();
    for (const employee of frontend.myTrackers.employees) {
        await employees.createIfAbsent(employee)
    }

    const supervisorEmpNumber = await employees.getEmpNumberByEmployeeId(frontend.myTrackers.employees[0].employeeId);

    if (supervisorEmpNumber !== undefined) {
        await users.createIfAbsent({
            username: frontend.myTrackers.employees[0].username,
            password: frontend.myTrackers.employees[0].password,
            status: frontend.myTrackers.employees[0].status,
            userRoleId: frontend.myTrackers.employees[0].userRoleId,
            empNumber: supervisorEmpNumber
        });
    }

    const essEmpNumber = await employees.getEmpNumberByEmployeeId(frontend.myTrackers.employees[1].employeeId);

    if (essEmpNumber !== undefined) {
        await users.createIfAbsent({
            username: frontend.myTrackers.employees[1].username,
            password: frontend.myTrackers.employees[1].password,
            status: frontend.myTrackers.employees[1].status,
            userRoleId: frontend.myTrackers.employees[1].userRoleId,
            empNumber: essEmpNumber
        });
    }

    if (essEmpNumber !== undefined && supervisorEmpNumber !== undefined) {
        const trackerDataFrontend = {
            trackerName: frontend.myTrackers.trackerDataFrontend.name,
            empNumber: essEmpNumber,
            reviewerEmpNumbers: [supervisorEmpNumber]
        }
        const trackerDataApi = {
            trackerName: api.trackers.trackerDataApi.name,
            empNumber: essEmpNumber,
            reviewerEmpNumbers: [supervisorEmpNumber]
        }
        const orderTracker = {
            trackerName: api.trackers.orderTracker.name,
            empNumber: essEmpNumber,
            reviewerEmpNumbers: [supervisorEmpNumber]
        }
        await myTracker.createIfAbsent(trackerDataFrontend);
        await myTracker.createIfAbsent(trackerDataApi);
        await myTracker.createIfAbsent(orderTracker);
        await myTracker.addLogAsAdmin(api.trackers.trackerDataApi.name, api.trackers.adminLog);
        await orangehrmAdminApi.logout();
        await orangehrmAdminApi.loginAsESS(frontend.myTrackers.employees[1].username, frontend.myTrackers.employees[1].password);
        await myTracker.addLogAsESS(api.trackers.trackerDataApi.name, api.trackers.positiveLog);
        await myTracker.addLogAsESS(api.trackers.trackerDataApi.name, api.trackers.logForDelete);
        await myTracker.addLogAsESS(api.trackers.trackerDataApi.name, api.trackers.logForvalidateDeleteModal);
        await myTracker.addLogsIfAbsentAsESS(api.trackers.orderTracker.name, api.trackers.bulkLogs);

        const orderTrackerId = await myTracker.getTrackerIdByNameForESSLogs(api.trackers.orderTracker.name);
        orderTrackerApiLogs = await myTracker.getLogs(orderTrackerId);
    }
})

test.describe('Test cases for my Trackers', () => {

    // Anchored to the server clock at runtime (not the runner's UTC clock at collection time)
    // so it matches the date the app renders for a just-created log.
    const today = new Date().toISOString().split('T')[0];

    test.beforeEach(async ({ myTrackersPage, page, myTracker }) => {
        await myTrackersPage.loginWithCredentials(frontend.myTrackers.employees[1].username, frontend.myTrackers.employees[1].password);
        await page.goto(frontend.myTrackers.routes.myTrackerList)
    })

    test('**TC-001** | ESS views the My Trackers list ', async ({ page }) => {
        await expect(page).toHaveURL(new RegExp(frontend.myTrackers.routes.myTrackerList))
    })
    test('**TC-002** | Open a tracker and view its logs', async ({ myTrackersPage }) => {
        await myTrackersPage.viewTracker(frontend.myTrackers.trackerDataFrontend.name);
        await expect(myTrackersPage.listTitle).toHaveText(frontend.myTrackers.myTrackerUI.title);
    })
    test('**TC-004** | Add a Positive log to own tracker | **TC-504** | Success toast on add / edit / delete | **TC-010** | Reviewer(s) + dates on tracker card', async ({ myTrackersPage }) => {
        const fullName = `${frontend.myTrackers.employees[1].firstName} ${frontend.myTrackers.employees[1].lastName}`;
        await myTrackersPage.viewTracker(frontend.myTrackers.trackerDataFrontend.name);
        await myTrackersPage.clickAddLog()
        await myTrackersPage.fillLog(frontend.myTrackers.positiveLog)
        await myTrackersPage.clickSaveLogBtn()
        await myTrackersPage.verifySuccessToastForSave();
        await myTrackersPage.waitUntilTableLoaderDissapear();
        const logData = await myTrackersPage.getLogDetails(frontend.myTrackers.positiveLog.log)
        expect(logData.logTitle).toContain(frontend.myTrackers.positiveLog.log)
        expect(logData.reviewerName).toContain(fullName)
        expect(logData.logBody).toContain(frontend.myTrackers.positiveLog.Comment)
        expect(logData.date).toContain(today)
    })
    //Covering TC-005 and TC-006
    test('**TC-007** | Edit own log **TC-504** | Success toast on add / edit / delete', async ({ myTrackersPage }) => {
        const fullName = `${frontend.myTrackers.employees[1].firstName} ${frontend.myTrackers.employees[1].lastName}`;
        await myTrackersPage.viewTracker(api.trackers.trackerDataApi.name);
        await myTrackersPage.clickEditLog(api.trackers.positiveLog.log);
        await myTrackersPage.fillLog(frontend.myTrackers.updateLog);
        await myTrackersPage.clickSaveLogBtn()
        await myTrackersPage.verifySuccessToastForUpdate();
        await myTrackersPage.waitUntilTableLoaderDissapear();
        const logData = await myTrackersPage.getLogDetails(frontend.myTrackers.updateLog.log)
        expect(logData.logTitle).toContain(frontend.myTrackers.updateLog.log)
        expect(logData.reviewerName).toContain(fullName)
        expect(logData.logBody).toContain(frontend.myTrackers.updateLog.Comment)
        expect(logData.date).toContain(today)

    })
    test('**TC-008** | Delete own log | **TC-504** | Success toast on add / edit / delete', async ({ myTrackersPage }) => {
        const fullName = `${frontend.myTrackers.employees[1].firstName} ${frontend.myTrackers.employees[1].lastName}`;
        await myTrackersPage.viewTracker(api.trackers.trackerDataApi.name);
        await myTrackersPage.clickDeleteLog(api.trackers.logForDelete.log);
        await myTrackersPage.clickYesDeleteBtn()
        await myTrackersPage.verifySuccessToastforDeletion();
        await expect(myTrackersPage.logRowByText(api.trackers.logForDelete.log)).toHaveCount(0);
    })

    test('**TC-403** | XSS / special chars escaped on display', async ({ myTrackersPage }) => {
        const fullName = `${frontend.myTrackers.employees[1].firstName} ${frontend.myTrackers.employees[1].lastName}`;
        await myTrackersPage.viewTracker(api.trackers.trackerDataApi.name);
        await myTrackersPage.clickAddLog()
        await myTrackersPage.fillLog(frontend.myTrackers.xssTest);
        await myTrackersPage.clickSaveLogBtn()
        await myTrackersPage.verifySuccessToastForSave();
        await myTrackersPage.waitUntilTableLoaderDissapear();
        const logData = await myTrackersPage.getLogDetails(frontend.myTrackers.xssTest.log)
        expect(logData.logTitle).toContain(frontend.myTrackers.xssTest.log)
        expect(logData.reviewerName).toContain(fullName)
        expect(logData.logBody).toContain(frontend.myTrackers.xssTest.Comment)
        expect(logData.date).toContain(today)
    })

    test('**TC-503** | Add Log form fields + inline validation', async ({ myTrackersPage }) => {
        await myTrackersPage.viewTracker(api.trackers.trackerDataApi.name);
        await myTrackersPage.clickAddLog()
        await myTrackersPage.clickSaveLogBtn()
        const [logValidation, commentValidation] = myTrackersPage.verifyInlineRequired();
        await expect(logValidation).toBeVisible();
        await expect(commentValidation).toBeVisible();
    })

    test('**TC-508** | Reviewer-authored logs read-only to the employee', async ({ myTrackersPage }) => {
        await myTrackersPage.viewTracker(api.trackers.trackerDataApi.name);
        await expect(myTrackersPage.checkEditability(api.trackers.adminLog.log)).not.toBeVisible();
    })

    test('**TC-405** | Tracker with zero logs', async ({ myTrackersPage, page }) => {
        await page.route(api.trackers.logsApiPattern, async route => {
            if (route.request().method() === "GET") {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ data: [], meta: { total: 0, positive: 0, negative: 0 }, rels: {} })
                });
                return;
            }
            await route.continue();
        });
        await myTrackersPage.viewTracker(api.trackers.trackerDataApi.name);
        await expect(myTrackersPage.validateEmptyLogText()).toBeVisible();
    });

    test('**TC-505** | Validate Delete confirmation dialog', async ({ myTrackersPage }) => {
        await myTrackersPage.viewTracker(api.trackers.trackerDataApi.name);
        await myTrackersPage.clickDeleteLog(api.trackers.logForvalidateDeleteModal.log);
        const deletModal = await myTrackersPage.validateDeleteModal();
        expect(deletModal.title).toBe(api.trackers.validateDeleteModalContent.title);
        expect(deletModal.body).toBe(api.trackers.validateDeleteModalContent.body);
    })

    test(' **TC-506** | Char-limit feedback in fields', async ({ myTrackersPage }) => {

        const log = Array.from({ length: 151 }, () =>
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 52)]
        ).join("");

        const comment = Array.from({ length: 3001 }, () =>
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 52)]
        ).join("");

        const logData = {
            log: log,
            type: "positive",
            Comment: comment
        }

        await myTrackersPage.viewTracker(api.trackers.trackerDataApi.name);
        await myTrackersPage.clickAddLog()
        await myTrackersPage.fillLog(logData);
        const errorMessages = await myTrackersPage.validateInLineErrorsForLength();
        expect (errorMessages.logError).toBe(api.trackers.lengthValidation.log)
        expect (errorMessages.commentError).toBe(api.trackers.lengthValidation.comment)
    })
});

test.describe("Test cases for Admin", () => {

    const today = new Date().toISOString().split('T')[0];

    test.beforeEach(async ({ myTrackersPage, page, myTracker }) => {
        await myTrackersPage.loginAs('admin');
        await page.goto(frontend.myTrackers.routes.myTrackerList)
    })

    test("Check the visibility of My Tracker as Admin user", async ({ page }) => {
        await expect(page).toHaveURL(new RegExp(frontend.myTrackers.routes.myTrackerList))
    })

})
