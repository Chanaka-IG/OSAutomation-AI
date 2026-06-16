import { test, expect } from '../../src/fixtures/apiAction';
import { env } from '../../src/config/env';
import { frontend } from '../../test-data';
import { api } from '../../test-data';

test.describe.configure({ timeout: 50_000 });

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
        await myTracker.createIfAbsent(trackerDataFrontend);
        await myTracker.createIfAbsent(trackerDataApi);
        await orangehrmAdminApi.logout();
        await orangehrmAdminApi.loginAsESS(frontend.myTrackers.employees[1].username, frontend.myTrackers.employees[1].password);
        await myTracker.addLogAsESS(api.trackers.trackerDataApi.name, api.trackers.positiveLog);
        await myTracker.addLogAsESS(api.trackers.trackerDataApi.name, api.trackers.logForDelete);
    }
})

test.describe('Test cases for my Trackers', () => {

    // Anchored to the server clock at runtime (not the runner's UTC clock at collection time)
    // so it matches the date the app renders for a just-created log.
    let today: string;

    test.beforeEach(async ({ myTrackersPage, page, myTracker }) => {
        today = await myTracker.getServerDate();
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
    test('**TC-004** | Add a Positive log to own tracker', async ({ myTrackersPage }) => {
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
    test('**TC-007** | Edit own log ', async ({ myTrackersPage }) => {
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
    test('**TC-008** | Delete own log', async ({ myTrackersPage }) => {
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
})

