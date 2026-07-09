import { test, expect } from '../../src/fixtures/apiAction';
import { env } from '../../src/config/env';
import { frontend } from '../../test-data';
import { api } from '../../test-data';

test.describe.configure({ timeout: 120_000 });

const EMPTY_REVIEWS_RESPONSE = { data: [], meta: { total: 0 }, rels: [] };

test.beforeEach(() => {
    test.skip(!env.baseURL, 'Set BASE_URL to run this suite.');
});


test.beforeAll(async ({ masterDataReadiness, orangehrmAdminApi, employees, users, assignDerectSupervisors, jobTitle, kpi, assignJobTitles, manageReview }) => {
    test.setTimeout(120_000);

    const base = new Date();
    const format = (d: Date): string => d.toISOString().split('T')[0];

    const today = format(base);

    const twoWeeksBefore = new Date(base);
    twoWeeksBefore.setDate(base.getDate() - 14);
    const startDate = format(twoWeeksBefore)

    const twoWeeksAfter = new Date(base);
    twoWeeksAfter.setDate(base.getDate() + 14);
    const endDate = format(twoWeeksAfter)

    const oneMonthAfter = new Date(base);
    oneMonthAfter.setMonth(base.getMonth() + 1);
    const dueDate = format(oneMonthAfter)

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
                userRoleId: api.reviewData.apiEmployees[i].userRoleId,
                empNumber: supervisorEmpNumber
            }); 1
        }

        const essEmpNumber = await employees.getEmpNumberByEmployeeId(api.reviewData.apiEmployees[i + 1].employeeId);

        if (essEmpNumber !== undefined) {
            await users.createIfAbsent({
                username: api.reviewData.apiEmployees[i + 1].username,
                password: api.reviewData.apiEmployees[i + 1].password,
                status: api.reviewData.apiEmployees[i + 1].status,
                userRoleId: api.reviewData.apiEmployees[i + 1].userRoleId,
                empNumber: essEmpNumber
            });
        }
        await assignDerectSupervisors.createSupervisors(essEmpNumber, supervisorEmpNumber);
        await assignJobTitles.assignJobTitles(essEmpNumber, jobTitleID, frontend.manageReviewData.jobTitle.title);
    }

    // Create reviews for testing
    const apisupervisorID = await employees.getEmpNumberByEmployeeId(api.reviewData.apiEmployees[4].employeeId);
    if (apisupervisorID === undefined) {
        throw new Error('Unable to resolve supervisor employee number for review setup');
    }

    const apiEmployeeID = await employees.getEmpNumberByEmployeeId(api.reviewData.apiEmployees[5].employeeId);
    if (apiEmployeeID === undefined) {
        throw new Error('Unable to resolve employee number for review setup');
    }

    const reviewAPI1 = {
        activate: true,
        dueDate: dueDate,
        empNumber: apiEmployeeID,
        endDate: endDate,
        reviewerEmpNumber: apisupervisorID,
        startDate: startDate
    }

    await manageReview.createReview(reviewAPI1);

    // Create reviews for testing search and supervisor validation
    const apisupervisorIDForSearch = await employees.getEmpNumberByEmployeeId(api.reviewData.apiEmployees[6].employeeId);
    if (apisupervisorIDForSearch === undefined) {
        throw new Error('Unable to resolve supervisor employee number for review setup');
    }

    const apiEmployeeIDForSearch = await employees.getEmpNumberByEmployeeId(api.reviewData.apiEmployees[7].employeeId);
    if (apiEmployeeIDForSearch === undefined) {
        throw new Error('Unable to resolve employee number for review setup');
    }

    const reviewAPI2 = {
        activate: true,
        dueDate: dueDate,
        empNumber: apiEmployeeIDForSearch,
        endDate: endDate,
        reviewerEmpNumber: apisupervisorIDForSearch,
        startDate: startDate
    }

    await manageReview.createReview(reviewAPI2);

    // Create reviews for testing for readonly behavior of completed review

    const apisupervisorIDForReadOnly = await employees.getEmpNumberByEmployeeId(api.reviewData.apiEmployees[8].employeeId);
    if (apisupervisorIDForReadOnly === undefined) {
        throw new Error('Unable to resolve supervisor employee number for review setup');
    }

    const apiEmployeeIDForReadOnly = await employees.getEmpNumberByEmployeeId(api.reviewData.apiEmployees[9].employeeId);
    if (apiEmployeeIDForReadOnly === undefined) {
        throw new Error('Unable to resolve employee number for review setup');
    }

    const reviewAPI3 = {
        activate: true,
        dueDate: dueDate,
        empNumber: apiEmployeeIDForReadOnly,
        endDate: endDate,
        reviewerEmpNumber: apisupervisorIDForReadOnly,
        startDate: startDate
    }

    await manageReview.createReview(reviewAPI3);

    // Create reviews for testing
    const apisupervisorIDForSaveReview = await employees.getEmpNumberByEmployeeId(api.reviewData.apiEmployees[10].employeeId);
    if (apisupervisorIDForSaveReview === undefined) {
        throw new Error('Unable to resolve supervisor employee number for review setup');
    }

    const apiEmployeeIDForSaveReview = await employees.getEmpNumberByEmployeeId(api.reviewData.apiEmployees[11].employeeId);
    if (apiEmployeeIDForSaveReview === undefined) {
        throw new Error('Unable to resolve employee number for review setup');
    }

    const reviewAPI4 = {
        activate: false,
        dueDate: dueDate,
        empNumber: apiEmployeeIDForSaveReview,
        endDate: endDate,
        reviewerEmpNumber: apisupervisorIDForSaveReview,
        startDate: startDate
    }

    await manageReview.createReview(reviewAPI4);

    // Create reviews for delete testing
    const apisupervisorIDFordeleteReview = await employees.getEmpNumberByEmployeeId(api.reviewData.apiEmployees[14].employeeId);
    if (apisupervisorIDFordeleteReview === undefined) {
        throw new Error('Unable to resolve supervisor employee number for review setup');
    }

    const apiEmployeeIDFordeleteReview = await employees.getEmpNumberByEmployeeId(api.reviewData.apiEmployees[15].employeeId);
    if (apiEmployeeIDFordeleteReview === undefined) {
        throw new Error('Unable to resolve employee number for review setup');
    }

    const reviewAPI5 = {
        activate: true,
        dueDate: dueDate,
        empNumber: apiEmployeeIDFordeleteReview,
        endDate: endDate,
        reviewerEmpNumber: apisupervisorIDFordeleteReview,
        startDate: startDate
    }

    await manageReview.createReview(reviewAPI5);

})

test.afterAll(async ({ manageReview, orangehrmAdminApi }) => {
    await orangehrmAdminApi.loginAsAdmin();
    await manageReview.deleteAllReviews();
})


test.describe("Test cases for Manage reviews", () => {

    test("TC-004 | Full lifecycle: create → activate → reviewer evaluates → In Progress → Completed", async ({ page, manageReviewsPage }) => {

        const base = new Date();
        const format = (d: Date): string => d.toISOString().split('T')[0];

        const today = format(base);

        const twoWeeksBefore = new Date(base);
        twoWeeksBefore.setDate(base.getDate() - 14);
        const startDate = format(twoWeeksBefore)

        const twoWeeksAfter = new Date(base);
        twoWeeksAfter.setDate(base.getDate() + 14);
        const endDate = format(twoWeeksAfter)

        const oneMonthAfter = new Date(base);
        oneMonthAfter.setMonth(base.getMonth() + 1);
        const dueDate = format(oneMonthAfter)

        //actions as admin
        await manageReviewsPage.loginAs('admin')
        await page.goto(frontend.manageReviewData.routes.manageReviews)
        await manageReviewsPage.clickOnAddReview();
        await manageReviewsPage.fillReview(frontend.manageReviewData.reviewData.employeeName, frontend.manageReviewData.reviewData.supervisorName, startDate, endDate, dueDate);
        await manageReviewsPage.clickActivateBtn();
        await manageReviewsPage.verifySuccessToastForActivate();
        expect(await manageReviewsPage.checkReviewStatusAsAdmin(frontend.manageReviewData.validateData.employeeName)).toBe(frontend.manageReviewData.validateData.reviewStatus);
        await manageReviewsPage.logOut();

        //action as supervisor
        await manageReviewsPage.loginWithCredentials(frontend.manageReviewData.logasSupervisor.username, frontend.manageReviewData.logasSupervisor.password);
        await page.goto(frontend.manageReviewData.routes.reviewsAsSupervisor)
        await manageReviewsPage.clickOnActionAsSupervisor(frontend.manageReviewData.validateData.employeeName)
        await manageReviewsPage.fillReviewasSupervvisor(frontend.manageReviewData.supervisorReview, today);
        await manageReviewsPage.clickSave();
        await manageReviewsPage.verifySuccessToastForSave();
        await manageReviewsPage.clickComplete();
        await manageReviewsPage.confirmReview();
        await manageReviewsPage.verifySuccessToastForSave();

    })

    test("TC-001 | Admin creates a review (Save)", async ({ page, manageReviewsPage }) => {

        const base = new Date();
        const format = (d: Date): string => d.toISOString().split('T')[0];

        const today = format(base);

        const twoWeeksBefore = new Date(base);
        twoWeeksBefore.setDate(base.getDate() - 14);
        const startDate = format(twoWeeksBefore)

        const twoWeeksAfter = new Date(base);
        twoWeeksAfter.setDate(base.getDate() + 14);
        const endDate = format(twoWeeksAfter)

        const oneMonthAfter = new Date(base);
        oneMonthAfter.setMonth(base.getMonth() + 1);
        const dueDate = format(oneMonthAfter)

        //actions as admin
        await manageReviewsPage.loginAs('admin')
        await page.goto(frontend.manageReviewData.routes.manageReviews)
        await manageReviewsPage.clickOnAddReview();
        await manageReviewsPage.fillReview(frontend.manageReviewData.saveReview.employeeName, frontend.manageReviewData.saveReview.supervisorName, startDate, endDate, dueDate);
        await manageReviewsPage.clickSave();
        await manageReviewsPage.verifySuccessToastForUpdate();
        expect(await manageReviewsPage.checkReviewStatusAsAdmin(frontend.manageReviewData.validateDataForSave.employeeName)).toBe(frontend.manageReviewData.validateDataForSave.reviewStatus);
    })

    test("TC-200 | ESS cannot access the Manage Reviews admin page ", async ({ page, manageReviewsPage }) => {

        await manageReviewsPage.loginWithCredentials(api.reviewData.apiEmployees[1].username, api.reviewData.apiEmployees[1].password);
        await page.goto(frontend.manageReviewData.routes.manageReviews)
        await expect(manageReviewsPage.verifyAccessDeniedVisibility()).toBeVisible();
    })

    test("TC-003 | Complete an existing Inprogress review from the list | TC-103 | Completed review renders read-only", async ({ page, manageReviewsPage }) => {
        const base = new Date();
        const format = (d: Date): string => d.toISOString().split('T')[0];
        const today = format(base);

        await manageReviewsPage.loginAs('admin')
        await page.goto(frontend.manageReviewData.routes.manageReviews)
        await manageReviewsPage.clickOnActionAsSupervisor(frontend.manageReviewData.validateDataForComplete.employeeName)
        await manageReviewsPage.fillReviewasSupervvisor(frontend.manageReviewData.supervisorReview, today);
        await manageReviewsPage.clickComplete();
        await manageReviewsPage.confirmReview();
        await manageReviewsPage.verifySuccessToastForSave();
        await manageReviewsPage.waitUntilFormLoaderDissapear();
        const readonlyData = await manageReviewsPage.validateDataReadonly();
        await expect(readonlyData.rating).toBeDisabled();
        await expect(readonlyData.comment).toBeDisabled();
        await expect(readonlyData.generalComment).toBeDisabled();
    })


    test("TC-005 | Created review is searchable in the list ", async ({ page, manageReviewsPage }) => {

        const base = new Date();
        const format = (d: Date): string => d.toISOString().split('T')[0];

        const today = format(base);

        const twoWeeksBefore = new Date(base);
        twoWeeksBefore.setDate(base.getDate() - 14);
        const startDate = format(twoWeeksBefore)

        const twoWeeksAfter = new Date(base);
        twoWeeksAfter.setDate(base.getDate() + 14);
        const endDate = format(twoWeeksAfter)

        const oneMonthAfter = new Date(base);
        oneMonthAfter.setMonth(base.getMonth() + 1);
        const dueDate = format(oneMonthAfter)

        await manageReviewsPage.loginAs('admin')
        await page.goto(frontend.manageReviewData.routes.manageReviews)
        await manageReviewsPage.fillSearchCriteria(frontend.manageReviewData.searchCriteria.employeeName);
        await manageReviewsPage.clickSearch();
        await manageReviewsPage.waitUntilTableLoaderDissapear()
        const validateData = await manageReviewsPage.validateDataInTable(frontend.manageReviewData.validateDataForSearch.employeeName)
        expect(validateData.employeeName).toBe(frontend.manageReviewData.validateDataForSearch.employeeName);
        expect(validateData.jobTitle).toBe(frontend.manageReviewData.validateDataForSearch.jobTitle);
        expect(validateData.period).toBe(startDate + " - " + endDate);
        expect(validateData.dueDate).toBe(dueDate);
        expect(validateData.reviewer).toBe(frontend.manageReviewData.validateDataForSearch.reviewer);
        expect(validateData.status).toBe(frontend.manageReviewData.validateDataForSearch.reviewStatus);
    })

    test("TC-100 | Reviewer autocomplete shows only the employee's supervisors", async ({ page, manageReviewsPage }) => {

        await manageReviewsPage.loginAs('admin')
        await page.goto(frontend.manageReviewData.routes.manageReviews)
        await manageReviewsPage.clickOnAddReview();
        await manageReviewsPage.selectEmployee(frontend.manageReviewData.validateSupervisor.employeeName);
        const supervisorData = await manageReviewsPage.validateSupervisor(frontend.manageReviewData.validateSupervisor.supervisorForSearch);
        expect(supervisorData.optionCount).toBe(1);
        expect(supervisorData.option).not.toBeNull();
        expect(supervisorData.option).toBe(frontend.manageReviewData.validateSupervisor.supervisorName);
    })


    test("TC-006 | Edit an Inactive review's period / due date / reviewer", async ({ page, manageReviewsPage }) => {

        const base = new Date();
        const format = (d: Date): string => d.toISOString().split('T')[0];

        const yesterday = new Date(base);
        yesterday.setDate(base.getDate() - 1);
        const startDate = format(yesterday);

        const tomorrow = new Date(base);
        tomorrow.setDate(base.getDate() + 1);
        const endDate = format(tomorrow);

        const oneAndHalfWeek = new Date(base);
        oneAndHalfWeek.setDate(base.getDate() + 10);
        const dueDate = format(oneAndHalfWeek)


        await manageReviewsPage.loginAs('admin')
        await page.goto(frontend.manageReviewData.routes.manageReviews)
        await manageReviewsPage.clickOnEditIcon(frontend.manageReviewData.validateDataForSaveReview.displayName)
        await manageReviewsPage.fillReview(frontend.manageReviewData.updateReview.employeeName, frontend.manageReviewData.updateReview.supervisorName, startDate, endDate, dueDate);
        await manageReviewsPage.clickActivateBtn();
        await manageReviewsPage.verifySuccessToastForActivate();
    })

    test("TC-007 | Delete a review from the list", async ({ page, manageReviewsPage }) => {

        await manageReviewsPage.loginAs('admin')
        await page.goto(frontend.manageReviewData.routes.manageReviews)
        await manageReviewsPage.clickOnDeleteReview(frontend.manageReviewData.dataForDeleteReview.employeeName)
        await manageReviewsPage.clickYesOnDeleteConfirmation();
        await manageReviewsPage.verifySuccessToastforDeletion();
    })
    test("TC-300 | Empty Save → 5× Required", async ({ page, manageReviewsPage }) => {

        await manageReviewsPage.loginAs('admin')
        await page.goto(frontend.manageReviewData.routes.manageReviews)
        await manageReviewsPage.clickOnAddReview();
        await manageReviewsPage.clickActivateBtn();
        const requiredErrors = manageReviewsPage.validateRequiredErrors();
        await expect(requiredErrors.employeeError).toBeVisible();
        await expect(requiredErrors.supervisorError).toBeVisible();
        await expect(requiredErrors.startDateError).toBeVisible();
        await expect(requiredErrors.endDateError).toBeVisible();
        await expect(requiredErrors.dueDateError).toBeVisible();
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

    test("TC-301: Free-typed (unbound) employee name is rejected", async ({ page, manageReviewsPage }) => {

        await manageReviewsPage.loginAs('admin')
        await page.goto(frontend.manageReviewData.routes.manageReviews)
        await manageReviewsPage.clickOnAddReview();
        await manageReviewsPage.fillNameInputForInvalid(frontend.manageReviewData.invalidNameInput.employeeName);
        const InvalidErrors = await manageReviewsPage.verifyEmployeeNameInvalidError();
        await expect(InvalidErrors.employeeError).toBeVisible();
    })
})