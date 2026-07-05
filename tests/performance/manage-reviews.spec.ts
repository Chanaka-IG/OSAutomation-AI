import { test, expect } from '../../src/fixtures/apiAction';
import { env } from '../../src/config/env';
import { frontend } from '../../test-data';
import { api } from '../../test-data';

test.describe.configure({ timeout: 120_000 });

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

})

test.afterAll(async ({ manageReview, orangehrmAdminApi }) => {
    await orangehrmAdminApi.loginAsAdmin();
    await manageReview.deleteAllReviews();
})


test.describe("Test cases for Manage reviews", () => {

    test("TC-004 | Full lifecycle: create → activate → reviewer evaluates → In Progress → Completed", async ({ page, manageReviews }) => {

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
        await manageReviews.loginAs('admin')
        await page.goto(frontend.manageReviewData.routes.manageReviews)
        await manageReviews.clickOnAddReview();
        await manageReviews.fillReview(frontend.manageReviewData.reviewData.employeeName, frontend.manageReviewData.reviewData.supervisorName, startDate, endDate, dueDate);
        await manageReviews.clickActivateBtn();
        await manageReviews.verifySuccessToastForActivate();
        expect(await manageReviews.checkReviewStatusAsAdmin(frontend.manageReviewData.validateData.employeeName)).toBe(frontend.manageReviewData.validateData.reviewStatus);
        await manageReviews.logOut();

        //action as supervisor
        await manageReviews.loginWithCredentials(frontend.manageReviewData.logasSupervisor.username, frontend.manageReviewData.logasSupervisor.password);
        await page.goto(frontend.manageReviewData.routes.reviewsAsSupervisor)
        await manageReviews.clickOnActionAsSupervisor(frontend.manageReviewData.validateData.employeeName)
        await manageReviews.fillReviewasSupervvisor(frontend.manageReviewData.supervisorReview, today);
        await manageReviews.clickSave();
        await manageReviews.verifySuccessToastForSave();
        await manageReviews.clickComplete();
        await manageReviews.confirmReview();
        await manageReviews.verifySuccessToastForSave();

    })

    test("TC-001 | Admin creates a review (Save)", async ({ page, manageReviews }) => {

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
        await manageReviews.loginAs('admin')
        await page.goto(frontend.manageReviewData.routes.manageReviews)
        await manageReviews.clickOnAddReview();
        await manageReviews.fillReview(frontend.manageReviewData.saveReview.employeeName, frontend.manageReviewData.saveReview.supervisorName, startDate, endDate, dueDate);
        await manageReviews.clickSave();
        await manageReviews.verifySuccessToastForUpdate();
        expect(await manageReviews.checkReviewStatusAsAdmin(frontend.manageReviewData.validateDataForSave.employeeName)).toBe(frontend.manageReviewData.validateDataForSave.reviewStatus);
    })

    test("TC-200 | ESS cannot access the Manage Reviews admin page ", async ({ page, manageReviews }) => {

        await manageReviews.loginWithCredentials(api.reviewData.apiEmployees[1].username, api.reviewData.apiEmployees[1].password);
        await page.goto(frontend.manageReviewData.routes.manageReviews)
        await expect(manageReviews.verifyAccessDeniedVisibility()).toBeVisible();
    })

    test("TC-003 | Complete an existing Inprogress review from the list ", async ({ page, manageReviews }) => {
        const base = new Date();
        const format = (d: Date): string => d.toISOString().split('T')[0];
        const today = format(base);

        await manageReviews.loginAs('admin')
        await page.goto(frontend.manageReviewData.routes.manageReviews)
        await manageReviews.clickOnActionAsSupervisor(frontend.manageReviewData.validateDataForComplete.employeeName)
        await manageReviews.fillReviewasSupervvisor(frontend.manageReviewData.supervisorReview, today);
        await manageReviews.clickComplete();
        await manageReviews.confirmReview();
        await manageReviews.verifySuccessToastForSave();
    })


    test.only("TC-005 | Created review is searchable in the list ", async ({ page, manageReviews }) => {
        await manageReviews.loginAs('admin')
        await page.goto(frontend.manageReviewData.routes.manageReviews)
        await manageReviews.fillSearchCriteria(frontend.manageReviewData.searchCriteria.employeeName);
        await manageReviews.clickSearch();
        await manageReviews.waitUntilTableLoaderDissapear()
        const validateData = await manageReviews.validateDataInTable(frontend.manageReviewData.validateDataForSearch.employeeName)
        expect(validateData.employeeName).not.toBeNull();
        expect(validateData.jobTitle).not.toBeNull();
        expect(validateData.period).toBe(frontend.manageReviewData.validateDataForSearch.reviewStatus);
        expect(validateData.dueDate).not.toBeNull();
        expect(validateData.reviewer).not.toBeNull();
        expect(validateData.status).not.toBeNull();
    })
})