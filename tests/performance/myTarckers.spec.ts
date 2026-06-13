import { test, expect } from '../../src/fixtures/apiAction';
import { env } from '../../src/config/env';
import { frontend } from '../../test-data'; 3


test.describe.configure({ timeout: 180_000 });

test.beforeEach(() => {
    test.skip(!env.baseURL, 'Set BASE_URL to run this suite.');
});

test.beforeAll(async ({ orangehrmAdminApi, masterDataReadiness, users, employees, myTracker }) => {

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
        const trackerData = {
            trackerName: frontend.myTrackers.trackerData.name,
            empNumber: essEmpNumber,
            reviewerEmpNumbers: [supervisorEmpNumber]
        }
        await myTracker.createIfAbsent(trackerData);
    }
})

test.describe('Test cases for my Trackers', () => {

    const today = new Date().toISOString().split('T')[0];

    test.beforeEach(async ({ myTrackersPage, page }) => {
        await myTrackersPage.loginWithCredentials(frontend.myTrackers.employees[1].username, frontend.myTrackers.employees[1].password);
        await page.goto(frontend.myTrackers.routes.myTrackerList)
    })

    test('**TC-001** | ESS views the My Trackers list ', async ({ page }) => {
        expect(page).toHaveURL(frontend.myTrackers.routes.myTrackerList)
    })
    test('**TC-002** | Open a tracker and view its logs', async ({ myTrackersPage }) => {
        await myTrackersPage.viewTracker(frontend.myTrackers.trackerData.name);
        await myTrackersPage.validateTitle(frontend.myTrackers.myTrackerUI.title)
    })
    test.only('**TC-004** | Add a Positive log to own tracker', async ({ myTrackersPage }) => {
        const fullName = `${frontend.myTrackers.employees[1].firstName} ${frontend.myTrackers.employees[1].lastName}`;
        await myTrackersPage.viewTracker(frontend.myTrackers.trackerData.name);
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

})

