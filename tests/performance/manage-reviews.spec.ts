import { test, expect } from '../../src/fixtures/apiAction';
import { env } from '../../src/config/env';
import { frontend } from '../../test-data';
import { api } from '../../test-data';

test.describe.configure({ timeout: 120_000 });

const EMPTY_REVIEWS_RESPONSE = { data: [], meta: { total: 0 }, rels: [] };

/** Format a date offset from today in LOCAL time (toISOString shifts the day when run near midnight UTC). */
const dateFromToday = (offsetDays: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const pad = (n: number): string => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Shared review period — computed once so the API-seeded reviews and the UI assertions always agree. */
const reviewDates = {
    today: dateFromToday(0),
    startDate: dateFromToday(-14),
    endDate: dateFromToday(14),
    dueDate: dateFromToday(30),
};

test.beforeEach(() => {
    test.skip(!env.baseURL, 'Set BASE_URL to run this suite.');
});


test.beforeAll(async ({ masterDataReadiness, orangehrmAdminApi, employees, users, assignDerectSupervisors, jobTitle, kpi, assignJobTitles, manageReview }) => {
    test.setTimeout(120_000);

    void masterDataReadiness;
    await orangehrmAdminApi.loginAsAdmin();
    for (const employee of api.reviewData.apiEmployees) {
        await employees.createIfAbsent(employee)
    }

    await jobTitle.createIfAbsent(frontend.manageReviewData.jobTitle);
    const jobTitleID = await jobTitle.getJobTitleIDbyName(frontend.manageReviewData.jobTitle.title);

    const kpiForJobTitle = {
        title: 'KPI for manage review tests',
        minRating: 25,
        maxRating: 50,
        jobTitleId: jobTitleID,
        isDefault: false,
    }
    await kpi.createIfAbsent(kpiForJobTitle);

    for (let i = 0; i < api.reviewData.apiEmployees.length; i += 2) {
        const supervisorEmpNumber = await employees.getEmpNumberByEmployeeId(api.reviewData.apiEmployees[i].employeeId);

        if (supervisorEmpNumber !== undefined) {
            await users.createIfAbsent({
                username: api.reviewData.apiEmployees[i].username,
                password: api.reviewData.apiEmployees[i].password,
                status: api.reviewData.apiEmployees[i].status,
                userRoleId: api.reviewData.apiEmployees[i].userRoleId,},
                supervisorEmpNumber
            );
        }

        const essEmpNumber = await employees.getEmpNumberByEmployeeId(api.reviewData.apiEmployees[i + 1].employeeId);

        if (essEmpNumber !== undefined) {
            await users.createIfAbsent({
                username: api.reviewData.apiEmployees[i + 1].username,
                password: api.reviewData.apiEmployees[i + 1].password,
                status: api.reviewData.apiEmployees[i + 1].status,
                userRoleId: api.reviewData.apiEmployees[i + 1].userRoleId},
                essEmpNumber
            );
        }
        await assignDerectSupervisors.createSupervisors(essEmpNumber, supervisorEmpNumber);
        await assignJobTitles.assignJobTitles(essEmpNumber, jobTitleID, frontend.manageReviewData.jobTitle.title);
    }

    // One API-seeded review per list scenario; createIfAbsent keeps reruns from stacking duplicates
    const reviewSeeds = [
        { pair: api.reviewData.actors.complete, activate: true },
        { pair: api.reviewData.actors.search, activate: true },
        { pair: api.reviewData.actors.readOnly, activate: true },
        { pair: api.reviewData.actors.edit, activate: false },
        { pair: api.reviewData.actors.delete, activate: true },
    ];

    for (const seed of reviewSeeds) {
        const reviewerEmpNumber = await employees.getEmpNumberByEmployeeId(seed.pair.supervisor.employeeId);
        const empNumber = await employees.getEmpNumberByEmployeeId(seed.pair.employee.employeeId);
        if (reviewerEmpNumber === undefined || empNumber === undefined) {
            throw new Error(`Unable to resolve employee numbers for review setup (employee ${seed.pair.employee.employeeId})`);
        }
        await manageReview.createIfAbsent({
            activate: seed.activate,
            dueDate: reviewDates.dueDate,
            empNumber: empNumber,
            endDate: reviewDates.endDate,
            reviewerEmpNumber: reviewerEmpNumber,
            startDate: reviewDates.startDate
        });
    }
})

test.afterAll(async ({ manageReview, orangehrmAdminApi, employees }) => {
    await orangehrmAdminApi.loginAsAdmin();
    // Scope cleanup to this suite's employees — never wipe reviews owned by other suites or manual data
    const empNumbers: number[] = [];
    for (const employee of api.reviewData.apiEmployees) {
        const empNumber = await employees.getEmpNumberByEmployeeId(employee.employeeId);
        if (empNumber !== undefined) {
            empNumbers.push(empNumber);
        }
    }
    await manageReview.deleteReviewsForEmployees(empNumbers);
})


test.describe("Test cases for Manage reviews", () => {

    test.describe("as admin", () => {

        test.beforeEach(async ({ page, manageReviewsPage }) => {
            await manageReviewsPage.loginAs('admin');
            await page.goto(frontend.manageReviewData.routes.manageReviews);
        });

        test.only("TC-004 | Full lifecycle: create → activate → reviewer evaluates → In Progress → Completed", async ({ page, manageReviewsPage }) => {

            //actions as admin
            await manageReviewsPage.clickOnAddReview();
            await manageReviewsPage.fillReview(frontend.manageReviewData.reviewData, reviewDates.startDate, reviewDates.endDate, reviewDates.dueDate);
            await manageReviewsPage.clickActivateBtn();
            await manageReviewsPage.verifySuccessToastForActivate();
            await expect(manageReviewsPage.reviewStatusCell(frontend.manageReviewData.validateData.employeeName)).toHaveText(frontend.manageReviewData.validateData.reviewStatus);
            await manageReviewsPage.logOut();

            //action as supervisor
            await manageReviewsPage.loginWithCredentials(frontend.manageReviewData.logasSupervisor.username, frontend.manageReviewData.logasSupervisor.password);
            await page.goto(frontend.manageReviewData.routes.reviewsAsSupervisor)
            await manageReviewsPage.clickOnActionAsSupervisor(frontend.manageReviewData.validateData.employeeName)
            await manageReviewsPage.fillReviewAsSupervisor(frontend.manageReviewData.supervisorReview, reviewDates.today);
            await manageReviewsPage.clickSave();
            await manageReviewsPage.verifySuccessToastForSave();
            await manageReviewsPage.clickComplete();
            await manageReviewsPage.confirmReview();
            await manageReviewsPage.verifySuccessToastForSave();

            //review reached its terminal state on the reviewer's list
            await page.goto(frontend.manageReviewData.routes.reviewsAsSupervisor)
            await manageReviewsPage.waitUntilTableLoaderDissapear();
            await expect(manageReviewsPage.reviewRowWithStatus(frontend.manageReviewData.validateDataForCompleted.employeeName, frontend.manageReviewData.validateDataForCompleted.reviewStatus)).toBeVisible();
        })

        test("TC-001 | Admin creates a review (Save)", async ({ manageReviewsPage }) => {

            await manageReviewsPage.clickOnAddReview();
            await manageReviewsPage.fillReview(frontend.manageReviewData.saveReview, reviewDates.startDate, reviewDates.endDate, reviewDates.dueDate);
            await manageReviewsPage.clickSave();
            await manageReviewsPage.verifySuccessToastForUpdate();
            await expect(manageReviewsPage.reviewStatusCell(frontend.manageReviewData.validateDataForSave.employeeName)).toHaveText(frontend.manageReviewData.validateDataForSave.reviewStatus);
        })

        test("TC-003 | Complete an existing Inprogress review from the list | TC-103 | Completed review renders read-only", async ({ manageReviewsPage }) => {

            await manageReviewsPage.clickOnActionAsSupervisor(frontend.manageReviewData.validateDataForComplete.employeeName)
            await manageReviewsPage.fillReviewAsSupervisor(frontend.manageReviewData.supervisorReview, reviewDates.today);
            await manageReviewsPage.clickComplete();
            await manageReviewsPage.confirmReview();
            await manageReviewsPage.verifySuccessToastForSave();
            await manageReviewsPage.waitUntilFormLoaderDissapear();
            const readonlyFields = manageReviewsPage.readonlyEvaluationFields();
            await expect(readonlyFields.rating).toBeDisabled();
            await expect(readonlyFields.comment).toBeDisabled();
            await expect(readonlyFields.generalComment).toBeDisabled();
        })

        test("TC-005 | Created review is searchable in the list ", async ({ manageReviewsPage }) => {

            await manageReviewsPage.fillSearchCriteria(frontend.manageReviewData.searchCriteria.employeeName);
            await manageReviewsPage.clickSearch();
            await manageReviewsPage.waitUntilTableLoaderDissapear()
            const row = manageReviewsPage.reviewRowCells(frontend.manageReviewData.validateDataForSearch.employeeName);
            await expect(row.employeeName).toHaveText(frontend.manageReviewData.validateDataForSearch.employeeName);
            await expect(row.jobTitle).toHaveText(frontend.manageReviewData.validateDataForSearch.jobTitle);
            await expect(row.period).toHaveText(reviewDates.startDate + " - " + reviewDates.endDate);
            await expect(row.dueDate).toHaveText(reviewDates.dueDate);
            await expect(row.reviewer).toHaveText(frontend.manageReviewData.validateDataForSearch.reviewer);
            await expect(row.status).toHaveText(frontend.manageReviewData.validateDataForSearch.reviewStatus);
        })

        test("TC-100 | Reviewer autocomplete shows only the employee's supervisors", async ({ manageReviewsPage }) => {

            await manageReviewsPage.clickOnAddReview();
            await manageReviewsPage.selectEmployee(frontend.manageReviewData.validateSupervisor.employeeName);
            const supervisorOptions = await manageReviewsPage.searchSupervisorOptions(frontend.manageReviewData.validateSupervisor.supervisorForSearch);
            await expect(supervisorOptions).toHaveCount(1);
            await expect(supervisorOptions.first()).toHaveText(frontend.manageReviewData.validateSupervisor.supervisorName);
        })


        test("TC-006 | Edit an Inactive review's period / due date / reviewer", async ({ manageReviewsPage }) => {

            await manageReviewsPage.clickOnEditIcon(frontend.manageReviewData.validateDataForSaveReview.displayName)
            await manageReviewsPage.fillReview(frontend.manageReviewData.updateReview, dateFromToday(-1), dateFromToday(1), dateFromToday(10));
            await manageReviewsPage.clickActivateBtn();
            await manageReviewsPage.verifySuccessToastForActivate();

            //updated review is back in the list as Activated
            await expect(manageReviewsPage.reviewRowWithStatus(frontend.manageReviewData.updateReviewValidate.employeeName, frontend.manageReviewData.updateReviewValidate.reviewStatus)).toBeVisible();
        })

        test("TC-007 | Delete a review from the list", async ({ manageReviewsPage }) => {

            await manageReviewsPage.clickOnDeleteReview(frontend.manageReviewData.dataForDeleteReview.employeeName)
            await manageReviewsPage.clickYesOnDeleteConfirmation();
            await manageReviewsPage.verifySuccessToastforDeletion();
        })

        test("TC-300 | Empty Save → 5× Required", async ({ manageReviewsPage }) => {

            await manageReviewsPage.clickOnAddReview();
            await manageReviewsPage.clickSave();
            const requiredErrors = manageReviewsPage.validateRequiredErrors();
            await expect(requiredErrors.employeeError).toBeVisible();
            await expect(requiredErrors.supervisorError).toBeVisible();
            await expect(requiredErrors.startDateError).toBeVisible();
            await expect(requiredErrors.endDateError).toBeVisible();
            await expect(requiredErrors.dueDateError).toBeVisible();
            await expect(manageReviewsPage.requiredFieldErrors).toHaveCount(5);
        })

        test("TC-301: Free-typed (unbound) employee name is rejected", async ({ manageReviewsPage }) => {

            await manageReviewsPage.clickOnAddReview();
            await manageReviewsPage.fillNameInputForInvalid(frontend.manageReviewData.invalidNameInput.employeeName);
            await expect(manageReviewsPage.employeeNameInvalidError()).toBeVisible();
        })
    })

    test("TC-200 | ESS cannot access the Manage Reviews admin page ", async ({ page, manageReviewsPage }) => {

        await manageReviewsPage.loginWithCredentials(api.reviewData.actors.essUser.username, api.reviewData.actors.essUser.password);
        await page.goto(frontend.manageReviewData.routes.manageReviews)
        await expect(manageReviewsPage.accessDeniedMsg).toBeVisible();
    })

    test("TC-500 | Empty list shows No Records Found Toast", async ({ page, manageReviewsPage }) => {

        await manageReviewsPage.loginAs('admin')
        await page.route('**/api/v2/performance/manage/**', async route => {
            if (route.request().method() === 'GET') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify(EMPTY_REVIEWS_RESPONSE)
                })
                return;
            }
            await route.continue();
        })
        await page.goto(frontend.manageReviewData.routes.manageReviews)
        await manageReviewsPage.VerifyNoRecords();

    })
})
